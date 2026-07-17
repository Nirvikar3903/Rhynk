import { errorResponse } from '../utils/apiResponse.js';

const CODE_TO_STATUS = {
  EMAIL_TAKEN: 409,
  OTP_COOLDOWN: 429,
  OTP_INVALID: 400,
  USER_NOT_FOUND: 404,
  INVALID_CREDENTIALS: 401,
  EMAIL_NOT_VERIFIED: 403,
  REFRESH_INVALID: 401,
  REFRESH_LOCKED: 409,
  SESSION_REVOKED: 401,
  RATE_LIMITED: 429,
  RESET_TOKEN_INVALID: 400,
  USERNAME_TAKEN: 409,
};

export function errorHandler(error, request, reply) {
  const code = error.code || null;
  const status = CODE_TO_STATUS[code] || error.statusCode || 500;

  // Any error that isn't a recognized business error code or a known Fastify
  // validation/statusCode error is unexpected — log the real error server-side
  // but never leak its raw message (Prisma/Mongo/driver internals, stack traces) to the client.
  if (status >= 500) {
    request.log.error({ err: error }, 'Unexpected server error');
    return reply.code(500).send(errorResponse('Internal Server Error', null));
  }

  // Handle Fastify validation errors gracefully if present
  const message = error.validation
    ? `Validation Error: ${error.validation.map(e => `${e.instancePath || ''} ${e.message}`).join(', ')}`
    : error.message || 'Something went wrong';

  return reply.code(status).send(errorResponse(message, code));
}
