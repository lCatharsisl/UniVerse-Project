import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { query, queryOne, transaction } from '../../../config/db';
import { AppError } from '../../../shared/core/errors';
import { Result } from '../../../shared/core/result';

export class IdentityService {
  private static readonly SALT_ROUNDS = 10;
  private static readonly SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

  static async register(data: any) {
    try {
      return await transaction(async (client) => {
        // Check if email already exists
        const existingUser = await client.query('SELECT user_id FROM users WHERE email = $1', [data.email]);
        if (existingUser.rows.length > 0) throw AppError.badRequest('Email already registered');

        // Hash password
        const passwordHash = await bcrypt.hash(data.password, this.SALT_ROUNDS);

        // Create user
        const userResult = await client.query(
          'INSERT INTO users (email, password_hash, role, is_email_verified, is_active) VALUES ($1, $2, $3, false, true) RETURNING user_id',
          [data.email, passwordHash, data.role]
        );
        const userId = userResult.rows[0].user_id;

        // Create role-specific record
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
          await client.query(
            'INSERT INTO communities (user_id, community_name, description, contact_email) VALUES ($1, $2, $3, $4)',
            [userId, data.communityName, data.description, data.email]
          );
        }

        // Generate email verification token
        const emailToken = randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
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

  static async login(email: string, password: string) {
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

      const sessionToken = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + this.SESSION_DURATION_MS);
      await query('INSERT INTO user_sessions (user_id, session_token, expires_at) VALUES ($1, $2, $3)', 
        [user.user_id, sessionToken, expiresAt]);

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

  static async logout(sessionToken: string): Promise<void> {
    await query('DELETE FROM user_sessions WHERE session_token = $1', [sessionToken]);
  }

  static async getCurrentUser(userId: number) {
    const user = await queryOne<any>(
      `SELECT user_id, email, role, is_email_verified, profile_image_url
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
      profile,
    };
  }

  static async updateProfile(userId: number, data: any) {
    try {
      return await transaction(async (client) => {
        const user = await client.query('SELECT role FROM users WHERE user_id = $1', [userId]);
        if (user.rows.length === 0) throw AppError.notFound('User not found');
        const role = user.rows[0].role;

        // Update password if provided
        if (data.password) {
          const passwordHash = await bcrypt.hash(data.password, this.SALT_ROUNDS);
          await client.query('UPDATE users SET password_hash = $1 WHERE user_id = $2', [passwordHash, userId]);
        }

        // Update role-specific profile fields
        if (role === 'student') {
          await client.query(
            `UPDATE students SET 
              student_name = COALESCE($1, student_name), 
              student_surname = COALESCE($2, student_surname), 
              phone_number = COALESCE($3, phone_number),
              avatar_url = COALESCE($4, avatar_url),
              cover_url = COALESCE($5, cover_url)
             WHERE user_id = $6`,
            [data.name || null, data.surname || null, data.phoneNumber || null, data.avatarUrl || null, data.coverUrl || null, userId]
          );
        } else if (role === 'staff') {
          await client.query(
            `UPDATE staff SET 
              staff_name = COALESCE($1, staff_name), 
              staff_surname = COALESCE($2, staff_surname), 
              phone_number = COALESCE($3, phone_number),
              avatar_url = COALESCE($4, avatar_url),
              cover_url = COALESCE($5, cover_url)
             WHERE user_id = $6`,
            [data.name || null, data.surname || null, data.phoneNumber || null, data.avatarUrl || null, data.coverUrl || null, userId]
          );
        } else if (role === 'community') {
          await client.query(
            `UPDATE communities SET 
              community_name = COALESCE($1, community_name),
              avatar_url = COALESCE($2, avatar_url),
              cover_url = COALESCE($3, cover_url),
              description = COALESCE($4, description)
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

  static async getPublicProfile(userId: number) {
    const user = await queryOne<any>(
      `SELECT user_id, email, role, created_at FROM users WHERE user_id = $1 AND is_active = true`,
      [userId]
    );

    if (!user) throw AppError.notFound('User not found');

    let profile: any;
    if (user.role === 'student') {
      profile = await queryOne(`
        SELECT student_name, student_surname, s.department_id, current_semester, avatar_url, cover_url, d.department_name, f.faculty_name, description
        FROM students s
        LEFT JOIN departments d ON s.department_id = d.department_id
        LEFT JOIN faculties f ON d.faculty_id = f.faculty_id
        WHERE user_id = $1`, [userId]);
    } else if (user.role === 'staff') {
      profile = await queryOne(`
        SELECT staff_name, staff_surname, s.department_id, avatar_url, cover_url, staff_title, d.department_name, f.faculty_name, description
        FROM staff s
        LEFT JOIN departments d ON s.department_id = d.department_id
        LEFT JOIN faculties f ON d.faculty_id = f.faculty_id
        WHERE user_id = $1`, [userId]);
    } else if (user.role === 'community') {
      profile = await queryOne(`SELECT community_name, description, avatar_url, cover_url FROM communities WHERE user_id = $1`, [userId]);
    }

    return {
      userId: user.user_id,
      email: user.email,
      role: user.role,
      name: profile?.student_name || profile?.staff_name || profile?.community_name,
      surname: profile?.student_surname || profile?.staff_surname,
      avatarUrl: profile?.avatar_url,
      coverUrl: profile?.cover_url,
      description: profile?.description,
      title: profile?.staff_title,
      departmentName: profile?.department_name,
      facultyName: profile?.faculty_name,
      createdAt: user.created_at
    };
  }
}
