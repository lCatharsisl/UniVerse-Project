/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';
import { runWhenIdle } from '../utils/runWhenIdle';
import { urlBase64ToUint8Array } from '../utils/webPush';
export type UnreadByScope = {
  personal: number;
  academic: number;
  community: number;
};

type NotificationsContextType = {
  unreadCount: number;
  unreadByScope: UnreadByScope;
  refreshUnreadCount: (force?: boolean) => Promise<void>;
  browserNotificationPermission: NotificationPermission | 'unsupported';
  requestBrowserNotificationPermission: () => Promise<NotificationPermission | 'unsupported'>;
};

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);
const UNREAD_CACHE_KEY = 'notifications:unread-cache:v1';
const LAST_SEEN_NOTIFICATION_ID_KEY = 'notifications:last-seen-id:v1';
type BrowserNotificationRow = {
  notification_id: number;
  title?: string | null;
  message?: string | null;
  kind?: string | null;
  source_module?: string | null;
};

type UnreadCacheShape = {
  unreadCount: number;
  unreadByScope: UnreadByScope;
};

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const raw = window.localStorage.getItem(UNREAD_CACHE_KEY);
      if (!raw) return 0;
      const parsed = JSON.parse(raw) as UnreadCacheShape;
      return Number.isFinite(parsed?.unreadCount) ? parsed.unreadCount : 0;
    } catch {
      return 0;
    }
  });
  const [unreadByScope, setUnreadByScope] = useState<UnreadByScope>(() => {
    if (typeof window === 'undefined') return { personal: 0, academic: 0, community: 0 };
    try {
      const raw = window.localStorage.getItem(UNREAD_CACHE_KEY);
      if (!raw) return { personal: 0, academic: 0, community: 0 };
      const parsed = JSON.parse(raw) as UnreadCacheShape;
      const scope = parsed?.unreadByScope;
      return {
        personal: Number.isFinite(Number(scope?.personal)) ? Number(scope?.personal) : 0,
        academic: Number.isFinite(Number(scope?.academic)) ? Number(scope?.academic) : 0,
        community: Number.isFinite(Number(scope?.community)) ? Number(scope?.community) : 0,
      };
    } catch {
      return { personal: 0, academic: 0, community: 0 };
    }
  });
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState<NotificationPermission | 'unsupported'>(
    typeof window !== 'undefined' && 'Notification' in window ? window.Notification.permission : 'unsupported'
  );
  const lastRefreshAtRef = useRef(0);
  const previousUnreadCountRef = useRef(unreadCount);
  /** After successful Web Push registration, suppress `window.Notification` to avoid duplicates with SW push. */
  const skipForegroundBrowserNotificationRef = useRef(false);

  const persistUnreadCache = useCallback((count: number, byScope: UnreadByScope) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      UNREAD_CACHE_KEY,
      JSON.stringify({
        unreadCount: count,
        unreadByScope: byScope,
      } satisfies UnreadCacheShape)
    );
  }, []);

  const requestBrowserNotificationPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported' as const;
    const permission = await window.Notification.requestPermission();
    setBrowserNotificationPermission(permission);
    return permission;
  }, []);

  const refreshUnreadCount = useCallback(async (force?: boolean) => {
    if (!user?.userId) {
      setUnreadCount(0);
      setUnreadByScope({ personal: 0, academic: 0, community: 0 });
      return;
    }
    const now = Date.now();
    if (!force && now - lastRefreshAtRef.current < 15000) return;
    const res = await api.get('/notifications/unread-count');
    const count = Number(res.data?.count ?? 0);
    const nextCount = Number.isFinite(count) ? count : 0;
    const b = res.data?.byScope;
    const nextByScope = {
      personal: Number.isFinite(Number(b?.personal)) ? Number(b.personal) : 0,
      academic: Number.isFinite(Number(b?.academic)) ? Number(b.academic) : 0,
      community: Number.isFinite(Number(b?.community)) ? Number(b.community) : 0,
    };
    setUnreadCount(nextCount);
    setUnreadByScope(nextByScope);
    persistUnreadCache(nextCount, nextByScope);
    lastRefreshAtRef.current = now;
  }, [user?.userId, persistUnreadCache]);

  useEffect(() => {
    if (!user?.userId) {
      skipForegroundBrowserNotificationRef.current = false;
      return;
    }
    if (import.meta.env.DEV || browserNotificationPermission !== 'granted') {
      if (browserNotificationPermission !== 'granted') {
        skipForegroundBrowserNotificationRef.current = false;
      }
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const fromEnv = import.meta.env.VITE_VAPID_PUBLIC_KEY?.trim();
        const vapid =
          fromEnv && fromEnv.length > 0
            ? fromEnv
            : (await api.get<{ publicKey: string | null }>('/notifications/push/public-key')).data?.publicKey?.trim() ??
              null;
        if (!vapid || cancelled) return;

        const reg = await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        sub =
          sub ||
          (await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapid),
          }));

        const json = sub.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

        await api.post('/notifications/push/subscribe', { subscription: json });
        if (!cancelled) skipForegroundBrowserNotificationRef.current = true;
      } catch (e) {
        console.warn('[web-push] subscribe failed', e);
        if (!cancelled) skipForegroundBrowserNotificationRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.userId, browserNotificationPermission]);

  useEffect(() => {
    if (!user?.userId) return;
    if (browserNotificationPermission !== 'granted') {
      previousUnreadCountRef.current = unreadCount;
      return;
    }
    if (unreadCount <= previousUnreadCountRef.current) {
      previousUnreadCountRef.current = unreadCount;
      return;
    }

    const newItemsCount = unreadCount - previousUnreadCountRef.current;
    previousUnreadCountRef.current = unreadCount;

    void (async () => {
      try {
        const res = await api.get('/notifications', {
          params: { limit: Math.min(Math.max(newItemsCount, 1), 5), offset: 0, scope: 'personal' },
        });
        const items = ((res.data?.items || []) as BrowserNotificationRow[]).filter(
          (item) => String(item.source_module || '').toLowerCase() !== 'messaging'
        );
        if (!items.length) return;

        const lastSeenId = Number(window.localStorage.getItem(LAST_SEEN_NOTIFICATION_ID_KEY) || '0');
        const freshItems = items.filter((item) => Number(item.notification_id) > lastSeenId);
        if (!freshItems.length) return;

        const newestId = Math.max(...freshItems.map((item) => Number(item.notification_id) || 0));
        window.localStorage.setItem(LAST_SEEN_NOTIFICATION_ID_KEY, String(newestId));

        const top = freshItems[0];
        const title = freshItems.length > 1 ? `UniVerse • ${freshItems.length} new notifications` : 'UniVerse';
        const topLine = top.title?.trim() || top.message?.trim() || top.kind?.replace(/[._]/g, ' ') || 'New notification';
        const body = freshItems.length > 1 ? `${topLine} + ${freshItems.length - 1} more` : topLine;

        if (skipForegroundBrowserNotificationRef.current) return;

        new window.Notification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: `notifications-${newestId}`,
        });
      } catch {
        /* non-fatal */
      }
    })();
  }, [browserNotificationPermission, unreadCount, user?.userId]);

  useEffect(() => {
    const cancel = runWhenIdle(() => void refreshUnreadCount(), { timeoutMs: 2400 });

    const id = user?.userId
      ? window.setInterval(() => {
          if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
          refreshUnreadCount().catch(() => {});
        }, 45000)
      : undefined;

    const onFocus = () => { refreshUnreadCount().catch(() => {}); };
    const onVis = () => {
      if (document.visibilityState === 'visible') refreshUnreadCount().catch(() => {});
    };
    if (user?.userId) {
      window.addEventListener('focus', onFocus);
      document.addEventListener('visibilitychange', onVis);
    }

    return () => {
      cancel();
      if (id !== undefined) window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [user?.userId, refreshUnreadCount]);

  const value = useMemo(
    () => ({
      unreadCount,
      unreadByScope,
      refreshUnreadCount,
      browserNotificationPermission,
      requestBrowserNotificationPermission,
    }),
    [unreadCount, unreadByScope, refreshUnreadCount, browserNotificationPermission, requestBrowserNotificationPermission]
  );
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationsProvider');
  return ctx;
}
