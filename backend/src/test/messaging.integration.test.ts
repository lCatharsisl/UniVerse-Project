import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

describe('Messaging integration (safe cases)', () => {
  it('GET /api/messages/users/search returns 400 when q is missing', async () => {
    process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret-32-characters-min';
    process.env.NODE_ENV = 'test';

    vi.doMock('../middleware/auth', () => ({
      authenticateSession: (req: any, _res: any, next: any) => {
        req.userId = 99;
        next();
      },
    }));

    const { default: app } = await import('../app');
    const response = await request(app)
      .get('/api/messages/users/search')
      .set('Authorization', 'Bearer mocked');

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: 'q is required',
    });
  });

  it('GET /api/messages/users/search returns users with mocked service', async () => {
    process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret-32-characters-min';
    process.env.NODE_ENV = 'test';

    vi.doMock('../middleware/auth', () => ({
      authenticateSession: (req: any, _res: any, next: any) => {
        req.userId = 99;
        next();
      },
    }));

    vi.doMock('../modules/messaging/infrastructure/messaging.service', () => ({
      MessagingService: {
        searchUsers: vi.fn().mockResolvedValue([
          { user_id: 10, email: 'student@stu.yasar.edu.tr', first_name: 'Test', last_name: 'User' },
        ]),
      },
    }));

    const { default: app } = await import('../app');
    const response = await request(app)
      .get('/api/messages/users/search?q=test')
      .set('Authorization', 'Bearer mocked');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject([
      { user_id: 10, email: 'student@stu.yasar.edu.tr', first_name: 'Test', last_name: 'User' },
    ]);
  });

  it('POST /api/messages/conversations returns 400 when participantIds is not array', async () => {
    process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret-32-characters-min';
    process.env.NODE_ENV = 'test';

    vi.doMock('../middleware/auth', () => ({
      authenticateSession: (req: any, _res: any, next: any) => {
        req.userId = 99;
        next();
      },
    }));

    const { default: app } = await import('../app');
    const response = await request(app)
      .post('/api/messages/conversations')
      .set('Authorization', 'Bearer mocked')
      .send({ participantIds: 'not-an-array' });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      error: 'participantIds must be an array',
    });
  });

  it('POST /api/messages/conversations returns 201 with mocked service', async () => {
    process.env.SESSION_SECRET = process.env.SESSION_SECRET ?? 'test-session-secret-32-characters-min';
    process.env.NODE_ENV = 'test';

    vi.doMock('../middleware/auth', () => ({
      authenticateSession: (req: any, _res: any, next: any) => {
        req.userId = 99;
        next();
      },
    }));

    vi.doMock('../modules/messaging/infrastructure/messaging.service', () => ({
      MessagingService: {
        createConversation: vi.fn().mockResolvedValue({
          conversation_id: 123,
          is_group: false,
          title: null,
          members: [{ user_id: 99 }, { user_id: 10 }],
        }),
      },
    }));

    const { default: app } = await import('../app');
    const response = await request(app)
      .post('/api/messages/conversations')
      .set('Authorization', 'Bearer mocked')
      .send({ participantIds: [10], isGroup: false });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      conversation_id: 123,
      is_group: false,
    });
  });
});
