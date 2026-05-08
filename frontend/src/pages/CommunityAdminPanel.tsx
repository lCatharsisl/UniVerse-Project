/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { FiCalendar, FiAlertTriangle, FiImage, FiX } from 'react-icons/fi';
import { themedAlert, themedPrompt } from '../utils/themedDialog';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';

const CommunityAdminPanel = () => {
  const { t } = useTranslation();
  const { communityId } = useParams<{ communityId: string }>();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isCommunityAdmin, setIsCommunityAdmin] = useState(false);
  const [pendingEventApps, setPendingEventApps] = useState<any[]>([]);
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);

  // Create Event form
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventStartAt, setEventStartAt] = useState('');
  const [eventEndAt, setEventEndAt] = useState('');
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [posterPreview, setPosterPreview] = useState<string | null>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);
  /** Blocks double-clicks and overlapping submits (each successful POST creates a new event). */
  const createEventInFlightRef = useRef(false);
  const [publishingEvent, setPublishingEvent] = useState(false);

  useEffect(() => {
    if (!posterFile) {
      setPosterPreview(null);
      return;
    }
    const url = URL.createObjectURL(posterFile);
    setPosterPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [posterFile]);

  const load = async () => {
    if (!communityId) return;
    setLoading(true);
    setError('');
    try {
      const profileRes = await api.get(`/community/${communityId}`);
      const adminFlag = !!profileRes.data?.isAdmin;
      setIsCommunityAdmin(adminFlag);

      setPendingEventApps([]);
      setPendingMembers([]);

      if (adminFlag) {
        const [eventRes, membersRes] = await Promise.all([
          api.get(`/community/${communityId}/admin/event-applications/pending`),
          api.get(`/community/${communityId}/admin/members/pending`),
        ]);
        setPendingEventApps(eventRes.data?.applications || []);
        setPendingMembers(membersRes.data?.members || []);
      }

    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load admin panel');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId]);

  const createEvent = async () => {
    if (!communityId) return;
    if (!eventTitle.trim()) {
      await themedAlert(t('communityAdmin.eventTitleRequired'));
      return;
    }
    if (createEventInFlightRef.current) return;
    createEventInFlightRef.current = true;
    setPublishingEvent(true);
    try {
      const res = await api.post(`/community/${communityId}/events`, {
        title: eventTitle.trim(),
        description: eventDescription || null,
        location: eventLocation || null,
        start_at: eventStartAt ? new Date(eventStartAt).toISOString() : null,
        end_at: eventEndAt ? new Date(eventEndAt).toISOString() : null,
      });
      const eventId = res.data?.eventId;
      if (posterFile && eventId != null) {
        const fd = new FormData();
        fd.append('poster', posterFile);
        try {
          await api.post(`/community/${communityId}/events/${eventId}/poster`, fd);
        } catch (pe: any) {
          const server = typeof pe?.response?.data?.error === 'string' ? pe.response.data.error.trim() : '';
          const net =
            !pe?.response && typeof pe?.message === 'string' && pe.message.length > 0 ? pe.message : '';
          const extra = [server, net].filter(Boolean).join('\n\n');
          await themedAlert(extra ? `${t('communityAdmin.posterUploadFailed')}\n\n${extra}` : t('communityAdmin.posterUploadFailed'));
        }
      }

      setEventTitle('');
      setEventDescription('');
      setEventLocation('');
      setEventStartAt('');
      setEventEndAt('');
      setPosterFile(null);
      await load();
    } catch (e: any) {
      await themedAlert(e?.response?.data?.error || 'Failed to create event');
    } finally {
      createEventInFlightRef.current = false;
      setPublishingEvent(false);
    }
  };

  const decideEventApp = async (appId: number, status: 'approved' | 'rejected' | 'cancelled') => {
    try {
      const note =
        status === 'rejected' || status === 'cancelled'
          ? (await themedPrompt(t('communityAdmin.decisionNotePrompt'))) || undefined
          : undefined;
      await api.patch(`/community/events/applications/${appId}/decision`, { status, note });
      await load();
    } catch (e: any) {
      await themedAlert(e?.response?.data?.error || 'Failed to decide application');
    }
  };

  const decideMemberRequest = async (memberUserId: number, status: 'approved' | 'rejected') => {
    if (!communityId) return;
    try {
      await api.patch(`/community/${communityId}/admin/members/${memberUserId}/decision`, { status });
      await load();
    } catch (e: any) {
      await themedAlert(e?.response?.data?.error || 'Failed to decide member request');
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen p-4 md:p-6 ${isSpace ? 'bg-[#050510]' : 'bg-white'}`}>
        <p className="text-uv-gray font-black uppercase tracking-widest text-[10px]">{t('communityAdmin.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen p-4 md:p-6 ${isSpace ? 'bg-[#050510]' : 'bg-white'}`}>
        <div className="p-4 rounded-2xl border border-red-500/30 bg-red-50 text-red-700 font-bold">{error}</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 md:p-6 ${isSpace ? 'bg-[#050510]' : 'bg-white'}`}>
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className={`text-2xl font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('communityAdmin.title')}</h1>
            <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>
              {t('communityAdmin.subtitle')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/community/${communityId}`)}
            className={`px-4 py-2 rounded-2xl font-black border ${isSpace ? 'border-white/10 text-white/70 hover:bg-white/5' : 'border-uv-border text-uv-gray hover:bg-gray-50'}`}
          >
            {t('communityAdmin.backToProfile')}
          </button>
        </div>

        {/* Create Event (community admin only) */}
        {isCommunityAdmin && (
        <section className={`rounded-3xl border ${isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-gray-50'} p-4 md:p-5 space-y-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiCalendar className={isSpace ? 'text-white/50' : 'text-uv-gray'} />
              <h2 className={`text-lg md:text-xl font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('communityAdmin.createEvent')}</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              placeholder={t('communityAdmin.eventTitlePlaceholder')}
              className={`uv-input ${isSpace ? 'bg-white/5 border-white/10 text-white placeholder:text-white/40' : ''}`}
            />
            <input
              value={eventLocation}
              onChange={(e) => setEventLocation(e.target.value)}
              placeholder={t('communityAdmin.eventLocationPlaceholder')}
              className={`uv-input ${isSpace ? 'bg-white/5 border-white/10 text-white placeholder:text-white/40' : ''}`}
            />
            <input
              type="datetime-local"
              value={eventStartAt}
              onChange={(e) => setEventStartAt(e.target.value)}
              className={`uv-input ${isSpace ? 'bg-white/5 border-white/10 text-white placeholder:text-white/40' : ''}`}
            />
            <input
              type="datetime-local"
              value={eventEndAt}
              onChange={(e) => setEventEndAt(e.target.value)}
              className={`uv-input ${isSpace ? 'bg-white/5 border-white/10 text-white placeholder:text-white/40' : ''}`}
            />
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={posterInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setPosterFile(f ?? null);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => posterInputRef.current?.click()}
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-black uppercase tracking-widest transition-colors ${
                  isSpace ? 'border-white/15 text-white/80 hover:bg-white/10' : 'border-uv-border text-uv-gray hover:bg-white'
                }`}
              >
                <FiImage size={16} />
                {t('communityAdmin.eventPosterLabel')}
              </button>
              {posterFile ? (
                <button
                  type="button"
                  onClick={() => setPosterFile(null)}
                  className={`inline-flex items-center gap-1 rounded-2xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest ${
                    isSpace ? 'border-white/15 text-white/60 hover:bg-white/10' : 'border-uv-border text-uv-gray hover:bg-gray-50'
                  }`}
                >
                  <FiX size={14} />
                  {t('communityAdmin.eventPosterClear')}
                </button>
              ) : null}
            </div>
            <p className={`text-[10px] font-bold ${isSpace ? 'text-white/45' : 'text-uv-gray'}`}>{t('communityAdmin.eventPosterHint')}</p>
            <div
              className={`mx-auto flex w-full max-w-[200px] flex-col overflow-hidden rounded-2xl border md:max-w-[220px] ${
                isSpace ? 'border-white/15 bg-white/5' : 'border-uv-border bg-white'
              }`}
            >
              <div className="relative aspect-[210/297] w-full">
                {posterPreview ? (
                  <img src={posterPreview} alt="" className="absolute inset-0 h-full w-full object-contain" />
                ) : (
                  <div
                    className={`absolute inset-0 flex flex-col items-center justify-center gap-1 p-3 text-center ${
                      isSpace ? 'text-white/35' : 'text-uv-gray'
                    }`}
                  >
                    <FiImage size={28} className="opacity-50" />
                    <span className="text-[9px] font-black uppercase tracking-widest">{t('communityAdmin.eventPosterPreviewEmpty')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <textarea
            value={eventDescription}
            onChange={(e) => setEventDescription(e.target.value)}
            placeholder={t('communityAdmin.eventDescriptionPlaceholder')}
            className={`w-full uv-textarea min-h-[110px] ${isSpace ? 'bg-white/5 border-white/10 text-white placeholder:text-white/40' : ''}`}
          />

          <button
            type="button"
            disabled={publishingEvent}
            onClick={() => void createEvent()}
            className="w-full bg-primary text-white font-black py-3 rounded-2xl hover:brightness-95 transition-all active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none"
          >
            {publishingEvent ? t('communityAdmin.publishingEvent') : t('communityAdmin.createEventButton')}
          </button>
        </section>
        )}

        {/* Pending Applications */}
        <section className={`rounded-3xl border ${isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-gray-50'} p-4 md:p-5 space-y-4`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-lg md:text-xl font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('communityAdmin.pendingApplications')}</h2>
            <FiAlertTriangle className={isSpace ? 'text-white/50' : 'text-uv-gray'} />
          </div>

          <div className="space-y-5">
            {/* Members */}
            {isCommunityAdmin && (
              <div className="space-y-3">
                <h3 className={`font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('communityAdmin.pendingMemberRequests')}</h3>
                {pendingMembers.length === 0 ? (
                  <p className={`text-sm ${isSpace ? 'text-white/60' : 'text-uv-gray'}`}>{t('communityAdmin.noPending')}</p>
                ) : (
                  <div className="space-y-3">
                    {pendingMembers.map((m: any) => (
                      <div key={m.member_user_id} className={`rounded-2xl p-4 border ${isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-white'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className={`font-black truncate ${isSpace ? 'text-white' : 'text-uv-black'}`}>
                              {m.first_name} {m.last_name}
                            </div>
                            <div className={`text-xs ${isSpace ? 'text-white/60' : 'text-uv-gray'} mt-1`}>
                              {m.email}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => decideMemberRequest(m.member_user_id, 'approved')}
                              className="bg-primary text-white font-black py-2 px-3 rounded-2xl hover:brightness-95 transition-all active:scale-[0.98] text-[12px]"
                            >
                              {t('common.approve')}
                            </button>
                            <button
                              type="button"
                              onClick={() => decideMemberRequest(m.member_user_id, 'rejected')}
                              className="bg-red-500 text-white font-black py-2 px-3 rounded-2xl hover:brightness-95 transition-all active:scale-[0.98] text-[12px]"
                            >
                              {t('common.reject')}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Events */}
            {isCommunityAdmin && (
              <div className="space-y-3">
                <h3 className={`font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('communityAdmin.pendingEventApps')}</h3>
                {pendingEventApps.length === 0 ? (
                  <p className={`text-sm ${isSpace ? 'text-white/60' : 'text-uv-gray'}`}>{t('communityAdmin.noPending')}</p>
                ) : (
                  <div className="space-y-3">
                    {pendingEventApps.map((a: any) => (
                      <div key={a.event_application_id} className={`rounded-2xl p-4 border ${isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-white'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className={`font-black truncate ${isSpace ? 'text-white' : 'text-uv-black'}`}>{a.event_title}</div>
                            <div className={`text-xs ${isSpace ? 'text-white/60' : 'text-uv-gray'} mt-1`}>
                              {a.first_name} {a.last_name} · {a.applicant_email}
                            </div>
                            <div className={`text-[10px] font-bold uppercase tracking-widest mt-2 ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>
                              {a.is_submitted ? t('communityAdmin.submitted') : t('communityAdmin.started')}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => decideEventApp(a.event_application_id, 'approved')}
                              className="bg-primary text-white font-black py-2 px-3 rounded-2xl hover:brightness-95 transition-all active:scale-[0.98] text-[12px]"
                            >
                              {t('common.approve')}
                            </button>
                            <button
                              type="button"
                              onClick={() => decideEventApp(a.event_application_id, 'rejected')}
                              className="bg-red-500 text-white font-black py-2 px-3 rounded-2xl hover:brightness-95 transition-all active:scale-[0.98] text-[12px]"
                            >
                              {t('common.reject')}
                            </button>
                          </div>
                        </div>
                        {a.cv_file_url && (
                          <a
                            href={resolveMediaUrl(a.cv_file_url)}
                            target="_blank"
                            rel="noreferrer"
                            className={`block mt-3 text-[12px] font-black ${isSpace ? 'text-primary/90 hover:text-primary' : 'text-primary hover:text-primary'}`}
                          >
                            {t('communityAdmin.viewCv')}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default CommunityAdminPanel;
