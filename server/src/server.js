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
    console.log(`\n🚀 Rhynk server running on http://localhost:${env.PORT}`);
    console.log(`📋 API Docs: http://localhost:${env.PORT}/docs\n`);
  } catch (error) {
    console.error("❌ Server failed to start:", error.message);
    process.exit(1);
  }
};

start();