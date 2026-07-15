import {
  updateProfileSchema,
  getPublicProfileSchema,
  searchUsersSchema
} from './user.validator.js';

export default async function userRoutes(fastify, options) {
  const { controller } = options;

  // Apply JWT authentication preHandler hook to all routes in this group
  fastify.addHook('preHandler', fastify.verifyJwt);

  // Get current user profile
  fastify.get('/me', controller.getMe);

  // Update current user profile
  fastify.patch('/me', { schema: updateProfileSchema }, controller.updateProfile);

  // Search users by username query prefix
  fastify.get('/search', { schema: searchUsersSchema }, controller.searchUsers);

  // Get public profile of any user by ID
  fastify.get('/:id', { schema: getPublicProfileSchema }, controller.getPublicProfile);
}
