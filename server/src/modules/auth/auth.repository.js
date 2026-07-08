// AuthRepository: Performs database queries directly via Prisma Client.
// It abstracts Postgres operations so the service layer doesn't need to know the database structure.
export class AuthRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  // findUserByEmail: Queries the database for a user matching a unique email address.
  async findUserByEmail(email) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  // findUserById: Queries the database for a user matching a unique UUID.
  async findUserById(id) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  // createUser: Inserts a new unverified user row with hashed password details.
  async createUser({ username, email, passwordHash }) {
    return this.prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        isVerified: false,
      },
    });
  }

  // verifyUser: Sets the isVerified flag of a user to true after successful OTP verification.
  async verifyUser(id) {
    return this.prisma.user.update({
      where: { id },
      data: { isVerified: true },
    });
  }

  // findDeviceById: Checks if a logged-in device session exists in the database.
  async findDeviceById(id) {
    return this.prisma.device.findUnique({
      where: { id },
    });
  }

  // upsertDevice: Registers or updates a device active status in the database.
  // If the device already exists, it updates userId, type, and last active timestamp.
  // If it's a new device, it inserts it.
  async upsertDevice({ deviceId, userId, deviceType }) {
    return this.prisma.device.upsert({
      where: { id: deviceId },
      update: {
        userId,
        deviceType,
        lastActiveAt: new Date(),
      },
      create: {
        id: deviceId,
        userId,
        deviceType,
      },
    });
  }

  // deleteDevice: Removes a device session from the database.
  // Catches and ignores the Prisma RecordNotFound (P2025) error if device is already deleted.
  async deleteDevice(deviceId) {
    try {
      return await this.prisma.device.delete({
        where: { id: deviceId },
      });
    } catch (err) {
      if (err.code !== 'P2025') {
        throw err;
      }
    }
  }
}

