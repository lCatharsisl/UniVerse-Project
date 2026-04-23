import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { COMMUNITY_CATEGORY_CODES, COMMUNITY_CATEGORY_LABEL_KEYS, type CommunityCategoryCode } from '../constants/communityCategories';
import { toImgSrc } from '../utils/resolveMediaUrl';
import { FiUsers, FiCalendar, FiArrowRight, FiCamera, FiBriefcase, FiX } from 'react-icons/fi';

const formatDateOnly = (raw: string) => {
  const d = (raw || '').split('T')[0];
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y}`;
};

const isJobDeadlinePassed = (raw: string) => {
  const d = (raw || '').split('T')[0];
  if (!d) return false;
  return new Date(`${d}T23:59:59`).getTime() < Date.now();
};

const getInitials = (firstName?: string, lastName?: string, email?: string) => {
  const first = firstName?.trim() || '';
  const last = lastName?.trim() || '';
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first) {
    const words = first.split(/\s+/).filter(Boolean);
    if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
    return first[0].toUpperCase();
  }
  return email?.trim()?.[0]?.toUpperCase() || '?';
};

const CommunityProfile = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { communityId } = useParams<{ communityId: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';
  const isStaff = user?.role === 'staff' || user?.role === 'admin';

  const [notice, setNotice] = useState<null | { title: string; message?: string; kind: 'info' | 'success' | 'error' }>(null);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [fullMembers, setFullMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const canApplyToJobs = Boolean(user?.role && user.role !== 'community');

  useEffect(() => {
    if (!notice) return;
    const tId = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(tId);
  }, [notice]);

  const categories = useMemo(
    () => [...COMMUNITY_CATEGORY_CODES] as CommunityCategoryCode[],
    []
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [profile, setProfile] = useState<any>(null);
  const [selectedCategories, setSelectedCategories] = useState<CommunityCategoryCode[]>([]);
  const [mediaSaving, setMediaSaving] = useState(false);

  const load = async () => {
    if (!communityId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/community/${communityId}`);
      setProfile(res.data);
      const codes = (res.data?.community?.category_codes || []).filter((c: any) => categories.includes(c as CommunityCategoryCode));
      setSelectedCategories(codes as CommunityCategoryCode[]);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load community');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communityId]);

  const eventIdFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('eventId');
  }, [location.search]);

  useEffect(() => {
    if (!eventIdFromQuery) return;
    const evs = profile?.events;
    if (!Array.isArray(evs) || evs.length === 0) return;
    const el = document.getElementById(`uv-event-${eventIdFromQuery}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [eventIdFromQuery, profile?.events]);

  useEffect(() => {
    if (!membersModalOpen || !communityId || !profile) return;
    setMembersLoading(true);
    const preview = profile.membersPreview as any[] | undefined;
    api
      .get(`/community/${communityId}/members`)
      .then((res) => {
        const list = res.data?.members || [];
        const adminRow = preview?.find((m: any) => m.membership_role === 'admin');
        if (adminRow && !list.some((m: any) => m.user_id === adminRow.user_id)) {
          setFullMembers([adminRow, ...list]);
        } else {
          setFullMembers(list);
        }
      })
      .catch(() => setFullMembers([]))
      .finally(() => setMembersLoading(false));
  }, [membersModalOpen, communityId, profile]);

  const applyToCommunityJob = async (jobPostId: number) => {
    try {
      const res = await api.post(`/community/jobs/${jobPostId}/applications/init`);
      navigate(`/community/jobs/applications/${res.data.jobApplicationId}`);
    } catch (e: any) {
      setNotice({ kind: 'error', title: e?.response?.data?.error || 'Failed to start application' });
    }
  };

  const toggleCategory = (code: CommunityCategoryCode) => {
    setSelectedCategories((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  };

  const join = async () => {
    try {
      await api.post(`/community/${communityId}/members`);
      const res = await api.get(`/community/${communityId}`);
      setProfile(res.data);
      if (res.data?.membershipStatus === 'pending') {
        setNotice({ kind: 'info', title: t('communityProfile.joinPending') });
      } else {
        setNotice({ kind: 'success', title: t('communityProfile.join') });
      }
    } catch (e: any) {
      setNotice({ kind: 'error', title: e?.response?.data?.error || 'Failed to join community' });
    }
  };

  const leave = async () => {
    try {
      await api.delete(`/community/${communityId}/members/me`);
      // Force immediate UI refresh from backend response.
      const res = await api.get(`/community/${communityId}`);
      setProfile(res.data);
      setNotice({ kind: 'success', title: t('communityProfile.leave') });
    } catch (e: any) {
      setNotice({ kind: 'error', title: e?.response?.data?.error || 'Failed to leave community' });
    }
  };

  const updateCategories = async () => {
    try {
      await api.patch(`/community/${communityId}/categories`, { categories: selectedCategories });
      await load();
    } catch (e: any) {
      setNotice({ kind: 'error', title: e?.response?.data?.error || 'Failed to update categories' });
    }
  };

  const updateMedia = async (input: { avatarFile?: File | null; coverFile?: File | null }) => {
    if (!communityId) return;
    if (!input.avatarFile && !input.coverFile) {
      setNotice({ kind: 'info', title: t('communityProfile.noMediaSelected') });
      return;
    }
    setMediaSaving(true);
    try {
      const form = new FormData();
      if (input.avatarFile) form.append('avatar', input.avatarFile);
      if (input.coverFile) form.append('cover', input.coverFile);
      await api.patch(`/community/${communityId}/media`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await load();
      setNotice({ kind: 'success', title: t('communityProfile.mediaUpdated') });
    } catch (e: any) {
      setNotice({ kind: 'error', title: e?.response?.data?.error || 'Failed to update images' });
    } finally {
      setMediaSaving(false);
    }
  };

  const applyToEvent = async (eventId: number) => {
    if (!profile?.isMember || profile?.isAdmin) {
      if (profile?.membershipStatus === 'pending') {
        setNotice({ kind: 'info', title: t('communityProfile.joinPending') });
      } else {
        setNotice({ kind: 'info', title: t('communityProfile.joinRequired') });
      }
      return;
    }
    try {
      const res = await api.post(`/community/events/${eventId}/applications/init`);
      const status = res.data?.status || 'pending';
      if (status === 'approved') {
        setNotice({ kind: 'success', title: t('communityProfile.eventJoined') });
      } else {
        setNotice({ kind: 'info', title: t('communityProfile.eventJoinPending') });
      }
    } catch (e: any) {
      setNotice({ kind: 'error', title: e?.response?.data?.error || 'Failed to start application' });
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen p-4 md:p-6 ${isSpace ? 'bg-[#050510]' : 'bg-white'}`}>
        <p className="text-uv-gray font-black uppercase tracking-widest text-[10px]">{t('communityProfile.loading')}</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={`min-h-screen p-4 md:p-6 ${isSpace ? 'bg-[#050510]' : 'bg-white'}`}>
        <div className="p-4 rounded-2xl border border-red-500/30 bg-red-50 text-red-700 font-bold">{error || t('common.notFound')}</div>
      </div>
    );
  }

  const { community, memberCount, isMember, isAdmin, membershipStatus, membersPreview, events, jobs } = profile;
  const coverSrc = toImgSrc(community.cover_url);
  const groupAvatarSrc = toImgSrc(community.avatar_url);

  return (
    <div className={`min-h-screen p-4 md:p-6 ${isSpace ? 'bg-[#050510]' : 'bg-white'}`}>
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Cover */}
        <div className={`rounded-3xl overflow-hidden border ${isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-white'}`}>
          <div className="relative h-44 md:h-56">
            {community.cover_url ? (
              <img src={resolveMediaUrl(community.cover_url)} className="w-full h-full object-cover" alt={community.community_name} />
            ) : (
              <div className={`w-full h-full ${isSpace ? 'bg-primary/20' : 'bg-primary/10'}`} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            {isAdmin && (
              <label
                className={`absolute inset-0 z-[2] cursor-pointer group ${mediaSaving ? 'pointer-events-none opacity-70' : ''}`}
                title={t('communityProfile.changeCover')}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={mediaSaving}
                  onChange={(e) => updateMedia({ coverFile: e.target.files?.[0] || null }).catch(() => {})}
                />
                <span
                  className={`absolute right-3 top-3 w-9 h-9 rounded-xl border flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 ${
                    isSpace ? 'bg-black/50 border-white/20 text-white' : 'bg-white/90 border-uv-border text-uv-black'
                  }`}
                >
                  <FiCamera size={16} />
                </span>
              </label>
            )}
            <button
              type="button"
              onClick={() => navigate(-1)}
              className={`absolute top-3 left-3 z-[3] p-2 rounded-xl ${isSpace ? 'bg-white/10 text-white' : 'bg-white/90 text-uv-black'}`}
              aria-label={t('common.back')}
            >
              <FiArrowRight className="rotate-180" />
            </button>

            <div className="absolute left-4 bottom-3 flex items-center gap-3">
              <label
                className={`relative cursor-pointer group ${mediaSaving ? 'pointer-events-none opacity-70' : ''}`}
                title={t('communityProfile.changeAvatar')}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={mediaSaving}
                  onChange={(e) => updateMedia({ avatarFile: e.target.files?.[0] || null }).catch(() => {})}
                />
                {groupAvatarSrc ? (
                  <img
                    src={groupAvatarSrc}
                    alt={community.community_name}
                    className="w-14 h-14 rounded-2xl border-2 border-white/30 object-cover bg-white"
                  />
                ) : (
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black ${isSpace ? 'bg-white/10 text-white' : 'bg-primary/10 text-primary'} border-2 border-white/30`}>
                    {community.community_name?.[0]?.toUpperCase() || 'C'}
                  </div>
                )}
                {isAdmin && (
                  <span
                    className={`absolute -right-1 -bottom-1 w-6 h-6 rounded-lg border flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 ${
                      isSpace ? 'bg-black/60 border-white/20 text-white' : 'bg-white border-uv-border text-uv-black'
                    }`}
                  >
                    <FiCamera size={12} />
                  </span>
                )}
              </label>
              <div>
                <h1 className={`text-2xl md:text-3xl font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>{community.community_name}</h1>
                <div className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1 mt-1 ${isSpace ? 'text-white/60' : 'text-uv-gray'}`}>
                  <FiUsers size={12} /> {memberCount} {t('communityProfile.members')}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-5">
            <p className={`text-sm md:text-[15px] ${isSpace ? 'text-white/80' : 'text-uv-black/90'} whitespace-pre-wrap`}>
              {community.description || t('communityProfile.noDescription')}
            </p>

            <div className="flex flex-wrap gap-2 mt-3">
              {(community.category_codes || []).slice(0, 4).map((code: string) => (
                <span
                  key={code}
                  className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-xl border ${
                    isSpace ? 'bg-white/5 border-white/10 text-white/70' : 'bg-primary/10 border-primary/20 text-primary'
                  }`}
                >
                  {t(COMMUNITY_CATEGORY_LABEL_KEYS[code as CommunityCategoryCode] || 'communityCategory.other')}
                </span>
              ))}
              {(!community.category_codes || community.category_codes.length === 0) && (
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-xl border ${isSpace ? 'bg-white/5 border-white/10 text-white/70' : 'bg-primary/10 border-primary/20 text-primary'}`}>
                  {t('communityCategory.other')}
                </span>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-3 mt-4">
              {isAdmin || isStaff ? (
                <button
                  type="button"
                  onClick={() => navigate(`/community/${community.community_id}/admin`)}
                  className="w-full md:w-auto bg-transparent text-primary font-black py-3 rounded-2xl border border-primary/30 hover:bg-primary/10 transition-all active:scale-[0.98]"
                >
                  {t('communityProfile.adminPanel')}
                </button>
              ) : membershipStatus === 'none' ? (
                <button
                  type="button"
                  onClick={join}
                  className="w-full bg-primary text-white font-black py-4 px-6 rounded-2xl hover:brightness-95 transition-all active:scale-[0.98] min-h-[52px]"
                >
                  {t('communityProfile.join')}
                </button>
              ) : membershipStatus === 'pending' ? (
                <>
                  <button
                    type="button"
                    disabled
                    className={`w-full bg-white text-uv-gray font-black py-4 px-6 rounded-2xl border border-uv-border opacity-60 cursor-not-allowed min-h-[52px]`}
                  >
                    {t('communityProfile.join')}
                  </button>
                  <button
                    type="button"
                    onClick={leave}
                    className={`w-full bg-white text-uv-black font-black py-4 px-6 rounded-2xl border border-uv-border hover:bg-gray-50 transition-all active:scale-[0.98] min-h-[52px]`}
                  >
                    {t('communityProfile.cancelRequest')}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={leave}
                  className="w-full bg-white text-uv-black font-black py-4 px-6 rounded-2xl border border-uv-border hover:bg-gray-50 transition-all active:scale-[0.98] min-h-[52px]"
                >
                  {t('communityProfile.leave')}
                </button>
              )}
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className={`rounded-3xl border ${isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-gray-50'} p-4 md:p-5`}>
            <h2 className={`text-lg md:text-xl font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('communityProfile.categories')}</h2>
            <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>{t('communityProfile.categoriesHint')}</p>

            <div className="flex flex-wrap gap-2 mt-3">
              {categories.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => toggleCategory(code)}
                  className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${
                    selectedCategories.includes(code)
                      ? 'bg-primary text-white border-primary/30'
                      : isSpace
                      ? 'bg-white/5 text-white/60 border-white/10 hover:text-white'
                      : 'bg-white text-uv-gray border-uv-border hover:text-uv-black'
                  }`}
                >
                  {t(COMMUNITY_CATEGORY_LABEL_KEYS[code])}
                </button>
              ))}
            </div>

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={updateCategories}
                className="bg-primary text-white font-black py-3 px-5 rounded-2xl hover:brightness-95 transition-all"
              >
                {t('common.save')}
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategories((community.category_codes || []) as CommunityCategoryCode[])}
                className={`py-3 px-5 rounded-2xl font-black border transition-all ${isSpace ? 'border-white/10 text-white/70 hover:bg-white/5' : 'border-uv-border text-uv-gray hover:bg-white'}`}
              >
                {t('common.reset')}
              </button>
            </div>
          </div>
        )}

        {/* Members */}
        <div className={`rounded-3xl border ${isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-gray-50'} p-4 md:p-5`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className={`text-lg md:text-xl font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('communityProfile.membersList')}</h2>
            <div className="flex items-center gap-2">
              <div className={`text-[10px] font-black uppercase tracking-widest ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>
                {membersPreview.length} / {memberCount}
              </div>
              {memberCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setMembersModalOpen(true)}
                  className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border transition-all ${
                    isSpace ? 'border-white/20 text-white/80 hover:bg-white/10' : 'border-uv-border text-uv-gray hover:bg-white'
                  }`}
                >
                  {t('communityProfile.viewAllMembers')}
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            {membersPreview.map((m: any) => {
              const memSrc = toImgSrc(m.avatar_url);
              return (
              <div
                key={m.user_id}
                className={`rounded-2xl p-3 border ${
                  isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-white'
                }`}
              >
                <div className="mb-2">
                  {memSrc ? (
                    <img
                      src={memSrc}
                      alt=""
                      className="w-9 h-9 rounded-xl object-cover border border-white/20"
                    />
                  ) : (
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-[10px] border ${isSpace ? 'bg-white/10 text-white border-white/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
                      {getInitials(m.first_name, m.last_name, m.email)}
                    </div>
                  )}
                </div>
                <div className={`text-xs font-black uppercase tracking-widest ${isSpace ? 'text-white/60' : 'text-uv-gray'} truncate`}>
                  {m.membership_role === 'admin' ? t('communityProfile.admin') : t('communityProfile.member')}
                </div>
                <div className={`mt-1 font-black ${isSpace ? 'text-white' : 'text-uv-black'} truncate`}>
                  {m.first_name} {m.last_name}
                </div>
                <div className={`text-[10px] ${isSpace ? 'text-white/50' : 'text-uv-gray'} truncate`}>{m.email}</div>
              </div>
              );
            })}
          </div>
        </div>

        {/* Events */}
        <div className={`rounded-3xl border ${isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-gray-50'} p-4 md:p-5 space-y-3`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-lg md:text-xl font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('communityProfile.events')}</h2>
            <FiCalendar className={isSpace ? 'text-white/50' : 'text-uv-gray'} />
          </div>
          {events.length === 0 ? (
            <p className={`text-sm ${isSpace ? 'text-white/60' : 'text-uv-gray'}`}>{t('communityProfile.noEvents')}</p>
          ) : (
            <div className="space-y-3">
              {events.map((ev: any) => (
                <div
                  key={ev.event_id}
                  id={`uv-event-${ev.event_id}`}
                  className={`rounded-2xl p-4 border ${isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-white'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className={`font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>{ev.title}</div>
                      <div className={`text-xs ${isSpace ? 'text-white/60' : 'text-uv-gray'} mt-1`}>
                        {ev.location || t('communityProfile.noLocation')}
                      </div>
                      <div className={`text-[10px] font-bold uppercase tracking-widest mt-2 ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>
                        {ev.start_at ? `${t('communityProfile.startAt')}: ${new Date(ev.start_at).toLocaleString()}` : ''}
                        {ev.end_at ? ` · ${t('communityProfile.endAt')}: ${new Date(ev.end_at).toLocaleString()}` : ''}
                      </div>
                    </div>
                    {isMember && !isAdmin ? (
                      <button
                        type="button"
                        onClick={() => applyToEvent(ev.event_id)}
                        className="bg-primary text-white font-black py-2 px-4 rounded-2xl hover:brightness-95 transition-all active:scale-[0.98] text-[12px]"
                      >
                        {t('communityProfile.eventJoin')}
                      </button>
                    ) : !isAdmin ? (
                      <div className={`text-[10px] font-black uppercase tracking-widest ${isSpace ? 'text-white/40' : 'text-uv-gray'}`}>
                        {t('communityProfile.joinFirst')}
                      </div>
                    ) : (
                      <div className={`text-[10px] font-black uppercase tracking-widest ${isSpace ? 'text-white/40' : 'text-uv-gray'}`}>
                        {t('communityProfile.adminCannotApply')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {Array.isArray(jobs) && jobs.length > 0 ? (
          <div className={`rounded-3xl border ${isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-gray-50'} p-4 md:p-5 space-y-3`}>
            <div className="flex items-center gap-2">
              <FiBriefcase className={isSpace ? 'text-white/50' : 'text-uv-gray'} />
              <h2 className={`text-lg md:text-xl font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('communityProfile.jobBoard')}</h2>
            </div>
            <div className="space-y-3">
              {jobs.map((job: any) => {
                const passed = isJobDeadlinePassed(job.deadline_date);
                return (
                  <div
                    key={job.job_post_id}
                    className={`rounded-2xl p-4 border ${isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-white'}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="min-w-0">
                        <div className={`font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>{job.title}</div>
                        {job.company_name ? (
                          <div className={`text-xs mt-1 ${isSpace ? 'text-white/60' : 'text-uv-gray'}`}>{job.company_name}</div>
                        ) : null}
                        <div className={`text-[10px] font-bold uppercase tracking-widest mt-2 ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>
                          {job.post_type === 'internship' ? t('communityProfile.internship') : t('communityProfile.job')} ·{' '}
                          {t('communityProfile.deadline')}: {formatDateOnly(job.deadline_date)}
                        </div>
                        {job.description ? (
                          <p className={`text-sm mt-2 line-clamp-3 ${isSpace ? 'text-white/70' : 'text-uv-gray'}`}>{job.description}</p>
                        ) : null}
                      </div>
                      {canApplyToJobs ? (
                        <button
                          type="button"
                          disabled={passed}
                          onClick={() => applyToCommunityJob(job.job_post_id)}
                          className={`shrink-0 font-black py-2.5 px-4 rounded-2xl text-xs transition-all ${
                            passed
                              ? isSpace
                                ? 'bg-white/10 text-white/40 cursor-not-allowed'
                                : 'bg-gray-100 text-uv-gray cursor-not-allowed'
                              : 'bg-primary text-white hover:brightness-95 active:scale-[0.98]'
                          }`}
                        >
                          {passed ? t('communityProfile.deadlinePassed') : t('communityProfile.apply')}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {membersModalOpen ? (
          <div className="fixed inset-0 z-[998] flex items-center justify-center p-4">
            <button
              type="button"
              className={`absolute inset-0 ${isSpace ? 'bg-black/70' : 'bg-black/50'}`}
              aria-label={t('common.close')}
              onClick={() => setMembersModalOpen(false)}
            />
            <div
              className={`relative w-full max-w-lg max-h-[min(78vh,560px)] overflow-hidden flex flex-col rounded-3xl border shadow-2xl ${
                isSpace ? 'bg-[#0d0d1a] border-white/10' : 'bg-white border-uv-border'
              }`}
            >
              <div className={`flex items-center justify-between gap-2 p-4 border-b ${isSpace ? 'border-white/10' : 'border-uv-border'}`}>
                <h3 className={`text-lg font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('communityProfile.allMembersTitle')}</h3>
                <button
                  type="button"
                  onClick={() => setMembersModalOpen(false)}
                  className={`p-2 rounded-xl ${isSpace ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-uv-black'}`}
                  aria-label={t('common.close')}
                >
                  <FiX size={22} />
                </button>
              </div>
              <div className="overflow-y-auto p-4 space-y-2 flex-1 min-h-0">
                {membersLoading ? (
                  <p className={`text-xs font-black uppercase tracking-widest ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>
                    {t('common.loading')}
                  </p>
                ) : fullMembers.length === 0 ? (
                  <p className={`text-sm ${isSpace ? 'text-white/60' : 'text-uv-gray'}`}>{t('communityProfile.noMembersInList')}</p>
                ) : (
                  fullMembers.map((m: any, idx: number) => {
                    const memSrc = toImgSrc(m.avatar_url);
                    return (
                    <div
                      key={`${m.user_id}-${idx}`}
                      className={`rounded-2xl p-3 border ${isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-gray-50'}`}
                    >
                      <div className="mb-2">
                        {memSrc ? (
                          <img
                            src={memSrc}
                            alt=""
                            className="w-10 h-10 rounded-xl object-cover border border-white/20"
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border ${isSpace ? 'bg-white/10 text-white border-white/20' : 'bg-primary/10 text-primary border-primary/20'}`}>
                            {getInitials(m.first_name, m.last_name, m.email)}
                          </div>
                        )}
                      </div>
                      <div className={`text-[10px] font-black uppercase tracking-widest ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>
                        {m.membership_role === 'admin' ? t('communityProfile.admin') : t('communityProfile.member')}
                      </div>
                      <div className={`mt-1 font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>
                        {m.first_name} {m.last_name}
                      </div>
                      <div className={`text-xs truncate ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>{m.email}</div>
                    </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : null}

        {notice && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <div className={`absolute inset-0 ${isSpace ? 'bg-black/60' : 'bg-black/40'}`} onClick={() => setNotice(null)} />
            <div
              className={`relative w-full max-w-sm rounded-3xl border p-4 md:p-5 shadow-2xl ${
                isSpace ? 'bg-[#0d0d1a] border-white/10' : 'bg-white border-uv-border'
              }`}
            >
              <div
                className={`text-xs font-black uppercase tracking-widest ${
                  notice.kind === 'success'
                    ? 'text-green-500'
                    : notice.kind === 'error'
                      ? 'text-red-500'
                      : isSpace
                        ? 'text-white/60'
                        : 'text-uv-gray'
                }`}
              >
                {notice.kind}
              </div>
              <div className={`mt-2 font-black text-lg ${isSpace ? 'text-white' : 'text-uv-black'}`}>{notice.title}</div>
              {notice.message ? (
                <div className={`mt-2 text-sm ${isSpace ? 'text-white/70' : 'text-uv-gray'}`}>{notice.message}</div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityProfile;

