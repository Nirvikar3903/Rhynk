// import Fastify from "fastify";
// import env from "./config/env.js";

// export function buildApp() {
//   const app = Fastify({
//     logger: true,
//   });

//   app.get("/health", async (req, res) => {
//     return {
//       status: "ok",
//       uptime: process.uptime(),
//       timestamp: new Date().toISOString(),
//       env: env.NODE_ENV,
//     };
//   });
//   return app;
// }

import Fastify from "fastify";
import env from "./config/env.js";
import prismaPlugin from "./plugins/prisma.plugin.js";
import mongoosePlugin from "./plugins/mongoose.plugin.js";
import redisPlugin from "./plugins/redis.plugin.js";

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(prismaPlugin);
  await app.register(mongoosePlugin);
  await app.register(redisPlugin);

  app.get("/health", async (req, res) => {
    const checks = { postgres: false, mongodb: false, redis: false };

    try {
      await app.prisma.$queryRaw`SELECT 1`;
      checks.postgres = true;
    } catch (err) {
      app.log.error({ err }, "Postgres health check failed");
    }

    try {
      checks.mongodb = app.mongo.readyState === 1;
    } catch (err) {
      app.log.error({ err }, "MongoDB health check failed");
    }

    try {
      const pong = await app.redis.ping();
      checks.redis = pong === "PONG";
    } catch (err) {
      app.log.error({ err }, "Redis health check failed");
    }

    const allHealthy = Object.values(checks).every(Boolean);
    res.code(allHealthy ? 200 : 503);

    return {
      status: allHealthy ? "ok" : "degraded",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      env: env.NODE_ENV,
      checks,
    };
  });

  return app;
}