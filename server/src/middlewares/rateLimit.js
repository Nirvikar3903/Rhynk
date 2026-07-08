export function rateLimit({ maxAttempts, windowSeconds }) {
  return async function (request, reply) {
    const key = `ratelimit:${request.ip}:${request.routerPath}`;
    const current = await request.server.redis.incr(key);
    if (current === 1) {
      await request.server.redis.expire(key, windowSeconds);
    }
    if (current > maxAttempts) {
      const err = new Error('Too many attempts, try again later');
      err.code = 'RATE_LIMITED';
      throw err;
    }
  };
}
