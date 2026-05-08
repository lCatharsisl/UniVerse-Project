import { describe, expect, it } from 'vitest';
import { normalizeApiBaseUrl, uploadsBaseFromApiRoot } from './apiBase';

describe('apiBase helpers', () => {
  it('normalizeApiBaseUrl defaults to relative /api', () => {
    expect(normalizeApiBaseUrl(undefined)).toBe('/api');
    expect(normalizeApiBaseUrl('')).toBe('/api');
    expect(normalizeApiBaseUrl('   ')).toBe('/api');
  });

  it('normalizeApiBaseUrl appends /api when missing', () => {
    expect(normalizeApiBaseUrl('https://api.example.com')).toBe('https://api.example.com/api');
    expect(normalizeApiBaseUrl('https://api.example.com/')).toBe('https://api.example.com/api');
  });

  it('normalizeApiBaseUrl keeps trailing /api', () => {
    expect(normalizeApiBaseUrl('https://api.example.com/api')).toBe('https://api.example.com/api');
    expect(normalizeApiBaseUrl('https://api.example.com/api/')).toBe('https://api.example.com/api');
  });

  it('uploadsBaseFromApiRoot strips /api', () => {
    expect(uploadsBaseFromApiRoot('https://api.example.com/api')).toBe('https://api.example.com');
    expect(uploadsBaseFromApiRoot('https://api.example.com/api/')).toBe('https://api.example.com');
    expect(uploadsBaseFromApiRoot('https://api.example.com')).toBe('https://api.example.com');
  });
});
