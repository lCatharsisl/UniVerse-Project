import { AuthenticatedRequest } from './auth';
import env from '../config/env';
import { AppError } from '../shared/core/errors';
import { logger } from '../utils/logger';

const ACADEMIC_ROLES = new Set(['staff', 'admin']);

function policyMeta(req: AuthenticatedRequest, policy: string, extra?: Record<string, unknown>) {
  return {
    policy,
    userId: req.userId ?? null,
    userRole: req.userRole ?? null,
    requestId: (req as any).requestId,
    path: req.originalUrl,
    method: req.method,
    ...extra,
  };
}

function logDenied(req: AuthenticatedRequest, policy: string, reason: string, extra?: Record<string, unknown>) {
  logger.warn('Authorization policy denied request', policyMeta(req, policy, { reason, ...extra }));
}

function logAllowed(req: AuthenticatedRequest, policy: string, extra?: Record<string, unknown>) {
  if (!env.AUTHORIZATION_AUDIT_ENABLED) return;
  logger.info('Authorization policy allowed request', policyMeta(req, policy, extra));
}

export function requireUser(req: AuthenticatedRequest, message: string = 'Unauthorized'): number {
  if (req.userId == null) {
    logDenied(req, 'requireUser', 'missing_user');
    throw AppError.unauthorized(message);
  }
  return req.userId;
}

export function requireRole(
  req: AuthenticatedRequest,
  roles: readonly string[],
  message: string = 'Forbidden'
): { userId: number; role: string } {
  const userId = requireUser(req);
  const role = String(req.userRole || '');
  if (!roles.includes(role)) {
    logDenied(req, 'requireRole', 'role_mismatch', { allowedRoles: roles, actualRole: role || null });
    throw AppError.forbidden(message);
  }
  logAllowed(req, 'requireRole', { allowedRoles: roles, grantedRole: role });
  return { userId, role };
}

export function requireAcademic(req: AuthenticatedRequest, message: string = 'Academic access only') {
  return requireRole(req, ['staff', 'admin'], message);
}

export function requireStudent(req: AuthenticatedRequest, message: string = 'Only students can perform this action') {
  return requireRole(req, ['student'], message);
}

export function requireStaff(req: AuthenticatedRequest, message: string = 'Only staff can perform this action') {
  return requireRole(req, ['staff'], message);
}

export function requireAdmin(req: AuthenticatedRequest, message: string = 'Administrator access required') {
  return requireRole(req, ['admin'], message);
}

export function requireNotBanned(
  req: AuthenticatedRequest,
  message: string = 'Access is restricted for this account'
) {
  if (req.isBanned) {
    logDenied(req, 'requireNotBanned', 'user_banned');
    throw AppError.forbidden(message);
  }
  const id = requireUser(req);
  logAllowed(req, 'requireNotBanned', {});
  return id;
}

export function requireIntParam(
  req: AuthenticatedRequest,
  paramName: string,
  message: string = `Invalid ${paramName}`
): number {
  const value = parseInt(String(req.params?.[paramName] || ''), 10);
  if (Number.isNaN(value)) {
    logDenied(req, 'requireIntParam', 'invalid_param', { paramName, rawValue: req.params?.[paramName] ?? null });
    throw AppError.badRequest(message);
  }
  return value;
}

export function isAcademicRole(role: string | null | undefined): boolean {
  return ACADEMIC_ROLES.has(String(role || ''));
}
