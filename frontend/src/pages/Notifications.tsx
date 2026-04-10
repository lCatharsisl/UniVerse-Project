import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiCheck } from 'react-icons/fi';
import { themedAlert, themedConfirm } from '../utils/themedDialog';
import { useNotifications } from '../context/NotificationsContext';

type UnifiedNotification = {
  notification_id: number;
  recipient_user_id: number;
  actor_user_id?: number | null;
  community_id: number | null;
  source_module?: string;
  kind: string;
  title?: string | null;
  message?: string | null;
  entity_type?: string | null;
  entity_id?: number | null;
  payload?: any;
  is_read?: boolean;
  created_at?: string;
};

const PAGE_SIZE = 25;

const Notifications = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';
  const { refreshUnreadCount } = useNotifications();

  const [activeTab, setActiveTab] = useState<'personal' | 'academic' | 'community'>('personal');

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState<UnifiedNotification[]>([]);
  const [total, setTotal] = useState(0);

  const fetchSlice = useCallback(async (offset: number, append: boolean) => {
    const res = await api.get('/notifications', { params: { limit: PAGE_SIZE, offset } });
    const items = (res.data?.items || []) as UnifiedNotification[];
    const nextTotal = Number(res.data?.total ?? 0);
    setTotal(Number.isFinite(nextTotal) ? nextTotal : 0);
    if (append) {
      setNotifications((prev) => {
        const seen = new Set(prev.map((n) => n.notification_id));
        const merged = [...prev];
        for (const n of items) {
          if (!seen.has(n.notification_id)) {
            seen.add(n.notification_id);
            merged.push(n);
          }
        }
        return merged;
      });
    } else {
      setNotifications(items);
    }
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await fetchSlice(0, false);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [fetchSlice]);

  const loadMore = useCallback(async () => {
    if (loadingMore || notifications.length >= total) return;
    setLoadingMore(true);
    try {
      await fetchSlice(notifications.length, true);
    } catch (e: any) {
      await themedAlert(e?.response?.data?.error || 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  }, [fetchSlice, loadingMore, notifications.length, total]);

  useEffect(() => {
    loadInitial().catch(() => {});
  }, [loadInitial]);

  const markRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n)));
      await refreshUnreadCount();
    } catch (e: any) {
      await themedAlert(e?.response?.data?.error || 'Failed to mark read');
    }
  };

  const markTabRead = async () => {
    try {
      await api.post('/notifications/read-tab', { scope: activeTab });
      await loadInitial();
      await refreshUnreadCount();
    } catch (e: any) {
      await themedAlert(e?.response?.data?.error || 'Failed to mark tab read');
    }
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      await loadInitial();
      await refreshUnreadCount();
    } catch (e: any) {
      await themedAlert(e?.response?.data?.error || 'Failed to mark all read');
    }
  };

  const sourceMatch = (n: UnifiedNotification, tab: typeof activeTab) => {
    const src = String(n.source_module || '');
    if (tab === 'academic') return src === 'academic';
    if (tab === 'community') return src === 'community';
    return src !== 'academic' && src !== 'community';
  };

  const deleteReadInTab = async () => {
    const ids = notifications.filter((n) => sourceMatch(n, activeTab) && !!n.is_read).map((n) => n.notification_id);
    if (!ids.length) return;
    try {
      await api.delete('/notifications', { data: { ids } });
      await loadInitial();
      await refreshUnreadCount();
    } catch (e: any) {
      await themedAlert(e?.response?.data?.error || 'Failed to delete notifications');
    }
  };

  const deleteAllInTab = async () => {
    const ids = notifications.filter((n) => sourceMatch(n, activeTab)).map((n) => n.notification_id);
    if (!ids.length) return;
    if (!(await themedConfirm(t('notifications.deleteAllInTabConfirm')))) return;
    try {
      await api.delete('/notifications', { data: { ids } });
      await loadInitial();
      await refreshUnreadCount();
    } catch (e: any) {
      await themedAlert(e?.response?.data?.error || 'Failed to delete notifications');
    }
  };

  const activeList = notifications.filter((n) => sourceMatch(n, activeTab));
  const hasMore = notifications.length < total;

  const openNotificationTarget = (n: UnifiedNotification) => {
    const kind = String(n.kind || '');
    const actorId = n.actor_user_id ?? null;
    if (n.entity_type === 'event' && n.community_id) navigate(`/community/${n.community_id}?eventId=${n.entity_id}`);
    else if (n.entity_type === 'event_application' && n.community_id) {
      const eventId = n.payload?.eventId ?? n.payload?.event_id ?? null;
      navigate(`/community/${n.community_id}${eventId ? `?eventId=${eventId}` : ''}`);
    } else if (n.entity_type === 'job_application') navigate(`/community/jobs/applications/${n.entity_id}`);
    else if (n.entity_type === 'job_post') navigate('/job-board');
    else if (n.entity_type === 'appointment') navigate('/appointments');
    else if (n.entity_type === 'conversation' && actorId) navigate(`/messages?dm=${actorId}`);
    else if (kind === 'social.follow' && actorId) navigate(`/profile/${actorId}`);
    else if (n.entity_type === 'user' && n.entity_id) navigate(`/profile/${n.entity_id}`);
    else if (n.entity_type === 'post' && n.entity_id != null) navigate(`/post/${n.entity_id}`);
    else navigate('/feed');
    markRead(n.notification_id).catch(() => {});
  };

  return (
    <div className={`min-h-screen p-4 md:p-6 ${isSpace ? 'bg-[#050510]' : 'bg-white'}`}>
      <div className="max-w-3xl mx-auto space-y-4">
        <div
          className={`rounded-3xl border ${
            isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-gray-50'
          } p-4 md:p-5 flex items-center gap-3`}
        >
          <FiBell />
          <div>
            <h1 className={`text-2xl font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('notifications.title')}</h1>
            <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>
              {t('notifications.subtitle')}
            </p>
          </div>
        </div>

        <div className={`flex gap-2 p-1 rounded-2xl border ${isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-gray-50'}`}>
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={`flex-1 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'personal'
                ? 'bg-white text-primary shadow-sm'
                : isSpace
                  ? 'text-white/60 hover:text-white'
                  : 'text-uv-gray hover:text-uv-black'
            }`}
          >
            {t('notifications.personalTitle')}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('academic')}
            className={`flex-1 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'academic'
                ? 'bg-white text-primary shadow-sm'
                : isSpace
                  ? 'text-white/60 hover:text-white'
                  : 'text-uv-gray hover:text-uv-black'
            }`}
          >
            {t('notifications.academicTitle')}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('community')}
            className={`flex-1 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'community'
                ? 'bg-white text-primary shadow-sm'
                : isSpace
                  ? 'text-white/60 hover:text-white'
                  : 'text-uv-gray hover:text-uv-black'
            }`}
          >
            {t('notifications.communityTitle')}
          </button>
        </div>

        <section className="space-y-3">
          <h2 className={`font-black text-lg ${isSpace ? 'text-white' : 'text-uv-black'}`}>
            {activeTab === 'personal'
              ? t('notifications.personalTitle')
              : activeTab === 'academic'
                ? t('notifications.academicTitle')
                : t('notifications.communityTitle')}
          </h2>

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

          <p className={`text-[10px] font-bold uppercase tracking-widest ${isSpace ? 'text-white/40' : 'text-uv-gray'}`}>
            {t('notifications.loadedOfTotal', { loaded: notifications.length, total })}
          </p>

          {error ? (
            <div className="p-4 rounded-2xl border border-red-500/30 bg-red-50 text-red-700 font-bold">{error}</div>
          ) : loading ? (
            <p className={`font-black uppercase tracking-widest text-[10px] ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>
              {t('notifications.loading')}
            </p>
          ) : activeList.length === 0 ? (
            <div
              className={`rounded-3xl p-8 text-center border ${
                isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-gray-50'
              }`}
            >
              <p className={`font-black uppercase tracking-widest text-[10px] ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>
                {t('notifications.empty')}
              </p>
              <p className={`mt-4 text-xs leading-relaxed max-w-lg mx-auto ${isSpace ? 'text-white/55' : 'text-uv-gray'}`}>
                {t('notifications.emptyHint')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeList.map((n) => {
                const isRead = !!n.is_read;
                const title = n.title || (n.kind ? n.kind : t('notifications.title'));
                const message = n.message || '';
                return (
                  <div
                    key={n.notification_id}
                    className={`rounded-3xl p-4 border ${
                      isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className={`font-black truncate ${isSpace ? 'text-white' : 'text-uv-black'}`}>{title}</div>
                        {message ? (
                          <div className={`text-sm mt-1 ${isSpace ? 'text-white/70' : 'text-uv-gray'}`}>{message}</div>
                        ) : null}
                        <div
                          className={`text-[10px] font-bold uppercase tracking-widest mt-2 ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}
                        >
                          {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
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
                            onClick={() => markRead(n.notification_id)}
                            className="px-4 py-2 rounded-2xl font-black bg-primary text-white text-[12px] hover:brightness-95 transition-all active:scale-[0.98]"
                          >
                            {t('notifications.markRead')}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => openNotificationTarget(n)}
                          className={`px-4 py-2 rounded-2xl font-black border text-[12px] ${
                            isSpace ? 'border-white/10 text-white/70 hover:bg-white/5' : 'border-uv-border text-uv-gray hover:bg-gray-50'
                          }`}
                        >
                          {t('notifications.view')}
                        </button>
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
