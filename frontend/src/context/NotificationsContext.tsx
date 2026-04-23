import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

type NotificationsContextType = {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const lastRefreshAtRef = useRef(0);

  const refreshUnreadCount = async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const now = Date.now();
    if (now - lastRefreshAtRef.current < 10000) return;
    const res = await api.get('/notifications/unread-count');
    const count = Number(res.data?.count ?? 0);
    setUnreadCount(Number.isFinite(count) ? count : 0);
    lastRefreshAtRef.current = now;
  };

  useEffect(() => {
    refreshUnreadCount().catch(() => {});
  }, [user?.userId]);

  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => {
      refreshUnreadCount().catch(() => {});
    }, 30000);
    return () => window.clearInterval(id);
  }, [user?.userId]);

  useEffect(() => {
    if (!user) return;
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
  }, [user?.userId]);

  const value = useMemo(() => ({ unreadCount, refreshUnreadCount }), [unreadCount]);
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationsProvider');
  return ctx;
}
