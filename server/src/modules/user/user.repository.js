export class UserRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  // findById: Retrieves a user (with their Profile row) by UUID if not soft-deleted.
  async findById(id) {
    return this.prisma.user.findUnique({
      where: { id, deletedAt: null },
      include: { profile: true }
    });
  }

  // findByUsername: Retrieves a user by their unique username if they are not soft-deleted.
  async findByUsername(username) {
    return this.prisma.user.findUnique({
      where: { username, deletedAt: null }
    });
  }

  // updateProfile: Updates identity fields (username, name) on User and display
  // fields (bio, avatarUrl, statusText) on the related Profile row in one call.
  async updateProfile(id, { username, name, bio, avatarUrl, statusText }) {
    const userData = {};
    if (username !== undefined) userData.username = username;
    if (name !== undefined) userData.name = name;

    const profileData = {};
    if (bio !== undefined) profileData.bio = bio;
    if (avatarUrl !== undefined) profileData.avatarUrl = avatarUrl;
    if (statusText !== undefined) profileData.statusText = statusText;

    return this.prisma.user.update({
      where: { id },
      data: {
        ...userData,
        ...(Object.keys(profileData).length > 0 ? { profile: { update: profileData } } : {})
      },
      include: { profile: true }
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
        lastSeenAt: true,
        createdAt: true,
        profile: {
          select: { avatarUrl: true, bio: true, statusText: true }
        }
      }
    });
  }
}
