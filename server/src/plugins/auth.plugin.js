import fp from 'fastify-plugin';
import { verifyJwt } from '../middlewares/verifyJwt.js';

export default fp(async function authPlugin(fastify) {
  fastify.decorate('verifyJwt', verifyJwt);
});
