import { successResponse } from '../../utils/apiResponse.js';

export class UserController {
  constructor(userService) {
    this.userService = userService;
  }

  // getMe: Returns the profile data of the authenticated caller.
  getMe = async (request, reply) => {
    const { userId } = request.user;
    const result = await this.userService.getMe(userId);
    return reply.code(200).send(successResponse(result, 'Profile retrieved successfully'));
  };

  // updateProfile: Patches the authenticated caller's profile attributes.
  updateProfile = async (request, reply) => {
    const { userId } = request.user;
    const result = await this.userService.updateProfile(userId, request.body);
    return reply.code(200).send(successResponse(result, 'Profile updated successfully'));
  };

  // getPublicProfile: Returns public profile information of a specified user ID.
  getPublicProfile = async (request, reply) => {
    const { id } = request.params;
    const result = await this.userService.getPublicProfile(id);
    return reply.code(200).send(successResponse(result, 'Public profile retrieved successfully'));
  };

  // searchUsers: Performs a case-insensitive search by username prefix query.
  searchUsers = async (request, reply) => {
    const { q } = request.query;
    const result = await this.userService.searchUsers(q);
    return reply.code(200).send(successResponse(result, 'Users search completed successfully'));
  };
}
