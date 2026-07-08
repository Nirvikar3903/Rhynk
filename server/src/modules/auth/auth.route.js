import {
  registerSchema,
  verifyOtpSchema,
  loginSchema,
  resendOtpSchema,
  refreshSchema,
  logoutSchema
} from './auth.schema.js';
import { rateLimit } from '../../middlewares/rateLimit.js';

// authRoutes: Declares Fastify route patterns, applies request validation schemas,
// and maps preHandler middlewares (rate limiters, token verify) to endpoints.
export default async function authRoutes(fastify, options) {
  const { controller } = options;

  // Sign Up: Rate-limited to max 3 attempts per 60s per IP
  fastify.post('/register', {
    schema: registerSchema,
    preHandler: [rateLimit({ maxAttempts: 3, windowSeconds: 60 })]
  }, controller.register);

  // OTP Verification: Rate-limited to max 5 attempts per 60s per IP
  fastify.post('/verify-otp', {
    schema: verifyOtpSchema,
    preHandler: [rateLimit({ maxAttempts: 5, windowSeconds: 60 })]
  }, controller.verifyOtp);

  // Sign In: Rate-limited to max 5 attempts per 60s per IP
  fastify.post('/login', {
    schema: loginSchema,
    preHandler: [rateLimit({ maxAttempts: 5, windowSeconds: 60 })]
  }, controller.login);

  // Resend Sign Up Verification OTP
  fastify.post('/resend-otp', { schema: resendOtpSchema }, controller.resendOtp);
  
  // Rotate expired tokens using a valid refresh token
  fastify.post('/refresh', { schema: refreshSchema }, controller.refresh);
  
  // Protected logout route: validates access JWT first, then removes session
  fastify.post('/logout', {
    schema: logoutSchema,
    preHandler: [fastify.verifyJwt]
  }, controller.logout);
}


