import { query, queryOne, transaction } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import type {
  CreateLostItemRequest,
  CreateFoundItemRequest,
  LostItemsQuery,
  FoundItemsQuery,
} from '../validators/lostFound.js';

interface LostItemRow {
  lost_item_id: number;
  lost_item_name: string;
  user_id: number | null;
  location: string | null;
  description: string | null;
  lost_date: Date | null;
  is_resolved: boolean;
  resolved_at: Date | null;
}

interface FoundItemRow {
  found_item_id: number;
  found_item_name: string;
  user_id: number | null;
  location: string | null;
  description: string | null;
  found_date: Date | null;
  is_resolved: boolean;
  resolved_at: Date | null;
}

export class LostFoundService {
  static async createLostItem(
    userId: number,
    data: CreateLostItemRequest,
    imageUrls: string[] = []
  ): Promise<LostItemRow> {
    const lostDate = data.lostDate
      ? new Date(data.lostDate)
      : new Date();

    return transaction(async (client) => {
      const result = await client.query<LostItemRow>(
        `INSERT INTO lost_items 
         (lost_item_name, user_id, location, description, lost_date, is_resolved)
         VALUES ($1, $2, $3, $4, $5, false)
         RETURNING *`,
        [data.lostItemName, userId, data.location, data.description || null, lostDate]
      );

      if (result.rows.length === 0) {
        throw new AppError(500, 'Failed to create lost item');
      }

      const item = result.rows[0];

      // Insert images
      if (imageUrls.length > 0) {
        for (const url of imageUrls) {
          await client.query(
            `INSERT INTO lost_item_images (lost_item_id, image_url) VALUES ($1, $2)`,
            [item.lost_item_id, url]
          );
        }
      }

      return item;
    });
  }

  static async createFoundItem(
    userId: number,
    data: CreateFoundItemRequest,
    imageUrls: string[] = []
  ): Promise<FoundItemRow> {
    const foundDate = data.foundDate
      ? new Date(data.foundDate)
      : new Date();

    return transaction(async (client) => {
      const result = await client.query<FoundItemRow>(
        `INSERT INTO found_items 
         (found_item_name, user_id, location, description, found_date, is_resolved)
         VALUES ($1, $2, $3, $4, $5, false)
         RETURNING *`,
        [data.foundItemName, userId, data.location, data.description || null, foundDate]
      );

      if (result.rows.length === 0) {
        throw new AppError(500, 'Failed to create found item');
      }

      const item = result.rows[0];

      // Insert images
      if (imageUrls.length > 0) {
        for (const url of imageUrls) {
          await client.query(
            `INSERT INTO found_item_images (found_item_id, image_url) VALUES ($1, $2)`,
            [item.found_item_id, url]
          );
        }
      }

      return item;
    });
  }

  static async getLostItems(
    queryParams: LostItemsQuery
  ): Promise<{ items: LostItemRow[]; total: number }> {
    const { location, isResolved, startDate, endDate, limit, offset } = queryParams;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (location) {
      conditions.push(`location ILIKE $${paramIndex}`);
      params.push(`%${location}%`);
      paramIndex++;
    }

    if (isResolved !== undefined) {
      conditions.push(`is_resolved = $${paramIndex}`);
      params.push(isResolved);
      paramIndex++;
    }

    if (startDate) {
      conditions.push(`lost_date >= $${paramIndex}`);
      params.push(new Date(startDate));
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`lost_date <= $${paramIndex}`);
      params.push(new Date(endDate));
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const items = await query<LostItemRow & { poster_email?: string }>(
      `SELECT li.*, u.email as poster_email FROM lost_items li
       LEFT JOIN users u ON u.user_id = li.user_id
       ${whereClause}
       ORDER BY li.lost_date DESC NULLS LAST, li.lost_item_id DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM lost_items ${whereClause}`,
      params
    );

    const total = parseInt(countResult?.count || '0', 10);

    // Attach thumbnail image
    const itemsWithImages = await Promise.all(items.map(async (item) => {
      const images = await query<{ image_url: string }>(
        'SELECT image_url FROM lost_item_images WHERE lost_item_id = $1 LIMIT 1',
        [item.lost_item_id]
      );
      return { ...item, imageUrl: images[0]?.image_url };
    }));

    return { items: itemsWithImages, total };
  }

  static async getFoundItems(
    queryParams: FoundItemsQuery
  ): Promise<{ items: FoundItemRow[]; total: number }> {
    const { location, isResolved, startDate, endDate, limit, offset } = queryParams;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (location) {
      conditions.push(`location ILIKE $${paramIndex}`);
      params.push(`%${location}%`);
      paramIndex++;
    }

    if (isResolved !== undefined) {
      conditions.push(`is_resolved = $${paramIndex}`);
      params.push(isResolved);
      paramIndex++;
    }

    if (startDate) {
      conditions.push(`found_date >= $${paramIndex}`);
      params.push(new Date(startDate));
      paramIndex++;
    }

    if (endDate) {
      conditions.push(`found_date <= $${paramIndex}`);
      params.push(new Date(endDate));
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const items = await query<FoundItemRow & { poster_email?: string }>(
      `SELECT fi.*, u.email as poster_email FROM found_items fi
       LEFT JOIN users u ON u.user_id = fi.user_id
       ${whereClause}
       ORDER BY fi.found_date DESC NULLS LAST, fi.found_item_id DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM found_items ${whereClause}`,
      params
    );

    const total = parseInt(countResult?.count || '0', 10);

    // Attach thumbnail image
    const itemsWithImages = await Promise.all(items.map(async (item) => {
      const images = await query<{ image_url: string }>(
        'SELECT image_url FROM found_item_images WHERE found_item_id = $1 LIMIT 1',
        [item.found_item_id]
      );
      return { ...item, imageUrl: images[0]?.image_url };
    }));

    return { items: itemsWithImages, total };
  }

  static async resolveLostItem(itemId: number, resolvedByUserId: number): Promise<void> {
    const item = await queryOne<LostItemRow>(
      'SELECT * FROM lost_items WHERE lost_item_id = $1',
      [itemId]
    );

    if (!item) {
      throw new AppError(404, 'Lost item not found');
    }

    if (item.is_resolved) {
      throw new AppError(400, 'Item is already resolved');
    }

    await query(
      `UPDATE lost_items
       SET is_resolved = true,
           resolved_at = NOW(),
           resolved_by_user_id = $1
       WHERE lost_item_id = $2`,
      [resolvedByUserId, itemId]
    );
  }

  static async resolveFoundItem(itemId: number, resolvedByUserId: number): Promise<void> {
    const item = await queryOne<FoundItemRow>(
      'SELECT * FROM found_items WHERE found_item_id = $1',
      [itemId]
    );

    if (!item) {
      throw new AppError(404, 'Found item not found');
    }

    if (item.is_resolved) {
      throw new AppError(400, 'Item is already resolved');
    }

    await query(
      `UPDATE found_items
       SET is_resolved = true,
           resolved_at = NOW(),
           resolved_by_user_id = $1
       WHERE found_item_id = $2`,
      [resolvedByUserId, itemId]
    );
  }
  static async addComment(
    userId: number,
    itemType: 'lost' | 'found',
    itemId: number,
    content: string
  ): Promise<void> {
    await query(
      `INSERT INTO item_comments (user_id, item_type, item_id, content) VALUES ($1, $2, $3, $4)`,
      [userId, itemType, itemId, content]
    );
  }

  static async getComments(
    itemType: 'lost' | 'found',
    itemId: number
  ): Promise<any[]> {
    return query(
      `SELECT c.*, u.email 
       FROM item_comments c
       JOIN users u ON u.user_id = c.user_id
       WHERE c.item_type = $1 AND c.item_id = $2
       ORDER BY c.created_at ASC`,
      [itemType, itemId]
    );
  }

  static async getItemImages(
    itemType: 'lost' | 'found',
    itemId: number
  ): Promise<string[]> {
    const table = itemType === 'lost' ? 'lost_item_images' : 'found_item_images';
    const idColumn = itemType === 'lost' ? 'lost_item_id' : 'found_item_id';

    const images = await query<{ image_url: string }>(
      `SELECT image_url FROM ${table} WHERE ${idColumn} = $1`,
      [itemId]
    );

    return images.map(img => img.image_url);
  }
}


