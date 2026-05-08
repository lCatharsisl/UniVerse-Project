// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  localStorage.clear();
  window.history.pushState({}, '', '/');
});

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
});

describe('API client smoke behavior', () => {
  it('adds the stored session token to outgoing API requests', async () => {
    localStorage.setItem('sessionToken', 'session-token-123');
    const { default: api } = await import('../api/client');

    const adapter = vi.fn().mockResolvedValue({
      data: { ok: true },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    });
    api.defaults.adapter = adapter;

    await api.get('/auth/me');

    expect(adapter).toHaveBeenCalledTimes(1);
    expect(adapter.mock.calls[0][0].headers.Authorization).toBe('Bearer session-token-123');
  });

  it('clears a stale token before redirecting on protected API 401s', async () => {
    window.history.pushState({}, '', '/feed');
    localStorage.setItem('sessionToken', 'stale-token');
    const { default: api } = await import('../api/client');
    const originalRemoveItem = Storage.prototype.removeItem;
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function removeAndStop(
      this: Storage,
      key: string
    ) {
      originalRemoveItem.call(this, key);
      throw new Error('stop before jsdom navigation');
    });

    api.defaults.adapter = vi.fn().mockRejectedValue({
      response: { status: 401 },
    });

    await expect(api.get('/auth/me')).rejects.toThrow('stop before jsdom navigation');

    expect(removeItem).toHaveBeenCalledWith('sessionToken');
    expect(localStorage.getItem('sessionToken')).toBeNull();
  });

  it('preserves the token on login/register 401s so the page can show its own error', async () => {
    window.history.pushState({}, '', '/login');
    localStorage.setItem('sessionToken', 'existing-token');
    const { default: api } = await import('../api/client');

    api.defaults.adapter = vi.fn().mockRejectedValue({
      response: { status: 401 },
    });

    await expect(api.post('/auth/login', {})).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(localStorage.getItem('sessionToken')).toBe('existing-token');
  });
});
