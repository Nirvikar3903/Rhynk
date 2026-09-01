// createDirectSchema: Validates request body to start or retrieve a 1-on-1 direct message chat.
export const createDirectSchema = {
  body: {
    type: 'object',
    properties: {
      recipient: { type: 'string', minLength: 1 },
      recipientUserId: { type: 'string', minLength: 1 },
    },
  },
};

// createGroupSchema: Validates request body to create a multi-user group chat.
export const createGroupSchema = {
  body: {
    type: 'object',
    required: ['name', 'memberUserIds'],
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 50 },
      avatarUrl: { type: 'string', maxLength: 500 },
      memberUserIds: {
        type: 'array',
        items: { type: 'string', minLength: 1 },
        minItems: 1,
      },
    },
  },
};

// getMessagesSchema: Validates query params for fetching paginated messages in a conversation.
export const getMessagesSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1 },
    },
  },
  querystring: {
    type: 'object',
    properties: {
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 30 },
      before: { type: 'string' },
    },
  },
};

// sendMessageSchema: Validates HTTP payload for sending a message.
export const sendMessageSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1 },
    },
  },
  body: {
    type: 'object',
    required: ['content'],
    properties: {
      content: { type: 'string', minLength: 1 },
      type: { type: 'string', enum: ['TEXT', 'IMAGE', 'AUDIO', 'VIDEO', 'FILE', 'SYSTEM'], default: 'TEXT' },
      metadata: { type: 'object' },
    },
  },
};

// markReadSchema: Validates params for updating read receipts.
export const markReadSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1 },
    },
  },
};

// reactMessageSchema: Validates request body to toggle an emoji reaction.
export const reactMessageSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1 },
    },
  },
  body: {
    type: 'object',
    required: ['emoji'],
    properties: {
      emoji: { type: 'string', minLength: 1, maxLength: 10 },
    },
  },
};

// updateSettingsSchema: Validates request body to update conversation settings (pin/mute/archive).
export const updateSettingsSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1 },
    },
  },
  body: {
    type: 'object',
    properties: {
      isPinned: { type: 'boolean' },
      isMuted: { type: 'boolean' },
      isArchived: { type: 'boolean' },
    },
  },
};

// starMessageSchema: Validates params for starring/unstarring a message.
export const starMessageSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', minLength: 1 },
    },
  },
};
