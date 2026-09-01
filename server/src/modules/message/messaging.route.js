import {
  createDirectSchema,
  createGroupSchema,
  getMessagesSchema,
  sendMessageSchema,
  markReadSchema,
  reactMessageSchema,
  updateSettingsSchema,
  starMessageSchema,
} from './messaging.validator.js';

// messagingRoutes: Registers Fastify HTTP route definitions for Messaging.
// Applies JWT authentication (fastify.verifyJwt) and JSON-schema validators to all endpoints.
export default async function messagingRoutes(fastify, options) {
  const { controller } = options;

  const authGuard = [fastify.verifyJwt];

  // POST /messaging/conversations/direct: Get or create 1-on-1 DM conversation
  fastify.post('/conversations/direct', {
    schema: createDirectSchema,
    preHandler: authGuard,
  }, controller.createDirectConversation);

  // POST /messaging/conversations/group: Create a multi-user group chat
  fastify.post('/conversations/group', {
    schema: createGroupSchema,
    preHandler: authGuard,
  }, controller.createGroupConversation);

  // GET /messaging/conversations: List all conversations for the authenticated user
  fastify.get('/conversations', {
    preHandler: authGuard,
  }, controller.getUserConversations);

  // GET /messaging/conversations/:id: Get details and members for a conversation
  fastify.get('/conversations/:id', {
    preHandler: authGuard,
  }, controller.getConversationDetails);

  // POST /messaging/conversations/:id/messages: Send a message via HTTP
  fastify.post('/conversations/:id/messages', {
    schema: sendMessageSchema,
    preHandler: authGuard,
  }, controller.sendMessage);

  // GET /messaging/conversations/:id/messages: Fetch paginated message history
  fastify.get('/conversations/:id/messages', {
    schema: getMessagesSchema,
    preHandler: authGuard,
  }, controller.getMessages);

  // POST /messaging/conversations/:id/read: Update user read receipt timestamp
  fastify.post('/conversations/:id/read', {
    schema: markReadSchema,
    preHandler: authGuard,
  }, controller.markAsRead);

  // POST /messaging/messages/:id/react: Toggle an emoji reaction on a message
  fastify.post('/messages/:id/react', {
    schema: reactMessageSchema,
    preHandler: authGuard,
  }, controller.reactToMessage);

  // PATCH /messaging/conversations/:id/settings: Update conversation settings (pin/mute/archive)
  fastify.patch('/conversations/:id/settings', {
    schema: updateSettingsSchema,
    preHandler: authGuard,
  }, controller.updateConversationSettings);

  // POST /messaging/messages/:id/star: Toggle star state on a message
  fastify.post('/messages/:id/star', {
    schema: starMessageSchema,
    preHandler: authGuard,
  }, controller.toggleStarMessage);

  // GET /messaging/starred: Fetch all starred messages for the user
  fastify.get('/starred', {
    preHandler: authGuard,
  }, controller.getStarredMessages);
}
