import fp from "fastify-plugin";
import mongoose from "mongoose";
import env from "../config/env.js";

async function mongoosePlugin(fastify) {
  fastify.log.info("Connecting to MongoDB...");

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 20000,
  });

  fastify.log.info("✅ MongoDB connected");

  fastify.decorate("mongo", mongoose.connection);

  fastify.addHook("onClose", async () => {
    await mongoose.disconnect();
  });
}

export default fp(mongoosePlugin);