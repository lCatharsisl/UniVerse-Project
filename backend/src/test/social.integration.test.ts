import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

describe('Social integration (safe cases)', () => {
  it('GET /api/social/health returns service status', async () => {
    process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret-32-characters-min';
    process.env.NODE_ENV = 'test';

    const { default: app } = await import('../app');
    const response = await request(app).get('/api/social/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      service: 'social',
    });
  });

  it('GET /api/social/feed returns 401 without token', async () => {
    process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret-32-characters-min';
    process.env.NODE_ENV = 'test';

    const { default: app } = await import('../app');
    const response = await request(app).get('/api/social/feed');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });

  it('POST /api/social/posts/:id/report returns 201 with mocked auth/moderation', async () => {
    process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret-32-characters-min';
    process.env.NODE_ENV = 'test';

    vi.doMock('../middleware/auth', () => ({
      authenticateSession: (req: any, _res: any, next: any) => {
        req.userId = 77;
        req.userRole = 'student';
        req.isBanned = false;
        next();
      },
    }));

    vi.doMock('../modules/social/infrastructure/moderation.service', () => ({
      isAcademic: vi.fn().mockReturnValue(false),
      ModerationService: {
        reportPost: vi.fn().mockResolvedValue(undefined),
      },
    }));

    const { default: app } = await import('../app');
    const response = await request(app)
      .post('/api/social/posts/12/report')
      .set('Authorization', 'Bearer mocked')
      .send({ reportType: 'spam' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ message: 'Report submitted' });
  });

  it('GET /api/social/reported/posts returns 403 for non-academic user', async () => {
    process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret-32-characters-min';
    process.env.NODE_ENV = 'test';

    vi.doMock('../middleware/auth', () => ({
      authenticateSession: (req: any, _res: any, next: any) => {
        req.userId = 77;
        req.userRole = 'student';
        req.isBanned = false;
        next();
      },
    }));

    vi.doMock('../modules/social/infrastructure/moderation.service', () => ({
      isAcademic: vi.fn().mockReturnValue(false),
      ModerationService: {
        getReportedPosts: vi.fn(),
      },
    }));

    const { default: app } = await import('../app');
    const response = await request(app)
      .get('/api/social/reported/posts')
      .set('Authorization', 'Bearer mocked');

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ error: 'Academic access only' });
  });

  it('GET /api/social/reported/posts returns 200 for academic user', async () => {
    process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret-32-characters-min';
    process.env.NODE_ENV = 'test';

    vi.doMock('../middleware/auth', () => ({
      authenticateSession: (req: any, _res: any, next: any) => {
        req.userId = 12;
        req.userRole = 'staff';
        req.isBanned = false;
        next();
      },
    }));

    vi.doMock('../modules/social/infrastructure/moderation.service', () => ({
      isAcademic: vi.fn().mockReturnValue(true),
      ModerationService: {
        getReportedPosts: vi.fn().mockResolvedValue([{ post_id: 8, reports_count: 2 }]),
      },
    }));

    const { default: app } = await import('../app');
    const response = await request(app)
      .get('/api/social/reported/posts')
      .set('Authorization', 'Bearer mocked');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject([{ post_id: 8, reports_count: 2 }]);
  });

  it('GET /api/social/feed returns empty payload for banned user', async () => {
    process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret-32-characters-min';
    process.env.NODE_ENV = 'test';

    vi.doMock('../middleware/auth', () => ({
      authenticateSession: (req: any, _res: any, next: any) => {
        req.userId = 12;
        req.userRole = 'student';
        req.isBanned = true;
        next();
      },
    }));

    const { default: app } = await import('../app');
    const response = await request(app)
      .get('/api/social/feed')
      .set('Authorization', 'Bearer mocked');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ items: [], total: 0 });
  });
});
