/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';
import { runWhenIdle } from '../utils/runWhenIdle';

type MessagingUnreadContextType = {
  messagesUnreadCount: number;
  refreshMessagesUnreadCount: () => Promise<void>;
};

const MessagingUnreadContext = createContext<MessagingUnreadContextType | undefined>(undefined);

export function MessagingUnreadProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [messagesUnreadCount, setMessagesUnreadCount] = useState(0);
  const lastRefreshAtRef = useRef(0);

  const refreshMessagesUnreadCount = useCallback(async () => {
    if (!user) {
      setMessagesUnreadCount(0);
      return;
    }
    try {
      const now = Date.now();
      if (now - lastRefreshAtRef.current < 15000) return;
      const res = await api.get('/messages/unread-count', { timeout: 10000 });
      const totalUnread = Number(res.data?.count ?? 0);
      setMessagesUnreadCount(Number.isFinite(totalUnread) ? totalUnread : 0);
      lastRefreshAtRef.current = now;
    } catch {
      // keep previous count on transient errors
    }
  }, [user]);

  useEffect(() => {
    const cancel = runWhenIdle(() => void refreshMessagesUnreadCount(), { timeoutMs: 2800 });

    const id = user
      ? window.setInterval(() => {
          if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
          refreshMessagesUnreadCount().catch(() => {});
        }, 45000)
      : undefined;

    const onFocus = () => { refreshMessagesUnreadCount().catch(() => {}); };
    const onVis = () => {
      if (document.visibilityState === 'visible') refreshMessagesUnreadCount().catch(() => {});
    };
    if (user) {
      window.addEventListener('focus', onFocus);
      document.addEventListener('visibilitychange', onVis);
    }

    return () => {
      cancel();
      if (id !== undefined) window.clearInterval(id);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [user, refreshMessagesUnreadCount]);

  const value = useMemo(
    () => ({ messagesUnreadCount, refreshMessagesUnreadCount }),
    [messagesUnreadCount, refreshMessagesUnreadCount]
  );

  return <MessagingUnreadContext.Provider value={value}>{children}</MessagingUnreadContext.Provider>;
}

export function useMessagingUnread() {
  const ctx = useContext(MessagingUnreadContext);
  if (!ctx) throw new Error('useMessagingUnread must be used within MessagingUnreadProvider');
  return ctx;
}
