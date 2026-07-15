// updateProfileSchema: Validation for patching user profile fields.
export const updateProfileSchema = {
  body: {
    type: 'object',
    properties: {
      username: { type: 'string', minLength: 3, maxLength: 30, pattern: '^[a-zA-Z0-9_]+$' },
      name: { type: 'string', minLength: 1, maxLength: 50, nullable: true },
      bio: { type: 'string', maxLength: 160, nullable: true },
      avatarUrl: { type: 'string', nullable: true },
      statusText: { type: 'string', maxLength: 100, nullable: true }
    },
    additionalProperties: false
  }
};

// getPublicProfileSchema: Validation for verifying UUID path parameters.
export const getPublicProfileSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', pattern: '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' }
    }
  }
};

// searchUsersSchema: Validation for verifying the query string query prefix.
export const searchUsersSchema = {
  querystring: {
    type: 'object',
    required: ['q'],
    properties: {
      q: { type: 'string', minLength: 1 }
    }
  }
};
