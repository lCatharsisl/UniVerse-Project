/** İlk yüklemede kritik işleri (kimlik doğrulama, route verisi) kazanmak için yan istekleri erteler. */

export function runWhenIdle(fn: () => void, options?: { timeoutMs?: number }): () => void {
  const timeout = options?.timeoutMs ?? 2000;
  if (typeof globalThis.requestIdleCallback === 'function') {
    const id = globalThis.requestIdleCallback(() => fn(), { timeout });
    return () => globalThis.cancelIdleCallback(id);
  }
  const id = window.setTimeout(fn, 1);
  return () => window.clearTimeout(id);
}
