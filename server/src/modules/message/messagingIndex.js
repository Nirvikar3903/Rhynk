import { MessagingRepository } from './messaging.repository.js';
import { MessagingService } from './messaging.service.js';
import { MessagingController } from './messaging.controller.js';
import messagingRoutes from './messaging.route.js';
import { registerMessagingSockets } from './messaging.socket.js';

// messagingIndex: The main entry point and composition root for the Messaging Module.
// Injects Prisma and Redis dependencies into Repository, Service, and Controller layers,
// registers Fastify routes under '/messaging', and binds Socket.io event listeners.
export default async function messagingIndex(fastify) {
  // 1. Initialize Repository with Postgres client
  const repository = new MessagingRepository(fastify.prisma);

  // 2. Initialize Service with Repository and Redis client
  const service = new MessagingService(repository, fastify.redis);

  // 3. Initialize Controller with Service
  const controller = new MessagingController(service);

  // 4. Register HTTP routes under the '/messaging' URL prefix
  await fastify.register(messagingRoutes, { controller, prefix: '/messaging' });

  // 5. Register WebSockets if Socket.io instance is decorated on Fastify
  if (fastify.io) {
    registerMessagingSockets(fastify.io, service);
  }
}
