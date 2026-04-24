import request from 'supertest';
import { describe, expect, it } from 'vitest';

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
});
