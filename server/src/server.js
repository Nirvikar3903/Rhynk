import { buildApp } from "./app.js";
import env from "./config/env.js";

const start = async () => {
  try {
    const app = await buildApp();

    await app.listen({
      port: env.PORT,
      host: "0.0.0.0",
    });
    console.log(`Rhynk server running on http://localhost:${env.PORT}`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

start();