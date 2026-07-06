import fp from "fastify-plugin";
import Redis from "ioredis";
import env from "../config/env.js";

async function redisPlugin(fastify) {
  fastify.log.info(`Connecting to Redis at: ${env.REDIS_URL?.replace(/:[^:@]*@/, ':****@')}`);

  const redis = new Redis(env.REDIS_URL, {
    connectTimeout: 10000,
    maxRetriesPerRequest: 1,
  });

  redis.on("error", (err) => {
    fastify.log.error({ err }, "Redis connection error");
  });

  await Promise.race([
    new Promise((resolve, reject) => {
      redis.once("ready", resolve);
      redis.once("error", reject);
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Redis connection timed out after 10s")), 10000)
    ),
  ]);

  fastify.log.info("✅ Redis connected");

  fastify.decorate("redis", redis);

  fastify.addHook("onClose", async (instance) => {
    await instance.redis.quit();
  });
}

export default fp(redisPlugin);