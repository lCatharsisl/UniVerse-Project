import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

type MessagingUnreadContextType = {
  messagesUnreadCount: number;
  refreshMessagesUnreadCount: () => Promise<void>;
};

const MessagingUnreadContext = createContext<MessagingUnreadContextType | undefined>(undefined);

export function MessagingUnreadProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [messagesUnreadCount, setMessagesUnreadCount] = useState(0);

  const refreshMessagesUnreadCount = useCallback(async () => {
    if (!user) {
      setMessagesUnreadCount(0);
      return;
    }
    try {
      const res = await api.get('/messages/conversations', { timeout: 20000 });
      const list = (res.data || []) as Array<{ unread_count?: number | string }>;
      const totalUnread = list.reduce((sum, c) => {
        const n = Number(c.unread_count);
        return sum + (Number.isFinite(n) && n > 0 ? n : 0);
      }, 0);
      setMessagesUnreadCount(totalUnread);
    } catch {
      // keep previous count on transient errors
    }
  }, [user]);

  useEffect(() => {
    refreshMessagesUnreadCount().catch(() => {});
  }, [user?.userId, refreshMessagesUnreadCount]);

  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => {
      refreshMessagesUnreadCount().catch(() => {});
    }, 8000);
    return () => window.clearInterval(id);
  }, [user?.userId, refreshMessagesUnreadCount]);

  useEffect(() => {
    if (!user) return;
    const onFocus = () => {
      refreshMessagesUnreadCount().catch(() => {});
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') refreshMessagesUnreadCount().catch(() => {});
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [user?.userId, refreshMessagesUnreadCount]);

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
