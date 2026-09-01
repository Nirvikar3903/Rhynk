import { successResponse } from '../../utils/apiResponse.js';

// MessagingController: Handles HTTP requests for DMs, Group Chats, and Messages,
// delegating business operations to MessagingService and sending standard responses.
export class MessagingController {
  constructor(messagingService) {
    this.messagingService = messagingService;
  }

  // createDirectConversation: Retrieves existing or starts new 1-on-1 DM by username, email, or user ID.
  createDirectConversation = async (request, reply) => {
    const { userId: currentUserId } = request.user;
    const { recipient, recipientUserId } = request.body || {};
    const result = await this.messagingService.getOrCreateDirectConversation({
      currentUserId,
      recipientUserId,
      recipient,
    });
    return reply.code(200).send(successResponse(result, 'Direct conversation retrieved successfully'));
  };

  // createGroupConversation: Creates a new multi-user group chat.
  createGroupConversation = async (request, reply) => {
    const { userId: currentUserId } = request.user;
    const { name, memberUserIds, avatarUrl } = request.body;
    const result = await this.messagingService.createGroupConversation({
      currentUserId,
      name,
      memberUserIds,
      avatarUrl,
    });
    return reply.code(201).send(successResponse(result, 'Group conversation created successfully'));
  };

  // getUserConversations: Lists all conversations for the authenticated user.
  getUserConversations = async (request, reply) => {
    const { userId } = request.user;
    const result = await this.messagingService.getUserConversations(userId);
    return reply.code(200).send(successResponse(result, 'Conversations retrieved successfully'));
  };

  // getConversationDetails: Fetches details for a single conversation.
  getConversationDetails = async (request, reply) => {
    const { userId } = request.user;
    const { id: conversationId } = request.params;
    const result = await this.messagingService.getConversationDetails({
      conversationId,
      userId,
    });
    return reply.code(200).send(successResponse(result, 'Conversation details retrieved successfully'));
  };

  // sendMessage: Sends a message via HTTP endpoint.
  sendMessage = async (request, reply) => {
    const { userId: senderId } = request.user;
    const { id: conversationId } = request.params;
    const { content, type, metadata } = request.body;

    const result = await this.messagingService.sendMessage({
      conversationId,
      senderId,
      content,
      type,
      metadata,
    });
    return reply.code(201).send(successResponse(result, 'Message sent successfully'));
  };

  // getMessages: Fetches paginated past messages for a conversation.
  getMessages = async (request, reply) => {
    const { userId } = request.user;
    const { id: conversationId } = request.params;
    const { limit, before } = request.query;

    const result = await this.messagingService.getMessages({
      conversationId,
      userId,
      limit,
      before,
    });
    return reply.code(200).send(successResponse(result, 'Messages retrieved successfully'));
  };

  // markAsRead: Updates read receipt cursor for the user.
  markAsRead = async (request, reply) => {
    const { userId } = request.user;
    const { id: conversationId } = request.params;

    const result = await this.messagingService.markAsRead({
      conversationId,
      userId,
    });
    return reply.code(200).send(successResponse(result, 'Conversation marked as read'));
  };

  // reactToMessage: Toggles an emoji reaction on a message.
  reactToMessage = async (request, reply) => {
    const { userId } = request.user;
    const { id: messageId } = request.params;
    const { emoji } = request.body;

    const result = await this.messagingService.reactToMessage({
      messageId,
      userId,
      emoji,
    });
    return reply.code(200).send(successResponse(result, 'Reaction updated successfully'));
  };

  // updateConversationSettings: Updates pin, mute, or archive status for a conversation.
  updateConversationSettings = async (request, reply) => {
    const { userId } = request.user;
    const { id: conversationId } = request.params;
    const { isPinned, isMuted, isArchived } = request.body;

    const result = await this.messagingService.updateConversationSettings({
      conversationId,
      userId,
      isPinned,
      isMuted,
      isArchived,
    });
    return reply.code(200).send(successResponse(result, 'Conversation settings updated successfully'));
  };

  // toggleStarMessage: Stars or unstars a message.
  toggleStarMessage = async (request, reply) => {
    const { userId } = request.user;
    const { id: messageId } = request.params;

    const result = await this.messagingService.toggleStarMessage({
      messageId,
      userId,
    });
    return reply.code(200).send(successResponse(result, 'Starred message status updated'));
  };

  // getStarredMessages: Fetches all starred messages for the user.
  getStarredMessages = async (request, reply) => {
    const { userId } = request.user;

    const result = await this.messagingService.getStarredMessages(userId);
    return reply.code(200).send(successResponse(result, 'Starred messages retrieved successfully'));
  };
}
