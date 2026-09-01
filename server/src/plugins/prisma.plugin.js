import fp from "fastify-plugin";
import pkg from "@prisma/client";
const { PrismaClient } = pkg;

async function prismaPlugin(fastify) {
  const prisma = new PrismaClient();

  try {
    await prisma.$connect();
  } catch (err) {
    console.error("❌ Postgres (Prisma) connection error:", err.message);
    throw err;
  }

  fastify.decorate("prisma", prisma);

  fastify.addHook("onClose", async (instance) => {
    await instance.prisma.$disconnect();
  });
}

export default fp(prismaPlugin);