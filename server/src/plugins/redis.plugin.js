import fp from "fastify-plugin";
import Redis from "ioredis";
import env from "../config/env.js";

async function redisPlugin(fastify) {
  const redis = new Redis(env.REDIS_URL, {
    connectTimeout: 10000,
    maxRetriesPerRequest: 1,
  });

  redis.on("error", (err) => {
    // Only log if connection dropped
  });

  try {
    await Promise.race([
      new Promise((resolve, reject) => {
        redis.once("ready", resolve);
        redis.once("error", reject);
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Redis connection timed out after 10s")), 10000)
      ),
    ]);
  } catch (err) {
    console.error("❌ Redis connection error:", err.message);
    throw err;
  }

  fastify.decorate("redis", redis);

  fastify.addHook("onClose", async (instance) => {
    await instance.redis.quit();
  });
}

export default fp(redisPlugin);