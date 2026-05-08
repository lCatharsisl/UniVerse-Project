import { boolean, integer, pgTable, text } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  userId: integer('user_id').primaryKey(),
  email: text('email').notNull(),
  role: text('role').notNull(),
  isEmailVerified: boolean('is_email_verified'),
  profileImageUrl: text('profile_image_url'),
  warningTier: integer('warning_tier'),
  isBanned: boolean('is_banned'),
  isActive: boolean('is_active'),
});
