import { UserRepository } from './user.repository.js';
import { UserService } from './user.service.js';
import { UserController } from './user.controller.js';
import userRoutes from './user.route.js';

// userIndex: The main entry point for the User Module.
// It initializes and injects dependencies into the Repository, Service,
// and Controller layers, then registers routes under the '/users' prefix.
export default async function userIndex(fastify) {
  // 1. Initialize Repository with Postgres client (fastify.prisma)
  const repository = new UserRepository(fastify.prisma);
  
  // 2. Initialize Service with Repository
  const service = new UserService(repository);
  
  // 3. Initialize Controller with Service
  const controller = new UserController(service);

  // 4. Register all route definitions under the '/users' URL prefix
  await fastify.register(userRoutes, { controller, prefix: '/users' });
}
