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
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import env from "./config/env.js";
import prismaPlugin from "./plugins/prisma.plugin.js";
import mongoosePlugin from "./plugins/mongoose.plugin.js";
import redisPlugin from "./plugins/redis.plugin.js";
import mailerPlugin from "./plugins/mailer.plugin.js";
import authPlugin from "./plugins/auth.plugin.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import authIndex from "./modules/auth/authIndex.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const swaggerPath = path.join(__dirname, "../swagger.json");

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(prismaPlugin);
  await app.register(mongoosePlugin);
  await app.register(redisPlugin);

  await app.register(mailerPlugin);
  await app.register(authPlugin);
  app.setErrorHandler(errorHandler);
  await app.register(authIndex);

  app.get("/swagger.json", async (req, reply) => {
    try {
      const data = await fs.readFile(swaggerPath, "utf8");
      return reply.type("application/json").send(JSON.parse(data));
    } catch (err) {
      return reply.code(404).send({ success: false, message: "Swagger file not found" });
    }
  });

  app.get("/docs", async (req, reply) => {
    reply.type("text/html");
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Rhynk Auth API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body { margin: 0; background: #fafafa; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/swagger.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`;
  });

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