import { Message, StarredMessage } from './message.model.js';

// MessagingService: Implements business logic for 1-on-1 DMs, group chats,
// MongoDB message persistence, message history, and unread counters.
export class MessagingService {
  constructor(repository, redis) {
    this.repository = repository;
    this.redis = redis;
  }

  // getOrCreateDirectConversation: Retrieves existing 1-on-1 DM or creates a new one.
  // Accepts recipient as username, email address, or UUID.
  async getOrCreateDirectConversation({ currentUserId, recipientUserId, recipient }) {
    const identifier = recipient || recipientUserId;

    if (!identifier || (typeof identifier === 'string' && identifier.trim().length === 0)) {
      const error = new Error('Recipient username, email, or user ID is required');
      error.code = 'RECIPIENT_REQUIRED';
      throw error;
    }

    const targetUser = await this.repository.findUserByIdentifier(identifier.trim());

    if (!targetUser) {
      const error = new Error(`User '${identifier}' not found`);
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    const resolvedRecipientId = targetUser.id;

    if (currentUserId === resolvedRecipientId) {
      const error = new Error('Cannot start a direct conversation with yourself');
      error.code = 'CANNOT_CHAT_SELF';
      throw error;
    }

    let conversation = await this.repository.findDirectConversation(currentUserId, resolvedRecipientId);

    if (!conversation) {
      conversation = await this.repository.createDirectConversation(currentUserId, resolvedRecipientId);
    }

    return conversation;
  }

  // createGroupConversation: Creates a new GROUP conversation with specified members.
  async createGroupConversation({ currentUserId, name, memberUserIds, avatarUrl }) {
    if (!name || name.trim().length === 0) {
      const error = new Error('Group name is required');
      error.code = 'GROUP_NAME_REQUIRED';
      throw error;
    }

    const conversation = await this.repository.createGroupConversation({
      name,
      avatarUrl,
      createdBy: currentUserId,
      memberUserIds: memberUserIds || [],
    });

    return conversation;
  }

  // getUserConversations: Lists all user conversations enriched with last message snippet & unread count.
  async getUserConversations(userId) {
    const conversations = await this.repository.getUserConversations(userId);

    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await Message.findOne({ conversationId: conv.id })
          .sort({ createdAt: -1 })
          .lean();

        const currentMember = conv.members.find((m) => m.userId === userId);
        const lastReadAt = currentMember?.lastReadAt;

        let unreadCount = 0;
        if (lastReadAt) {
          unreadCount = await Message.countDocuments({
            conversationId: conv.id,
            createdAt: { $gt: lastReadAt },
            senderId: { $ne: userId },
          });
        } else {
          unreadCount = await Message.countDocuments({
            conversationId: conv.id,
            senderId: { $ne: userId },
          });
        }

        return {
          ...conv,
          lastMessage: lastMessage || null,
          unreadCount,
        };
      })
    );

    return enrichedConversations;
  }

  // getConversationDetails: Fetches details and member list for a single conversation.
  async getConversationDetails({ conversationId, userId }) {
    const isMember = await this.repository.isMember(conversationId, userId);
    if (!isMember) {
      const error = new Error('Access denied: You are not a member of this conversation');
      error.code = 'NOT_CONVERSATION_MEMBER';
      throw error;
    }

    return this.repository.findConversationById(conversationId);
  }

  // sendMessage: Verifies membership in Postgres, then saves message to MongoDB.
  async sendMessage({ conversationId, senderId, content, type = 'TEXT', metadata = {} }) {
    const isMember = await this.repository.isMember(conversationId, senderId);
    if (!isMember) {
      const error = new Error('Access denied: You cannot send messages to a conversation you are not in');
      error.code = 'NOT_CONVERSATION_MEMBER';
      throw error;
    }

    const message = await Message.create({
      conversationId,
      senderId,
      content,
      type,
      metadata,
    });

    return message;
  }

  // getMessages: Fetches paginated past messages from MongoDB for a chat thread.
  async getMessages({ conversationId, userId, limit = 30, before }) {
    const isMember = await this.repository.isMember(conversationId, userId);
    if (!isMember) {
      const error = new Error('Access denied: You are not a member of this conversation');
      error.code = 'NOT_CONVERSATION_MEMBER';
      throw error;
    }

    const query = { conversationId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    return messages.reverse();
  }

  // markAsRead: Updates lastReadAt timestamp in Postgres for read receipts.
  async markAsRead({ conversationId, userId }) {
    const isMember = await this.repository.isMember(conversationId, userId);
    if (!isMember) {
      const error = new Error('Access denied: You are not a member of this conversation');
      error.code = 'NOT_CONVERSATION_MEMBER';
      throw error;
    }

    await this.repository.updateLastRead(conversationId, userId);
    return { success: true, conversationId, userId };
  }

  // reactToMessage: Toggles an emoji reaction on a message in MongoDB.
  async reactToMessage({ messageId, userId, emoji }) {
    const message = await Message.findById(messageId);
    if (!message) {
      const error = new Error('Message not found');
      error.code = 'MESSAGE_NOT_FOUND';
      throw error;
    }

    const isMember = await this.repository.isMember(message.conversationId, userId);
    if (!isMember) {
      const error = new Error('Access denied: You are not a member of this conversation');
      error.code = 'NOT_CONVERSATION_MEMBER';
      throw error;
    }

    if (!message.reactions) {
      message.reactions = [];
    }

    // Toggle reaction logic: if same reaction exists, remove it; else toggle/add
    const existingIndex = message.reactions.findIndex(
      (r) => r.userId === userId && r.emoji === emoji
    );

    if (existingIndex > -1) {
      message.reactions.splice(existingIndex, 1);
    } else {
      // Remove any prior reaction by this user or append new one
      message.reactions = message.reactions.filter((r) => r.userId !== userId);
      message.reactions.push({ userId, emoji });
    }

    await message.save();
    return message;
  }

  // updateConversationSettings: Updates isPinned, isMuted, and isArchived settings in Postgres.
  async updateConversationSettings({ conversationId, userId, isPinned, isMuted, isArchived }) {
    const isMember = await this.repository.isMember(conversationId, userId);
    if (!isMember) {
      const error = new Error('Access denied: You are not a member of this conversation');
      error.code = 'NOT_CONVERSATION_MEMBER';
      throw error;
    }

    return this.repository.updateMemberSettings(conversationId, userId, {
      isPinned,
      isMuted,
      isArchived,
    });
  }

  // toggleStarMessage: Stars or unstars a message for the authenticated user.
  async toggleStarMessage({ messageId, userId }) {
    const message = await Message.findById(messageId);
    if (!message) {
      const error = new Error('Message not found');
      error.code = 'MESSAGE_NOT_FOUND';
      throw error;
    }

    const isMember = await this.repository.isMember(message.conversationId, userId);
    if (!isMember) {
      const error = new Error('Access denied: You are not a member of this conversation');
      error.code = 'NOT_CONVERSATION_MEMBER';
      throw error;
    }

    const existingStar = await StarredMessage.findOne({ userId, messageId });
    if (existingStar) {
      await StarredMessage.deleteOne({ _id: existingStar._id });
      return { isStarred: false, messageId };
    } else {
      await StarredMessage.create({
        userId,
        messageId,
        conversationId: message.conversationId,
      });
      return { isStarred: true, messageId };
    }
  }

  // getStarredMessages: Fetches all starred messages for the current user.
  async getStarredMessages(userId) {
    const starredDocs = await StarredMessage.find({ userId }).lean();
    const messageIds = starredDocs.map((doc) => doc.messageId);

    const messages = await Message.find({ _id: { $in: messageIds } }).lean();
    return messages;
  }
}
