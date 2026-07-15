export class UserService {
  constructor(repository) {
    this.repository = repository;
  }

  // getMe: Retrieves the full private profile of the currently logged-in user.
  async getMe(userId) {
    const user = await this.repository.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.code = 'USER_NOT_FOUND';
      throw error;
    }
    // Omit sensitive credential fields
    const { passwordHash, googleId, deletedAt, ...profile } = user;
    return profile;
  }

  // updateProfile: Updates the user's profile information. Checks username availability if changed.
  async updateProfile(userId, updateData) {
    if (updateData.username) {
      const existing = await this.repository.findByUsername(updateData.username);
      if (existing && existing.id !== userId) {
        const error = new Error('Username is already taken');
        error.code = 'USERNAME_TAKEN';
        throw error;
      }
    }

    const updatedUser = await this.repository.updateProfile(userId, updateData);
    const { passwordHash, googleId, deletedAt, ...profile } = updatedUser;
    return profile;
  }

  // getPublicProfile: Retrieves only non-sensitive public details of another user.
  async getPublicProfile(userId) {
    const user = await this.repository.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      statusText: user.statusText,
      lastSeenAt: user.lastSeenAt,
      createdAt: user.createdAt
    };
  }

  // searchUsers: Searches for users matching a query prefix.
  async searchUsers(query) {
    if (!query || query.trim() === '') {
      return [];
    }
    return this.repository.searchUsers(query.trim());
  }
}
