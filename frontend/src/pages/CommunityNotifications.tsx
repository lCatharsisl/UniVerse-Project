import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { themedAlert } from '../utils/themedDialog';

import { useNavigate } from 'react-router-dom';
import { FiBell, FiCheck } from 'react-icons/fi';

const CommunityNotifications = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';

  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/community/notifications');
      setNotifications(res.data?.notifications || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markRead = async (id: number) => {
    try {
      await api.patch(`/community/notifications/${id}/read`);
      await load();
    } catch (e: any) {
      await themedAlert(e?.response?.data?.error || 'Failed to mark read');
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen p-4 md:p-6 ${isSpace ? 'bg-[#050510]' : 'bg-white'}`}>
        <p className="text-uv-gray font-black uppercase tracking-widest text-[10px]">{t('notifications.loading')}</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 md:p-6 ${isSpace ? 'bg-[#050510]' : 'bg-white'}`}>
      <div className="max-w-3xl mx-auto space-y-4">
        <div className={`rounded-3xl border ${isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-gray-50'} p-4 md:p-5 flex items-center gap-3`}>
          <FiBell />
          <div>
            <h1 className={`text-2xl font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('notifications.title')}</h1>
            <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>
              {t('notifications.subtitle')}
            </p>
          </div>
        </div>

        {error ? <div className="p-4 rounded-2xl border border-red-500/30 bg-red-50 text-red-700 font-bold">{error}</div> : null}

        {notifications.length === 0 && !error ? (
          <div className={`rounded-3xl p-8 text-center border ${isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-gray-50'}`}>
            <p className={`font-black uppercase tracking-widest text-[10px] ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>{t('notifications.empty')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => {
              const label = t(`communityNotifications.${n.kind}`);
              const isRead = !!n.is_read;
              return (
                <div key={n.notification_id} className={`rounded-3xl p-4 border ${isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-white'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className={`font-black truncate ${isSpace ? 'text-white' : 'text-uv-black'}`}>
                        {label || n.kind}
                      </div>
                      {n.title ? (
                        <div className={`text-sm mt-1 ${isSpace ? 'text-white/70' : 'text-uv-gray'}`}>{n.title}</div>
                      ) : null}
                      <div className={`text-[10px] font-bold uppercase tracking-widest mt-2 ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {isRead ? (
                        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center ${isSpace ? 'bg-white/10 text-white' : 'bg-primary/10 text-primary'} border ${isSpace ? 'border-white/10' : 'border-primary/20'}`}>
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
                        onClick={() => {
                          if (n.entity_type === 'job_application') navigate(`/community/jobs/applications/${n.entity_id}`);
                          if (n.entity_type === 'event') {
                            navigate(`/community/${n.community_id}?eventId=${n.entity_id}`);
                          }
                          if (n.entity_type === 'event_application') {
                            const eventId = n.payload?.eventId ?? n.payload?.event_id ?? null;
                            navigate(`/community/${n.community_id}${eventId ? `?eventId=${eventId}` : ''}`);
                          }
                          markRead(n.notification_id).catch(() => {});
                        }}
                        className={`px-4 py-2 rounded-2xl font-black border text-[12px] ${isSpace ? 'border-white/10 text-white/70 hover:bg-white/5' : 'border-uv-border text-uv-gray hover:bg-gray-50'}`}
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
      </div>
    </div>
  );
};

export default CommunityNotifications;

