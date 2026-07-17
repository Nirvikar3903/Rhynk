// registerSchema: Defines requirements for signing up.
// Validates username length, email pattern, and minimum password length.
export const registerSchema = {
  body: {
    type: 'object',
    required: ['username', 'email', 'password'],
    properties: {
      username: { type: 'string', minLength: 3, maxLength: 30 },
      email: { type: 'string', pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' },
      password: { type: 'string', minLength: 6 }
    }
  }
};

// verifyOtpSchema: Defines requirements for verifying email via OTP.
// Ensures a 6-digit numeric OTP and one of the allowed device types (IOS, ANDROID, WEB).
export const verifyOtpSchema = {
  body: {
    type: 'object',
    required: ['email', 'otp', 'deviceId', 'deviceType'],
    properties: {
      email: { type: 'string', pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' },
      otp: { type: 'string', pattern: '^[0-9]{6}$' },
      deviceId: { type: 'string', minLength: 1 },
      deviceType: { type: 'string', enum: ['IOS', 'ANDROID', 'WEB'] }
    }
  }
};

// loginSchema: Defines requirements for signing in.
// Validates presence of credentials and device metadata.
export const loginSchema = {
  body: {
    type: 'object',
    required: ['email', 'password', 'deviceId', 'deviceType'],
    properties: {
      email: { type: 'string', pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' },
      password: { type: 'string' },
      deviceId: { type: 'string', minLength: 1 },
      deviceType: { type: 'string', enum: ['IOS', 'ANDROID', 'WEB'] }
    }
  }
};

// resendOtpSchema: Defines requirements for resending verification email.
export const resendOtpSchema = {
  body: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' }
    }
  }
};

// refreshSchema: Defines requirements for requesting a new token pair.
export const refreshSchema = {
  body: {
    type: 'object',
    required: ['refreshToken', 'deviceId'],
    properties: {
      refreshToken: { type: 'string', minLength: 1 },
      deviceId: { type: 'string', minLength: 1 }
    }
  }
};

// logoutSchema: Defines requirements for signing out a device session.
export const logoutSchema = {
  body: {
    type: 'object',
    required: ['deviceId'],
    properties: {
      deviceId: { type: 'string', minLength: 1 }
    }
  }
};

// forgotPasswordRequestSchema: Defines requirements for requesting a password reset.
export const forgotPasswordRequestSchema = {
  body: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' }
    }
  }
};

// forgotPasswordVerifySchema: Defines requirements for verifying OTP during password reset.
export const forgotPasswordVerifySchema = {
  body: {
    type: 'object',
    required: ['email', 'otp'],
    properties: {
      email: { type: 'string', pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' },
      otp: { type: 'string', pattern: '^[0-9]{6}$' }
    }
  }
};

// forgotPasswordResetSchema: Defines requirements for resetting the password with a token.
export const forgotPasswordResetSchema = {
  body: {
    type: 'object',
    required: ['email', 'resetToken', 'newPassword'],
    properties: {
      email: { type: 'string', pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' },
      resetToken: { type: 'string', minLength: 1 },
      newPassword: { type: 'string', minLength: 6 }
    }
  }
};

