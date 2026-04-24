import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

export type UnreadByScope = {
  personal: number;
  academic: number;
  community: number;
};

type NotificationsContextType = {
  unreadCount: number;
  unreadByScope: UnreadByScope;
  refreshUnreadCount: (force?: boolean) => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadByScope, setUnreadByScope] = useState<UnreadByScope>({ personal: 0, academic: 0, community: 0 });
  const lastRefreshAtRef = useRef(0);

  const refreshUnreadCount = useCallback(async (force?: boolean) => {
    if (!user?.userId) {
      setUnreadCount(0);
      setUnreadByScope({ personal: 0, academic: 0, community: 0 });
      return;
    }
    const now = Date.now();
    if (!force && now - lastRefreshAtRef.current < 10000) return;
    const res = await api.get('/notifications/unread-count');
    const count = Number(res.data?.count ?? 0);
    setUnreadCount(Number.isFinite(count) ? count : 0);
    const b = res.data?.byScope;
    setUnreadByScope({
      personal: Number.isFinite(Number(b?.personal)) ? Number(b.personal) : 0,
      academic: Number.isFinite(Number(b?.academic)) ? Number(b.academic) : 0,
      community: Number.isFinite(Number(b?.community)) ? Number(b.community) : 0,
    });
    lastRefreshAtRef.current = now;
  }, [user?.userId]);

  useEffect(() => {
    refreshUnreadCount().catch(() => {});
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!user?.userId) return;
    const id = window.setInterval(() => {
      refreshUnreadCount().catch(() => {});
    }, 30000);
    return () => window.clearInterval(id);
  }, [user?.userId, refreshUnreadCount]);

  useEffect(() => {
    if (!user?.userId) return;
    const onFocus = () => {
      refreshUnreadCount().catch(() => {});
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') refreshUnreadCount().catch(() => {});
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [user?.userId, refreshUnreadCount]);

  const value = useMemo(
    () => ({ unreadCount, unreadByScope, refreshUnreadCount }),
    [unreadCount, unreadByScope, refreshUnreadCount]
  );
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationsProvider');
  return ctx;
}
