import fp from "fastify-plugin";
import pkg from "@prisma/client";
const { PrismaClient } = pkg;

async function prismaPlugin(fastify) {
  const prisma = new PrismaClient();

  await prisma.$connect();
  fastify.log.info("✅ Postgres (Prisma) connected");

  fastify.decorate("prisma", prisma);

  fastify.addHook("onClose", async (instance) => {
    await instance.prisma.$disconnect();
  });
}

export default fp(prismaPlugin);