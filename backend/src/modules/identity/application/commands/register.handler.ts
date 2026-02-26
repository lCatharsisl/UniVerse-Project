import { IdentityService } from '../../infrastructure/identity.service';

export class RegisterHandler {
  static async execute(data: any) {
    return await IdentityService.register(data);
  }
}
