import { IdentityService } from '../../infrastructure/identity.service';

export class LoginHandler {
  static async execute(email: string, password: string) {
    return await IdentityService.login(email, password);
  }
}
