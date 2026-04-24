import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useAuth, isAcademic } from '../context/AuthContext';
import api from '../api/client';
import { FiAlertTriangle, FiTrash2, FiChevronDown, FiX, FiUser } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { themedAlert, themedConfirm } from '../utils/themedDialog';
import PostAttachment from '../components/PostAttachment';

interface ReportedPost {
  post_id: number;
  user_id: number;
  content: string;
  image_url: string | null;
  created_at: string;
  reports_count: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  likes_count?: number;
  comments_count?: number;
  reposts_count?: number;
}

interface ReportedUser {
  userId: number;
  name?: string;
  surname?: string;
  email?: string;
  avatarUrl?: string | null;
  reports_count: number;
}

function ModerationAvatar({
  avatarUrl,
  fallbackLetter,
  isSpace,
  onNavigate,
}: {
  avatarUrl: string | null | undefined;
  fallbackLetter: string;
  isSpace: boolean;
  onNavigate: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = avatarUrl && !failed;

  return (
    <button
      type="button"
      onClick={onNavigate}
      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-black text-sm sm:text-base border-2 shrink-0 cursor-pointer overflow-hidden transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 ${
        isSpace
          ? 'bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 border-white/15 text-white shadow-inner'
          : 'bg-gradient-to-br from-violet-100 to-fuchsia-50 border-violet-200/80 text-violet-800 shadow-sm'
      }`}
    >
      {showImg ? (
        <img
          src={avatarUrl!.startsWith('http') ? avatarUrl! : `http://localhost:3000${avatarUrl}`}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        fallbackLetter
      )}
    </button>
  );
}

/** i18n plural suffix resolution is flaky with some configs; explicit keys always work. */
function moderationReportsLabel(t: TFunction, rawCount: unknown): string {
  const n = Math.max(0, Math.floor(Number(rawCount) || 0));
  return n === 1 ? t('reported.reportsCount_one', { count: n }) : t('reported.reportsCount_other', { count: n });
}

/** System/seed posts often store "notification" in English; show localized label with proper casing. */
function formatReportedPostContent(raw: string | undefined | null, t: TFunction): string {
  const trimmed = (raw ?? '').trim();
  if (trimmed.toLowerCase() === 'notification') {
    return t('reported.postContentNotification');
  }
  return raw ?? '';
}

function isNotificationPlaceholderContent(raw: string | undefined | null): boolean {
  return (raw ?? '').trim().toLowerCase() === 'notification';
}

const Reported = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';

  const [reportedPosts, setReportedPosts] = useState<ReportedPost[]>([]);
  const [reportedUsers, setReportedUsers] = useState<ReportedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportersModal, setReportersModal] = useState<{ type: 'post' | 'user'; id: number; list: any[] } | null>(null);
  const [loadingReporters, setLoadingReporters] = useState(false);
  const [reportTypePosts, setReportTypePosts] = useState<string>('');
  const [reportTypeUsers, setReportTypeUsers] = useState<string>('');
  const [openFilter, setOpenFilter] = useState<'posts' | 'users' | null>(null);
  const filterPostsRef = useRef<HTMLDivElement>(null);
  const filterUsersRef = useRef<HTMLDivElement>(null);
  const ignoreNextTriggerRef = useRef(false);

  const isStaff = user && isAcademic(user.role);

  const reportTypeOptions = useMemo(
    () => [
      { value: '', label: t('reported.allTypes') },
      { value: 'spam', label: t('reported.spam') },
      { value: 'harassment', label: t('reported.harassment') },
      { value: 'inappropriate', label: t('reported.inappropriate') },
      { value: 'other', label: t('reported.other') },
    ],
    [t, i18n.language]
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterPostsRef.current?.contains(e.target as Node) || filterUsersRef.current?.contains(e.target as Node)) return;
      setOpenFilter(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFilterTrigger = (which: 'posts' | 'users') => {
    if (ignoreNextTriggerRef.current) {
      ignoreNextTriggerRef.current = false;
      return;
    }
    setOpenFilter(openFilter === which ? null : which);
  };

  const handleFilterSelect = (which: 'posts' | 'users', value: string) => {
    if (which === 'posts') setReportTypePosts(value);
    else setReportTypeUsers(value);
    setOpenFilter(null);
    ignoreNextTriggerRef.current = true;
    setTimeout(() => {
      ignoreNextTriggerRef.current = false;
    }, 150);
  };

  const loadReported = async () => {
    if (!isStaff) return;
    setLoading(true);
    try {
      const [postsRes, usersRes] = await Promise.all([
        api.get('/social/reported/posts', { params: reportTypePosts ? { reportType: reportTypePosts } : {} }),
        api.get('/social/reported/users', { params: reportTypeUsers ? { reportType: reportTypeUsers } : {} }),
      ]);
      const postsData = postsRes.data || [];
      setReportedPosts(
        postsData.map((p: any) => ({
          ...p,
          reports_count: Math.max(0, Math.floor(Number(p.reports_count) || 0)),
        }))
      );
      const usersData = usersRes.data || [];
      setReportedUsers(
        usersData.map((u: any) => ({
          ...u,
          userId: u.userId ?? u.user_id,
          avatarUrl: u.avatarUrl ?? u.avatar_url,
          reports_count: Math.max(0, Math.floor(Number(u.reports_count) || 0)),
        }))
      );
    } catch (err) {
      console.error('Failed to load reported content', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isStaff) {
      setLoading(false);
      return;
    }
    loadReported();
  }, [isStaff, reportTypePosts, reportTypeUsers]);

  const handleDeletePost = async (postId: number) => {
    if (!(await themedConfirm(t('reported.deletePostConfirm')))) return;
    try {
      await api.delete(`/social/posts/${postId}`);
      setReportedPosts((prev) => prev.filter((p) => p.post_id !== postId));
    } catch {
      await themedAlert(t('reported.deletePostFailed'));
    }
  };

  const handleShowReporters = async (type: 'post' | 'user', id: number) => {
    setLoadingReporters(true);
    setReportersModal({ type, id, list: [] });
    try {
      const endpoint = type === 'post' ? `/social/posts/${id}/reporters` : `/social/users/${id}/reporters`;
      const res = await api.get(endpoint);
      setReportersModal((prev) => (prev ? { ...prev, list: res.data || [] } : null));
    } catch {
      setReportersModal(null);
    } finally {
      setLoadingReporters(false);
    }
  };

  const formatPostDate = (dateString: string) => {
    const locale = i18n.language?.startsWith('tr') ? 'tr-TR' : 'en-US';
    return new Date(dateString).toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  };

  const panelShell = isSpace
    ? 'bg-[#0d0d1a]/95 border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.06]'
    : 'bg-white border-uv-border shadow-[0_4px_24px_rgba(15,23,42,0.06)] ring-1 ring-black/[0.04]';

  const cardShell = isSpace
    ? 'bg-white/[0.04] border-white/10 hover:bg-white/[0.06] hover:border-white/15'
    : 'bg-slate-50/90 border-slate-200/80 hover:bg-white hover:border-slate-300/90 hover:shadow-md';

  const filterBtn = isSpace
    ? 'bg-[#1a1a2e] border-red-500/50 text-white hover:bg-[#252540]'
    : 'bg-slate-50 border-slate-200 text-uv-black hover:bg-white hover:border-slate-300';

  if (!user) return null;
  if (!isStaff) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-6">
        <FiAlertTriangle className="text-red-500 w-12 h-12 mb-4" />
        <h2 className="text-xl font-black text-uv-black dark:text-white mb-2">{t('reported.accessRestricted')}</h2>
        <p className="text-uv-gray text-sm text-center max-w-sm">{t('reported.accessRestrictedDesc')}</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen ${isSpace ? 'bg-[#050510]' : 'bg-slate-50/80'}`}>
      <div className={`sticky top-0 z-20 border-b px-4 md:px-8 py-4 md:py-5 ${isSpace ? 'premium-blur border-white/10' : 'premium-blur border-uv-border bg-white/80'}`}>
        <div className="max-w-[1600px] mx-auto w-full">
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isSpace ? 'bg-red-500/20 text-red-300' : 'bg-red-50 text-red-600'}`}
            >
              <FiAlertTriangle className="w-5 h-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 className={`text-lg sm:text-2xl md:text-3xl font-black tracking-tight leading-tight ${isSpace ? 'text-white' : 'text-uv-black'}`}>
                {t('reported.title')}
              </h2>
              <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] mt-1 ${isSpace ? 'text-red-400' : 'text-red-600'}`}>
                {t('reported.moderation')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="max-w-[1600px] mx-auto w-full px-4 md:px-8 lg:px-10 py-6 md:py-8 flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Reported posts */}
            <section className={`rounded-2xl border p-5 md:p-6 min-w-0 flex flex-col overflow-x-hidden ${panelShell}`}>
              <div className="flex w-full min-w-0 flex-col gap-3 pb-4 mb-1 border-b border-inherit">
                <div className="min-w-0 w-full pr-0">
                  <h3 className={`text-xs sm:text-sm font-black uppercase tracking-widest break-words ${isSpace ? 'text-white' : 'text-uv-black'}`}>
                    {t('reported.reportedPosts')}
                  </h3>
                  <p className={`text-[11px] mt-0.5 ${isSpace ? 'text-white/45' : 'text-slate-600'}`}>{t('reported.moderation')}</p>
                </div>
                <div className="relative w-full max-w-full min-w-0 self-stretch" ref={filterPostsRef}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFilterTrigger('posts');
                    }}
                    className={`w-full flex items-center justify-between gap-2.5 text-xs font-bold rounded-xl pl-3.5 pr-2.5 py-2.5 min-h-[44px] border-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 ${filterBtn}`}
                  >
                    <span className="min-w-0 flex-1 text-left truncate leading-snug">
                      {reportTypeOptions.find((o) => o.value === reportTypePosts)?.label || t('reported.allTypes')}
                    </span>
                    <FiChevronDown className={`w-4 h-4 shrink-0 transition-transform ${openFilter === 'posts' ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {openFilter === 'posts' && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border-2 shadow-xl py-1 min-w-0 w-full max-h-60 overflow-y-auto box-border ${
                          isSpace ? 'bg-[#1a1a2e] border-red-500/70' : 'bg-white border-uv-border'
                        }`}
                      >
                        {reportTypeOptions.map((opt) => (
                          <button
                            key={opt.value || 'all'}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleFilterSelect('posts', opt.value);
                            }}
                            className={`w-full text-left px-3.5 py-2.5 text-xs font-bold transition-colors break-words ${
                              isSpace ? 'text-white hover:bg-red-500/20' : 'text-slate-900 hover:bg-slate-50'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              {reportedPosts.length === 0 ? (
                <div className={`flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl ${isSpace ? 'bg-white/[0.03]' : 'bg-slate-100/50'}`}>
                  <FiAlertTriangle className={`w-8 h-8 mb-3 ${isSpace ? 'text-white/30' : 'text-slate-300'}`} />
                  <p className={`text-sm font-bold ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>{t('reported.noReportedPosts')}</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[min(70vh,720px)] overflow-y-auto overscroll-contain pr-1 -mr-1 min-h-0">
                  {reportedPosts.map((post) => (
                    <article
                      key={post.post_id}
                      className={`rounded-2xl border p-4 sm:p-5 transition-all duration-200 min-w-0 overflow-hidden ${cardShell}`}
                    >
                      {/* Top row: avatar + name/badge only; body + actions full card width, left-aligned */}
                      <div className="flex gap-3 sm:gap-4 min-w-0">
                        <button
                          type="button"
                          onClick={() => navigate(`/profile/${post.user_id}`)}
                          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-black text-sm sm:text-base border-2 shrink-0 cursor-pointer transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 ${
                            isSpace
                              ? 'bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 border-white/15 text-white'
                              : 'bg-gradient-to-br from-violet-100 to-fuchsia-50 border-violet-200/80 text-violet-800'
                          }`}
                        >
                          {(post.email || '?')[0].toUpperCase()}
                        </button>
                        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                          <div className="min-w-0 space-y-1 text-left">
                            <button
                              type="button"
                              onClick={() => navigate(`/profile/${post.user_id}`)}
                              className={`text-left font-black text-base sm:text-lg leading-snug hover:text-primary transition-colors break-words ${
                                isSpace ? 'text-white' : 'text-uv-black'
                              }`}
                            >
                              {post.first_name} {post.last_name}
                            </button>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                              <span className={`font-semibold truncate max-w-full ${isSpace ? 'text-white/70' : 'text-slate-600'}`}>
                                @{(post.email || '').split('@')[0]}
                              </span>
                              <span className={isSpace ? 'text-white/25' : 'text-slate-400'} aria-hidden>
                                ·
                              </span>
                              <time
                                dateTime={post.created_at}
                                className={`font-medium tabular-nums ${isSpace ? 'text-white/55' : 'text-slate-600'}`}
                              >
                                {formatPostDate(post.created_at)}
                              </time>
                            </div>
                          </div>
                          <span
                            className={`inline-flex shrink-0 items-center self-start rounded-full px-2.5 py-1 text-[11px] font-black leading-tight sm:text-xs sm:self-center ${
                              isSpace ? 'bg-red-500/20 text-red-300' : 'bg-red-50 text-red-700 ring-1 ring-red-100'
                            }`}
                          >
                            {moderationReportsLabel(t, post.reports_count)}
                          </span>
                        </div>
                      </div>
                      <div
                        className={`mt-3 w-full min-w-0 ${isNotificationPlaceholderContent(post.content) ? 'text-center' : 'text-left'}`}
                      >
                        <div
                          className={`box-border w-full max-w-full rounded-xl px-3 py-3 text-base font-medium leading-[1.55] tracking-normal antialiased break-words sm:px-4 sm:py-3.5 ${
                            isNotificationPlaceholderContent(post.content)
                              ? 'flex min-h-[2.75rem] items-center justify-center text-center sm:min-h-[3rem]'
                              : 'text-left'
                          } ${
                            isSpace
                              ? 'border border-white/10 bg-black/30 text-white/95'
                              : 'border border-slate-200/90 bg-white text-slate-800 shadow-sm'
                          }`}
                        >
                          {formatReportedPostContent(post.content, t)}
                        </div>
                        {post.image_url && (
                          <PostAttachment
                            path={post.image_url}
                            className="mt-3 w-full max-w-full overflow-hidden rounded-xl border border-uv-border/50 shadow-sm"
                            mediaClassName="max-h-48 sm:max-h-72 w-full object-cover"
                          />
                        )}
                        <div className="mt-4 flex w-full min-w-0 max-w-md flex-col items-stretch gap-2 border-t border-inherit pt-3">
                          <button
                            type="button"
                            onClick={() => handleShowReporters('post', post.post_id)}
                            className={`flex min-h-[44px] w-full min-w-0 items-center justify-center gap-1.5 rounded-xl border-2 px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide transition-colors sm:min-h-0 sm:text-xs ${
                              isSpace
                                ? 'border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20'
                                : 'border-red-200 bg-red-50/80 text-red-700 hover:bg-red-100'
                            }`}
                          >
                            {t('reported.viewReporters')}
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/profile/${post.user_id}`)}
                            className={`flex min-h-[44px] w-full min-w-0 items-center justify-center gap-1.5 rounded-xl border-2 px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide transition-colors sm:min-h-0 sm:text-xs ${
                              isSpace
                                ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20'
                                : 'border-primary/25 bg-primary/5 text-primary hover:bg-primary/10'
                            }`}
                          >
                            <FiUser className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            {t('reported.goToProfile')}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePost(post.post_id)}
                            className={`flex min-h-[44px] w-full min-w-0 items-center justify-center gap-1.5 rounded-xl border-2 px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide transition-colors sm:min-h-0 sm:text-xs ${
                              isSpace
                                ? 'border-red-400/50 bg-transparent text-red-300 hover:bg-red-500/15'
                                : 'border-red-200 bg-white text-red-600 hover:bg-red-50'
                            }`}
                          >
                            <FiTrash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            {t('reported.deletePost')}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* Reported users */}
            <section className={`rounded-2xl border p-5 md:p-6 min-w-0 flex flex-col overflow-x-hidden ${panelShell}`}>
              <div className="flex w-full min-w-0 flex-col gap-3 pb-4 mb-1 border-b border-inherit">
                <div className="min-w-0 w-full pr-0">
                  <h3 className={`text-xs sm:text-sm font-black uppercase tracking-widest break-words ${isSpace ? 'text-white' : 'text-uv-black'}`}>
                    {t('reported.reportedUsers')}
                  </h3>
                  <p className={`text-[11px] mt-0.5 ${isSpace ? 'text-white/45' : 'text-slate-600'}`}>{t('reported.moderation')}</p>
                </div>
                <div className="relative w-full max-w-full min-w-0 self-stretch" ref={filterUsersRef}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFilterTrigger('users');
                    }}
                    className={`w-full flex items-center justify-between gap-2.5 text-xs font-bold rounded-xl pl-3.5 pr-2.5 py-2.5 min-h-[44px] border-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-red-500/40 ${filterBtn}`}
                  >
                    <span className="min-w-0 flex-1 text-left truncate leading-snug">
                      {reportTypeOptions.find((o) => o.value === reportTypeUsers)?.label || t('reported.allTypes')}
                    </span>
                    <FiChevronDown className={`w-4 h-4 shrink-0 transition-transform ${openFilter === 'users' ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {openFilter === 'users' && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border-2 shadow-xl py-1 min-w-0 w-full max-h-60 overflow-y-auto box-border ${
                          isSpace ? 'bg-[#1a1a2e] border-red-500/70' : 'bg-white border-uv-border'
                        }`}
                      >
                        {reportTypeOptions.map((opt) => (
                          <button
                            key={opt.value || 'all-u'}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleFilterSelect('users', opt.value);
                            }}
                            className={`w-full text-left px-3.5 py-2.5 text-xs font-bold transition-colors break-words ${
                              isSpace ? 'text-white hover:bg-red-500/20' : 'text-slate-900 hover:bg-slate-50'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              {reportedUsers.length === 0 ? (
                <div className={`flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl ${isSpace ? 'bg-white/[0.03]' : 'bg-slate-100/50'}`}>
                  <FiUser className={`w-8 h-8 mb-3 ${isSpace ? 'text-white/30' : 'text-slate-300'}`} />
                  <p className={`text-sm font-bold ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>{t('reported.noReportedUsers')}</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[min(70vh,720px)] overflow-y-auto overscroll-contain pr-1 -mr-1 min-h-0">
                  {reportedUsers.map((u) => (
                    <article
                      key={u.userId}
                      className={`rounded-2xl border p-4 sm:p-5 transition-all duration-200 min-w-0 overflow-hidden ${cardShell}`}
                    >
                      <div className="flex gap-3 sm:gap-4 min-w-0">
                        <ModerationAvatar
                          avatarUrl={u.avatarUrl}
                          fallbackLetter={((u.name || u.surname || u.email || '?')[0] || '?').toUpperCase()}
                          isSpace={isSpace}
                          onNavigate={() => navigate(`/profile/${u.userId}`)}
                        />
                        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                          <div className="min-w-0 space-y-1 text-left">
                            <button
                              type="button"
                              onClick={() => navigate(`/profile/${u.userId}`)}
                              className={`text-left font-black text-base sm:text-lg leading-snug hover:text-primary transition-colors break-words ${
                                isSpace ? 'text-white' : 'text-uv-black'
                              }`}
                            >
                              {u.name} {u.surname}
                            </button>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                              <span className={`font-semibold truncate max-w-full ${isSpace ? 'text-white/70' : 'text-slate-600'}`}>
                                @{(u.email || '').split('@')[0]}
                              </span>
                            </div>
                          </div>
                          <span
                            className={`inline-flex shrink-0 items-center self-start rounded-full px-2.5 py-1 text-[11px] font-black leading-tight sm:text-xs sm:self-center ${
                              isSpace ? 'bg-red-500/20 text-red-300' : 'bg-red-50 text-red-700 ring-1 ring-red-100'
                            }`}
                          >
                            {moderationReportsLabel(t, u.reports_count)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 w-full min-w-0 text-left">
                        <div className="flex w-full min-w-0 max-w-md flex-col items-stretch gap-2 border-t border-inherit pt-3">
                          <button
                            type="button"
                            onClick={() => handleShowReporters('user', u.userId)}
                            className={`flex min-h-[44px] w-full min-w-0 items-center justify-center gap-1.5 rounded-xl border-2 px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide transition-colors sm:min-h-0 sm:text-xs ${
                              isSpace
                                ? 'border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20'
                                : 'border-red-200 bg-red-50/80 text-red-700 hover:bg-red-100'
                            }`}
                          >
                            {t('reported.viewReporters')}
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/profile/${u.userId}`)}
                            className={`flex min-h-[44px] w-full min-w-0 items-center justify-center gap-1.5 rounded-xl border-2 px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-wide transition-colors sm:min-h-0 sm:text-xs ${
                              isSpace
                                ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20'
                                : 'border-primary/25 bg-primary/5 text-primary hover:bg-primary/10'
                            }`}
                          >
                            <FiUser className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            {t('reported.goToProfile')}
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* Reporters modal */}
      <AnimatePresence>
        {reportersModal && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReportersModal(null)}
              className="absolute inset-0 bg-uv-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative flex max-h-[70vh] w-full flex-col rounded-t-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl sm:max-w-md sm:rounded-2xl dark:border-white/15 dark:bg-[#0d0d1a] dark:text-white"
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 p-4 dark:border-white/10">
                <h3 className="pr-2 text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white sm:text-base">
                  {reportersModal.type === 'post' ? t('reported.postReporters') : t('reported.userReporters')}
                </h3>
                <button
                  type="button"
                  onClick={() => setReportersModal(null)}
                  className="shrink-0 rounded-xl p-2 text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-white dark:hover:bg-white/15 dark:hover:text-white"
                  aria-label={t('common.close')}
                >
                  <FiX className="block h-[1.15rem] w-[1.15rem]" strokeWidth={2.5} aria-hidden />
                </button>
              </div>
              <div className="min-h-0 space-y-2 overflow-y-auto p-4">
                {loadingReporters ? (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : reportersModal.list.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-600 dark:text-slate-300">{t('reported.noReporters')}</p>
                ) : (
                  reportersModal.list.map((r: any) => (
                    <button
                      key={r.user_id}
                      type="button"
                      onClick={() => {
                        setReportersModal(null);
                        navigate(`/profile/${r.user_id}`);
                      }}
                      className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-transparent p-3 text-left text-slate-900 transition-colors hover:border-slate-200 hover:bg-slate-50 dark:text-white dark:hover:border-white/15 dark:hover:bg-white/10"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-base font-black text-primary dark:bg-primary/25 dark:text-red-100">
                        {(r.first_name || r.email)?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                          {r.first_name} {r.last_name}
                        </p>
                        <p className="truncate text-[11px] text-slate-600 dark:text-slate-300">@{r.email?.split('@')[0]}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Reported;
