import { IdentityService } from '../../infrastructure/identity.service';

export class UpdateProfileHandler {
  static async execute(userId: number, data: any) {
    const result = await IdentityService.updateProfile(userId, data);
    return result;
  }
}
