import { verifyAccessToken } from '../../utils/jwt.util.js';

// registerMessagingSockets: Binds Socket.io event listeners for real-time chat,
// authentication, conversation room joining, message delivery, and read receipts.
export function registerMessagingSockets(io, messagingService) {
  if (!io) return;

  // Socket Authentication Middleware
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    try {
      const payload = verifyAccessToken(token);
      socket.user = payload;
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', async (socket) => {
    const { userId } = socket.user;

    // Auto-join personal user room for direct alerts
    socket.join(`user:${userId}`);

    // Auto-join rooms for all conversations where user is a member
    try {
      const userConversations = await messagingService.getUserConversations(userId);
      userConversations.forEach((conv) => {
        socket.join(`conversation:${conv.id}`);
      });
    } catch (err) {
      console.error(`Failed to join conversation rooms for user ${userId}:`, err);
    }

    // Event: send_message (Real-time message send & broadcast)
    socket.on('send_message', async (data, ack) => {
      try {
        const { conversationId, content, type = 'TEXT', metadata = {} } = data;

        const message = await messagingService.sendMessage({
          conversationId,
          senderId: userId,
          content,
          type,
          metadata,
        });

        // Broadcast new_message event to all connected clients in the conversation room
        io.to(`conversation:${conversationId}`).emit('new_message', message);

        if (typeof ack === 'function') {
          ack({ success: true, message });
        }
      } catch (err) {
        if (typeof ack === 'function') {
          ack({ success: false, error: err.message, code: err.code || 'MESSAGE_SEND_FAILED' });
        }
      }
    });

    // Event: join_conversation (Explicit join room request)
    socket.on('join_conversation', (data) => {
      const { conversationId } = data;
      if (conversationId) {
        socket.join(`conversation:${conversationId}`);
      }
    });

    // Event: mark_read (Real-time read receipt emission)
    socket.on('mark_read', async (data) => {
      try {
        const { conversationId } = data;
        await messagingService.markAsRead({ conversationId, userId });

        socket.to(`conversation:${conversationId}`).emit('read_receipt', {
          conversationId,
          userId,
          readAt: new Date(),
        });
      } catch (err) {
        console.error('Failed to process mark_read socket event:', err);
      }
    });

    // Event: typing_start (Broadcast typing indicator to conversation room)
    socket.on('typing_start', (data) => {
      const { conversationId } = data;
      if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit('user_typing', {
          conversationId,
          userId,
        });
      }
    });

    // Event: typing_stop (Broadcast stopped typing indicator)
    socket.on('typing_stop', (data) => {
      const { conversationId } = data;
      if (conversationId) {
        socket.to(`conversation:${conversationId}`).emit('user_stopped_typing', {
          conversationId,
          userId,
        });
      }
    });

    // Event: react_message (Real-time emoji reaction toggle)
    socket.on('react_message', async (data, ack) => {
      try {
        const { messageId, emoji } = data;
        const updatedMessage = await messagingService.reactToMessage({
          messageId,
          userId,
          emoji,
        });

        io.to(`conversation:${updatedMessage.conversationId}`).emit('message_reacted', {
          messageId: updatedMessage._id,
          conversationId: updatedMessage.conversationId,
          reactions: updatedMessage.reactions,
        });

        if (typeof ack === 'function') {
          ack({ success: true, reactions: updatedMessage.reactions });
        }
      } catch (err) {
        if (typeof ack === 'function') {
          ack({ success: false, error: err.message });
        }
      }
    });
  });
}
