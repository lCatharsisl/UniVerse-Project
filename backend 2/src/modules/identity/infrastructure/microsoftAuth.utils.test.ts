import { describe, expect, it } from 'vitest';
import {
  inferYasarRoleFromEmail,
  readMicrosoftAuthState,
  sanitizeReturnTo,
  sealMicrosoftAuthState,
  splitDisplayName,
} from './microsoftAuth.utils';

describe('microsoftAuth.utils', () => {
  it('infers Yaşar roles from known email domains', () => {
    expect(inferYasarRoleFromEmail('12345@stu.yasar.edu.tr')).toBe('student');
    expect(inferYasarRoleFromEmail('personel@yasar.edu.tr')).toBe('staff');
    expect(inferYasarRoleFromEmail('user@gmail.com')).toBeNull();
  });

  it('sanitizes unsafe return paths', () => {
    expect(sanitizeReturnTo('/messages')).toBe('/messages');
    expect(sanitizeReturnTo('https://evil.example')).toBe('/feed');
    expect(sanitizeReturnTo('//evil.example')).toBe('/feed');
    expect(sanitizeReturnTo(undefined)).toBe('/feed');
  });

  it('round-trips signed auth state', () => {
    const secret = 'x'.repeat(32);
    const sealed = sealMicrosoftAuthState(
      { nonce: 'nonce-123', returnTo: '/profile', issuedAt: Date.now() },
      secret
    );

    expect(readMicrosoftAuthState(sealed, secret)).toMatchObject({
      nonce: 'nonce-123',
      returnTo: '/profile',
    });
  });

  it('splits display names safely', () => {
    expect(splitDisplayName('Ada Lovelace')).toEqual({ firstName: 'Ada', lastName: 'Lovelace' });
    expect(splitDisplayName('Plato')).toEqual({ firstName: 'Plato', lastName: '' });
  });
});
