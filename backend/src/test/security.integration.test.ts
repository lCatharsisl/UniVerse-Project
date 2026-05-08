import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const setTestEnv = () => {
  process.env.SESSION_SECRET = 'test-session-secret-32-characters-min';
  process.env.NODE_ENV = 'test';
};

beforeEach(() => {
  setTestEnv();
});

afterEach(() => {
  delete process.env.CORS_ORIGINS;
  vi.resetModules();
  vi.restoreAllMocks();
});

describe('Security integration coverage', () => {
  it('applies baseline security headers without enabling a broad CSP', async () => {
    const { default: app } = await import('../app');

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect(response.headers['content-security-policy']).toBeUndefined();
  });

  it('allows only configured browser origins to receive credentialed CORS headers', async () => {
    process.env.CORS_ORIGINS = 'https://mobile.yasar.example';

    const { default: app } = await import('../app');

    const allowed = await request(app)
      .get('/health')
      .set('Origin', 'https://mobile.yasar.example');
    const blocked = await request(app)
      .get('/health')
      .set('Origin', 'https://evil.example');

    expect(allowed.status).toBe(200);
    expect(allowed.headers['access-control-allow-origin']).toBe('https://mobile.yasar.example');
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('rejects expired bearer sessions without requiring a real database connection', async () => {
    const queryOne = vi.fn().mockResolvedValue(null);
    vi.doMock('../config/db', () => ({ queryOne }));

    const { default: app } = await import('../app');
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer expired-session-token');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      error: 'Unauthorized: Invalid or expired session',
    });
    expect(queryOne).toHaveBeenCalledWith(expect.stringContaining('user_sessions'), [
      'expired-session-token',
    ]);
  });

  it('rate limits authenticated search traffic before it can fan out to services', async () => {
    vi.doMock('../middleware/auth', () => ({
      authenticateSession: (req: any, _res: any, next: any) => {
        req.userId = 77;
        req.userRole = 'student';
        next();
      },
    }));

    const searchAll = vi.fn().mockResolvedValue({
      users: [],
      posts: [],
      communities: [],
      nextCursor: null,
    });
    vi.doMock('../modules/search/infrastructure/search.service', () => ({ searchAll }));

    const { default: app } = await import('../app');

    for (let i = 0; i < 30; i += 1) {
      const response = await request(app)
        .get('/api/search?q=campus')
        .set('Authorization', 'Bearer mocked-session');

      expect(response.status).toBe(200);
    }

    const limited = await request(app)
      .get('/api/search?q=campus')
      .set('Authorization', 'Bearer mocked-session');

    expect(limited.status).toBe(429);
    expect(limited.text).toContain('Too many search requests');
    expect(searchAll).toHaveBeenCalledTimes(30);
  });

  it('rejects staff-only mutations from student callers', async () => {
    vi.doMock('../middleware/auth', () => ({
      authenticateSession: (req: any, _res: any, next: any) => {
        req.userId = 12;
        req.userRole = 'student';
        req.isBanned = false;
        next();
      },
    }));

    const { default: app } = await import('../app');
    const res = await request(app)
      .put('/api/academic/staff/availability')
      .set('Authorization', 'Bearer student-token')
      .send({ slots: [] });

    expect(res.status).toBe(403);
    expect(String(res.body.error || '')).toMatch(/staff/i);
  });

  it('rate limits repeated login attempts from the same IP', async () => {
    vi.doMock('../modules/identity/application/commands/login.handler', () => ({
      LoginHandler: {
        execute: async () => ({ success: false, error: 'Invalid credentials' }),
      },
    }));

    const { default: app } = await import('../app');

    for (let i = 0; i < 5; i += 1) {
      const r = await request(app).post('/api/auth/login').send({
        email: 'user@stu.yasar.edu.tr',
        password: 'wrongpassword',
      });
      expect(r.status).toBe(401);
    }

    const blocked = await request(app).post('/api/auth/login').send({
      email: 'user@stu.yasar.edu.tr',
      password: 'wrongpassword',
    });
    expect(blocked.status).toBe(429);
    expect(blocked.text).toMatch(/Too many authentication attempts/i);
  });
});
