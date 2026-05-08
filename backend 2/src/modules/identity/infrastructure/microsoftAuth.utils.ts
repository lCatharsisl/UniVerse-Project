import { createHmac, timingSafeEqual } from 'crypto';

export type MicrosoftSsoRole = 'student' | 'staff';

export type MicrosoftAuthState = {
  nonce: string;
  returnTo: string;
  issuedAt: number;
};

function toBase64Url(value: Buffer | string): string {
  const source = typeof value === 'string' ? Buffer.from(value, 'utf8') : value;
  return source
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value: string): Buffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (normalized.length % 4 || 4)) % 4;
  return Buffer.from(normalized + '='.repeat(padding), 'base64');
}

export function sanitizeReturnTo(value?: string): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/feed';
  }

  return value;
}

export function normalizeMicrosoftEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function inferYasarRoleFromEmail(email: string): MicrosoftSsoRole | null {
  const normalized = normalizeMicrosoftEmail(email);

  if (normalized.endsWith('@stu.yasar.edu.tr')) {
    return 'student';
  }

  if (normalized.endsWith('@yasar.edu.tr')) {
    return 'staff';
  }

  return null;
}

export function splitDisplayName(name?: string | null): { firstName: string; lastName: string } {
  const normalized = (name || '').trim().replace(/\s+/g, ' ');
  if (!normalized) {
    return { firstName: '', lastName: '' };
  }

  const parts = normalized.split(' ');
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }

  return {
    firstName: parts.slice(0, -1).join(' '),
    lastName: parts[parts.length - 1],
  };
}

export function sealMicrosoftAuthState(state: MicrosoftAuthState, secret: string): string {
  const payload = toBase64Url(JSON.stringify({
    ...state,
    returnTo: sanitizeReturnTo(state.returnTo),
  }));
  const signature = toBase64Url(createHmac('sha256', secret).update(payload).digest());
  return `${payload}.${signature}`;
}

export function readMicrosoftAuthState(state: string, secret: string, maxAgeMs = 10 * 60 * 1000): MicrosoftAuthState {
  const [payload, signature] = state.split('.');
  if (!payload || !signature) {
    throw new Error('Invalid Microsoft auth state');
  }

  const expectedSignature = createHmac('sha256', secret).update(payload).digest();
  const actualSignature = fromBase64Url(signature);

  if (
    expectedSignature.length !== actualSignature.length ||
    !timingSafeEqual(expectedSignature, actualSignature)
  ) {
    throw new Error('Invalid Microsoft auth state signature');
  }

  const parsed = JSON.parse(fromBase64Url(payload).toString('utf8')) as Partial<MicrosoftAuthState>;
  const issuedAt = Number(parsed.issuedAt);

  if (!parsed.nonce || !Number.isFinite(issuedAt)) {
    throw new Error('Invalid Microsoft auth state payload');
  }

  if (Date.now() - issuedAt > maxAgeMs) {
    throw new Error('Microsoft auth state expired');
  }

  return {
    nonce: parsed.nonce,
    returnTo: sanitizeReturnTo(parsed.returnTo),
    issuedAt,
  };
}
