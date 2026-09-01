// MessagingRepository: Performs PostgreSQL queries via Prisma Client for Conversations and Memberships.
export class MessagingRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  // findUserByIdentifier: Finds a user by ID, username, or email address (case-insensitive).
  async findUserByIdentifier(identifier) {
    return this.prisma.user.findFirst({
      where: {
        OR: [
          { id: identifier },
          { username: { equals: identifier, mode: 'insensitive' } },
          { email: { equals: identifier, mode: 'insensitive' } },
        ],
      },
    });
  }

  // findDirectConversation: Checks if a 1-on-1 direct conversation already exists between two users.
  async findDirectConversation(userAId, userBId) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        type: 'DIRECT',
        AND: [
          { members: { some: { userId: userAId } } },
          { members: { some: { userId: userBId } } },
        ],
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                isVerified: true,
                profile: {
                  select: { avatarUrl: true, bio: true, statusText: true },
                },
              },
            },
          },
        },
      },
    });

    return conversations.length > 0 ? conversations[0] : null;
  }

  // createDirectConversation: Inserts a new 1-on-1 conversation row with members.
  async createDirectConversation(userAId, userBId) {
    return this.prisma.conversation.create({
      data: {
        type: 'DIRECT',
        createdBy: userAId,
        members: {
          create: [
            { userId: userAId, role: 'MEMBER' },
            { userId: userBId, role: 'MEMBER' },
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                isVerified: true,
                profile: {
                  select: { avatarUrl: true, bio: true, statusText: true },
                },
              },
            },
          },
        },
      },
    });
  }

  // createGroupConversation: Inserts a new GROUP conversation with creator as ADMIN and list of members.
  async createGroupConversation({ name, avatarUrl, createdBy, memberUserIds }) {
    const uniqueMemberIds = Array.from(new Set([createdBy, ...memberUserIds]));

    const memberData = uniqueMemberIds.map((userId) => ({
      userId,
      role: userId === createdBy ? 'ADMIN' : 'MEMBER',
    }));

    return this.prisma.conversation.create({
      data: {
        type: 'GROUP',
        name,
        avatarUrl: avatarUrl || null,
        createdBy,
        members: {
          create: memberData,
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                isVerified: true,
                profile: {
                  select: { avatarUrl: true, bio: true, statusText: true },
                },
              },
            },
          },
        },
      },
    });
  }

  // getUserConversations: Fetches all conversations where the user is a member.
  async getUserConversations(userId) {
    return this.prisma.conversation.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                isVerified: true,
                profile: {
                  select: { avatarUrl: true, bio: true, statusText: true },
                },
              },
            },
          },
        },
      },
    });
  }

  // findConversationById: Retrieves a specific conversation with member metadata.
  async findConversationById(conversationId) {
    return this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                isVerified: true,
                profile: {
                  select: { avatarUrl: true, bio: true, statusText: true },
                },
              },
            },
          },
        },
      },
    });
  }

  // isMember: Fast query to check if a user is an active member of a conversation.
  async isMember(conversationId, userId) {
    const member = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });
    return !!member;
  }

  // updateLastRead: Updates lastReadAt timestamp for read receipts.
  async updateLastRead(conversationId, userId) {
    return this.prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    });
  }

  // updateMemberSettings: Updates isPinned, isMuted, and isArchived settings for a conversation member.
  async updateMemberSettings(conversationId, userId, settingsData) {
    const dataToUpdate = {};
    if (typeof settingsData.isPinned === 'boolean') dataToUpdate.isPinned = settingsData.isPinned;
    if (typeof settingsData.isMuted === 'boolean') dataToUpdate.isMuted = settingsData.isMuted;
    if (typeof settingsData.isArchived === 'boolean') dataToUpdate.isArchived = settingsData.isArchived;

    return this.prisma.conversationMember.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: dataToUpdate,
    });
  }
}
