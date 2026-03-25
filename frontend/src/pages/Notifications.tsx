import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiCheck } from 'react-icons/fi';
import { themedAlert } from '../utils/themedDialog';

type CommunityNotification = {
  notification_id: number;
  recipient_user_id: number;
  community_id: number | null;
  kind: string;
  title?: string | null;
  message?: string | null;
  entity_type?: string | null;
  entity_id?: number | null;
  payload?: any;
  is_read?: boolean;
  created_at?: string;
};

type PersonalNotification = {
  notification_id: number;
  message: string;
  is_read: boolean;
  created_at: string;
};

const Notifications = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';

  const [activeTab, setActiveTab] = useState<'personal' | 'academic' | 'community'>('personal');

  const [communityLoading, setCommunityLoading] = useState(true);
  const [communityError, setCommunityError] = useState('');
  const [communityNotifications, setCommunityNotifications] = useState<CommunityNotification[]>([]);

  const [personalLoading, setPersonalLoading] = useState(true);
  const [personalError, setPersonalError] = useState('');
  const [personalNotifications, setPersonalNotifications] = useState<PersonalNotification[]>([]);

  const loadCommunity = async () => {
    setCommunityLoading(true);
    setCommunityError('');
    try {
      const res = await api.get('/community/notifications');
      setCommunityNotifications(res.data?.notifications || []);
    } catch (e: any) {
      setCommunityError(e?.response?.data?.error || 'Failed to load notifications');
    } finally {
      setCommunityLoading(false);
    }
  };

  const loadPersonal = async () => {
    setPersonalLoading(true);
    setPersonalError('');
    try {
      const res = await api.get('/academic/appointments/notifications');
      setPersonalNotifications(res.data?.notifications || []);
    } catch (e: any) {
      setPersonalError(e?.response?.data?.error || 'Failed to load notifications');
    } finally {
      setPersonalLoading(false);
    }
  };

  useEffect(() => {
    loadCommunity().catch(() => {});
    loadPersonal().catch(() => {});
  }, []);

  const markCommunityRead = async (id: number) => {
    try {
      await api.patch(`/community/notifications/${id}/read`);
      await loadCommunity();
    } catch (e: any) {
      await themedAlert(e?.response?.data?.error || 'Failed to mark read');
    }
  };

  const markPersonalRead = async (id: number) => {
    try {
      await api.patch(`/academic/appointments/notifications/${id}/read`);
      await loadPersonal();
    } catch (e: any) {
      await themedAlert(e?.response?.data?.error || 'Failed to mark read');
    }
  };

  const communityEmpty =
    !communityLoading && !communityError && (!communityNotifications || communityNotifications.length === 0);
  const personalEmpty =
    !personalLoading && !personalError && (!personalNotifications || personalNotifications.length === 0);

  const jobNotifications = communityNotifications.filter((n) => (n.kind || '').startsWith('job_'));
  const communityOnlyNotifications = communityNotifications.filter((n) => !(n.kind || '').startsWith('job_'));

  const activeList =
    activeTab === 'personal'
      ? personalNotifications
      : activeTab === 'academic'
        ? jobNotifications
        : communityOnlyNotifications;

  const isActiveLoading =
    activeTab === 'personal' ? personalLoading : activeTab === 'academic' ? communityLoading : communityLoading;

  const activeError =
    activeTab === 'personal' ? personalError : activeTab === 'academic' ? communityError : communityError;

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

        {/* Tabs */}
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

        <section className={`space-y-3`}>
          <h2 className={`font-black text-lg ${isSpace ? 'text-white' : 'text-uv-black'}`}>
            {activeTab === 'personal'
              ? t('notifications.personalTitle')
              : activeTab === 'academic'
                ? t('notifications.academicTitle')
                : t('notifications.communityTitle')}
          </h2>

          {activeError ? (
            <div className="p-4 rounded-2xl border border-red-500/30 bg-red-50 text-red-700 font-bold">{activeError}</div>
          ) : isActiveLoading ? (
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
            </div>
          ) : activeTab === 'personal' ? (
            <div className="space-y-3">
              {(activeList as PersonalNotification[]).map((n) => (
                <button
                  key={n.notification_id}
                  type="button"
                  onClick={() => markPersonalRead(n.notification_id)}
                  className={`w-full text-left p-4 rounded-3xl border ${
                    isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-white'
                  }`}
                >
                  <div className={`font-black ${isSpace ? 'text-white' : 'text-uv-black'} text-sm truncate`}>
                    {n.message}
                  </div>
                  <div className={`text-[10px] font-bold uppercase tracking-widest mt-2 ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>
                    {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {(activeList as CommunityNotification[]).map((n) => {
                const label = t(`communityNotifications.${n.kind}`);
                const isRead = !!n.is_read;
                return (
                  <div
                    key={n.notification_id}
                    className={`rounded-3xl p-4 border ${
                      isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className={`font-black truncate ${isSpace ? 'text-white' : 'text-uv-black'}`}>
                          {label || n.kind}
                        </div>
                        {n.title ? (
                          <div className={`text-sm mt-1 ${isSpace ? 'text-white/70' : 'text-uv-gray'}`}>{n.title}</div>
                        ) : null}
                        <div className={`text-[10px] font-bold uppercase tracking-widest mt-2 ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>
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
                            onClick={() => markCommunityRead(n.notification_id)}
                            className="px-4 py-2 rounded-2xl font-black bg-primary text-white text-[12px] hover:brightness-95 transition-all active:scale-[0.98]"
                          >
                            {t('notifications.markRead')}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (n.entity_type === 'event' && n.community_id) {
                              navigate(`/community/${n.community_id}?eventId=${n.entity_id}`);
                            }
                            if (n.entity_type === 'event_application' && n.community_id) {
                              const eventId = n.payload?.eventId ?? n.payload?.event_id ?? null;
                              navigate(`/community/${n.community_id}${eventId ? `?eventId=${eventId}` : ''}`);
                            }
                            if (n.entity_type === 'job_application') {
                              navigate(`/community/jobs/applications/${n.entity_id}`);
                            }
                            if (n.entity_type === 'job_post') {
                              navigate('/job-board');
                            }
                            markCommunityRead(n.notification_id).catch(() => {});
                          }}
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
        </section>
      </div>
    </div>
  );
};

export default Notifications;

