import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

describe('Community integration (safe cases)', () => {
  it('GET /api/community/fair returns 401 without token', async () => {
    process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret-32-characters-min';
    process.env.NODE_ENV = 'test';

    const { default: app } = await import('../app');
    const response = await request(app).get('/api/community/fair');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });

  it('GET /api/community/fair returns fair communities with mocked auth/service', async () => {
    process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret-32-characters-min';
    process.env.NODE_ENV = 'test';

    vi.doMock('../middleware/auth', () => ({
      authenticateSession: (req: any, _res: any, next: any) => {
        req.userId = 42;
        req.userRole = 'student';
        next();
      },
    }));

    vi.doMock('../modules/community/infrastructure/community.service', () => ({
      CommunityService: {
        getFairCommunities: vi.fn().mockResolvedValue({
          items: [{ community_id: 1, community_name: 'Test Community' }],
        }),
      },
    }));

    const { default: app } = await import('../app');
    const response = await request(app)
      .get('/api/community/fair')
      .set('Authorization', 'Bearer mocked');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      items: [{ community_id: 1, community_name: 'Test Community' }],
    });
  });

  it('GET /api/community/me returns 400 for invalid mocked session user id', async () => {
    process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret-32-characters-min';
    process.env.NODE_ENV = 'test';

    vi.doMock('../middleware/auth', () => ({
      authenticateSession: (req: any, _res: any, next: any) => {
        req.userId = Number.NaN;
        next();
      },
    }));

    const { default: app } = await import('../app');
    const response = await request(app)
      .get('/api/community/me')
      .set('Authorization', 'Bearer mocked');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: 'Invalid session user id',
    });
  });

  it('GET /api/community/me returns user communities with mocked service', async () => {
    process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret-32-characters-min';
    process.env.NODE_ENV = 'test';

    vi.doMock('../middleware/auth', () => ({
      authenticateSession: (req: any, _res: any, next: any) => {
        req.userId = 42;
        next();
      },
    }));

    vi.doMock('../modules/community/infrastructure/community.service', () => ({
      CommunityService: {
        getMyCommunities: vi.fn().mockResolvedValue({
          communities: [{ community_id: 1, community_name: 'Test Community' }],
        }),
      },
    }));

    const { default: app } = await import('../app');
    const response = await request(app)
      .get('/api/community/me')
      .set('Authorization', 'Bearer mocked');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      communities: [{ community_id: 1, community_name: 'Test Community' }],
    });
  });

  it('PATCH /api/community/:communityId/categories returns 403 for non-owner', async () => {
    process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret-32-characters-min';
    process.env.NODE_ENV = 'test';

    vi.doMock('../middleware/auth', () => ({
      authenticateSession: (req: any, _res: any, next: any) => {
        req.userId = 42;
        req.userRole = 'community';
        next();
      },
    }));

    vi.doMock('../modules/community/infrastructure/community.service', () => ({
      CommunityService: {
        updateCommunityCategories: vi.fn().mockRejectedValue(new Error('Only community owner can edit categories')),
      },
    }));

    const { default: app } = await import('../app');
    const response = await request(app)
      .patch('/api/community/1/categories')
      .set('Authorization', 'Bearer mocked')
      .send({ categories: ['tech'] });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: 'Only community owner can edit categories' });
  });
});
