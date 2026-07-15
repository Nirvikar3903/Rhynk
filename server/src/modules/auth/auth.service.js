import crypto from 'crypto';
import { hashPassword, comparePassword } from '../../utils/hash.util.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt.util.js';

// Expiry and cooldown configurations in seconds
const OTP_TTL_SECONDS = 180; // OTP is valid for 3 minutes (180 seconds)
const RESEND_COOLDOWN_SECONDS = 30; // Resending OTP has a 30-second cooldown
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // Refresh tokens expire in 7 days

// AuthService: Implements the core business logic of the authentication system.
// It integrates the database repository, Redis cache/session store, and email service.
export class AuthService {
  constructor(repository, redis, sendEmail) {
    this.repository = repository;
    this.redis = redis;
    this.sendEmail = sendEmail;
  }

  // sendOtp: Generates a 6-digit random OTP code, stores it in Redis,
  // sets a cooldown timer key, and sends the OTP email asynchronously.
  async sendOtp(email) {
    const cooldownKey = `otp:cooldown:${email}`;
    const hasCooldown = await this.redis.get(cooldownKey);
    if (hasCooldown) {
      const error = new Error('OTP resend cooldown active');
      error.code = 'OTP_COOLDOWN';
      throw error;
    }

    // Generate random 6-digit number string
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpKey = `otp:${email}`;

    // Redis transaction (multi) to write the OTP and its cooldown concurrently
    await this.redis.multi()
      .set(otpKey, otp, 'EX', OTP_TTL_SECONDS)
      .set(cooldownKey, '1', 'EX', RESEND_COOLDOWN_SECONDS)
      .exec();

    let name = email;
    try {
      const user = await this.repository.findUserByEmail(email);
      if (user) {
        name = user.name || user.username || email;
      }
    } catch (err) {
      // Log error but don't block OTP dispatch
      console.error('Failed to lookup name for OTP email:', err);
    }

    await this.sendEmail(email, 'otp_verification', { otp, username: name, expiry: '3 minutes' });
  }

  // register: Signs up a new user. 
  // If the email is already registered but unverified, it automatically resends the OTP.
  // Otherwise, it hashes the password, inserts the user row, and sends the first OTP.
  async register({ username, email, password }) {
    const existingUser = await this.repository.findUserByEmail(email);

    if (existingUser) {
      if (existingUser.isVerified) {
        const error = new Error('Email is already registered');
        error.code = 'EMAIL_TAKEN';
        throw error;
      }
      await this.sendOtp(email);
      return { email, userId: existingUser.id, isVerified: false };
    }

    const passwordHash = await hashPassword(password);
    const user = await this.repository.createUser({ username, email, passwordHash });

    await this.sendOtp(email);
    return { email, userId: user.id, isVerified: false };
  }

  // verifyOtp: Validates the 6-digit OTP code stored in Redis.
  // On success, updates the user's `isVerified` field in Postgres, deletes the OTP key from Redis,
  // registers/upserts the user's device, and returns newly issued JWT tokens.
  async verifyOtp({ email, otp, deviceId, deviceType }) {
    const otpKey = `otp:${email}`;
    const storedOtp = await this.redis.get(otpKey);

    if (!storedOtp || storedOtp !== otp) {
      const error = new Error('Invalid or expired OTP');
      error.code = 'OTP_INVALID';
      throw error;
    }

    const user = await this.repository.findUserByEmail(email);
    if (!user) {
      const error = new Error('User not found');
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    await this.repository.verifyUser(user.id);
    await this.redis.del(otpKey);

    // Asynchronously trigger the welcome email upon successful verification
    this.sendEmail(user.email, 'welcome_email', { username: user.name || user.username || user.email })
      .catch(err => console.error('Failed to send welcome email:', err));

    const tokens = await this.issueTokens({ userId: user.id, deviceId, deviceType });

    return {
      ...tokens,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isVerified: true
      }
    };
  }

  // login: Handles user sign-in.
  // 1. Fetches user details.
  // 2. Compares the plain password with the stored hash using bcrypt.
  // 3. If the email is unverified, triggers/resends a verification OTP and throws EMAIL_NOT_VERIFIED.
  // 4. On success, registers the device and issues a pair of JWT access and refresh tokens.
  async login({ email, password, deviceId, deviceType }) {
    const user = await this.repository.findUserByEmail(email);

    if (!user || !user.passwordHash) {
      const error = new Error('Please enter valid credentials');
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      const error = new Error('Please enter valid credentials');
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    if (!user.isVerified) {
      try {
        await this.sendOtp(email);
      } catch (err) {
        // Ignore cooldown errors when logging in so we can still throw EMAIL_NOT_VERIFIED
        if (err.code !== 'OTP_COOLDOWN') {
          throw err;
        }
      }

      const error = new Error('Email is not verified');
      error.code = 'EMAIL_NOT_VERIFIED';
      throw error;
    }

    const tokens = await this.issueTokens({ userId: user.id, deviceId, deviceType });
    return {
      ...tokens,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        isVerified: true
      }
    };
  }

  // resendOtp: Manually requests a new OTP code for an existing unverified account.
  async resendOtp({ email }) {
    const user = await this.repository.findUserByEmail(email);
    if (!user) {
      const error = new Error('User not found');
      error.code = 'USER_NOT_FOUND';
      throw error;
    }
    await this.sendOtp(email);
    return { success: true };
  }

  // issueTokens: Generates a short-lived access JWT and a long-lived refresh JWT.
  // It registers/updates the user's active device in Postgres and caches the refresh token in Redis.
  async issueTokens({ userId, deviceId, deviceType }) {
    await this.repository.upsertDevice({ deviceId, userId, deviceType });

    const accessToken = signAccessToken({ userId, deviceId });
    const refreshToken = signRefreshToken({ userId, deviceId });

    // Store the refresh token in Redis mapped to the user device to enable session rotation and revocation.
    const sessionKey = `session:${userId}:${deviceId}`;
    await this.redis.set(sessionKey, refreshToken, 'EX', SESSION_TTL_SECONDS);

    return { accessToken, refreshToken };
  }

  // refresh: Renews expired access tokens using a valid refresh token.
  // Implements token reuse detection to prevent replay attacks (stealing a refresh token):
  // 1. Uses a Redis concurrency lock to prevent multiple simultaneous refreshes.
  // 2. Checks if the refresh token matches the one currently stored in Redis for that session.
  // 3. If it does NOT match, it implies reuse (the token was already rotated or stolen).
  //    In this case, it revokes ALL sessions of the user (`session:userId:*`) for security.
  async refresh({ refreshToken, deviceId }) {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch (err) {
      const error = new Error('Invalid or expired refresh token');
      error.code = 'REFRESH_INVALID';
      throw error;
    }

    const { userId, deviceId: tokenDeviceId } = payload;
    if (tokenDeviceId !== deviceId) {
      const error = new Error('Refresh token device mismatch');
      error.code = 'REFRESH_INVALID';
      throw error;
    }

    // Set a short-lived lock in Redis to avoid concurrency race conditions
    const lockKey = `lock:refresh:${refreshToken}`;
    const acquired = await this.redis.set(lockKey, '1', 'NX', 'EX', 5);
    if (!acquired) {
      const error = new Error('Concurrent refresh in progress');
      error.code = 'REFRESH_LOCKED';
      throw error;
    }

    try {
      const sessionKey = `session:${userId}:${deviceId}`;
      const storedToken = await this.redis.get(sessionKey);

      // Detection of token reuse (Replay Attack mitigation)
      if (!storedToken || storedToken !== refreshToken) {
        const keysPattern = `session:${userId}:*`;
        const sessionKeys = await this.redis.keys(keysPattern);
        if (sessionKeys.length > 0) {
          // Immediately log out user from ALL devices
          await this.redis.del(...sessionKeys);
        }
        const error = new Error('Session revoked due to refresh token reuse');
        error.code = 'SESSION_REVOKED';
        throw error;
      }

      const device = await this.repository.findDeviceById(deviceId);
      const deviceType = device ? device.deviceType : 'WEB';

      // Issue new access and refresh tokens, replacing the current session token in Redis (Token Rotation)
      const tokens = await this.issueTokens({ userId, deviceId, deviceType });
      return tokens;
    } finally {
      // Release concurrency lock
      await this.redis.del(lockKey);
    }
  }

  // logout: Ends a user session. Deletes the refresh token from Redis and removes the device from the database.
  async logout({ userId, deviceId }) {
    const sessionKey = `session:${userId}:${deviceId}`;
    await this.redis.del(sessionKey);
    await this.repository.deleteDevice(deviceId);
    return { success: true };
  }

  // forgotPasswordRequest: Handles requesting a password reset OTP.
  // Verifies that a user exists with matching username and email, and that they are verified.
  async forgotPasswordRequest({ username, email }) {
    const user = await this.repository.findUserByEmail(email);

    if (!user || user.username !== username) {
      const error = new Error('Invalid email or username');
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    if (!user.isVerified) {
      const error = new Error('Email is not verified');
      error.code = 'EMAIL_NOT_VERIFIED';
      throw error;
    }

    const cooldownKey = `forgot-password:cooldown:${email}`;
    const hasCooldown = await this.redis.get(cooldownKey);
    if (hasCooldown) {
      const error = new Error('OTP resend cooldown active');
      error.code = 'OTP_COOLDOWN';
      throw error;
    }

    // Generate random 6-digit number string
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpKey = `forgot-password:otp:${email}`;

    // Redis transaction (multi) to write the OTP and its cooldown concurrently
    await this.redis.multi()
      .set(otpKey, otp, 'EX', 300) // OTP is valid for 5 minutes (300 seconds)
      .set(cooldownKey, '1', 'EX', 30) // Resend OTP cooldown of 30 seconds
      .exec();

    await this.sendEmail(email, 'otp_verification', { 
      otp, 
      username: user.name || user.username || email,
      expiry: '5 minutes'
    });

    return { email };
  }

  // forgotPasswordVerify: Verifies the OTP sent for password reset.
  // If valid, issues a short-lived reset token for password update.
  async forgotPasswordVerify({ email, otp }) {
    const otpKey = `forgot-password:otp:${email}`;
    const storedOtp = await this.redis.get(otpKey);

    if (!storedOtp || storedOtp !== otp) {
      const error = new Error('Invalid or expired OTP');
      error.code = 'OTP_INVALID';
      throw error;
    }

    // Generate a secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenKey = `forgot-password:reset-token:${email}`;

    // Save reset token in Redis for 15 minutes
    await this.redis.set(resetTokenKey, resetToken, 'EX', 15 * 60);

    // Delete OTP after verification to prevent reuse
    await this.redis.del(otpKey);

    return { resetToken };
  }

  // forgotPasswordReset: Updates the user's password using a verified reset token.
  async forgotPasswordReset({ email, resetToken, newPassword }) {
    const resetTokenKey = `forgot-password:reset-token:${email}`;
    const storedToken = await this.redis.get(resetTokenKey);

    if (!storedToken || storedToken !== resetToken) {
      const error = new Error('Invalid or expired reset token');
      error.code = 'RESET_TOKEN_INVALID';
      throw error;
    }

    const user = await this.repository.findUserByEmail(email);
    if (!user) {
      const error = new Error('User not found');
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    const passwordHash = await hashPassword(newPassword);
    await this.repository.updatePassword(user.id, passwordHash);

    // Invalidate reset token
    await this.redis.del(resetTokenKey);

    // Revoke all active sessions for the user to force re-authentication
    const keysPattern = `session:${user.id}:*`;
    const sessionKeys = await this.redis.keys(keysPattern);
    if (sessionKeys.length > 0) {
      await this.redis.del(...sessionKeys);
    }

    return { success: true };
  }
}

