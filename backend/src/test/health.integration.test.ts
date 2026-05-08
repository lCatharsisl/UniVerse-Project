import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

describe('GET /health', () => {
  it('returns 200 with basic health payload', async () => {
    process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret-32-characters-min';
    process.env.NODE_ENV = 'test';

    const { default: app } = await import('../app');

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
    });
    expect(typeof response.body.timestamp).toBe('string');
  });

  it('returns liveness payload from /health/live', async () => {
    process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret-32-characters-min';
    process.env.NODE_ENV = 'test';

    const { default: app } = await import('../app');
    const response = await request(app).get('/health/live');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      environment: 'test',
    });
  });

  it('returns readiness payload from /health/ready with mocked database', async () => {
    process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret-32-characters-min';
    process.env.NODE_ENV = 'test';

    vi.doMock('../config/db', () => ({
      getPool: () => ({
        query: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
      }),
    }));

    const { default: app } = await import('../app');
    const response = await request(app).get('/health/ready');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ready',
      services: {
        database: 'connected',
      },
    });
  });
});
