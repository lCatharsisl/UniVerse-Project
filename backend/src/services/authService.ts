import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { query, queryOne, transaction } from '../config/db.js';
import { AppError } from '../middleware/errorHandler.js';
import type { RegisterRequest } from '../validators/auth.js';

interface UserRow {
  user_id: number;
  email: string;
  password_hash: string;
  role: string;
  is_email_verified: boolean;
  is_active: boolean;
  profile_image_url?: string;
}

interface SessionRow {
  session_id: number;
  session_token: string;
  expires_at: Date;
}

export class AuthService {
  private static readonly SALT_ROUNDS = 10;
  private static readonly SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  private static readonly EMAIL_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateSessionToken(): string {
    return randomBytes(32).toString('hex');
  }

  static generateEmailToken(): string {
    return randomBytes(32).toString('hex');
  }

  static async register(data: RegisterRequest): Promise<{ userId: number; emailToken: string }> {
    return transaction(async (client) => {
      // Check if email already exists
      const existingUser = await client.query<UserRow>(
        'SELECT user_id FROM users WHERE email = $1',
        [data.email]
      );

      if (existingUser.rows.length > 0) {
        throw new AppError(409, 'Email already registered');
      }

      // Hash password
      const passwordHash = await this.hashPassword(data.password);

      // Create user
      const userResult = await client.query<{ user_id: number }>(
        `INSERT INTO users (email, password_hash, role, is_email_verified, is_active)
         VALUES ($1, $2, $3, false, true)
         RETURNING user_id`,
        [data.email, passwordHash, data.role]
      );

      const userId = userResult.rows[0].user_id;

      // Create role-specific record
      if (data.role === 'student') {
        await client.query(
          `INSERT INTO students (user_id, student_number, student_name, student_surname, department_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, data.studentNumber, data.studentName, data.studentSurname, data.departmentId]
        );
      } else if (data.role === 'staff') {
        await client.query(
          `INSERT INTO staff (user_id, staff_name, staff_surname, department_id)
           VALUES ($1, $2, $3, $4)`,
          [userId, data.staffName, data.staffSurname, data.departmentId]
        );
      } else if (data.role === 'admin') {
        await client.query(
          `INSERT INTO admins (user_id, admin_name, admin_surname)
           VALUES ($1, $2, $3)`,
          [userId, data.adminName, data.adminSurname]
        );
      } else if (data.role === 'community') {
        await client.query(
          `INSERT INTO communities (user_id, community_name, description, contact_email)
           VALUES ($1, $2, $3, $4)`,
          [userId, data.communityName, data.description, data.email]
        );
      }

      // Generate email verification token
      const emailToken = this.generateEmailToken();
      const expiresAt = new Date(Date.now() + this.EMAIL_TOKEN_EXPIRY_MS);

      await client.query(
        `INSERT INTO email_verification_tokens (user_id, token, expires_at, is_used)
         VALUES ($1, $2, $3, false)`,
        [userId, emailToken, expiresAt]
      );

      return { userId, emailToken };
    });
  }

  static async login(email: string, password: string): Promise<{ sessionToken: string; expiresAt: Date }> {
    const user = await queryOne<UserRow>(
      `SELECT user_id, email, password_hash, role, is_email_verified, is_active
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (!user) {
      throw new AppError(401, 'Invalid email or password');
    }

    if (!user.is_active) {
      throw new AppError(403, 'Account is deactivated');
    }

    const isValidPassword = await this.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      throw new AppError(401, 'Invalid email or password');
    }

    // Create session
    const sessionToken = this.generateSessionToken();
    const expiresAt = new Date(Date.now() + this.SESSION_DURATION_MS);

    await query(
      `INSERT INTO user_sessions (user_id, session_token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.user_id, sessionToken, expiresAt]
    );

    return { sessionToken, expiresAt };
  }

  static async logout(sessionToken: string): Promise<void> {
    await query(
      'DELETE FROM user_sessions WHERE session_token = $1',
      [sessionToken]
    );
  }

  static async verifyEmail(token: string): Promise<void> {
    const tokenRecord = await queryOne<{
      email_token_id: number;
      user_id: number;
      expires_at: Date;
      is_used: boolean;
    }>(
      `SELECT email_token_id, user_id, expires_at, is_used
       FROM email_verification_tokens
       WHERE token = $1`,
      [token]
    );

    if (!tokenRecord) {
      throw new AppError(404, 'Invalid verification token');
    }

    if (tokenRecord.is_used) {
      throw new AppError(400, 'Token already used');
    }

    if (new Date() > tokenRecord.expires_at) {
      throw new AppError(400, 'Token expired');
    }

    await transaction(async (client) => {
      await client.query(
        'UPDATE users SET is_email_verified = true WHERE user_id = $1',
        [tokenRecord.user_id]
      );

      await client.query(
        'UPDATE email_verification_tokens SET is_used = true WHERE email_token_id = $1',
        [tokenRecord.email_token_id]
      );
    });
  }

  static async getCurrentUser(userId: number): Promise<{
    userId: number;
    email: string;
    role: string;
    isEmailVerified: boolean;
    profileImageUrl?: string;
    profile?: Record<string, unknown>;
  }> {
    const user = await queryOne<UserRow>(
      `SELECT user_id, email, role, is_email_verified, profile_image_url
       FROM users
       WHERE user_id = $1 AND is_active = true`,
      [userId]
    );

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    let profile: Record<string, unknown> | undefined;

    if (user.role === 'student') {
      const student = await queryOne(
        `SELECT student_id, student_number, student_name, student_surname, 
                department_id, current_semester, phone_number, birth_date
         FROM students
         WHERE user_id = $1`,
        [userId]
      );
      profile = (student as Record<string, unknown>) || undefined;
    } else if (user.role === 'staff') {
      const staff = await queryOne(
        `SELECT 
           s.staff_id, 
           s.staff_name, 
           s.staff_surname, 
           s.department_id, 
           s.staff_title, 
           s.phone_number, 
           s.office_id,
           s.office_hours,
           o.office_name,
           o.office_code,
           o.room_id as office_room_id
         FROM staff s
         LEFT JOIN offices o ON o.office_id = s.office_id
         WHERE s.user_id = $1`,
        [userId]
      );
      profile = (staff as Record<string, unknown>) || undefined;
    } else if (user.role === 'admin') {
      const admin = await queryOne(
        `SELECT admin_id, admin_name, admin_surname
         FROM admins
         WHERE user_id = $1`,
        [userId]
      );
      profile = (admin as Record<string, unknown>) || undefined;
    } else if (user.role === 'community') {
      const community = await queryOne(
        `SELECT community_id, community_name, description, contact_email
         FROM communities
         WHERE user_id = $1`,
        [userId]
      );
      profile = (community as Record<string, unknown>) || undefined;
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
}

