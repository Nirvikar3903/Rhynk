import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
    senderId: {
      type: String,
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'FILE', 'SYSTEM'],
      default: 'TEXT',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    reactions: [
      {
        userId: { type: String, required: true },
        emoji: { type: String, required: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Compound index for fast paginated chat history retrieval
messageSchema.index({ conversationId: 1, createdAt: -1 });

export const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);

const starredMessageSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    messageId: {
      type: String,
      required: true,
      index: true,
    },
    conversationId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

starredMessageSchema.index({ userId: 1, messageId: 1 }, { unique: true });

export const StarredMessage =
  mongoose.models.StarredMessage || mongoose.model('StarredMessage', starredMessageSchema);
