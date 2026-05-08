import api from '../api/client';

/** VAPID public key (URL-safe base64) → `BufferSource` for `PushManager.subscribe`. */
export function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray as BufferSource;
}

/** Remove server push rows and browser subscription (call while session cookie/token still valid). */
export async function teardownWebPush(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    await api.delete('/notifications/push/subscriptions').catch(() => {});
    // `serviceWorker.ready` can hang on some mobile browsers; prefer registration lookup.
    const reg =
      (await navigator.serviceWorker.getRegistration().catch(() => undefined)) ??
      (await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<undefined>((resolve) => window.setTimeout(() => resolve(undefined), 2000)),
      ]).catch(() => undefined));
    const sub = await reg?.pushManager.getSubscription();
    await sub?.unsubscribe();
  } catch {
    /* non-fatal */
  }
}
