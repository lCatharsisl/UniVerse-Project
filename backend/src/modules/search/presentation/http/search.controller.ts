import { Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../../../../middleware/auth';
import { searchAll } from '../../infrastructure/search.service';

const searchQuerySchema = z.object({
  q: z.string().min(1, 'q required').max(200),
  type: z.enum(['top', 'users', 'posts', 'communities']).default('top'),
  sort: z.enum(['relevance', 'latest']).default('relevance'),
  limit: z.coerce.number().int().min(1).max(30).default(10),
  cursor: z.string().max(200).optional(),
});

export class SearchController {
  static async getSearch(req: AuthenticatedRequest, res: Response) {
    const userId = req.userId;
    if (userId == null) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parsed = searchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: parsed.error.issues[0]?.message || 'Invalid query' });
    }

    const { q, type, sort, limit, cursor } = parsed.data;
    try {
      const result = await searchAll({
        viewerUserId: userId,
        q,
        type,
        sort,
        limit,
        cursor,
      });

      if ('error' in result) {
        if (result.error === 'EMPTY_QUERY') {
          return res.status(400).json({ error: 'Search query (q) is required' });
        }
        if (result.error === 'INVALID_TYPE') {
          return res.status(400).json({ error: 'Invalid type' });
        }
      }

      return res.json(result);
    } catch (e) {
      const err = e as Error;
      console.error('[search]', err.message, err.stack);
      return res.status(500).json({
        error:
          process.env.NODE_ENV === 'development'
            ? `Search error: ${err.message}`
            : 'Search failed. Try again.',
      });
    }
  }
}
