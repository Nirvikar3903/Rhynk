import { successResponse } from '../../utils/apiResponse.js';

// AuthController: Handles incoming HTTP requests for authentication, 
// delegates logic to AuthService, and sends back standard API responses.
export class AuthController {
  constructor(authService) {
    this.authService = authService;
  }

  // register: Handles new user signup. It hashes the password, creates an unverified
  // user in the database, generates a 6-digit OTP code, saves it in Redis, and sends it to user's email.
  register = async (request, reply) => {
    const result = await this.authService.register(request.body);
    return reply.code(201).send(successResponse(result, 'Registration OTP sent successfully'));
  };

  // verifyOtp: Verifies the email verification OTP sent during signup. If the OTP is correct,
  // it marks the user as verified, registers their device, and returns JWT access & refresh tokens.
  verifyOtp = async (request, reply) => {
    const result = await this.authService.verifyOtp(request.body);
    return reply.code(200).send(successResponse(result, 'OTP verified successfully'));
  };

  // login: Verifies user credentials (email & password), ensures they are email-verified,
  // registers/updates their logged-in device, and issues a new pair of JWT access and refresh tokens.
  login = async (request, reply) => {
    const result = await this.authService.login(request.body);
    return reply.code(200).send(successResponse(result, 'Login successful'));
  };

  // resendOtp: Generates and emails a new verification OTP if the user didn't receive the first one,
  // subject to a 60-second cooldown to prevent spam.
  resendOtp = async (request, reply) => {
    const result = await this.authService.resendOtp(request.body);
    return reply.code(200).send(successResponse(result, 'OTP resent successfully'));
  };

  // refresh: Rotates/renews expired tokens. Validates the provided refresh token,
  // checks it against the active session in Redis, and issues a new access token & refresh token.
  refresh = async (request, reply) => {
    const result = await this.authService.refresh(request.body);
    return reply.code(200).send(successResponse(result, 'Tokens refreshed successfully'));
  };

  // logout: Revokes a user's active session for a specific device, deleting the refresh token
  // from Redis and removing/invalidating their device registration.
  logout = async (request, reply) => {
    const { userId } = request.user;
    const { deviceId } = request.body;
    const result = await this.authService.logout({ userId, deviceId });
    return reply.code(200).send(successResponse(result, 'Logged out successfully'));
  };

  // forgotPasswordRequest: Initiates password reset by checking email, generating OTP, and sending email.
  forgotPasswordRequest = async (request, reply) => {
    const result = await this.authService.forgotPasswordRequest(request.body);
    return reply.code(200).send(successResponse(result, 'Password reset OTP sent successfully'));
  };

  // forgotPasswordVerify: Verifies OTP for password reset and returns a temporary reset token.
  forgotPasswordVerify = async (request, reply) => {
    const result = await this.authService.forgotPasswordVerify(request.body);
    return reply.code(200).send(successResponse(result, 'OTP verified successfully'));
  };

  // forgotPasswordReset: Performs password reset using a verified reset token.
  forgotPasswordReset = async (request, reply) => {
    const result = await this.authService.forgotPasswordReset(request.body);
    return reply.code(200).send(successResponse(result, 'Password reset successfully'));
  };
}

