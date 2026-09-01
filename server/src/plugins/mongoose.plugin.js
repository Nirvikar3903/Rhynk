import fp from "fastify-plugin";
import mongoose from "mongoose";
import env from "../config/env.js";

async function mongoosePlugin(fastify) {
  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 20000,
    });
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    throw err;
  }

  fastify.decorate("mongo", mongoose.connection);

  fastify.addHook("onClose", async () => {
    await mongoose.disconnect();
  });
}

export default fp(mongoosePlugin);