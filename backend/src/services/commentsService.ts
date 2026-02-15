import { query } from '../config/db.js';
import { NotFoundError } from '../errors/customErrors.js';

export class CommentsService {
  /**
   * Add a comment to a lost or found item
   */
  static async addComment(
    userId: number,
    itemType: 'lost' | 'found',
    itemId: number,
    content: string
  ): Promise<void> {
    // Verify item exists
    const itemTable = itemType === 'lost' ? 'lost_items' : 'found_items';
    const itemIdCol = itemType === 'lost' ? 'lost_item_id' : 'found_item_id';
    
    const itemCheck = await query(
      `SELECT ${itemIdCol} FROM ${itemTable} WHERE ${itemIdCol} = $1 AND deleted_at IS NULL`,
      [itemId]
    );

    if (itemCheck.rows.length === 0) {
      throw new NotFoundError(`${itemType} item`);
    }

    // Insert comment
    await query(
      `INSERT INTO item_comments (user_id, item_type, item_id, content)
       VALUES ($1, $2, $3, $4)`,
      [userId, itemType, itemId, content]
    );
  }

  /**
   * Get all comments for an item
   */
  static async getComments(itemType: 'lost' | 'found', itemId: number): Promise<any[]> {
    const result = await query(
      `SELECT 
        ic.comment_id,
        ic.content,
        ic.created_at,
        ic.user_id,
        u.email as user_email
       FROM item_comments ic
       JOIN users u ON u.user_id = ic.user_id
       WHERE ic.item_type = $1 AND ic.item_id = $2
       ORDER BY ic.created_at DESC`,
      [itemType, itemId]
    );

    return result.rows;
  }

  /**
   * Delete a comment (only by owner or admin)
   */
  static async deleteComment(commentId: number, userId: number, userRole: string): Promise<void> {
    // Get comment
    const commentResult = await query(
      'SELECT user_id FROM item_comments WHERE comment_id = $1',
      [commentId]
    );

    if (commentResult.rows.length === 0) {
      throw new NotFoundError('Comment');
    }

    const comment = commentResult.rows[0];

    // Check ownership or admin
    if (comment.user_id !== userId && userRole !== 'admin') {
      throw new Error('Forbidden: You can only delete your own comments');
    }

    // Delete comment
    await query('DELETE FROM item_comments WHERE comment_id = $1', [commentId]);
  }

  /**
   * Get user's comment count
   */
  static async getUserCommentCount(userId: number): Promise<number> {
    const result = await query(
      'SELECT COUNT(*) as count FROM item_comments WHERE user_id = $1',
      [userId]
    );

    return parseInt(result.rows[0].count);
  }
}
