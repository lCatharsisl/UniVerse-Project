import bcrypt from 'bcryptjs';
import { PoolClient } from 'pg';
import { randomBytes } from 'crypto';
import { query, queryOne, transaction } from '../../../config/db';
import { AppError } from '../../../shared/core/errors';
import { Result } from '../../../shared/core/result';
import {
  buildCorporateEmailLocalCandidates,
  extractYasarStaffLocalPart,
  normalizeStaffRegistrationEmail,
} from './yasarStaffEmailCandidates';

export class IdentityService {
  private static readonly SALT_ROUNDS = 10;
  private static readonly SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

  static async register(data: any) {
    try {
      const normalizedEmail = normalizeStaffRegistrationEmail(data.email);

      if (data.role === 'student' || data.role === 'community') {
        if (!normalizedEmail.endsWith('@stu.yasar.edu.tr')) {
          throw AppError.badRequest('Student/Society accounts must use @stu.yasar.edu.tr email');
        }

        if (data.role === 'student') {
          const emailPrefix = normalizedEmail.split('@')[0];
          if (emailPrefix !== data.studentNumber.toString()) {
            throw AppError.badRequest('Email prefix must match student number');
          }
        }
      } else if (data.role === 'staff') {
        if (!normalizedEmail.endsWith('@yasar.edu.tr') || normalizedEmail.endsWith('@stu.yasar.edu.tr')) {
          throw AppError.badRequest('Academic staff accounts must use @yasar.edu.tr email');
        }
      }

      return await transaction(async (client) => {
        const existingUser = await client.query('SELECT user_id FROM users WHERE email = $1', [normalizedEmail]);
        if (existingUser.rows.length > 0) throw AppError.badRequest('Email already registered');

        const passwordHash = await bcrypt.hash(data.password, this.SALT_ROUNDS);

        if (data.role === 'staff') {
          const localPart = extractYasarStaffLocalPart(normalizedEmail);
          if (localPart) {
            const staffRows = await client.query(
              `SELECT s.user_id, s.staff_name, s.staff_surname, s.department_id
               FROM staff s
               INNER JOIN users u ON u.user_id = s.user_id
               WHERE u.role = 'staff' AND COALESCE(u.is_active, true) = true`
            );

            type StaffMatch = { user_id: number; department_id: number | null };
            const matches: StaffMatch[] = [];
            for (const row of staffRows.rows) {
              const cands = buildCorporateEmailLocalCandidates(
                String(row.staff_name ?? ''),
                String(row.staff_surname ?? '')
              );
              if (cands.includes(localPart)) {
                matches.push({ user_id: row.user_id, department_id: row.department_id });
              }
            }

            let claimUserId: number | null = null;
            if (matches.length === 1) {
              claimUserId = matches[0].user_id;
            } else if (matches.length > 1) {
              const depId = parseInt(String(data.departmentId), 10);
              const byDep = matches.filter((m) => m.department_id === depId);
              if (byDep.length === 1) {
                claimUserId = byDep[0].user_id;
              } else if (byDep.length > 1) {
                throw AppError.badRequest(
                  'Multiple directory profiles match this email and department; contact support to link your account.'
                );
              } else {
                throw AppError.badRequest(
                  'Multiple directory profiles match this name pattern; choose the department that matches the university directory or contact support.'
                );
              }
            }

            if (claimUserId != null) {
              const upd = await client.query(
                `UPDATE users
                 SET email = $1, password_hash = $2, is_email_verified = false
                 WHERE user_id = $3 AND role = 'staff' AND COALESCE(is_active, true) = true
                 RETURNING user_id`,
                [normalizedEmail, passwordHash, claimUserId]
              );
              if (upd.rowCount === 0) {
                throw AppError.badRequest('Could not link to staff profile; contact support.');
              }

              await client.query(
                `UPDATE staff SET staff_name = $1, staff_surname = $2, department_id = $3 WHERE user_id = $4`,
                [data.staffName, data.staffSurname, data.departmentId, claimUserId]
              );

              await client.query(`DELETE FROM email_verification_tokens WHERE user_id = $1 AND is_used = false`, [
                claimUserId,
              ]);

              const emailToken = randomBytes(32).toString('hex');
              const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
              await client.query(
                'INSERT INTO email_verification_tokens (user_id, token, expires_at, is_used) VALUES ($1, $2, $3, false)',
                [claimUserId, emailToken, expiresAt]
              );

              return Result.ok({ userId: claimUserId, emailToken });
            }
          }
        }

        const userResult = await client.query(
          'INSERT INTO users (email, password_hash, role, is_email_verified, is_active) VALUES ($1, $2, $3, false, true) RETURNING user_id',
          [normalizedEmail, passwordHash, data.role]
        );
        const userId = userResult.rows[0].user_id;

        if (data.role === 'student') {
          await client.query(
            'INSERT INTO students (user_id, student_number, student_name, student_surname, department_id) VALUES ($1, $2, $3, $4, $5)',
            [userId, data.studentNumber, data.studentName, data.studentSurname, data.departmentId]
          );
        } else if (data.role === 'staff') {
          await client.query(
            'INSERT INTO staff (user_id, staff_name, staff_surname, department_id) VALUES ($1, $2, $3, $4)',
            [userId, data.staffName, data.staffSurname, data.departmentId]
          );
        } else if (data.role === 'admin') {
          await client.query(
            'INSERT INTO admins (user_id, admin_name, admin_surname) VALUES ($1, $2, $3)',
            [userId, data.adminName, data.adminSurname]
          );
        } else if (data.role === 'community') {
          const comm = await client.query(
            'INSERT INTO communities (user_id, community_name, description, contact_email) VALUES ($1, $2, $3, $4) RETURNING community_id',
            [userId, data.communityName, data.description, normalizedEmail]
          );
          const communityId = comm.rows[0]?.community_id;
          if (communityId) {
            await client.query(
              `INSERT INTO community_members (community_id, member_user_id, role, is_active)
               VALUES ($1, $2, 'admin', true)
               ON CONFLICT (community_id, member_user_id) DO UPDATE SET role='admin', is_active=true`,
              [communityId, userId]
            );
          }
        }

        const emailToken = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await client.query(
          'INSERT INTO email_verification_tokens (user_id, token, expires_at, is_used) VALUES ($1, $2, $3, false)',
          [userId, emailToken, expiresAt]
        );

        return Result.ok({ userId, emailToken });
      });
    } catch (error: any) {
      console.error('Registration Error:', error);
      return Result.fail(error.message || 'Registration failed');
    }
  }

  static async login(email: string, password: string, userAgent?: string, ipAddress?: string) {
    try {
      const user = await queryOne<any>('SELECT * FROM users WHERE email = $1', [email]);
      if (!user) {
        return Result.fail('Invalid credentials');
      }

      if (!user.is_active) {
        return Result.fail('Account is deactivated');
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return Result.fail('Invalid credentials');
      }

      const sessionToken = await this.createSession(query, user.user_id, userAgent, ipAddress);

      return Result.ok({
        token: sessionToken,
        user: {
          id: user.user_id,
          email: user.email,
          role: user.role
        }
      });
    } catch (error: any) {
      console.error('Login Error:', error);
      return Result.fail(error.message || 'Login failed');
    }
  }

  static async loginWithMicrosoft(
    data: {
      email: string;
      microsoftOid: string;
      microsoftTid: string;
      inferredRole: 'student' | 'staff' | null;
      firstName: string;
      lastName: string;
      displayName?: string;
    },
    userAgent?: string,
    ipAddress?: string
  ) {
    try {
      return await transaction(async (client) => {
        const normalizedEmail = data.email.toLowerCase();
        const linkedUserResult = await client.query(
          `SELECT * FROM users
           WHERE microsoft_tid = $1
             AND microsoft_oid = $2
           LIMIT 1`,
          [data.microsoftTid, data.microsoftOid]
        );

        let user = linkedUserResult.rows[0] || null;

        if (!user) {
          const existingByEmailResult = await client.query(
            'SELECT * FROM users WHERE email = $1 LIMIT 1',
            [normalizedEmail]
          );
          const existingByEmail = existingByEmailResult.rows[0] || null;

          if (existingByEmail) {
            if (!existingByEmail.is_active) {
              throw AppError.badRequest('Account is deactivated');
            }

            if (
              existingByEmail.microsoft_tid &&
              existingByEmail.microsoft_oid &&
              (
                existingByEmail.microsoft_tid !== data.microsoftTid ||
                existingByEmail.microsoft_oid !== data.microsoftOid
              )
            ) {
              throw AppError.badRequest('This account is already linked to another Microsoft identity');
            }

            const updatedUserResult = await client.query(
              `UPDATE users
               SET microsoft_tid = $1,
                   microsoft_oid = $2,
                   is_email_verified = true
               WHERE user_id = $3
               RETURNING *`,
              [data.microsoftTid, data.microsoftOid, existingByEmail.user_id]
            );

            user = updatedUserResult.rows[0];
          } else {
            if (!data.inferredRole) {
              throw AppError.badRequest('Only Yaşar University Microsoft accounts can sign in');
            }

            const generatedPassword = randomBytes(48).toString('hex');
            const passwordHash = await bcrypt.hash(generatedPassword, this.SALT_ROUNDS);
            const createdUserResult = await client.query(
              `INSERT INTO users (
                email,
                password_hash,
                role,
                is_email_verified,
                is_active,
                microsoft_tid,
                microsoft_oid
              )
              VALUES ($1, $2, $3, true, true, $4, $5)
              RETURNING *`,
              [normalizedEmail, passwordHash, data.inferredRole, data.microsoftTid, data.microsoftOid]
            );

            user = createdUserResult.rows[0];

            if (data.inferredRole === 'student') {
              const studentNumber = normalizedEmail.split('@')[0];
              await client.query(
                `INSERT INTO students (
                  user_id,
                  student_number,
                  student_name,
                  student_surname,
                  department_id
                )
                VALUES ($1, $2, $3, $4, $5)`,
                [
                  user.user_id,
                  studentNumber,
                  data.firstName || studentNumber,
                  data.lastName || '',
                  null,
                ]
              );
            } else {
              await client.query(
                `INSERT INTO staff (
                  user_id,
                  staff_name,
                  staff_surname,
                  department_id
                )
                VALUES ($1, $2, $3, $4)`,
                [
                  user.user_id,
                  data.firstName || data.displayName || normalizedEmail.split('@')[0],
                  data.lastName || '',
                  null,
                ]
              );
            }
          }
        }

        if (!user.is_active) {
          throw AppError.badRequest('Account is deactivated');
        }

        const sessionToken = await this.createSession(client, user.user_id, userAgent, ipAddress);

        return Result.ok({
          token: sessionToken,
          user: {
            id: user.user_id,
            email: user.email,
            role: user.role,
          },
        });
      });
    } catch (error: any) {
      console.error('Microsoft Login Error:', error);
      return Result.fail(error.message || 'Microsoft sign-in failed');
    }
  }

  static async logout(sessionToken: string): Promise<void> {
    await query('DELETE FROM user_sessions WHERE session_token = $1', [sessionToken]);
  }

  private static async createSession(
    executor: Pick<PoolClient, 'query'> | typeof query,
    userId: number,
    userAgent?: string,
    ipAddress?: string
  ): Promise<string> {
    const sessionToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.SESSION_DURATION_MS);

    if (typeof executor === 'function') {
      await executor(
        'INSERT INTO user_sessions (user_id, session_token, expires_at, user_agent, ip_address, last_active_at) VALUES ($1, $2, $3, $4, $5, NOW())',
        [userId, sessionToken, expiresAt, userAgent || null, ipAddress || null]
      );
    } else {
      await executor.query(
        'INSERT INTO user_sessions (user_id, session_token, expires_at, user_agent, ip_address, last_active_at) VALUES ($1, $2, $3, $4, $5, NOW())',
        [userId, sessionToken, expiresAt, userAgent || null, ipAddress || null]
      );
    }

    return sessionToken;
  }

  static async getCurrentUser(userId: number) {
    const user = await queryOne<any>(
      `SELECT user_id, email, role, is_email_verified, profile_image_url,
              COALESCE(warning_tier, 0) AS warning_tier, COALESCE(is_banned, false) AS is_banned
       FROM users WHERE user_id = $1 AND is_active = true`,
      [userId]
    );

    if (!user) throw AppError.notFound('User not found');

    let profile: Record<string, unknown> | undefined;

    if (user.role === 'student') {
      profile = (await queryOne<any>(
        `SELECT s.student_id, s.student_number, s.student_name, s.student_surname, s.department_id, s.current_semester, s.phone_number, d.department_name, f.faculty_name
         FROM students s
         LEFT JOIN departments d ON s.department_id = d.department_id
         LEFT JOIN faculties f ON d.faculty_id = f.faculty_id
         WHERE s.user_id = $1`,
        [userId]
      )) || undefined;
    } else if (user.role === 'staff') {
      profile = (await queryOne<any>(
        `SELECT s.staff_id, s.staff_name, s.staff_surname, s.department_id, s.staff_title, s.phone_number, s.office_id, s.office_hours, d.department_name, f.faculty_name
         FROM staff s
         LEFT JOIN departments d ON s.department_id = d.department_id
         LEFT JOIN faculties f ON d.faculty_id = f.faculty_id
         WHERE s.user_id = $1`,
        [userId]
      )) || undefined;
    } else if (user.role === 'community') {
      profile = (await queryOne<any>(
        `SELECT community_id, community_name, description, contact_email FROM communities WHERE user_id = $1`,
        [userId]
      )) || undefined;
    }

    return {
      userId: user.user_id,
      email: user.email,
      role: user.role,
      isEmailVerified: user.is_email_verified,
      profileImageUrl: user.profile_image_url || undefined,
      warningTier: user.warning_tier ?? 0,
      isBanned: user.is_banned ?? false,
      profile,
    };
  }

  static async updateProfile(userId: number, data: any) {
    try {
      return await transaction(async (client) => {
        const user = await client.query('SELECT role, password_hash FROM users WHERE user_id = $1', [userId]);
        if (user.rows.length === 0) throw AppError.notFound('User not found');
        const role = user.rows[0].role;
        const password_hash = user.rows[0].password_hash;

        // Update password if provided
        if (data.password) {
          if (!data.currentPassword) {
            throw AppError.badRequest('Current password is required to change password.');
          }
          const isMatch = await bcrypt.compare(data.currentPassword, password_hash);
          if (!isMatch) {
            throw AppError.badRequest('Current password is incorrect.');
          }
          const passwordHash = await bcrypt.hash(data.password, this.SALT_ROUNDS);
          await client.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [passwordHash, userId]);
        }

        // Parse social_links JSON if it comes as a string
        let socialLinks = null;
        if (data.socialLinks !== undefined) {
          socialLinks = typeof data.socialLinks === 'string'
            ? JSON.parse(data.socialLinks)
            : data.socialLinks;
        }

        // Parse interests array if it comes as a string
        let interests = null;
        if (data.interests !== undefined) {
          interests = Array.isArray(data.interests)
            ? data.interests
            : (typeof data.interests === 'string' ? JSON.parse(data.interests) : []);
        }

        // Parse phone number
        const phoneNumber = data.phoneNumber || null;

        // Update role-specific profile fields
        if (role === 'student') {
          await client.query(
            `UPDATE students SET
              student_name    = COALESCE($1, student_name),
              student_surname = COALESCE($2, student_surname),
              phone_number    = COALESCE($3, phone_number),
              avatar_url      = COALESCE($4, avatar_url),
              cover_url       = COALESCE($5, cover_url),
              description     = COALESCE($6, description),
              social_links    = COALESCE($7, social_links),
              interests       = COALESCE($8, interests)
             WHERE user_id = $9`,
            [
              data.name || null,
              data.surname || null,
              phoneNumber,
              data.avatarUrl || null,
              data.coverUrl || null,
              data.description || null,
              socialLinks,
              interests,
              userId
            ]
          );
        } else if (role === 'staff') {
          await client.query(
            `UPDATE staff SET
              staff_name    = COALESCE($1, staff_name),
              staff_surname = COALESCE($2, staff_surname),
              phone_number  = COALESCE($3, phone_number),
              avatar_url    = COALESCE($4, avatar_url),
              cover_url     = COALESCE($5, cover_url),
              description   = COALESCE($6, description),
              social_links  = COALESCE($7, social_links),
              interests     = COALESCE($8, interests)
             WHERE user_id = $9`,
            [
              data.name || null,
              data.surname || null,
              phoneNumber,
              data.avatarUrl || null,
              data.coverUrl || null,
              data.description || null,
              socialLinks,
              interests,
              userId
            ]
          );
        } else if (role === 'community') {
          await client.query(
            `UPDATE communities SET
              community_name = COALESCE($1, community_name),
              avatar_url     = COALESCE($2, avatar_url),
              cover_url      = COALESCE($3, cover_url),
              description    = COALESCE($4, description)
             WHERE user_id = $5`,
            [data.name || null, data.avatarUrl || null, data.coverUrl || null, data.description || null, userId]
          );
        }

        return Result.ok();
      });
    } catch (error: any) {
      console.error('Update Profile Error:', error);
      return Result.fail(error.message || 'Profile update failed');
    }
  }

  static async updatePrivacySettings(userId: number, data: { isPrivate?: boolean; mutedWords?: string[] }) {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (data.isPrivate !== undefined) {
        fields.push(`is_private = $${idx++}`);
        values.push(data.isPrivate);
      }
      if (data.mutedWords !== undefined) {
        fields.push(`muted_words = $${idx++}`);
        values.push(data.mutedWords);
      }

      if (fields.length === 0) return Result.ok();

      values.push(userId);
      await query(`UPDATE users SET ${fields.join(', ')} WHERE user_id = $${idx}`, values);
      return Result.ok();
    } catch (error: any) {
      return Result.fail(error.message || 'Privacy update failed');
    }
  }

  static async getPublicProfile(userId: number, requesterId?: number) {
    const user = await queryOne<any>(
      `SELECT user_id, email, role, created_at, is_private,
              COALESCE(warning_tier, 0) AS warning_tier, COALESCE(is_banned, false) AS is_banned,
              COALESCE(muted_words, '{}') AS muted_words
       FROM users WHERE user_id = $1 AND is_active = true`,
      [userId]
    );

    if (!user) throw AppError.notFound('User not found');

    // Check if blocked
    if (requesterId && requesterId !== userId) {
      const blocked = await queryOne(
        `SELECT 1 FROM blocked_users WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)`,
        [userId, requesterId]
      );
      if (blocked) throw AppError.forbidden('User not available');
    }

    // Check if requester is following (needed for private account check)
    let isFollower = false;
    if (requesterId && requesterId !== userId) {
      const followCheck = await queryOne(
        `SELECT 1 FROM user_follows WHERE follower_id = $1 AND following_id = $2`,
        [requesterId, userId]
      );
      isFollower = !!followCheck;
    }

    // Private account: hide bio/profile details if not follower
    const isPrivate = user.is_private;
    const canSeeFull = !isPrivate || requesterId === userId || isFollower;

    let profile: any = null;
    if (canSeeFull) {
      if (user.role === 'student') {
        profile = await queryOne(`
          SELECT student_name, student_surname, s.department_id, current_semester, avatar_url, cover_url,
                 d.department_name, f.faculty_name, description, phone_number,
                 COALESCE(social_links, '{}') AS social_links,
                 COALESCE(interests, '{}') AS interests
          FROM students s
          LEFT JOIN departments d ON s.department_id = d.department_id
          LEFT JOIN faculties f ON d.faculty_id = f.faculty_id
          WHERE user_id = $1`, [userId]);
      } else if (user.role === 'staff') {
        profile = await queryOne(`
          SELECT staff_name, staff_surname, s.department_id, avatar_url, cover_url, staff_title,
                 d.department_name, f.faculty_name, description, phone_number,
                 COALESCE(social_links, '{}') AS social_links,
                 COALESCE(interests, '{}') AS interests
          FROM staff s
          LEFT JOIN departments d ON s.department_id = d.department_id
          LEFT JOIN faculties f ON d.faculty_id = f.faculty_id
          WHERE user_id = $1`, [userId]);
      } else if (user.role === 'community') {
        profile = await queryOne(`SELECT community_name, description, avatar_url, cover_url FROM communities WHERE user_id = $1`, [userId]);
      }
    } else {
      // Private account: fetch only avatar (visible to everyone)
      if (user.role === 'student') {
        profile = await queryOne(`SELECT student_name, student_surname, avatar_url FROM students WHERE user_id = $1`, [userId]);
      } else if (user.role === 'staff') {
        profile = await queryOne(`SELECT staff_name, staff_surname, avatar_url FROM staff WHERE user_id = $1`, [userId]);
      } else if (user.role === 'community') {
        profile = await queryOne(`SELECT community_name, avatar_url FROM communities WHERE user_id = $1`, [userId]);
      }
    }

    // Mutual followers count
    let mutualFollowersCount = 0;
    if (requesterId && requesterId !== userId && canSeeFull) {
      const mutual = await queryOne<{ count: string }>(
        `SELECT COUNT(*) AS count
         FROM user_follows f1
         JOIN user_follows f2 ON f1.follower_id = f2.following_id
         WHERE f1.following_id = $1 AND f2.follower_id = $2`,
        [userId, requesterId]
      );
      mutualFollowersCount = parseInt(mutual?.count || '0', 10);
    }

    return {
      userId: user.user_id,
      email: user.email,
      role: user.role,
      isPrivate: user.is_private,
      isProfileHidden: !canSeeFull,
      name: profile?.student_name || profile?.staff_name || profile?.community_name,
      surname: profile?.student_surname || profile?.staff_surname,
      avatarUrl: profile?.avatar_url,
      coverUrl: canSeeFull ? profile?.cover_url : undefined,
      description: canSeeFull ? profile?.description : undefined,
      title: canSeeFull ? profile?.staff_title : undefined,
      departmentName: canSeeFull ? profile?.department_name : undefined,
      facultyName: canSeeFull ? profile?.faculty_name : undefined,
      phoneNumber: canSeeFull ? profile?.phone_number : undefined,
      socialLinks: canSeeFull ? (profile?.social_links || {}) : {},
      interests: canSeeFull ? (profile?.interests || []) : [],
      mutualFollowersCount,
      createdAt: user.created_at,
      warningTier: user.warning_tier ?? 0,
      isBanned: user.is_banned ?? false,
      mutedWords: user.muted_words || [],
    };
  }

  // ─── Block / Unblock ────────────────────────────────────────────────────────
  static async toggleBlock(blockerId: number, blockedId: number) {
    if (blockerId === blockedId) return Result.fail('Cannot block yourself');
    try {
      const existing = await queryOne(
        `SELECT id FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2`,
        [blockerId, blockedId]
      );
      if (existing) {
        await query(`DELETE FROM blocked_users WHERE blocker_id = $1 AND blocked_id = $2`, [blockerId, blockedId]);
        return Result.ok({ action: 'unblocked' });
      } else {
        // Also remove any existing follows when blocking
        await query(`DELETE FROM user_follows WHERE (follower_id = $1 AND following_id = $2) OR (follower_id = $2 AND following_id = $1)`, [blockerId, blockedId]);
        await query(`INSERT INTO blocked_users (blocker_id, blocked_id) VALUES ($1, $2)`, [blockerId, blockedId]);
        return Result.ok({ action: 'blocked' });
      }
    } catch (error: any) {
      return Result.fail(error.message || 'Block operation failed');
    }
  }

  static async isBlocked(userId: number, targetId: number): Promise<{ isBlocked: boolean; blockedByTarget: boolean }> {
    const row = await queryOne<{ blocker_id: number; blocked_id: number }>(
      `SELECT blocker_id, blocked_id FROM blocked_users
       WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)`,
      [userId, targetId]
    );
    if (!row) return { isBlocked: false, blockedByTarget: false };
    return {
      isBlocked: row.blocker_id === userId,
      blockedByTarget: row.blocker_id === targetId,
    };
  }

  // ─── Active Sessions ─────────────────────────────────────────────────────────
  static async getActiveSessions(userId: number) {
    return await query<any>(
      `SELECT session_id, user_agent, ip_address, last_active_at, expires_at, created_at
       FROM user_sessions
       WHERE user_id = $1 AND expires_at > NOW()
       ORDER BY last_active_at DESC`,
      [userId]
    );
  }

  static async terminateSession(userId: number, sessionId: number) {
    const result = await query(
      `DELETE FROM user_sessions WHERE session_id = $1 AND user_id = $2`,
      [sessionId, userId]
    );
    return result;
  }

  // ─── Deactivate Account ──────────────────────────────────────────────────────
  static async deactivateAccount(userId: number) {
    try {
      await query(`UPDATE users SET is_active = false WHERE user_id = $1`, [userId]);
      await query(`DELETE FROM user_sessions WHERE user_id = $1`, [userId]);
      return Result.ok();
    } catch (error: any) {
      return Result.fail(error.message || 'Account deactivation failed');
    }
  }
}
