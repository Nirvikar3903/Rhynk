import "./polyfill.js";
import { buildApp } from "./app.js";
import env from "./config/env.js";

const start = async () => {
  try {
    const app = await buildApp();

    await app.listen({
      port: env.PORT,
      host: "0.0.0.0",
    });
    app.log.info(`🚀 Rhynk server running on http://localhost:${env.PORT}`);
    app.log.info(`📋 Swagger documentation available at http://localhost:${env.PORT}/docs`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

start();