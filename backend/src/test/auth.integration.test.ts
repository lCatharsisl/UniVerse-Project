import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

describe('Auth integration (safe cases)', () => {
  it('GET /api/auth/me returns 401 when token is missing', async () => {
    process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret-32-characters-min';
    process.env.NODE_ENV = 'test';

    const { default: app } = await import('../app');
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });

  it('POST /api/auth/login returns 400 when email/password missing', async () => {
    process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret-32-characters-min';
    process.env.NODE_ENV = 'test';

    const { default: app } = await import('../app');
    const response = await request(app).post('/api/auth/login').send({});

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: 'Email and password are required',
    });
  });

  it('POST /api/auth/login returns session token on success', async () => {
    process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret-32-characters-min';
    process.env.NODE_ENV = 'test';

    vi.doMock('../modules/identity/application/commands/login.handler', () => ({
      LoginHandler: {
        execute: vi.fn().mockResolvedValue({
          success: true,
          data: {
            token: 'mock-session-token',
            user: {
              id: 99,
              email: 'test@stu.yasar.edu.tr',
              role: 'student',
            },
          },
        }),
      },
    }));

    const { default: app } = await import('../app');
    const response = await request(app).post('/api/auth/login').send({
      email: 'test@stu.yasar.edu.tr',
      password: 'strong-password',
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      sessionToken: 'mock-session-token',
      user: {
        id: 99,
        email: 'test@stu.yasar.edu.tr',
        role: 'student',
      },
    });
  });

  it('POST /api/auth/login is rate limited after repeated failed attempts', async () => {
    process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret-32-characters-min';
    process.env.NODE_ENV = 'test';

    const { default: app } = await import('../app');

    for (let i = 0; i < 5; i += 1) {
      const response = await request(app).post('/api/auth/login').send({});
      expect(response.status).toBe(400);
    }

    const limited = await request(app).post('/api/auth/login').send({});
    expect(limited.status).toBe(429);
    expect(limited.text).toContain('Too many authentication attempts');
  });

  it('GET /api/auth/me returns current user with mocked auth', async () => {
    process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret-32-characters-min';
    process.env.NODE_ENV = 'test';

    vi.doMock('../middleware/auth', () => ({
      authenticateSession: (req: any, _res: any, next: any) => {
        req.userId = 99;
        next();
      },
    }));

    vi.doMock('../modules/identity/infrastructure/identity.service', () => ({
      IdentityService: {
        getCurrentUser: vi.fn().mockResolvedValue({
          userId: 99,
          email: 'test@stu.yasar.edu.tr',
          role: 'student',
          isEmailVerified: true,
          profile: {},
        }),
      },
    }));

    const { default: app } = await import('../app');
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer any-token');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      userId: 99,
      email: 'test@stu.yasar.edu.tr',
      role: 'student',
      isEmailVerified: true,
    });
  });
});
