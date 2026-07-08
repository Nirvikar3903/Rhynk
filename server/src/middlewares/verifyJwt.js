import { verifyAccessToken } from '../utils/jwt.util.js';

export async function verifyJwt(request, reply) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('Missing or malformed Authorization header');
    error.statusCode = 401;
    throw error;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    if (!decoded || !decoded.userId || !decoded.deviceId) {
      const error = new Error('Invalid token payload');
      error.statusCode = 401;
      throw error;
    }
    request.user = {
      userId: decoded.userId,
      deviceId: decoded.deviceId
    };
  } catch (err) {
    const error = new Error('Invalid or expired access token');
    error.statusCode = 401;
    throw error;
  }
}
