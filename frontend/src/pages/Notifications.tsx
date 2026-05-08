/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowRight, FiBell, FiCheck } from 'react-icons/fi';
import api from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { themedAlert, themedConfirm } from '../utils/themedDialog';
import { useNotifications } from '../context/NotificationsContext';
import { NavIconBadge } from '../components/NavIconBadge';
import { FeedAvatarImage } from '../components/FeedAvatarImage';
import { PULL_REFRESH_EVENT, type PullRefreshRequestDetail } from '../types/pullRefresh';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';
import {
  formatNotificationTime,
  getNotificationActorInitials,
  getNotificationActorName,
  getNotificationSourceLabel,
  getNotificationSummary,
  type NotificationLike,
} from '../utils/notificationDisplay';

type UnifiedNotification = NotificationLike & {
  notification_id: number;
  recipient_user_id: number;
  actor_user_id?: number | null;
  community_id: number | null;
  entity_type?: string | null;
  entity_id?: number | null;
  payload?: any;
  is_read?: boolean;
  created_at?: string;
};

const PAGE_SIZE = 10;
const TAB_ORDER = ['personal', 'academic', 'community'] as const;
type NotificationTab = (typeof TAB_ORDER)[number];
const NOTIFICATIONS_CACHE_KEY = 'notifications:first-page-cache:v5';
type NotificationsCacheRecord = Partial<Record<NotificationTab, { items: UnifiedNotification[]; total: number }>>;

function readNotificationsCache() {
  if (typeof window === 'undefined') return {} as NotificationsCacheRecord;
  const raw = window.localStorage.getItem(NOTIFICATIONS_CACHE_KEY);
  if (!raw) return {} as NotificationsCacheRecord;
  try {
    const parsed = JSON.parse(raw) as NotificationsCacheRecord;
    return Object.fromEntries(
      TAB_ORDER.map((tab) => {
        const entry = parsed?.[tab];
        const items = Array.isArray(entry?.items)
          ? entry.items.filter(
              (n) => String((n as UnifiedNotification).source_module || '').toLowerCase() !== 'messaging'
            )
          : [];
        return [tab, { items, total: Number.isFinite(entry?.total) ? Number(entry?.total) : 0 }];
      })
    ) as NotificationsCacheRecord;
  } catch {
    return {} as NotificationsCacheRecord;
  }
}

const Notifications = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';
  const { refreshUnreadCount, unreadByScope, browserNotificationPermission, requestBrowserNotificationPermission } = useNotifications();
  const [cacheStore, setCacheStore] = useState<NotificationsCacheRecord>(() => readNotificationsCache());
  /** Yalnızca ilk ağ fetch’inde tam sayfa spinner; loadMore sonrası loadInitial yeniden tetiklenmez. */
  const isFirstNetworkLoadRef = useRef(true);

  const [activeTab, setActiveTab] = useState<NotificationTab>('personal');
  const activeCached = cacheStore[activeTab] ?? { items: [] as UnifiedNotification[], total: 0 };
  const [loading, setLoading] = useState(activeCached.items.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState<UnifiedNotification[]>(activeCached.items);
  const [total, setTotal] = useState(activeCached.total);

  const fetchSlice = useCallback(async (offset: number, append: boolean, scope: NotificationTab) => {
    const res = await api.get('/notifications', {
      params: { limit: PAGE_SIZE, offset, scope },
    });
    const items = (res.data?.items || []) as UnifiedNotification[];
    const nextTotal = Number(res.data?.total ?? 0);
    const normalizedTotal = Number.isFinite(nextTotal) ? nextTotal : 0;

    setTotal(normalizedTotal);
    if (append) {
      setNotifications((prev) => {
        const seen = new Set(prev.map((n) => n.notification_id));
        const merged = [...prev];
        for (const item of items) {
          if (!seen.has(item.notification_id)) {
            seen.add(item.notification_id);
            merged.push(item);
          }
        }
        return merged;
      });
    } else {
      setNotifications(items);
    }
    setCacheStore((prev) => {
      const baseItems = append ? prev[scope]?.items || [] : [];
      const seen = new Set(baseItems.map((n) => n.notification_id));
      const merged = [...baseItems];
      for (const item of items) {
        if (!append || !seen.has(item.notification_id)) {
          if (append) seen.add(item.notification_id);
          merged.push(item);
        }
      }
      const nextStore: NotificationsCacheRecord = {
        ...prev,
        [scope]: {
          items: append ? merged : items,
          total: normalizedTotal,
        },
      };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(NOTIFICATIONS_CACHE_KEY, JSON.stringify(nextStore));
      }
      return nextStore;
    });
  }, []);

  const loadInitial = useCallback(async () => {
    if (isFirstNetworkLoadRef.current && activeCached.items.length === 0) {
      setLoading(true);
    }
    setError('');
    try {
      await fetchSlice(0, false, activeTab);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load notifications');
    } finally {
      setLoading(false);
      isFirstNetworkLoadRef.current = false;
    }
  }, [fetchSlice, activeTab, activeCached.items.length]);

  const loadMore = useCallback(async () => {
    if (loadingMore || notifications.length >= total) return;
    setLoadingMore(true);
    try {
      await fetchSlice(notifications.length, true, activeTab);
    } catch (e: any) {
      await themedAlert(e?.response?.data?.error || 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  }, [fetchSlice, loadingMore, notifications.length, total, activeTab]);

  useEffect(() => {
    const nextCached = cacheStore[activeTab] ?? { items: [] as UnifiedNotification[], total: 0 };
    setNotifications(nextCached.items);
    setTotal(nextCached.total);
    setError('');
    setLoading(nextCached.items.length === 0 && isFirstNetworkLoadRef.current);
  }, [activeTab, cacheStore]);

  useEffect(() => {
    loadInitial().catch(() => {});
  }, [loadInitial]);

  useEffect(() => {
    void refreshUnreadCount(true);
  }, [refreshUnreadCount]);

  useEffect(() => {
    const handlePullRefresh = (event: Event) => {
      const customEvent = event as CustomEvent<PullRefreshRequestDetail>;
      if (customEvent.detail?.path !== '/notifications') return;

      customEvent.preventDefault();
      customEvent.detail.enqueue(
        (async () => {
          await loadInitial();
          await refreshUnreadCount(true);
        })()
      );
    };

    window.addEventListener(PULL_REFRESH_EVENT, handlePullRefresh);
    return () => window.removeEventListener(PULL_REFRESH_EVENT, handlePullRefresh);
  }, [loadInitial, refreshUnreadCount]);

  const sourceMatch = (notification: UnifiedNotification, tab: NotificationTab) => {
    const source = String(notification.source_module || '').toLowerCase();
    if (tab === 'academic') return source === 'academic';
    if (tab === 'community') return source === 'community';
    return source !== 'academic' && source !== 'community' && source !== 'messaging';
  };

  const activeList = notifications.filter((notification) => sourceMatch(notification, activeTab));
  const hasMore = notifications.length < total;
  const shouldShowEmpty = !loading && !error && activeList.length === 0;
  const notificationsPermissionSupported = browserNotificationPermission !== 'unsupported';

  const markRead = async (notificationId: number) => {
    try {
      await api.post(`/notifications/${notificationId}/read`);
      setNotifications((prev) => prev.map((notification) => (notification.notification_id === notificationId ? { ...notification, is_read: true } : notification)));
      setCacheStore((prev) => {
        const scoped = prev[activeTab];
        if (!scoped) return prev;
        const nextStore: NotificationsCacheRecord = {
          ...prev,
          [activeTab]: {
            ...scoped,
            items: scoped.items.map((notification) =>
              notification.notification_id === notificationId ? { ...notification, is_read: true } : notification
            ),
          },
        };
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(NOTIFICATIONS_CACHE_KEY, JSON.stringify(nextStore));
        }
        return nextStore;
      });
      await refreshUnreadCount(true);
    } catch (e: any) {
      await themedAlert(e?.response?.data?.error || 'Failed to mark read');
    }
  };

  const markTabRead = async () => {
    try {
      await api.post('/notifications/read-tab', { scope: activeTab });
      await loadInitial();
      await refreshUnreadCount(true);
    } catch (e: any) {
      await themedAlert(e?.response?.data?.error || 'Failed to mark tab read');
    }
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      await loadInitial();
      await refreshUnreadCount(true);
    } catch (e: any) {
      await themedAlert(e?.response?.data?.error || 'Failed to mark all read');
    }
  };

  const deleteReadInTab = async () => {
    const ids = notifications.filter((notification) => sourceMatch(notification, activeTab) && !!notification.is_read).map((notification) => notification.notification_id);
    if (!ids.length) return;

    try {
      await api.delete('/notifications', { data: { ids } });
      await loadInitial();
      await refreshUnreadCount(true);
    } catch (e: any) {
      await themedAlert(e?.response?.data?.error || 'Failed to delete notifications');
    }
  };

  const deleteAllInTab = async () => {
    const ids = notifications.filter((notification) => sourceMatch(notification, activeTab)).map((notification) => notification.notification_id);
    if (!ids.length) return;
    if (!(await themedConfirm(t('notifications.deleteAllInTabConfirm')))) return;

    try {
      await api.delete('/notifications', { data: { ids } });
      await loadInitial();
      await refreshUnreadCount(true);
    } catch (e: any) {
      await themedAlert(e?.response?.data?.error || 'Failed to delete notifications');
    }
  };

  const openNotificationTarget = (notification: UnifiedNotification) => {
    const kind = String(notification.kind || '');
    const actorId = notification.actor_user_id ?? null;

    if (notification.entity_type === 'event' && notification.community_id) navigate(`/community/${notification.community_id}?eventId=${notification.entity_id}`);
    else if (notification.entity_type === 'event_application' && notification.community_id) {
      const eventId = notification.payload?.eventId ?? notification.payload?.event_id ?? null;
      navigate(`/community/${notification.community_id}${eventId ? `?eventId=${eventId}` : ''}`);
    } else if (notification.entity_type === 'job_application') navigate(`/community/jobs/applications/${notification.entity_id}`);
    else if (notification.entity_type === 'job_post') navigate('/job-board');
    else if (notification.entity_type === 'appointment') navigate('/appointments');
    else if (notification.entity_type === 'conversation' && actorId) navigate(`/messages?dm=${actorId}`);
    else if (kind === 'social.follow' && actorId) navigate(`/profile/${actorId}`);
    else if (notification.entity_type === 'user' && notification.entity_id) navigate(`/profile/${notification.entity_id}`);
    else if (notification.entity_type === 'post' && notification.entity_id != null) navigate(`/post/${notification.entity_id}`);
    else navigate('/feed');

    markRead(notification.notification_id).catch(() => {});
  };

  const tabTitle =
    activeTab === 'personal'
      ? t('notifications.personalTitle')
      : activeTab === 'academic'
        ? t('notifications.academicTitle')
        : t('notifications.communityTitle');

  return (
    <div className={`min-h-screen p-4 md:p-6 ${isSpace ? 'bg-[#050510]' : 'bg-white'}`}>
      <div className="max-w-3xl mx-auto space-y-4">
        <div
          className={`rounded-3xl border ${isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-gray-50'} p-4 md:p-5 flex items-center gap-3`}
        >
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isSpace ? 'bg-white/10 text-white' : 'bg-primary/10 text-primary'}`}>
            <FiBell />
          </div>
          <div>
            <h1 className={`text-2xl font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('notifications.title')}</h1>
            <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>
              {t('notifications.subtitle')}
            </p>
          </div>
        </div>

        {notificationsPermissionSupported && browserNotificationPermission !== 'granted' ? (
          <div className={`rounded-3xl border p-4 md:p-5 flex items-center justify-between gap-4 ${isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-gray-50'}`}>
            <div className="min-w-0">
              <div className={`text-sm font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>
                {t('notifications.browserPromptTitle')}
              </div>
              <p className={`mt-1 text-xs leading-relaxed ${isSpace ? 'text-white/60' : 'text-uv-gray'}`}>
                {t('notifications.browserPromptBody')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => requestBrowserNotificationPermission().catch(() => {})}
              className="shrink-0 rounded-2xl bg-primary px-4 py-2 text-[12px] font-black text-white transition hover:brightness-95"
            >
              {t('notifications.enableBrowserAlerts')}
            </button>
          </div>
        ) : null}

        <div className={`flex gap-2 p-1 rounded-2xl border ${isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-gray-50'}`}>
          {TAB_ORDER.map((tab) => {
            const active = activeTab === tab;
            const label =
              tab === 'personal'
                ? t('notifications.personalTitle')
                : tab === 'academic'
                  ? t('notifications.academicTitle')
                  : t('notifications.communityTitle');
            const tabUnread =
              tab === 'personal'
                ? unreadByScope.personal
                : tab === 'academic'
                  ? unreadByScope.academic
                  : unreadByScope.community;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`relative flex flex-1 min-w-0 items-center justify-center px-2 sm:px-3 py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest text-center transition-all ${
                  active
                    ? 'bg-white text-primary shadow-sm'
                    : isSpace
                      ? 'text-white/60 hover:text-white'
                      : 'text-uv-gray hover:text-uv-black'
                }`}
              >
                <NavIconBadge placement="boxTopLeft" count={tabUnread} tone="alerts" />
                <span className="block min-w-0 max-w-full truncate px-1 text-center leading-tight">{label}</span>
              </button>
            );
          })}
        </div>

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            <div>
              <h2 className={`font-black text-lg ${isSpace ? 'text-white' : 'text-uv-black'}`}>{tabTitle}</h2>
              <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isSpace ? 'text-white/40' : 'text-uv-gray'}`}>
                {shouldShowEmpty ? t('notifications.noNewInTab') : t('notifications.loadedOfTotal', { loaded: activeList.length, total })}
              </p>
            </div>

            {!loading && !error && (activeList.length > 0 || notifications.length > 0) ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => markTabRead().catch(() => {})}
                  className={`px-4 py-2 rounded-2xl font-black text-[12px] border ${
                    isSpace ? 'border-white/10 text-white/70 hover:bg-white/5' : 'border-uv-border text-uv-gray hover:bg-gray-50'
                  }`}
                >
                  {t('notifications.markTabRead')}
                </button>
                <button
                  type="button"
                  onClick={() => markAllRead().catch(() => {})}
                  className={`px-4 py-2 rounded-2xl font-black text-[12px] border ${
                    isSpace ? 'border-white/10 text-white/70 hover:bg-white/5' : 'border-uv-border text-uv-gray hover:bg-gray-50'
                  }`}
                >
                  {t('notifications.markAllRead')}
                </button>
                <button
                  type="button"
                  onClick={() => deleteReadInTab().catch(() => {})}
                  className={`px-4 py-2 rounded-2xl font-black text-[12px] border ${
                    isSpace ? 'border-white/10 text-white/70 hover:bg-white/5' : 'border-uv-border text-uv-gray hover:bg-gray-50'
                  }`}
                >
                  {t('notifications.deleteRead')}
                </button>
                <button
                  type="button"
                  onClick={() => deleteAllInTab().catch(() => {})}
                  className={`px-4 py-2 rounded-2xl font-black text-[12px] border border-red-500/40 ${
                    isSpace ? 'text-red-300 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'
                  }`}
                >
                  {t('notifications.deleteAllInTab')}
                </button>
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="p-4 rounded-2xl border border-red-500/30 bg-red-50 text-red-700 font-bold">{error}</div>
          ) : loading ? (
            <p className={`font-black uppercase tracking-widest text-[10px] ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>
              {t('notifications.loading')}
            </p>
          ) : activeList.length === 0 ? (
            <div className={`rounded-3xl p-8 text-center border ${isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-gray-50'}`}>
              <p className={`font-black uppercase tracking-widest text-[10px] ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>
                {t('notifications.empty')}
              </p>
              <p className={`mt-4 text-xs leading-relaxed max-w-lg mx-auto ${isSpace ? 'text-white/55' : 'text-uv-gray'}`}>
                {t('notifications.emptyHint')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeList.map((notification) => {
                const isRead = !!notification.is_read;
                const actorName = getNotificationActorName(notification);
                const actorInitials = getNotificationActorInitials(notification);
                const sourceLabel = getNotificationSourceLabel(notification, t);
                const summary = getNotificationSummary(notification, t);
                const detail =
                  notification.message && notification.message.trim() && notification.message.trim() !== summary
                    ? notification.message.trim()
                    : notification.title && notification.title.trim() && notification.title.trim() !== summary
                      ? notification.title.trim()
                      : '';
                const avatarUrl = resolveMediaUrl(notification.actor_avatar_url) || undefined;
                const actorId = notification.actor_user_id ?? null;
                const actorProfileTo = actorId ? `/profile/${actorId}` : null;
                const avatarBox = (
                  <div
                    className={`relative w-12 h-12 rounded-2xl overflow-hidden border flex items-center justify-center ${
                      isSpace ? 'border-white/10 bg-white/10' : 'border-uv-border bg-gray-100'
                    }`}
                  >
                    <FeedAvatarImage
                      src={avatarUrl}
                      initials={actorInitials}
                      className="font-black text-sm"
                      imgClassName="w-full h-full object-cover"
                    />
                    <span
                      className={`absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full border-2 ${
                        isRead ? 'bg-uv-gray border-white' : 'bg-primary border-white'
                      }`}
                    />
                  </div>
                );

                return (
                  <div
                    key={notification.notification_id}
                    className={`rounded-3xl p-4 md:p-5 border transition-all ${
                      isRead
                        ? isSpace
                          ? 'border-white/8 bg-white/[0.03]'
                          : 'border-uv-border bg-white'
                        : isSpace
                          ? 'border-primary/25 bg-primary/5 shadow-[0_0_0_1px_rgba(99,102,241,0.15)]'
                          : 'border-primary/20 bg-primary/5'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 pt-0.5">
                        {actorProfileTo ? (
                          <Link
                            to={actorProfileTo}
                            onClick={(e) => e.stopPropagation()}
                            title={actorName || undefined}
                            aria-label={actorName || undefined}
                            className="block no-underline outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary/40 rounded-2xl"
                          >
                            {avatarBox}
                          </Link>
                        ) : (
                          avatarBox
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {actorProfileTo && actorName ? (
                                <Link
                                  to={actorProfileTo}
                                  onClick={(e) => e.stopPropagation()}
                                  className={`font-black text-sm truncate no-underline transition hover:underline ${
                                    isSpace ? 'text-white hover:text-white' : 'text-uv-black hover:text-primary'
                                  }`}
                                >
                                  {actorName}
                                </Link>
                              ) : (
                                <div className={`font-black text-sm truncate ${isSpace ? 'text-white' : 'text-uv-black'}`}>
                                  {actorName || sourceLabel}
                                </div>
                              )}
                              <span
                                className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                  isSpace ? 'border-white/10 bg-white/5 text-white/60' : 'border-uv-border bg-gray-50 text-uv-gray'
                                }`}
                              >
                                {sourceLabel}
                              </span>
                            </div>

                            <div className={`mt-1 text-base font-black leading-snug ${isSpace ? 'text-white' : 'text-uv-black'}`}>{summary}</div>

                            {detail ? (
                              <div className={`mt-1 text-sm leading-relaxed ${isSpace ? 'text-white/70' : 'text-uv-gray'}`}>{detail}</div>
                            ) : null}

                            <div className={`mt-3 text-[10px] font-bold uppercase tracking-widest ${isSpace ? 'text-white/45' : 'text-uv-gray'}`}>
                              {formatNotificationTime(notification.created_at, t)}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2 shrink-0">
                            {isRead ? (
                              <div
                                className={`w-9 h-9 rounded-2xl flex items-center justify-center ${
                                  isSpace ? 'bg-white/10 text-white' : 'bg-primary/10 text-primary'
                                } border ${isSpace ? 'border-white/10' : 'border-primary/20'}`}
                              >
                                <FiCheck />
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => markRead(notification.notification_id)}
                                className="px-4 py-2 rounded-2xl font-black bg-primary text-white text-[12px] hover:brightness-95 transition-all active:scale-[0.98]"
                              >
                                {t('notifications.markRead')}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => openNotificationTarget(notification)}
                              className={`px-4 py-2 rounded-2xl font-black border text-[12px] inline-flex items-center gap-2 ${
                                isSpace ? 'border-white/10 text-white/70 hover:bg-white/5' : 'border-uv-border text-uv-gray hover:bg-gray-50'
                              }`}
                            >
                              {t('notifications.view')}
                              <FiArrowRight className="text-[11px]" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && hasMore ? (
            <button
              type="button"
              disabled={loadingMore}
              onClick={() => loadMore().catch(() => {})}
              className="w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest border border-primary/30 text-primary hover:bg-primary/5 disabled:opacity-50"
            >
              {loadingMore ? '…' : t('notifications.loadMore')}
            </button>
          ) : null}
        </section>
      </div>
    </div>
  );
};

export default Notifications;
