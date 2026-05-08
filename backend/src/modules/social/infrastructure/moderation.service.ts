import { normalizeStoredMediaUrl } from '../../../integrations/normalizeStoredMediaUrl';
import { query, queryOne } from '../../../config/db';
import { AppError } from '../../../shared/core/errors';

const ACADEMIC_ROLES = ['staff', 'admin'];
const REPORT_THRESHOLD = 1; // for testing; use 3 in production

export function isAcademic(role: string): boolean {
  return ACADEMIC_ROLES.includes(role);
}

export class ModerationService {
  static async reportPost(postId: number, reporterId: number, reportType: string) {
    await query(
      `INSERT INTO post_reports (post_id, reporter_user_id, report_type)
       VALUES ($1, $2, $3)
       ON CONFLICT (post_id, reporter_user_id) DO UPDATE SET report_type = $3, created_at = NOW()`,
      [postId, reporterId, reportType || 'other']
    );
    return { success: true };
  }

  static async reportUser(reportedUserId: number, reporterId: number, reportType: string) {
    await query(
      `INSERT INTO user_reports (reported_user_id, reporter_user_id, report_type)
       VALUES ($1, $2, $3)
       ON CONFLICT (reported_user_id, reporter_user_id) DO UPDATE SET report_type = $3, created_at = NOW()`,
      [reportedUserId, reporterId, reportType || 'other']
    );
    return { success: true };
  }

  static async getReportedPosts(limit = 50, reportType?: string | null): Promise<any[]> {
    const filterByType = reportType && ['spam', 'harassment', 'inappropriate', 'other'].includes(reportType);
    const rows = await query<any>(
      `SELECT p.post_id, p.user_id, p.content, p.image_url, p.created_at,
              COUNT(pr.id)::int AS reports_count,
              (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.post_id)::int AS likes_count,
              (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.post_id)::int AS comments_count,
              (SELECT COUNT(*) FROM post_reposts pr2 WHERE pr2.post_id = p.post_id)::int AS reposts_count,
              u.email,
              COALESCE(s.student_name, st.staff_name, a.admin_name, c.community_name) AS first_name,
              COALESCE(s.student_surname, st.staff_surname, a.admin_surname) AS last_name
       FROM posts p
       JOIN post_reports pr ON pr.post_id = p.post_id ${filterByType ? 'AND pr.report_type = $2' : ''}
       JOIN users u ON u.user_id = p.user_id
       LEFT JOIN students s ON s.user_id = p.user_id
       LEFT JOIN staff st ON st.user_id = p.user_id
       LEFT JOIN admins a ON a.user_id = p.user_id
       LEFT JOIN communities c ON c.user_id = p.user_id
       GROUP BY p.post_id, p.user_id, p.content, p.image_url, p.created_at,
                u.email, s.student_name, s.student_surname, st.staff_name, st.staff_surname,
                a.admin_name, a.admin_surname, c.community_name
       HAVING COUNT(pr.id) >= $1
       ORDER BY reports_count DESC
       LIMIT ${filterByType ? '$3' : '$2'}`,
      filterByType ? [REPORT_THRESHOLD, reportType, limit] : [REPORT_THRESHOLD, limit]
    );
    return rows.map((r) => ({
      ...r,
      image_url:
        r.image_url == null || String(r.image_url).trim() === ''
          ? r.image_url
          : normalizeStoredMediaUrl(r.image_url),
    }));
  }

  static async getReportedUsers(limit = 50, reportType?: string | null): Promise<any[]> {
    const filterByType = reportType && ['spam', 'harassment', 'inappropriate', 'other'].includes(reportType);
    const rows = await query<any>(
      `SELECT u.user_id, COUNT(ur.id) AS reports_count
       FROM users u
       JOIN user_reports ur ON ur.reported_user_id = u.user_id ${filterByType ? 'AND ur.report_type = $2' : ''}
       GROUP BY u.user_id
       ORDER BY reports_count DESC
       LIMIT $1`,
      filterByType ? [limit, reportType] : [limit]
    );
    return rows;
  }

  static async getReportersForPost(postId: number): Promise<any[]> {
    return query(
      `SELECT pr.reporter_user_id AS user_id, pr.report_type, pr.created_at,
              u.email,
              COALESCE(s.student_name, st.staff_name, a.admin_name, c.community_name) AS first_name,
              COALESCE(s.student_surname, st.staff_surname, a.admin_surname) AS last_name
       FROM post_reports pr
       JOIN users u ON u.user_id = pr.reporter_user_id
       LEFT JOIN students s ON s.user_id = u.user_id
       LEFT JOIN staff st ON st.user_id = u.user_id
       LEFT JOIN admins a ON a.user_id = u.user_id
       LEFT JOIN communities c ON c.user_id = u.user_id
       WHERE pr.post_id = $1
       ORDER BY pr.created_at DESC`,
      [postId]
    );
  }

  static async getReportersForUser(reportedUserId: number): Promise<any[]> {
    return query(
      `SELECT ur.reporter_user_id AS user_id, ur.report_type, ur.created_at,
              u.email,
              COALESCE(s.student_name, st.staff_name, a.admin_name, c.community_name) AS first_name,
              COALESCE(s.student_surname, st.staff_surname, a.admin_surname) AS last_name
       FROM user_reports ur
       JOIN users u ON u.user_id = ur.reporter_user_id
       LEFT JOIN students s ON s.user_id = u.user_id
       LEFT JOIN staff st ON st.user_id = u.user_id
       LEFT JOIN admins a ON a.user_id = u.user_id
       LEFT JOIN communities c ON c.user_id = u.user_id
       WHERE ur.reported_user_id = $1
       ORDER BY ur.created_at DESC`,
      [reportedUserId]
    );
  }

  static async getMyReportForUser(reportedUserId: number, reporterId: number): Promise<{ has_reported: boolean; report_type: string | null }> {
    const row = await queryOne<{ report_type: string }>(
      'SELECT report_type FROM user_reports WHERE reported_user_id = $1 AND reporter_user_id = $2',
      [reportedUserId, reporterId]
    );
    return { has_reported: !!row, report_type: row?.report_type ?? null };
  }

  static async removeMyUserReport(reportedUserId: number, reporterId: number) {
    const r = await query(
      'DELETE FROM user_reports WHERE reported_user_id = $1 AND reporter_user_id = $2 RETURNING id',
      [reportedUserId, reporterId]
    );
    if (!r || r.length === 0) throw AppError.notFound('Report not found or already removed');
    return { success: true };
  }

  static async getPostReportCount(postId: number): Promise<number> {
    const row = await queryOne<{ count: string }>(
      'SELECT COUNT(*) AS count FROM post_reports WHERE post_id = $1',
      [postId]
    );
    return parseInt(row?.count || '0', 10);
  }

  static async getPostReportCounts(postIds: number[]): Promise<Record<number, number>> {
    if (postIds.length === 0) return {};
    const rows = await query<{ post_id: number; count: string }>(
      'SELECT post_id, COUNT(*) AS count FROM post_reports WHERE post_id = ANY($1) GROUP BY post_id',
      [postIds]
    );
    const map: Record<number, number> = {};
    rows.forEach((r) => { map[r.post_id] = parseInt(r.count, 10); });
    return map;
  }

  static async getMyReportsForPosts(postIds: number[], userId: number): Promise<Record<number, string>> {
    if (postIds.length === 0) return {};
    const rows = await query<{ post_id: number; report_type: string }>(
      'SELECT post_id, report_type FROM post_reports WHERE post_id = ANY($1) AND reporter_user_id = $2',
      [postIds, userId]
    );
    const map: Record<number, string> = {};
    rows.forEach((r) => { map[r.post_id] = r.report_type; });
    return map;
  }

  static async removeMyReport(postId: number, userId: number) {
    const r = await query(
      'DELETE FROM post_reports WHERE post_id = $1 AND reporter_user_id = $2 RETURNING id',
      [postId, userId]
    );
    if (!r || r.length === 0) throw AppError.notFound('Report not found or already removed');
    return { success: true };
  }

  static async deletePostByStaff(postId: number, _staffUserId: number, staffRole: string) {
    if (!isAcademic(staffRole)) throw AppError.forbidden('Only academic staff can delete this post');
    await query('DELETE FROM posts WHERE post_id = $1', [postId]);
    await query('DELETE FROM post_reports WHERE post_id = $1', [postId]);
  }

  static async addWarning(targetUserId: number, tier: 1 | 2 | 3 | 4, issuedByUserId: number) {
    if (![1, 2, 3, 4].includes(tier)) throw AppError.badRequest('Invalid tier');
    await query(
      'INSERT INTO user_warnings (user_id, tier, issued_by_user_id) VALUES ($1, $2, $3)',
      [targetUserId, tier, issuedByUserId]
    );
    const sumRow = await queryOne<{ s: string }>(
      'SELECT COALESCE(SUM(tier), 0)::text AS s FROM user_warnings WHERE user_id = $1 AND tier IN (1,2,3)',
      [targetUserId]
    );
    const hasBan = await queryOne<{ ok: number }>(
      'SELECT 1 AS ok FROM user_warnings WHERE user_id = $1 AND tier = 4 LIMIT 1',
      [targetUserId]
    );
    const sum = parseInt(sumRow?.s || '0', 10);
    const isBanned = !!hasBan || sum >= 4;
    const displayTier = Math.min(3, sum);
    await query(
      'UPDATE users SET warning_tier = $1, is_banned = $2 WHERE user_id = $3',
      [displayTier, isBanned, targetUserId]
    );
    return { warning_tier: displayTier, is_banned: isBanned };
  }

  static async setWarningTier(targetUserId: number, tier: 0 | 1 | 2 | 3, _issuedByUserId: number) {
    await query('UPDATE users SET warning_tier = $1, is_banned = false WHERE user_id = $2', [tier, targetUserId]);
    return { warning_tier: tier, is_banned: false };
  }

  static async removeWarning(targetUserId: number, _issuedByUserId: number) {
    await query('UPDATE users SET warning_tier = 0, is_banned = false WHERE user_id = $1', [targetUserId]);
    return { warning_tier: 0, is_banned: false };
  }

  static async setBanned(targetUserId: number, banned: boolean, _issuedByUserId: number) {
    await query('UPDATE users SET is_banned = $1 WHERE user_id = $2', [banned, targetUserId]);
    if (!banned) await query('UPDATE users SET warning_tier = 0 WHERE user_id = $1', [targetUserId]);
    return { is_banned: banned };
  }

  static async getUserModeration(userId: number): Promise<{ warning_tier: number; is_banned: boolean } | null> {
    return queryOne(
      'SELECT COALESCE(warning_tier, 0) AS warning_tier, COALESCE(is_banned, false) AS is_banned FROM users WHERE user_id = $1',
      [userId]
    );
  }
}
