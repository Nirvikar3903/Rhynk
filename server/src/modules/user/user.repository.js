export class UserRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  // findById: Retrieves a user by their UUID if they are not soft-deleted.
  async findById(id) {
    return this.prisma.user.findUnique({
      where: { id, deletedAt: null }
    });
  }

  // findByUsername: Retrieves a user by their unique username if they are not soft-deleted.
  async findByUsername(username) {
    return this.prisma.user.findUnique({
      where: { username, deletedAt: null }
    });
  }

  // updateProfile: Updates user record fields (e.g. bio, avatarUrl, statusText).
  async updateProfile(id, data) {
    return this.prisma.user.update({
      where: { id },
      data
    });
  }

  // searchUsers: Performs case-insensitive search by username prefix or name match.
  async searchUsers(query, limit = 20) {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        OR: [
          { username: { startsWith: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: limit,
      select: {
        id: true,
        username: true,
        name: true,
        avatarUrl: true,
        bio: true,
        statusText: true,
        lastSeenAt: true,
        createdAt: true
      }
    });
  }
}
