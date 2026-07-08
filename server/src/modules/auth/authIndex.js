import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import authRoutes from './auth.route.js';

// authIndex: The main entry point for the Auth Module.
// It initializes and injects dependencies (Prisma, Redis, Email utility)
// into the Repository, Service, and Controller layers, then registers routes.
export default async function authIndex(fastify) {
  // 1. Initialize Repository with Postgres client (fastify.prisma)
  const repository = new AuthRepository(fastify.prisma);
  
  // 2. Initialize Service with Repository, Redis client, and Send OTP Email utility
  const service = new AuthService(repository, fastify.redis, fastify.sendOtpEmail);
  
  // 3. Initialize Controller with Service
  const controller = new AuthController(service);

  // 4. Register all route definitions under the '/auth' URL prefix
  await fastify.register(authRoutes, { controller, prefix: '/auth' });
}

