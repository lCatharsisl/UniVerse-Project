import env from '../config/env';
import { AppError } from '../shared/core/errors';

export const DEFAULT_PLATFORM_ADMIN_EMAIL = 'admin@yasar.edu.tr';

/** Tek platform yöneticisi e-postası; `PLATFORM_ADMIN_EMAIL` ile değiştirilebilir */
export function getPlatformAdminEmail(): string {
  const configured = env.PLATFORM_ADMIN_EMAIL?.trim().toLowerCase();
  return configured && configured.includes('@') ? configured : DEFAULT_PLATFORM_ADMIN_EMAIL;
}

export function normalizeUserEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

export function isReservedPlatformAdminEmail(email: string): boolean {
  return normalizeUserEmail(email) === getPlatformAdminEmail();
}

/**
 * Güçlü şifre politikası — yalnızca ayarlı platform yöneticisi hesabında parola oluştururken/güncellerken zorunlu.
 */
export function assertStrongPasswordForPlatformAdmin(password: string): void {
  if (typeof password !== 'string' || password.length < 16) {
    throw AppError.badRequest('Platform administrator password must be at least 16 characters.');
  }
  if (!/[a-z]/.test(password)) throw AppError.badRequest('Password must include a lowercase letter.');
  if (!/[A-Z]/.test(password)) throw AppError.badRequest('Password must include an uppercase letter.');
  if (!/[0-9]/.test(password)) throw AppError.badRequest('Password must include a digit.');
  if (!/[^A-Za-z0-9]/.test(password)) {
    throw AppError.badRequest('Password must include a symbol (for example !@#$).');
  }
}
