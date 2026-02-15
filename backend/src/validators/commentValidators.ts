import { z } from 'zod';

/**
 * Create Comment Schema
 */
export const createCommentSchema = z.object({
  content: z.string()
    .min(1, 'Comment cannot be empty')
    .max(500, 'Comment too long (max 500 characters)')
    .trim(),
});

/**
 * Comment Params Schema
 */
export const commentParamsSchema = z.object({
  type: z.enum(['lost', 'found']),
  id: z.string().regex(/^\d+$/, 'Invalid item ID'),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type CommentParams = z.infer<typeof commentParamsSchema>;
