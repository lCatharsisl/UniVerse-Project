import { query, queryOne } from '../../../config/db';
import { AppError } from '../../../shared/core/errors';

export class SocialService {
  static async addComment(userId: number, itemId: number, itemType: string, content: string) {
    await query(
      'INSERT INTO item_comments (user_id, item_type, item_id, content) VALUES ($1, $2, $3, $4)',
      [userId, itemType, itemId, content]
    );
    return { success: true };
  }

  static async getComments(itemType: string, itemId: number) {
    const rows = await query(
      `SELECT c.*, u.email FROM item_comments c JOIN users u ON u.user_id = c.user_id 
       WHERE c.item_type = $1 AND c.item_id = $2 ORDER BY c.created_at ASC`,
      [itemType, itemId]
    );
    return rows;
  }

  static async createPost(userId: number, content: string, imageUrl?: string) {
    const result = await queryOne<any>(
      `INSERT INTO posts (user_id, content, image_url)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, content, imageUrl || null]
    );
    return result;
  }

  static async deletePost(postId: number, userId: number) {
    const post = await queryOne<{ user_id: number }>('SELECT user_id FROM posts WHERE post_id = $1', [postId]);
    if (!post) throw AppError.notFound('Post not found');
    if (post.user_id !== userId) throw AppError.forbidden('You can only delete your own posts');

    await query('DELETE FROM posts WHERE post_id = $1', [postId]);
  }

  static async toggleLike(postId: number, userId: number) {
    const existing = await queryOne('SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2', [postId, userId]);
    if (existing) {
      await query('DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2', [postId, userId]);
      return { action: 'unliked' };
    } else {
      await query('INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)', [postId, userId]);
      return { action: 'liked' };
    }
  }

  static async toggleRepost(postId: number, userId: number) {
    const existing = await queryOne('SELECT 1 FROM post_reposts WHERE post_id = $1 AND user_id = $2', [postId, userId]);
    if (existing) {
      await query('DELETE FROM post_reposts WHERE post_id = $1 AND user_id = $2', [postId, userId]);
      return { action: 'unreposted' };
    } else {
      await query('INSERT INTO post_reposts (post_id, user_id) VALUES ($1, $2)', [postId, userId]);
      return { action: 'reposted' };
    }
  }

  static async getFeedItems(currentUserId: number, type: 'feed' | 'user_posts' | 'user_likes' | 'user_reposts', targetUserId?: number, limit = 20, offset = 0) {
    const params: any[] = [currentUserId, limit, offset];
    let sql = '';
    let countSql = '';
    let countParams: any[] = [];

    if (type === 'feed') {
      // Timeline consists of original posts AND reposts
      sql = `
        SELECT * FROM (
          -- Original Posts
          SELECT 
            p.post_id, p.user_id, p.content, p.image_url, p.created_at,
            u.email, u.role,
            COALESCE(s.student_name, st.staff_name, a.admin_name, c.community_name) as first_name,
            COALESCE(s.student_surname, st.staff_surname, a.admin_surname) as last_name,
            NULL::text as reposter_name, NULL::text as reposter_email, NULL::int as reposter_id,
            p.created_at as sorted_at
          FROM posts p
          JOIN users u ON u.user_id = p.user_id
          LEFT JOIN students s ON s.user_id = u.user_id
          LEFT JOIN staff st ON st.user_id = u.user_id
          LEFT JOIN admins a ON a.user_id = u.user_id
          LEFT JOIN communities c ON c.user_id = u.user_id

          UNION ALL

          -- Reposts
          SELECT 
            p.post_id, p.user_id, p.content, p.image_url, p.created_at,
            u.email, u.role,
            COALESCE(s.student_name, st.staff_name, a.admin_name, c.community_name) as first_name,
            COALESCE(s.student_surname, st.staff_surname, a.admin_surname) as last_name,
            COALESCE(rs.student_name, rst.staff_name, ra.admin_name, rc.community_name, ru.email) as reposter_name,
            ru.email as reposter_email,
            pr.user_id as reposter_id,
            pr.created_at as sorted_at
          FROM post_reposts pr
          JOIN posts p ON p.post_id = pr.post_id
          JOIN users u ON u.user_id = p.user_id
          JOIN users ru ON ru.user_id = pr.user_id
          LEFT JOIN students s ON s.user_id = u.user_id
          LEFT JOIN staff st ON st.user_id = u.user_id
          LEFT JOIN admins a ON a.user_id = u.user_id
          LEFT JOIN communities c ON c.user_id = u.user_id
          -- Reposter joins
          LEFT JOIN students rs ON rs.user_id = ru.user_id
          LEFT JOIN staff rst ON rst.user_id = ru.user_id
          LEFT JOIN admins ra ON ra.user_id = ru.user_id
          LEFT JOIN communities rc ON rc.user_id = ru.user_id
        ) combined
        ORDER BY sorted_at DESC
        LIMIT $2 OFFSET $3
      `;
      // Count for feed
      countSql = `
        SELECT (SELECT COUNT(*) FROM posts) + (SELECT COUNT(*) FROM post_reposts) as total
      `;
      countParams = [];
    } else {
      // Profile activity tabs
      let whereClause = '';
      let fromClause = 'FROM posts p';
      const targetUserIdIdx = 4;
      params.push(targetUserId);

      if (type === 'user_posts') {
        whereClause = `WHERE p.user_id = $${targetUserIdIdx}`;
      } else if (type === 'user_likes') {
        fromClause += ` JOIN post_likes pl2 ON pl2.post_id = p.post_id`;
        whereClause = `WHERE pl2.user_id = $${targetUserIdIdx}`;
      } else if (type === 'user_reposts') {
        fromClause += ` JOIN post_reposts pr2 ON pr2.post_id = p.post_id`;
        whereClause = `WHERE pr2.user_id = $${targetUserIdIdx}`;
      }

      sql = `
        SELECT 
          p.*,
          u.email,
          u.role,
          COALESCE(s.student_name, st.staff_name, a.admin_name, c.community_name) as first_name,
          COALESCE(s.student_surname, st.staff_surname, a.admin_surname) as last_name,
          NULL::text as reposter_name, NULL::text as reposter_email, NULL::int as reposter_id,
          p.created_at as sorted_at
        ${fromClause}
        JOIN users u ON u.user_id = p.user_id
        LEFT JOIN students s ON s.user_id = u.user_id
        LEFT JOIN staff st ON st.user_id = u.user_id
        LEFT JOIN admins a ON a.user_id = u.user_id
        LEFT JOIN communities c ON c.user_id = u.user_id
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT $2 OFFSET $3
      `;

      countSql = `SELECT COUNT(*) as total ${fromClause} ${whereClause.replace('$4', '$1')}`;
      countParams = [targetUserId];
    }

    // Common Interaction subqueries
    const finalSql = `
      SELECT 
        q.*,
        (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = q.post_id) as likes_count,
        (SELECT COUNT(*) FROM post_reposts pr WHERE pr.post_id = q.post_id) as reposts_count,
        (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = q.post_id) as comments_count,
        EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = q.post_id AND pl.user_id = $1) as has_liked,
        EXISTS(SELECT 1 FROM post_reposts pr WHERE pr.post_id = q.post_id AND pr.user_id = $1) as has_reposted
      FROM (${sql}) q
      ORDER BY q.sorted_at DESC
    `;

    const items = await query(finalSql, params);
    const totalRow = await queryOne<{total: string}>(countSql, countParams);
    
    return {
      items,
      total: parseInt(totalRow?.total || '0', 10)
    };
  }

  static async addPostComment(userId: number, postId: number, content: string) {
    const result = await queryOne(
      'INSERT INTO post_comments (user_id, post_id, content) VALUES ($1, $2, $3) RETURNING *',
      [userId, postId, content]
    );
    return result;
  }

  static async getPostComments(postId: number) {
    return await query(`
      SELECT 
        pc.*, 
        u.email,
        COALESCE(s.student_name, st.staff_name, a.admin_name, c.community_name) as first_name,
        COALESCE(s.student_surname, st.staff_surname, a.admin_surname) as last_name
      FROM post_comments pc
      JOIN users u ON u.user_id = pc.user_id
      LEFT JOIN students s ON s.user_id = u.user_id
      LEFT JOIN staff st ON st.user_id = u.user_id
      LEFT JOIN admins a ON a.user_id = u.user_id
      LEFT JOIN communities c ON c.user_id = u.user_id
      WHERE pc.post_id = $1
      ORDER BY pc.created_at ASC
    `, [postId]);
  }

  static async getPostLikes(postId: number) {
    return await query(`
      SELECT 
        u.user_id,
        u.email,
        COALESCE(s.student_name, st.staff_name, a.admin_name, c.community_name) as first_name,
        COALESCE(s.student_surname, st.staff_surname, a.admin_surname) as last_name
      FROM post_likes pl
      JOIN users u ON u.user_id = pl.user_id
      LEFT JOIN students s ON s.user_id = u.user_id
      LEFT JOIN staff st ON st.user_id = u.user_id
      LEFT JOIN admins a ON a.user_id = u.user_id
      LEFT JOIN communities c ON c.user_id = u.user_id
      WHERE pl.post_id = $1
      ORDER BY pl.created_at DESC
    `, [postId]);
  }

  static async toggleFollow(followerId: number, followingId: number) {
    if (followerId === followingId) throw AppError.badRequest('You cannot follow yourself');

    const existing = await queryOne('SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2', [followerId, followingId]);
    if (existing) {
      await query('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [followerId, followingId]);
      return { action: 'unfollowed' };
    } else {
      await query('INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)', [followerId, followingId]);
      return { action: 'followed' };
    }
  }

  static async getFollowStats(userId: number) {
    const followers = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM follows WHERE following_id = $1', [userId]);
    const following = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM follows WHERE follower_id = $1', [userId]);
    
    return {
      followers: parseInt(followers?.count || '0', 10),
      following: parseInt(following?.count || '0', 10)
    };
  }

  static async isFollowing(followerId: number, followingId: number) {
    const existing = await queryOne('SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2', [followerId, followingId]);
    return !!existing;
  }

  static async getFollowers(userId: number) {
    const rows = await query<any>(
      `SELECT u.user_id, u.email,
        COALESCE(st.student_name, sf.staff_name, c.community_name) AS name,
        COALESCE(st.student_surname, sf.staff_surname, '') AS surname,
        COALESCE(st.avatar_url, sf.avatar_url, c.avatar_url) AS avatar_url
       FROM follows f
       JOIN users u ON u.user_id = f.follower_id
       LEFT JOIN students st ON st.user_id = u.user_id
       LEFT JOIN staff sf ON sf.user_id = u.user_id
       LEFT JOIN communities c ON c.user_id = u.user_id
       WHERE f.following_id = $1
       ORDER BY f.created_at DESC`,
      [userId]
    );
    return rows;
  }

  static async getFollowing(userId: number) {
    const rows = await query<any>(
      `SELECT u.user_id, u.email,
        COALESCE(st.student_name, sf.staff_name, c.community_name) AS name,
        COALESCE(st.student_surname, sf.staff_surname, '') AS surname,
        COALESCE(st.avatar_url, sf.avatar_url, c.avatar_url) AS avatar_url
       FROM follows f
       JOIN users u ON u.user_id = f.following_id
       LEFT JOIN students st ON st.user_id = u.user_id
       LEFT JOIN staff sf ON sf.user_id = u.user_id
       LEFT JOIN communities c ON c.user_id = u.user_id
       WHERE f.follower_id = $1
       ORDER BY f.created_at DESC`,
      [userId]
    );
    return rows;
  }
}
