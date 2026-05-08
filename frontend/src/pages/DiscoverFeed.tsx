import React, { useCallback, useEffect, useState, useRef, startTransition } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/client';
import {
  FiHeart,
  FiMessageCircle,
  FiRepeat,
  FiRefreshCcw,
  FiGlobe,
  FiMoreHorizontal,
  FiSend,
  FiTrash2,
  FiAlertTriangle,
  FiChevronLeft,
  FiCornerUpRight,
  FiX,
  FiNavigation,
  FiUser,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import PostAttachment from '../components/PostAttachment';
import AdminModerationMenu from '../components/AdminModerationMenu';
import SharedPostMessageCard from '../components/messaging/SharedPostMessageCard';
import { FeedAvatarImage } from '../components/FeedAvatarImage';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';
import { useAuth, isAcademic } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePagePullRefresh } from '../hooks/usePagePullRefresh';
import { themedAlert, themedConfirm } from '../utils/themedDialog';
import { getAuthUserAvatarUrl, getAuthUserInitials } from '../utils/authUserDisplay';

interface PostComment {
  comment_id: number;
  content: string;
  user_id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar_url?: string | null;
  created_at: string;
}

type DiscoverPost = {
  post_id: number;
  user_id: number;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  content?: string | null;
  image_url?: string | null;
  created_at: string;
  likes_count?: number | string;
  comments_count?: number | string;
  reposts_count?: number | string;
  reposter_name?: string | null;
  reposter_id?: number | null;
  avatar_url?: string | null;
  /** Backend: akış sırası (alıntıda = alıntı zamanı); yoksa created_at kullanılır */
  sorted_at?: string | null;
  has_reported?: boolean;
  my_report_type?: string | null;
  has_liked?: boolean;
  has_reposted?: boolean;
  showComments?: boolean;
  comments?: PostComment[];
  loadingComments?: boolean;
};

interface LikeUser {
  user_id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar_url?: string | null;
}

type ShareSearchUser = {
  user_id: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar_url?: string | null;
};

interface LikeUserCardProps {
  user: LikeUser;
  idx: number;
  onNavigate: (userId: number) => void;
  getEmailHandle: (email?: string) => string;
}

const LikeUserCard = React.memo(({ user: u, idx, onNavigate, getEmailHandle }: LikeUserCardProps) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: idx * 0.05 }}
    onClick={() => onNavigate(u.user_id)}
    className="flex cursor-pointer items-center gap-5 rounded-[1.8rem] border border-transparent bg-uv-border/5 p-4 transition-all hover:border-primary/20 hover:bg-primary/[0.05] hover:shadow-xl hover:shadow-primary/5 group"
  >
    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-uv-border bg-white text-xl font-black text-primary shadow-sm transition-all group-hover:scale-105 group-hover:border-primary/50 sm:h-14 sm:w-14 sm:text-2xl">
      <span className="relative z-10">{u.first_name?.[0].toUpperCase() || getEmailHandle(u.email)[0]}</span>
      <div className="absolute inset-0 bg-primary/5 opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <p className="truncate text-base font-black leading-tight text-uv-black transition-colors group-hover:text-primary sm:text-lg">
          {u.first_name} {u.last_name}
        </p>
        {idx % 3 === 0 && (
          <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" title="Active now" />
        )}
      </div>
      <div className="mt-0.5 flex items-center gap-2">
        <span className="truncate text-[10px] font-black uppercase tracking-widest text-primary/70 sm:text-xs">
          @{getEmailHandle(u.email).toLowerCase()}
        </span>
        <span className="h-1 w-1 rounded-full bg-uv-gray/30" />
        <span className="text-[9px] font-bold uppercase tracking-tighter text-uv-gray sm:text-[10px]">Campus Node verified</span>
      </div>
    </div>
    <div className="flex h-10 w-10 shrink-0 translate-x-8 items-center justify-center rounded-2xl bg-uv-black text-white opacity-0 shadow-2xl transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100 sm:h-12 sm:w-12">
      <FiUser size={18} />
    </div>
  </motion.div>
));

type ApiError = {
  response?: { status?: number; data?: { error?: string } };
  message?: string;
};

const REPORT_TYPES = ['spam', 'harassment', 'inappropriate', 'other'] as const;

const getEmailHandle = (email?: string) => (email?.split('@')[0] ?? 'user').toUpperCase();

function normalizeDiscoverPost(p: DiscoverPost): DiscoverPost {
  return {
    ...p,
    likes_count: String(p.likes_count ?? '0'),
    comments_count: String(p.comments_count ?? '0'),
    reposts_count: String(p.reposts_count ?? '0'),
    has_liked: Boolean(p.has_liked),
    has_reposted: Boolean(p.has_reposted),
  };
}

const getInitials = (firstName?: string | null, lastName?: string | null, email?: string | null) => {
  const first = firstName?.trim() || '';
  const last = lastName?.trim() || '';
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first) {
    const words = first.split(/\s+/).filter(Boolean);
    if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
    return first[0].toUpperCase();
  }
  const local = email?.split('@')[0] || '';
  const letter = local.match(/\p{L}/u);
  return letter ? letter[0].toUpperCase() : '?';
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const diff = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const countOf = (v: number | string | undefined) => {
  if (v === undefined || v === null) return 0;
  if (typeof v === 'number') return v;
  return parseInt(String(v), 10) || 0;
};

/** API / eski süreç farklı sıra döndürse bile Keşfet’te en güncel üstte */
function discoverActivityTimeMs(p: DiscoverPost): number {
  const raw = (p.sorted_at ?? p.created_at) || '';
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
}

function sortDiscoverPostsNewestFirst(items: DiscoverPost[]): DiscoverPost[] {
  return [...items].sort((a, b) => discoverActivityTimeMs(b) - discoverActivityTimeMs(a));
}

const DiscoverFeed: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';
  const isStaff = user != null && isAcademic(user.role);

  const [posts, setPosts] = useState<DiscoverPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const [menuReportScreen, setMenuReportScreen] = useState(false);
  const [reportSuccessMessage, setReportSuccessMessage] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [newComment, setNewComment] = useState<Record<number, string>>({});
  const [commentSheet, setCommentSheet] = useState<{ isOpen: boolean; postId: number | null }>({
    isOpen: false,
    postId: null,
  });
  const [shareSheetPostId, setShareSheetPostId] = useState<number | null>(null);
  const [shareSearchQ, setShareSearchQ] = useState('');
  const [shareSearchResults, setShareSearchResults] = useState<ShareSearchUser[]>([]);
  const [shareSearchLoading, setShareSearchLoading] = useState(false);
  const [shareSending, setShareSending] = useState(false);
  const [likeModal, setLikeModal] = useState<{ isOpen: boolean; postId: number | null; users: LikeUser[] }>({
    isOpen: false,
    postId: null,
    users: [],
  });
  const [loadingLikes, setLoadingLikes] = useState(false);

  const meAvatarUrl = getAuthUserAvatarUrl(user);
  const meInitials = getAuthUserInitials(user);
  const shareSheetPost = shareSheetPostId != null ? posts.find((p) => p.post_id === shareSheetPostId) ?? null : null;

  useEffect(() => {
    if (openMenuKey === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuKey(null);
        setMenuReportScreen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [openMenuKey]);

  useEffect(() => {
    if (!reportSuccessMessage) return;
    const id = window.setTimeout(() => setReportSuccessMessage(null), 3000);
    return () => window.clearTimeout(id);
  }, [reportSuccessMessage]);

  useEffect(() => {
    if (!shareSheetPostId) {
      setShareSearchQ('');
      setShareSearchResults([]);
      return;
    }
    const q = shareSearchQ.trim();
    if (q.length < 2) {
      setShareSearchResults([]);
      setShareSearchLoading(false);
      return;
    }
    setShareSearchLoading(true);
    const id = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await api.get<ShareSearchUser[]>('/messages/users/search', {
            params: { q, limit: 12 },
            timeout: 15000,
          });
          setShareSearchResults(Array.isArray(res.data) ? res.data : []);
        } catch {
          setShareSearchResults([]);
        } finally {
          setShareSearchLoading(false);
        }
      })();
    }, 320);
    return () => window.clearTimeout(id);
  }, [shareSearchQ, shareSheetPostId]);

  const fetchDiscover = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const res = await api.get('/social/discover');
      const raw = (res.data?.items || []) as DiscoverPost[];
      const nextPosts = sortDiscoverPostsNewestFirst(raw.map(normalizeDiscoverPost));
      startTransition(() => {
        setPosts(nextPosts);
      });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError((err?.response?.data?.error as string) || 'Failed to load discover feed');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  usePagePullRefresh(
    (path) => path === '/discover',
    () => fetchDiscover(true),
  );

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      await fetchDiscover();
    };
    run();
    const poll = window.setInterval(() => {
      if (!mounted) return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      fetchDiscover(true).catch(() => {});
    }, 90000);
    return () => {
      mounted = false;
      window.clearInterval(poll);
    };
  }, []);

  const handleCopyLink = useCallback(
    async (postId: number) => {
      const url = `${window.location.origin}/post/${postId}`;
      await navigator.clipboard.writeText(url);
      await themedAlert(t('socialFeed.linkCopied'));
      setOpenMenuKey(null);
      setMenuReportScreen(false);
    },
    [t]
  );

  const handleDeletePost = useCallback(
    async (postId: number) => {
      if (!(await themedConfirm(t('socialFeed.deleteConfirm')))) return;
      try {
        await api.delete(`/social/posts/${postId}`);
        setPosts((prev) => prev.filter((p) => p.post_id !== postId));
        if (shareSheetPostId === postId) setShareSheetPostId(null);
        if (commentSheet.postId === postId) setCommentSheet({ isOpen: false, postId: null });
        setOpenMenuKey(null);
        setMenuReportScreen(false);
      } catch {
        await themedAlert(t('socialFeed.deleteFailed'));
      }
    },
    [t, shareSheetPostId, commentSheet.postId]
  );

  const handleReportPost = useCallback(
    async (postId: number, reportType: string) => {
      try {
        await api.post(`/social/posts/${postId}/report`, { reportType });
        setOpenMenuKey(null);
        setMenuReportScreen(false);
        setReportSuccessMessage(t('socialFeed.reportSubmitted'));
        setPosts((prev) =>
          prev.map((p) => (p.post_id === postId ? { ...p, has_reported: true, my_report_type: reportType } : p))
        );
      } catch (err: unknown) {
        const apiError = err as ApiError;
        const status = apiError.response?.status;
        let msg =
          apiError.response?.data?.error ||
          apiError.message ||
          (status === 401 ? t('socialFeed.loginAgain') : t('socialFeed.reportFailed'));
        if (status === 404) {
          msg = t('socialFeed.reportEndpointMissing');
        }
        await themedAlert(msg);
      }
    },
    [t]
  );

  const handleRemoveReport = useCallback(
    async (postId: number) => {
      try {
        await api.delete(`/social/posts/${postId}/report`);
        setOpenMenuKey(null);
        setMenuReportScreen(false);
        setReportSuccessMessage(t('socialFeed.reportRemoved'));
        setPosts((prev) =>
          prev.map((p) => (p.post_id === postId ? { ...p, has_reported: false, my_report_type: null } : p))
        );
      } catch (err: unknown) {
        const apiError = err as ApiError;
        const msg = apiError.response?.data?.error || apiError.message || t('socialFeed.removeReportFailed');
        await themedAlert(msg);
      }
    },
    [t]
  );

  const toggleLike = useCallback(
    async (postId: number) => {
      setPosts((prev) =>
        prev.map((post) => {
          if (post.post_id !== postId) return post;
          const liked = !post.has_liked;
          const n = countOf(post.likes_count);
          return {
            ...post,
            has_liked: liked,
            likes_count: String(liked ? n + 1 : Math.max(0, n - 1)),
          };
        })
      );
      try {
        await api.post(`/social/posts/${postId}/like`);
      } catch {
        void fetchDiscover(true);
      }
    },
    [fetchDiscover]
  );

  const toggleRepost = useCallback(
    async (postId: number) => {
      setPosts((prev) =>
        prev.map((post) => {
          if (post.post_id !== postId) return post;
          const reposted = !post.has_reposted;
          const n = countOf(post.reposts_count);
          return {
            ...post,
            has_reposted: reposted,
            reposts_count: String(reposted ? n + 1 : Math.max(0, n - 1)),
          };
        })
      );
      try {
        await api.post(`/social/posts/${postId}/repost`);
        await fetchDiscover(true);
      } catch {
        await fetchDiscover(true);
      }
    },
    [fetchDiscover]
  );

  const handleFetchComments = useCallback(async (postId: number) => {
    setPosts((prev) => prev.map((p) => (p.post_id === postId ? { ...p, loadingComments: true } : p)));
    try {
      const res = await api.get<PostComment[]>(`/social/posts/${postId}/comments`);
      setPosts((prev) =>
        prev.map((p) => (p.post_id === postId ? { ...p, comments: res.data, loadingComments: false } : p))
      );
    } catch {
      setPosts((prev) => prev.map((p) => (p.post_id === postId ? { ...p, loadingComments: false } : p)));
    }
  }, []);

  const toggleComments = useCallback(
    async (postId: number) => {
      const post = posts.find((p) => p.post_id === postId);
      if (!post) return;
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setCommentSheet({ isOpen: true, postId });
        if (!post.comments) await handleFetchComments(postId);
        return;
      }
      setPosts((prev) =>
        prev.map((p) => (p.post_id === postId ? { ...p, showComments: !p.showComments } : p))
      );
      if (!post.showComments && !post.comments) {
        await handleFetchComments(postId);
      }
    },
    [posts, handleFetchComments]
  );

  const handleAddComment = useCallback(
    async (postId: number) => {
      const content = newComment[postId];
      if (!content?.trim()) return;
      try {
        await api.post(`/social/posts/${postId}/comments`, { content });
        setNewComment((prev) => ({ ...prev, [postId]: '' }));
        await handleFetchComments(postId);
        setPosts((prev) =>
          prev.map((p) =>
            p.post_id === postId
              ? { ...p, comments_count: String(countOf(p.comments_count) + 1) }
              : p
          )
        );
      } catch {
        await themedAlert(t('socialFeed.commentFailed'));
      }
    },
    [newComment, handleFetchComments, t]
  );

  const handleShowLikes = useCallback(async (postId: number) => {
    setLikeModal({ isOpen: true, postId, users: [] });
    setLoadingLikes(true);
    try {
      const res = await api.get<LikeUser[]>(`/social/posts/${postId}/likes`);
      setLikeModal((prev) => ({ ...prev, users: res.data }));
    } catch {
      // ignore
    } finally {
      setLoadingLikes(false);
    }
  }, []);

  const sendPostToFriend = useCallback(
    async (targetUserId: number) => {
      if (!shareSheetPost || shareSending) return;
      if (targetUserId === user?.userId) return;
      setShareSending(true);
      try {
        const conv = await api.post<{ conversation_id?: number }>('/messages/conversations', {
          participantIds: [targetUserId],
          isGroup: false,
        });
        const raw = conv.data as { conversation_id?: number | string } | undefined;
        const cid =
          typeof raw?.conversation_id === 'number'
            ? raw.conversation_id
            : raw?.conversation_id != null
              ? parseInt(String(raw.conversation_id), 10)
              : NaN;
        if (!Number.isFinite(cid) || cid <= 0) throw new Error('no conversation');
        const postId = Number(shareSheetPost.post_id);
        if (!Number.isFinite(postId) || postId < 1) throw new Error('invalid post');
        const pidEnc = encodeURIComponent(String(postId));
        await api.post(
          `/messages/conversations/${cid}/messages?sharedPostId=${pidEnc}`,
          { sharedPostId: postId },
          {
            timeout: 60000,
            headers: { 'Content-Type': 'application/json' },
          }
        );
        setShareSheetPostId(null);
        setShareSearchQ('');
        setShareSearchResults([]);
        await themedAlert(t('socialFeed.sharePostSent'));
      } catch (err: unknown) {
        const serverMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        await themedAlert(
          typeof serverMsg === 'string' && serverMsg.trim() ? serverMsg : t('socialFeed.sharePostFailed')
        );
      } finally {
        setShareSending(false);
      }
    },
    [shareSheetPost, shareSending, t, user?.userId]
  );

  const commentSheetPost =
    commentSheet.postId != null ? posts.find((p) => p.post_id === commentSheet.postId) ?? null : null;

  if (loading) return <div className="p-6 text-sm text-uv-gray">{t('discoverPage.loading')}</div>;
  if (error) return <div className="p-6 text-sm text-red-500">{error}</div>;
  if (user?.isBanned) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center p-6">
        <p className="mb-2 text-center font-black uppercase tracking-widest text-uv-gray">{t('socialFeed.restrictedTitle')}</p>
        <p className="text-center text-sm text-uv-gray">{t('socialFeed.restrictedDesc')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full min-w-0 max-w-full pb-24 md:pb-10">
      {reportSuccessMessage && (
        <div className="fixed left-1/2 z-[100] max-xl:top-[calc(env(safe-area-inset-top,0px)+1rem)] top-4 -translate-x-1/2 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-bold shadow-lg">
          {reportSuccessMessage}
        </div>
      )}
      <div className="p-3 md:p-5 border-b border-uv-border/60">
        <h1
          className={`flex items-center gap-2.5 text-2xl font-black tracking-tight ${isSpace ? 'text-white' : 'text-uv-black'}`}
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border md:h-10 md:w-10 ${
              isSpace ? 'border-primary/30 bg-primary/15 text-primary' : 'border-primary/25 bg-primary/10 text-primary'
            }`}
            aria-hidden
          >
            <FiGlobe className="h-[1.15rem] w-[1.15rem] md:h-5 md:w-5" strokeWidth={2.25} />
          </span>
          {t('discoverPage.title')}
        </h1>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
          <p className={`text-sm ${isSpace ? 'text-white/60' : 'text-uv-gray'}`}>
            {t('discoverPage.subtitle')}
          </p>
          <button
            type="button"
            onClick={async () => {
              setRefreshing(true);
              await fetchDiscover(true);
              setRefreshing(false);
            }}
            className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-primary hover:opacity-80"
            aria-label={t('discoverPage.refresh')}
          >
            <FiRefreshCcw size={13} className={refreshing ? 'animate-spin' : ''} />
            {t('discoverPage.refresh')}
          </button>
        </div>
      </div>

      {posts.length === 0 && (
        <div
          className={`mx-3 md:mx-5 mt-4 rounded-2xl border p-4 text-sm ${
            isSpace ? 'border-white/10 bg-white/5 text-white/60' : 'border-uv-border bg-gray-50/50 text-uv-gray'
          }`}
        >
          {t('discoverPage.empty')}
        </div>
      )}

      <div className="w-full min-w-0 px-1 pb-4 md:px-0">
        {posts.map((post) => {
          const repKey = post.reposter_id != null ? String(post.reposter_id) : 'orig';
          const rowKey = `${post.post_id}-${repKey}`;
          const displayName =
            [post.first_name, post.last_name].filter(Boolean).join(' ').trim() || post.email || t('messagesPage.user');
          const handle = post.email?.split('@')[0];

          return (
            <article
              key={rowKey}
              className={`p-3 md:p-5 rounded-2xl border transition-all mb-3 last:mb-0 ${
                isSpace
                  ? 'bg-white/5 border-white/10'
                  : 'bg-gray-50/80 border-uv-border/50 shadow-sm'
              }`}
            >
              {!!post.reposter_id && (
                <div
                  className={`mb-1 flex items-center gap-1.5 pl-1 text-[7px] font-black uppercase tracking-widest md:pl-2 md:text-[10px] ${
                    isSpace ? 'text-emerald-400' : 'text-green-600'
                  }`}
                >
                  <FiRepeat size={9} aria-hidden />
                  <span>
                    {post.reposter_id === user?.userId
                      ? t('socialFeed.you')
                      : post.reposter_name || t('messagesPage.user')}{' '}
                    {t('socialFeed.boosted')}
                  </span>
                </div>
              )}

              <div className="flex gap-2 md:gap-4">
                <button
                  type="button"
                  onClick={() => navigate(`/profile/${post.user_id}`)}
                  className="h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-primary/20 bg-primary/10 font-black text-primary md:h-12 md:w-12 md:text-base"
                  aria-label={displayName}
                >
                  <FeedAvatarImage
                    src={post.avatar_url ? resolveMediaUrl(post.avatar_url) : undefined}
                    initials={getInitials(post.first_name, post.last_name, post.email)}
                    imgClassName="h-full w-full object-cover"
                  />
                </button>

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div
                      className={`min-w-0 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-xs md:text-sm ${
                        isSpace ? 'text-white' : 'text-uv-black'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => navigate(`/profile/${post.user_id}`)}
                        className={`text-left font-black hover:underline ${
                          isSpace ? 'text-white' : 'text-uv-black'
                        }`}
                      >
                        {displayName}
                      </button>
                      {handle && (
                        <span
                          className={`text-[8px] font-bold uppercase tracking-tighter md:text-[10px] ${
                            isSpace ? 'text-white/50' : 'text-uv-gray'
                          }`}
                        >
                          @{handle}
                        </span>
                      )}
                      <span className={isSpace ? 'text-white/30' : 'text-uv-gray'}>·</span>
                      <time
                        dateTime={post.sorted_at ?? post.created_at}
                        className={`text-[8px] font-bold uppercase md:text-[10px] ${
                          isSpace ? 'text-white/45' : 'text-uv-gray'
                        }`}
                      >
                        {formatDate(post.sorted_at ?? post.created_at)}
                      </time>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                    <div className="relative shrink-0" ref={openMenuKey === rowKey ? menuRef : undefined}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (openMenuKey === rowKey) {
                            setOpenMenuKey(null);
                            setMenuReportScreen(false);
                          } else {
                            setOpenMenuKey(rowKey);
                            setMenuReportScreen(false);
                          }
                        }}
                        className={`rounded-lg p-0.5 transition-colors ${
                          isSpace ? 'text-white/50 hover:bg-white/10 hover:text-white' : 'text-uv-gray hover:bg-gray-50'
                        }`}
                        aria-expanded={openMenuKey === rowKey}
                        aria-haspopup="menu"
                        aria-label={t('messagesPage.messageActionsMenu')}
                      >
                        <FiMoreHorizontal size={14} />
                      </button>

                      {openMenuKey === rowKey && (
                        <div
                          role="menu"
                          className={`absolute right-0 isolate z-50 mt-2 rounded-xl border py-2 shadow-2xl ${
                            isSpace ? 'hub-feed-post-menu-space' : 'hub-feed-post-menu-ground'
                          } ${menuReportScreen ? 'w-52' : 'w-48'} ${
                            isSpace
                              ? 'border-white/10 shadow-[0_16px_48px_rgba(0,0,0,0.55)]'
                              : 'border-uv-border shadow-[0_12px_40px_rgba(15,23,42,0.14)]'
                          }`}
                          style={
                            isSpace
                              ? {
                                  backgroundColor: 'rgb(5, 5, 12)',
                                  backdropFilter: 'none',
                                  WebkitBackdropFilter: 'none',
                                }
                              : {
                                  backgroundColor: 'rgb(243, 244, 246)',
                                  backdropFilter: 'none',
                                  WebkitBackdropFilter: 'none',
                                }
                          }
                        >
                          {!menuReportScreen ? (
                            <>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => handleCopyLink(post.post_id)}
                                className={`flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-black uppercase tracking-widest ${
                                  isSpace ? 'text-white hover:bg-white/10' : 'text-uv-black hover:bg-gray-50'
                                }`}
                              >
                                <FiSend size={14} /> {t('socialFeed.copyLink')}
                              </button>
                              {(post.user_id === user?.userId || post.reposter_id === user?.userId) && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => void handleDeletePost(post.post_id)}
                                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10"
                                >
                                  <FiTrash2 size={14} /> {t('common.delete')}
                                </button>
                              )}
                              {!isStaff && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => setMenuReportScreen(true)}
                                  className={`flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-black uppercase tracking-widest ${
                                    post.has_reported
                                      ? 'text-red-400 hover:bg-red-500/10'
                                      : 'text-red-500 hover:bg-red-500/10'
                                  }`}
                                >
                                  <FiAlertTriangle size={14} />
                                  {post.has_reported ? t('socialFeed.reported') : t('socialFeed.report')}
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => setMenuReportScreen(false)}
                                className={`mb-1 flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-black uppercase tracking-widest ${
                                  isSpace ? 'text-white/80 hover:bg-white/10' : 'text-uv-gray hover:bg-gray-50'
                                }`}
                              >
                                <FiChevronLeft size={14} />
                                {t('common.back')}
                              </button>
                              <div className={`mx-2 border-t ${isSpace ? 'border-white/10' : 'border-gray-100'}`} />
                              {post.has_reported ? (
                                <div className="pt-1">
                                  <p
                                    className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${
                                      isSpace ? 'text-white/80' : 'text-uv-gray'
                                    }`}
                                  >
                                    {t('socialFeed.youReportedAs')}
                                  </p>
                                  <p
                                    className={`px-3 py-1 text-xs font-bold capitalize ${
                                      isSpace ? 'text-red-400' : 'text-red-600'
                                    }`}
                                  >
                                    {post.my_report_type || 'other'}
                                  </p>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => void handleRemoveReport(post.post_id)}
                                    className={`w-full px-3 py-2 text-left text-xs font-bold transition-colors ${
                                      isSpace ? 'text-red-300 hover:bg-red-500/20' : 'text-red-600 hover:bg-red-50'
                                    }`}
                                  >
                                    {t('socialFeed.removeReport')}
                                  </button>
                                </div>
                              ) : (
                                <div className="pt-1">
                                  <p
                                    className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${
                                      isSpace ? 'text-white/80' : 'text-uv-gray'
                                    }`}
                                  >
                                    {t('socialFeed.reportType')}
                                  </p>
                                  {REPORT_TYPES.map((type) => (
                                    <button
                                      key={type}
                                      type="button"
                                      role="menuitem"
                                      onClick={() => void handleReportPost(post.post_id, type)}
                                      className={`w-full px-3 py-2 text-left text-xs font-bold capitalize transition-colors ${
                                        isSpace
                                          ? 'text-red-400 hover:bg-red-500/20 hover:text-red-300'
                                          : 'text-red-600 hover:bg-red-50'
                                      }`}
                                    >
                                      {type}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    </div>
                  </div>

                  {!!post.content && (
                    <p
                      onClick={() => navigate(`/post/${post.post_id}`)}
                      className={`mb-2 break-words text-sm font-medium leading-relaxed whitespace-pre-wrap md:text-[15px] cursor-pointer ${
                        isSpace ? 'text-white' : 'text-uv-black'
                      }`}
                    >
                      {post.content}
                    </p>
                  )}

                  {post.image_url && (
                    <div className="min-w-0">
                      <PostAttachment
                        path={post.image_url}
                        className="mt-1 overflow-hidden rounded-xl border border-uv-border/50 cursor-pointer"
                        mediaClassName="max-h-[min(60vh,480px)] w-full object-cover"
                        onClick={() => navigate(`/post/${post.post_id}`)}
                      />
                    </div>
                  )}

                  <div
                    className={`mt-3 flex flex-wrap items-center gap-6 border-t pt-3 md:gap-8 ${
                      isSpace ? 'border-white/10 text-white/70' : 'border-uv-border/60 text-uv-gray'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => void toggleComments(post.post_id)}
                      className={`flex items-center gap-1 transition-all md:gap-1.5 ${
                        post.showComments ? 'text-primary' : 'hover:text-primary'
                      }`}
                    >
                      <FiMessageCircle size={15} className={post.showComments ? 'fill-primary/10' : ''} />
                      <span className="text-[9px] font-black md:text-[11px]">{post.comments_count}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleRepost(post.post_id)}
                      className={`flex items-center gap-1 transition-all md:gap-1.5 ${
                        post.has_reposted ? 'text-green-500' : 'hover:text-green-500'
                      }`}
                    >
                      <FiRepeat size={15} />
                      <span className="text-[9px] font-black md:text-[11px]">{post.reposts_count}</span>
                    </button>
                    <div className="flex items-center gap-1 md:gap-1.5">
                      <button
                        type="button"
                        onClick={() => void toggleLike(post.post_id)}
                        className={`transition-all ${post.has_liked ? 'text-pink-500' : 'hover:text-pink-500'}`}
                      >
                        <FiHeart size={15} className={post.has_liked ? 'fill-current' : ''} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleShowLikes(post.post_id)}
                        className="text-[9px] font-black hover:underline md:text-[11px]"
                      >
                        {post.likes_count}
                      </button>
                    </div>
                    {user ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShareSheetPostId(post.post_id);
                          setOpenMenuKey(null);
                          setMenuReportScreen(false);
                        }}
                        className="flex shrink-0 items-center gap-1 transition-all hover:text-primary md:gap-1.5"
                        title={t('socialFeed.sharePostViaMessage')}
                        aria-label={t('socialFeed.sharePostViaMessage')}
                      >
                        <FiCornerUpRight size={15} strokeWidth={2.2} />
                      </button>
                    ) : null}
                    {user && isAcademic(user.role) && post.user_id !== user.userId ? (
                      <div className="ml-auto flex shrink-0 items-center gap-1">
                        <AdminModerationMenu
                          visible
                          variant="post"
                          onDelete={async () => {
                            try {
                              await api.delete(`/social/posts/${post.post_id}`);
                              setPosts((prev) => prev.filter((p) => p.post_id !== post.post_id));
                              if (shareSheetPostId === post.post_id) setShareSheetPostId(null);
                              if (commentSheet.postId === post.post_id) setCommentSheet({ isOpen: false, postId: null });
                              setOpenMenuKey(null);
                              setMenuReportScreen(false);
                            } catch {
                              await themedAlert(t('socialFeed.deleteFailed'));
                            }
                          }}
                        />
                      </div>
                    ) : null}
                  </div>

                  {post.showComments && (
                    <div className="hidden md:block">
                      <div
                        className={`mt-2 space-y-2 border-t pt-2 md:mt-6 md:space-y-4 md:pt-6 ${
                          isSpace ? 'border-white/10' : 'border-uv-border'
                        }`}
                      >
                        <div className="flex gap-2.5 sm:gap-3">
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg text-[10px] font-black sm:h-8 sm:w-8 sm:text-xs ${
                              isSpace ? 'bg-primary/20 text-primary' : 'bg-primary/5 text-primary'
                            }`}
                          >
                            <FeedAvatarImage
                              src={meAvatarUrl}
                              initials={meInitials}
                              imgClassName="h-full w-full object-cover"
                            />
                          </div>
                          <div className="relative flex-1">
                            <input
                              type="text"
                              placeholder={t('discoverPage.commentPlaceholder')}
                              className={`w-full rounded-lg border-none py-1 pr-8 text-[11px] outline-none focus:ring-1 focus:ring-primary md:px-4 md:py-2 md:text-sm ${
                                isSpace
                                  ? 'bg-white/10 text-white placeholder:text-white/40'
                                  : 'bg-gray-50 text-uv-black placeholder:text-uv-gray'
                              }`}
                              value={newComment[post.post_id] || ''}
                              onChange={(e) =>
                                setNewComment({ ...newComment, [post.post_id]: e.target.value })
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') void handleAddComment(post.post_id);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => void handleAddComment(post.post_id)}
                              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-primary transition-colors hover:rounded-lg hover:bg-white/10"
                            >
                              <FiNavigation size={12} />
                            </button>
                          </div>
                        </div>

                        {post.loadingComments ? (
                          <div
                            className={`animate-pulse py-1 text-center text-[8px] font-black md:py-4 ${
                              isSpace ? 'text-white/50' : 'text-uv-gray'
                            }`}
                          >
                            …
                          </div>
                        ) : (
                          <div
                            className={`space-y-2 border-l pl-2 md:space-y-4 md:pl-4 ${
                              isSpace ? 'border-white/15' : 'border-uv-border/50'
                            }`}
                          >
                            {post.comments?.map((comment) => (
                              <div key={comment.comment_id} className="flex gap-2 opacity-90 md:gap-3">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/profile/${comment.user_id}`)}
                                  className={`flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md text-[8px] font-black md:h-7 md:w-7 md:rounded-lg md:text-xs ${
                                    isSpace ? 'bg-white/10 text-white/80' : 'bg-gray-100 text-uv-gray'
                                  }`}
                                >
                                  <FeedAvatarImage
                                    src={comment.avatar_url ? resolveMediaUrl(comment.avatar_url) : undefined}
                                    initials={getInitials(comment.first_name, comment.last_name, comment.email)}
                                    imgClassName="h-full w-full object-cover rounded-md md:rounded-lg"
                                  />
                                </button>
                                <div className="min-w-0 flex-1">
                                  <div className="mb-0.5 flex items-center gap-1 md:gap-2">
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/profile/${comment.user_id}`)}
                                      className={`truncate text-left text-[10px] font-bold transition-colors hover:text-primary md:text-xs ${
                                        isSpace ? 'text-white' : 'text-uv-black'
                                      }`}
                                    >
                                      {comment.first_name} {comment.last_name}
                                    </button>
                                    <span
                                      className={`whitespace-nowrap text-[8px] font-bold uppercase ${
                                        isSpace ? 'text-white/45' : 'text-uv-gray'
                                      }`}
                                    >
                                      {formatDate(comment.created_at)}
                                    </span>
                                  </div>
                                  <p
                                    className={`text-[10px] font-medium leading-snug md:text-xs ${
                                      isSpace ? 'text-white/90' : 'text-uv-black'
                                    }`}
                                  >
                                    {comment.content}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>

      {createPortal(
        <AnimatePresence>
          {shareSheetPost && (
            <div className="fixed inset-0 z-[115] flex items-end justify-center p-0 sm:items-center sm:p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !shareSending && setShareSheetPostId(null)}
                className={`absolute inset-0 ${isSpace ? 'bg-black/70' : 'bg-uv-black/50'} backdrop-blur-sm`}
              />
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                onClick={(e) => e.stopPropagation()}
                className={`relative z-10 flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl border shadow-2xl sm:max-w-md sm:rounded-3xl ${
                  isSpace ? 'border-white/10 bg-[#0a0a14] text-white' : 'border-uv-border bg-white text-uv-black'
                }`}
              >
                <div className={`flex items-start justify-between gap-3 border-b p-4 sm:p-5 ${isSpace ? 'border-white/10' : 'border-uv-border'}`}>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black uppercase tracking-widest text-primary">{t('socialFeed.sharePostSheetTitle')}</h3>
                    <p className={`mt-1 text-xs leading-relaxed ${isSpace ? 'text-white/55' : 'text-uv-gray'}`}>{t('socialFeed.sharePostSheetHint')}</p>
                  </div>
                  <button
                    type="button"
                    disabled={shareSending}
                    onClick={() => setShareSheetPostId(null)}
                    className={`shrink-0 rounded-xl p-2 transition-colors ${
                      isSpace ? 'text-white/60 hover:bg-white/10' : 'text-uv-gray hover:bg-gray-100'
                    }`}
                    aria-label="Close"
                  >
                    <FiX size={18} />
                  </button>
                </div>
                <div className={`px-4 pb-4 sm:px-5 ${isSpace ? 'border-b border-white/10' : 'border-b border-uv-border'}`}>
                  <p className={`mb-2 text-[10px] font-black uppercase tracking-widest ${isSpace ? 'text-white/45' : 'text-uv-gray'}`}>
                    {t('socialFeed.sharePostPreviewLabel')}
                  </p>
                  <SharedPostMessageCard
                    variant="preview"
                    sharedPostId={shareSheetPost.post_id}
                    imageUrl={shareSheetPost.image_url}
                    authorFirst={shareSheetPost.first_name}
                    authorLast={shareSheetPost.last_name}
                    contentPreview={shareSheetPost.content}
                    badgeLabel={t('messagesPage.postShareBadge')}
                    openLabel={t('messagesPage.postShareOpen')}
                    emptyContentLabel={t('messagesPage.postShareNoText')}
                  />
                </div>
                <div className="border-b border-transparent p-4 sm:p-5">
                  <input
                    type="search"
                    value={shareSearchQ}
                    onChange={(e) => setShareSearchQ(e.target.value)}
                    placeholder={t('socialFeed.sharePostSearchPlaceholder')}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm font-medium outline-none ring-0 transition focus:ring-2 focus:ring-primary/30 ${
                      isSpace
                        ? 'border-white/15 bg-white/5 text-white placeholder:text-white/35'
                        : 'border-uv-border bg-gray-50 text-uv-black placeholder:text-uv-gray'
                    }`}
                  />
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-3">
                  {shareSearchLoading ? (
                    <div className="flex justify-center py-10">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                  ) : shareSearchResults.length === 0 ? (
                    <p className={`py-8 text-center text-xs font-bold uppercase tracking-widest ${isSpace ? 'text-white/35' : 'text-uv-gray/70'}`}>
                      {shareSearchQ.trim().length < 2
                        ? t('socialFeed.sharePostSearchPlaceholder')
                        : t('socialFeed.sharePostNoMatches')}
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {shareSearchResults.map((u) => (
                        <li key={u.user_id}>
                          <button
                            type="button"
                            disabled={shareSending || u.user_id === user?.userId}
                            onClick={() => void sendPostToFriend(u.user_id)}
                            className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${
                              isSpace ? 'hover:bg-white/8' : 'hover:bg-primary/[0.06]'
                            } ${shareSending ? 'pointer-events-none opacity-50' : ''}`}
                          >
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                                isSpace ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'
                              }`}
                            >
                              {getInitials(u.first_name, u.last_name, u.email)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`truncate text-sm font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>
                                {u.first_name} {u.last_name}
                              </p>
                              <p
                                className={`truncate text-[10px] font-bold uppercase tracking-wide ${
                                  isSpace ? 'text-white/45' : 'text-primary/80'
                                }`}
                              >
                                @{getEmailHandle(u.email).toLowerCase()}
                              </p>
                            </div>
                            <FiCornerUpRight className={`shrink-0 ${isSpace ? 'text-white/25' : 'text-uv-gray/40'}`} size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {likeModal.isOpen && (
            <div className="fixed inset-0 z-[110] flex items-end justify-center p-0 sm:items-center sm:p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setLikeModal({ isOpen: false, postId: null, users: [] })}
                className="absolute inset-0 bg-uv-black/40 backdrop-blur-md sm:bg-uv-black/70"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 100 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 100 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="premium-blur relative z-10 mb-0 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-[2.5rem] border border-uv-border bg-white shadow-2xl sm:max-h-[70vh] sm:rounded-tl-none sm:rounded-tr-[3rem] sm:rounded-br-[1rem] sm:rounded-bl-[3rem]"
              >
                <div className="mx-auto mb-2 mt-4 h-1.5 w-12 rounded-full bg-uv-gray/20 opacity-50 sm:hidden" />

                <div className="relative flex items-center justify-between overflow-hidden border-b border-uv-border bg-gradient-to-r from-primary/5 to-transparent p-6 sm:p-8">
                  <div className="absolute -right-16 -top-16 hidden h-32 w-32 rounded-full bg-primary/10 blur-3xl sm:block" />

                  <div className="relative z-10 flex items-center gap-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 animate-ping rounded-full bg-primary shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
                        <h3 className="text-xl font-black uppercase leading-none tracking-tighter text-uv-black sm:text-2xl">Transmission Pulse</h3>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-primary">Live Node Data</span>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-uv-gray">v2.4.0</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLikeModal({ isOpen: false, postId: null, users: [] })}
                    className="group relative z-10 flex h-10 w-10 items-center justify-center rounded-2xl border border-uv-border bg-white text-uv-black shadow-md transition-all hover:bg-primary hover:text-white active:scale-95 sm:h-12 sm:w-12"
                  >
                    <FiX size={20} className="transition-transform duration-500 group-hover:rotate-90" />
                  </button>
                </div>

                <div className="scrollbar-hide min-h-0 flex-1 space-y-3 overflow-y-auto p-4 pb-8 sm:p-6">
                  {loadingLikes ? (
                    <div className="flex flex-col items-center gap-6 p-20 text-center">
                      <div className="relative">
                        <div className="h-16 w-16 rounded-full border-4 border-primary/10" />
                        <div className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-primary">Synchronizing Orbit...</p>
                        <div className="mx-auto h-1 w-32 overflow-hidden rounded-full bg-uv-border">
                          <motion.div
                            animate={{ x: [-128, 128] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                            className="h-full w-full bg-primary"
                          />
                        </div>
                      </div>
                    </div>
                  ) : likeModal.users.length === 0 ? (
                    <div className="flex flex-col items-center p-20 text-center">
                      <div className="group mb-6 flex h-20 w-20 items-center justify-center rounded-[2.5rem] border border-dashed border-uv-border bg-uv-border/10 transition-colors hover:border-primary/50">
                        <FiHeart size={32} className="text-uv-gray opacity-30 transition-colors group-hover:text-primary" />
                      </div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-uv-gray opacity-50">Pulse flat. No signals detected.</p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {likeModal.users.map((u, idx) => (
                        <LikeUserCard
                          key={u.user_id}
                          user={u}
                          idx={idx}
                          onNavigate={(userId) => {
                            setLikeModal({ isOpen: false, postId: null, users: [] });
                            navigate(`/profile/${userId}`);
                          }}
                          getEmailHandle={getEmailHandle}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative overflow-hidden border-t border-uv-border bg-uv-border/5 p-6 pb-10 text-center sm:pb-6">
                  <div
                    className="pointer-events-none absolute inset-0 opacity-[0.05]"
                    style={{
                      backgroundImage: 'radial-gradient(var(--uv-primary) 1px, transparent 1px)',
                      backgroundSize: '10px 10px',
                    }}
                  />
                  <p className="relative z-10 text-[10px] font-black uppercase tracking-[0.4em] text-uv-gray">UniVerse Intelligence Layer</p>
                  <div className="relative z-10 mt-3 flex justify-center gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 w-1.5 rounded-full ${i === 2 ? 'animate-pulse bg-primary shadow-[0_0_5px_var(--uv-primary)]' : 'bg-uv-gray/20'}`}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {createPortal(
        <AnimatePresence>
          {commentSheet.isOpen && commentSheetPost && (
            <div className="fixed inset-0 z-[110] flex items-end justify-center md:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setCommentSheet({ isOpen: false, postId: null })}
                className="absolute inset-0 bg-uv-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className={`relative z-10 flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-[2.5rem] bg-white shadow-2xl ${isSpace ? 'space-dimension' : ''}`}
              >
                <div className="mx-auto mb-2 mt-4 h-1.5 w-12 rounded-full bg-uv-gray/20 opacity-50" />

                <div className="flex items-center justify-between border-b border-uv-border px-5 py-4">
                  <h3 className="text-sm font-black uppercase tracking-widest text-uv-black">Transmission Replies</h3>
                  <button
                    type="button"
                    onClick={() => setCommentSheet({ isOpen: false, postId: null })}
                    className="rounded-full p-2 text-uv-gray hover:bg-gray-100"
                  >
                    <FiX size={20} />
                  </button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-5">
                  {commentSheetPost.loadingComments ? (
                    <div className="py-10 text-center">
                      <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-uv-gray">Syncing Feed...</p>
                    </div>
                  ) : (commentSheetPost.comments || []).length === 0 ? (
                    <div className="py-20 text-center text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Silence in the airwaves.</div>
                  ) : (
                    commentSheetPost.comments?.map((comment) => (
                      <div key={comment.comment_id} className="flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/5 text-xs font-black text-primary">
                          <FeedAvatarImage
                            src={comment.avatar_url ? resolveMediaUrl(comment.avatar_url) : undefined}
                            initials={getInitials(comment.first_name, comment.last_name, comment.email)}
                            imgClassName="h-full w-full rounded-lg object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-0.5 flex items-center gap-2">
                            <span className="truncate text-[11px] font-bold text-uv-black">
                              {comment.first_name} {comment.last_name}
                            </span>
                            <span className="text-[9px] font-bold uppercase text-uv-gray">{formatDate(comment.created_at)}</span>
                          </div>
                          <p className="text-[11px] font-medium leading-snug text-uv-black">{comment.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t border-uv-border bg-gray-50/50 p-4 pb-8">
                  <div className="relative flex gap-2">
                    <input
                      type="text"
                      placeholder={t('discoverPage.commentPlaceholder')}
                      className={`flex-1 rounded-xl border border-uv-border bg-white px-4 py-2.5 pr-12 text-xs outline-none focus:ring-1 focus:ring-primary ${isSpace ? '!border-white/10' : ''}`}
                      value={newComment[commentSheetPost.post_id] || ''}
                      onChange={(e) =>
                        setNewComment({ ...newComment, [commentSheetPost.post_id]: e.target.value })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void handleAddComment(commentSheetPost.post_id);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => void handleAddComment(commentSheetPost.post_id)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 rounded-xl p-2.5 text-primary transition-colors hover:bg-white"
                    >
                      <FiNavigation size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default DiscoverFeed;
