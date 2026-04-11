import { SocialService } from '../../infrastructure/social.service';
import { Result } from '../../../../shared/core/result';

export class CreatePostHandler {
  static async execute(userId: number, data: { content: string }, imageUrl?: string) {
    try {
      const trimmed = (data.content ?? '').trim();
      if (!trimmed && !imageUrl) {
        return Result.fail('Post content cannot be empty');
      }
      const post = await SocialService.createPost(userId, trimmed, imageUrl);
      return Result.ok(post);
    } catch (error: any) {
      return Result.fail(error.message || 'Failed to create post');
    }
  }
}
