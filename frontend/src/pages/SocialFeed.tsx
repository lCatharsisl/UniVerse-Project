import React, { useState, useEffect, useRef, useCallback, startTransition, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { FiHeart, FiRepeat, FiMessageCircle, FiTrash2, FiMoreHorizontal, FiSend, FiNavigation, FiX, FiUser, FiAlertTriangle, FiChevronLeft, FiCornerUpRight, FiImage } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { isAcademic } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useTheme } from '../context/ThemeContext';
import { themedAlert, themedConfirm } from '../utils/themedDialog';
import PostAttachment from '../components/PostAttachment';
import AdminModerationMenu from '../components/AdminModerationMenu';
import SharedPostMessageCard from '../components/messaging/SharedPostMessageCard';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';
import { FeedAvatarImage } from '../components/FeedAvatarImage';
import { getAuthUserAvatarUrl, getAuthUserInitials } from '../utils/authUserDisplay';
import { PULL_REFRESH_EVENT, type PullRefreshRequestDetail } from '../types/pullRefresh';

const feedCache: { posts: Post[]; scrollY: number } = {
    posts: [],
    scrollY: 0,
};

/** Hub kaydırması `window` değil; MainLayout’taki `overflow-y-auto` ana sütunda. */
function getFeedScrollParent(start: HTMLElement | null): Window | HTMLElement {
    if (typeof window === 'undefined' || !start) return window;
    let el: HTMLElement | null = start.parentElement;
    while (el && el !== document.documentElement) {
        const { overflowY } = window.getComputedStyle(el);
        if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
            return el;
        }
        el = el.parentElement;
    }
    return window;
}

interface Post {
    post_id: number;
    user_id: number;
    content: string;
    image_url: string | null;
    created_at: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role: string;
    likes_count: string;
    reposts_count: string;
    comments_count: string;
    has_liked: boolean;
    has_reposted: boolean;
    reposter_name?: string;
    reposter_email?: string;
    reposter_id?: number;
    avatar_url?: string | null;
    reports_count?: number;
    has_reported?: boolean;
    my_report_type?: string | null;
    // UI state
    showComments?: boolean;
    comments?: PostComment[];
    loadingComments?: boolean;
}

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

type ApiError = {
    response?: {
        status?: number;
        data?: { error?: string };
    };
    message?: string;
};

const getEmailHandle = (email?: string) => (email?.split('@')[0] ?? 'user').toUpperCase();

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

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const diff = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

interface LikeUserCardProps {
    user: LikeUser;
    idx: number;
    onNavigate: (userId: number) => void;
    getEmailHandle: (email?: string) => string;
}

const LikeUserCard = React.memo(({ user: u, idx, onNavigate }: LikeUserCardProps) => (
    <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: idx * 0.05 }}
        onClick={() => onNavigate(u.user_id)}
        className="flex items-center gap-5 p-4 bg-uv-border/5 hover:bg-primary/[0.05] rounded-[1.8rem] transition-all cursor-pointer group border border-transparent hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5"
    >
        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-2xl flex items-center justify-center font-black text-xl sm:text-2xl text-primary border-2 border-uv-border group-hover:border-primary/50 group-hover:scale-105 transition-all shadow-sm shrink-0 overflow-hidden relative">
            <span className="relative z-10">{u.first_name?.[0].toUpperCase() || getEmailHandle(u.email)[0]}</span>
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
                <p className="font-black text-uv-black group-hover:text-primary transition-colors truncate text-base sm:text-lg leading-tight">
                    {u.first_name} {u.last_name}
                </p>
                {idx % 3 === 0 && <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" title="Active now" />}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] sm:text-xs font-black text-primary/70 uppercase tracking-widest truncate">@{getEmailHandle(u.email).toLowerCase()}</span>
                <span className="w-1 h-1 bg-uv-gray/30 rounded-full" />
                <span className="text-[9px] sm:text-[10px] font-bold text-uv-gray uppercase tracking-tighter">Campus Node verified</span>
            </div>
        </div>
        <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-uv-black text-white rounded-2xl opacity-0 translate-x-8 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 shadow-2xl shrink-0">
            <FiUser size={18} />
        </div>
    </motion.div>
));

const SocialFeed = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [newComment, setNewComment] = useState<{ [key: number]: string }>({});
    const [openMenu, setOpenMenu] = useState<number | null>(null);
    /** Report flow lives inside the ⋯ menu (not a separate card button). */
    const [menuReportScreen, setMenuReportScreen] = useState(false);
    const [likeModal, setLikeModal] = useState<{ isOpen: boolean; postId: number | null; users: LikeUser[] }>({ isOpen: false, postId: null, users: [] });
    const [loadingLikes, setLoadingLikes] = useState(false);
    const [commentSheet, setCommentSheet] = useState<{ isOpen: boolean; post: Post | null }>({ isOpen: false, post: null });
    const [shareSheetPost, setShareSheetPost] = useState<Post | null>(null);
    const [shareSearchQ, setShareSearchQ] = useState('');
    const [shareSearchResults, setShareSearchResults] = useState<ShareSearchUser[]>([]);
    const [shareSearchLoading, setShareSearchLoading] = useState(false);
    const [shareSending, setShareSending] = useState(false);
    const [warningDropdown, setWarningDropdown] = useState<number | null>(null);
    const [reportSuccessMessage, setReportSuccessMessage] = useState<string | null>(null);
    const warningDropdownRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const { dimension } = useTheme();
    const hubFileInputRef = useRef<HTMLInputElement>(null);
    const [hubDraft, setHubDraft] = useState('');
    const [hubImage, setHubImage] = useState<File | null>(null);
    const [hubPosting, setHubPosting] = useState(false);

    useEffect(() => {
        if (openMenu === null && warningDropdown === null) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (openMenu !== null && menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenMenu(null);
                setMenuReportScreen(false);
            }
            if (warningDropdown !== null && warningDropdownRef.current && !warningDropdownRef.current.contains(e.target as Node)) {
                setWarningDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, [openMenu, warningDropdown]);

    useEffect(() => {
        if (!reportSuccessMessage) return;
        const t = setTimeout(() => setReportSuccessMessage(null), 3000);
        return () => clearTimeout(t);
    }, [reportSuccessMessage]);

    useEffect(() => {
        if (!shareSheetPost) {
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
    }, [shareSearchQ, shareSheetPost]);

    const isStaff = user && isAcademic(user.role);
    const isSpace = dimension === 'space';

    const meAvatarUrl = getAuthUserAvatarUrl(user);
    const meInitials = getAuthUserInitials(user);

    const fetchPosts = useCallback(async () => {
        try {
            const res = await api.get<{ items?: Post[] }>('/social/feed');
            const nextPosts = res.data.items || [];
            startTransition(() => {
                setPosts(nextPosts);
            });
            feedCache.posts = nextPosts;
        } catch (err) {
            console.error('Failed to load feed', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const hubPreviewUrl = useMemo(
        () => (hubImage ? URL.createObjectURL(hubImage) : null),
        [hubImage]
    );
    useEffect(() => {
        return () => {
            if (hubPreviewUrl) URL.revokeObjectURL(hubPreviewUrl);
        };
    }, [hubPreviewUrl]);

    const submitHubPost = useCallback(async () => {
        if (!user?.userId) return;
        const trimmed = hubDraft.trim();
        if (!trimmed && !hubImage) return;
        setHubPosting(true);
        try {
            const formData = new FormData();
            formData.append('content', trimmed);
            if (hubImage) {
                formData.append('images', hubImage);
            }
            await api.post('/social/posts', formData);
            setHubDraft('');
            setHubImage(null);
            if (hubFileInputRef.current) hubFileInputRef.current.value = '';
            await fetchPosts();
        } catch {
            await themedAlert(t('socialFeed.createFailed'));
        } finally {
            setHubPosting(false);
        }
    }, [user?.userId, hubDraft, hubImage, fetchPosts, t]);

    useEffect(() => {
        if (feedCache.posts.length > 0) {
            startTransition(() => {
                setPosts(feedCache.posts);
            });
            setLoading(false);
        }
        const timeoutId = window.setTimeout(() => {
            void fetchPosts();
        }, feedCache.posts.length > 0 ? 150 : 0);

        return () => window.clearTimeout(timeoutId);
    }, [fetchPosts]);

    useEffect(() => {
        const root = rootRef.current;
        const scrollEl = getFeedScrollParent(root);
        const readY = () =>
            scrollEl === window
                ? window.scrollY || window.pageYOffset || 0
                : (scrollEl as HTMLElement).scrollTop;

        const handleScroll = () => {
            const currentY = readY();
            feedCache.scrollY = currentY;
        };

        scrollEl.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => scrollEl.removeEventListener('scroll', handleScroll);
    }, [loading, posts.length]);

    useEffect(() => {
        const restore = () => {
            const root = rootRef.current;
            const scrollEl = getFeedScrollParent(root);
            if (scrollEl === window) {
                window.scrollTo(0, feedCache.scrollY);
            } else {
                (scrollEl as HTMLElement).scrollTop = feedCache.scrollY;
            }
        };

        if (feedCache.posts.length > 0) {
            const raf = window.requestAnimationFrame(() => {
                restore();
            });
            return () => window.cancelAnimationFrame(raf);
        }
        return;
    }, [posts.length]);

    useEffect(() => {
        return () => {
            feedCache.posts = posts;
            const root = rootRef.current;
            const scrollEl = getFeedScrollParent(root);
            feedCache.scrollY =
                scrollEl === window
                    ? window.scrollY || window.pageYOffset || 0
                    : (scrollEl as HTMLElement).scrollTop;
        };
    }, [posts]);

    useEffect(() => {
        const handlePullRefresh = (event: Event) => {
            const customEvent = event as CustomEvent<PullRefreshRequestDetail>;
            if (customEvent.detail?.path !== '/feed') return;

            customEvent.preventDefault();
            customEvent.detail.enqueue(fetchPosts());
        };

        window.addEventListener(PULL_REFRESH_EVENT, handlePullRefresh);
        return () => window.removeEventListener(PULL_REFRESH_EVENT, handlePullRefresh);
    }, [fetchPosts]);

    const handleDeletePost = useCallback(async (postId: number) => {
        if (!(await themedConfirm(t('socialFeed.deleteConfirm')))) return;
        try {
            await api.delete(`/social/posts/${postId}`);
            setPosts(posts.filter(p => p.post_id !== postId));
            setOpenMenu(null);
            setMenuReportScreen(false);
        } catch {
            await themedAlert(t('socialFeed.deleteFailed'));
        }
    }, [posts, t]);

    const handleCopyLink = async (postId: number) => {
        const url = `${window.location.origin}/post/${postId}`;
        navigator.clipboard.writeText(url);
        await themedAlert(t('socialFeed.linkCopied'));
        setOpenMenu(null);
        setMenuReportScreen(false);
    };

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
                setShareSheetPost(null);
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

    const toggleLike = useCallback(async (postId: number) => {
        setPosts(posts.map(post => {
            if (post.post_id === postId) {
                const liked = !post.has_liked;
                const _count = Number.parseInt(String(post.likes_count ?? '0'), 10) || 0;
                return {
                    ...post,
                    has_liked: liked,
                    likes_count: String(liked ? _count + 1 : Math.max(0, _count - 1))
                };
            }
            return post;
        }));
        try { await api.post(`/social/posts/${postId}/like`); } catch { fetchPosts(); }
    }, [posts, fetchPosts]);

    const toggleRepost = useCallback(async (postId: number) => {
        setPosts(posts.map(post => {
            if (post.post_id === postId) {
                const reposted = !post.has_reposted;
                const _count = Number.parseInt(String(post.reposts_count ?? '0'), 10) || 0;
                return {
                    ...post,
                    has_reposted: reposted,
                    reposts_count: String(reposted ? _count + 1 : Math.max(0, _count - 1))
                };
            }
            return post;
        }));
        try {
            await api.post(`/social/posts/${postId}/repost`);
            fetchPosts();
        } catch { fetchPosts(); }
    }, [posts, fetchPosts]);

    const toggleComments = async (postId: number) => {
        const post = posts.find(p => p.post_id === postId);
        if (!post) return;

        // Mobile: Show Bottom Sheet
        if (window.innerWidth < 768) {
            setCommentSheet({ isOpen: true, post });
            if (!post.comments) {
                handleFetchComments(postId);
            }
            return;
        }

        // Desktop: Inline toggle
        setPosts(posts.map(p => p.post_id === postId ? { ...p, showComments: !p.showComments } : p));
        if (!post.showComments && !post.comments) {
            handleFetchComments(postId);
        }
    };

    const handleFetchComments = async (postId: number) => {
        setPosts(prev => prev.map(p => p.post_id === postId ? { ...p, loadingComments: true } : p));
        try {
            const res = await api.get(`/social/posts/${postId}/comments`);
            setPosts(prev => prev.map(p => p.post_id === postId ? { ...p, comments: res.data, loadingComments: false } : p));
        } catch {
            setPosts(prev => prev.map(p => p.post_id === postId ? { ...p, loadingComments: false } : p));
        }
    };

    const handleAddComment = async (postId: number) => {
        const content = newComment[postId];
        if (!content?.trim()) return;
        try {
            await api.post(`/social/posts/${postId}/comments`, { content });
            setNewComment({ ...newComment, [postId]: '' });
            handleFetchComments(postId);
            setPosts(prev => prev.map(p => p.post_id === postId ? { ...p, comments_count: String(parseInt(p.comments_count) + 1) } : p));
        } catch {
            await themedAlert(t('socialFeed.commentFailed'));
        }
    };

    const REPORT_TYPES = ['spam', 'harassment', 'inappropriate', 'other'] as const;
    const handleReportPost = async (postId: number, reportType: string) => {
        try {
            await api.post(`/social/posts/${postId}/report`, { reportType });
            setOpenMenu(null);
            setMenuReportScreen(false);
            setReportSuccessMessage(t('socialFeed.reportSubmitted'));
            setPosts(prev => prev.map(p => p.post_id === postId ? { ...p, has_reported: true, my_report_type: reportType } : p));
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
    };

    const handleRemoveReport = async (postId: number) => {
        try {
            await api.delete(`/social/posts/${postId}/report`);
            setOpenMenu(null);
            setMenuReportScreen(false);
            setReportSuccessMessage(t('socialFeed.reportRemoved'));
            setPosts(prev => prev.map(p => p.post_id === postId ? { ...p, has_reported: false, my_report_type: null } : p));
        } catch (err: unknown) {
            const apiError = err as ApiError;
            const msg = apiError.response?.data?.error || apiError.message || t('socialFeed.removeReportFailed');
            await themedAlert(msg);
        }
    };

    const handleGiveWarning = async (userId: number, tier: 1 | 2 | 3 | 4) => {
        try {
            await api.post(`/social/users/${userId}/warning`, { tier });
            setWarningDropdown(null);
            setReportSuccessMessage(tier === 4 ? t('socialFeed.userBanned') : t('socialFeed.warningApplied', { tier }));
        } catch (err: unknown) {
            const apiError = err as ApiError;
            await themedAlert(apiError.response?.data?.error || t('socialFeed.warningFailed'));
        }
    };

    const handleShowLikes = useCallback(async (postId: number) => {
        setLikeModal({ isOpen: true, postId, users: [] });
        setLoadingLikes(true);
        try {
            const res = await api.get<LikeUser[]>(`/social/posts/${postId}/likes`);
            setLikeModal(prev => ({ ...prev, users: res.data }));
        } catch {
            console.error('Failed to fetch likes');
        } finally {
            setLoadingLikes(false);
        }
    }, []);

    if (user?.isBanned) {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center p-6">
                <p className="text-center font-black uppercase tracking-widest text-uv-gray mb-2">{t('socialFeed.restrictedTitle')}</p>
                <p className="text-sm text-center text-uv-gray">{t('socialFeed.restrictedDesc')}</p>
            </div>
        );
    }

    return (
        <div ref={rootRef} className="flex min-h-screen flex-col xl:min-h-0 xl:flex-1">
            {/* Report success toast */}
            {reportSuccessMessage && (
                <div className="fixed left-1/2 z-[100] max-xl:top-[calc(env(safe-area-inset-top,0px)+1rem)] top-4 -translate-x-1/2 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-bold shadow-lg">
                    {reportSuccessMessage}
                </div>
            )}
            {/* Normal akış: yalnızca feed en üstteyken görünür; kaydırınca içerikle birlikte gider (sticky değil). */}
            <div
                className={`relative z-10 flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2.5 max-xl:pl-[max(0.75rem,env(safe-area-inset-left,0px))] max-xl:pr-[max(0.75rem,env(safe-area-inset-right,0px))] md:px-5 md:py-3 xl:px-4 xl:py-3 ${
                    isSpace
                        ? 'border-white/10 max-xl:bg-[#0a0a1a] max-xl:backdrop-blur-none xl:bg-[#0a0a1a]/85 xl:backdrop-blur-md'
                        : 'border-uv-border max-xl:bg-white max-xl:backdrop-blur-none xl:premium-blur'
                }`}
            >
                <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 md:gap-3">
                    <img src="/logo.svg" alt="UniVerse" className="h-9 w-9 md:h-10 md:w-10 xl:h-11 xl:w-11" />
                    <span className={`text-xl font-black tracking-tighter md:text-2xl xl:text-[1.75rem] 2xl:text-2xl ${isSpace ? 'text-white' : 'text-uv-black'}`}>
                        {t('socialFeed.title')}
                    </span>
                </div>
                <div className="min-w-0 hidden md:block">
                    <p className={`text-[10px] font-black uppercase tracking-widest whitespace-nowrap md:text-xs ${isSpace ? 'text-primary/90' : 'text-primary'}`}>{t('socialFeed.subtitle')}</p>
                </div>
                <div className={`relative z-20 flex gap-1 rounded-tl-md rounded-br-md p-0.5 md:rounded-tl-lg md:rounded-br-lg ${isSpace ? 'bg-white/10' : 'bg-uv-border/50'}`}>
                    <button type="button" className={`rounded-tl-sm rounded-br-sm px-2.5 py-1 text-[9px] font-black uppercase tracking-widest shadow-sm md:rounded-tl-md md:rounded-br-md md:px-3 md:py-1.5 md:text-[10px] ${isSpace ? 'bg-primary text-white' : 'bg-white text-primary'}`}>{t('socialFeed.all')}</button>
                </div>
            </div>

            {user && !user.isBanned && (
                <div
                    className={`shrink-0 border-b px-3 pb-3 pt-2 md:px-4 md:pb-4 md:pt-2 xl:px-3 ${
                        isSpace
                            ? 'border-white/10 max-xl:bg-[#0a0a1a] xl:bg-[#0a0a1a]/50'
                            : 'border-uv-border/60 max-xl:bg-gray-50 xl:bg-gray-50/40'
                    }`}
                >
                    <div
                        className={`rounded-2xl border p-3 md:p-4 ${
                            isSpace
                                ? 'border-white/15 bg-white/[0.06]'
                                : 'border-uv-border/70 bg-white/90 shadow-sm'
                        }`}
                    >
                        <div className="flex gap-3">
                            <div
                                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border md:h-11 md:w-11 ${
                                    isSpace ? 'border-white/15 bg-white/5' : 'border-primary/20 bg-primary/5'
                                }`}
                            >
                                <FeedAvatarImage
                                    src={meAvatarUrl}
                                    initials={meInitials}
                                    imgClassName="h-full w-full object-cover"
                                    className="font-black text-xs text-primary md:text-sm"
                                />
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col">
                                <textarea
                                    rows={2}
                                    value={hubDraft}
                                    onChange={(e) => setHubDraft(e.target.value)}
                                    placeholder={t('socialFeed.broadcastPlaceholder')}
                                    className={`min-h-[3.25rem] w-full resize-none rounded-xl border-none bg-transparent text-sm font-semibold outline-none ring-0 placeholder:font-medium md:min-h-[3.5rem] md:text-base ${
                                        isSpace
                                            ? 'text-white placeholder:text-white/35'
                                            : 'text-uv-black placeholder:text-primary/35'
                                    }`}
                                />
                                {hubPreviewUrl && hubImage ? (
                                    <div className="relative mt-2">
                                        {hubImage.type.startsWith('video/') ? (
                                            <video
                                                src={hubPreviewUrl}
                                                controls
                                                playsInline
                                                className={`max-h-48 w-full rounded-xl border object-contain ${
                                                    isSpace ? 'border-white/10' : 'border-uv-border'
                                                }`}
                                            />
                                        ) : (
                                            <img
                                                src={hubPreviewUrl}
                                                alt=""
                                                className={`max-h-48 w-full rounded-xl border object-cover ${
                                                    isSpace ? 'border-white/10' : 'border-uv-border'
                                                }`}
                                            />
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setHubImage(null);
                                                if (hubFileInputRef.current) hubFileInputRef.current.value = '';
                                            }}
                                            className="absolute right-2 top-2 rounded-lg bg-black/70 p-1.5 text-white hover:bg-black"
                                            aria-label={t('common.close')}
                                        >
                                            <FiX size={16} />
                                        </button>
                                    </div>
                                ) : null}
                                <div
                                    className={`mt-2 flex flex-wrap items-center justify-between gap-2 border-t pt-2 ${
                                        isSpace ? 'border-white/10' : 'border-uv-border/40'
                                    }`}
                                >
                                    <div className="flex min-w-0 items-center gap-1.5">
                                        <input
                                            ref={hubFileInputRef}
                                            type="file"
                                            className="hidden"
                                            accept="image/*,video/mp4,.mp4"
                                            onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                if (f) setHubImage(f);
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => hubFileInputRef.current?.click()}
                                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                                                isSpace
                                                    ? 'bg-white/5 text-primary/90 hover:bg-white/10'
                                                    : 'bg-gray-100 text-primary hover:bg-primary/10'
                                            }`}
                                            aria-label={t('socialFeed.attach')}
                                        >
                                            <FiImage size={18} />
                                        </button>
                                        <span
                                            className={`hidden truncate text-[10px] font-black uppercase tracking-widest sm:inline ${
                                                isSpace ? 'text-white/40' : 'text-uv-gray'
                                            }`}
                                        >
                                            {t('socialFeed.attach')}
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={hubPosting || (!hubDraft.trim() && !hubImage)}
                                        onClick={() => void submitHubPost()}
                                        className="shrink-0 rounded-xl bg-primary px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-opacity hover:brightness-110 disabled:opacity-40 md:px-5 md:py-2.5 md:text-xs"
                                    >
                                        {hubPosting ? t('socialFeed.sending') : t('socialFeed.broadcast')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Feed — kartlar arası sabit boşluk (eski aralı hissi) */}
            <div className="flex flex-col gap-4 pb-24 pt-1 xl:gap-3">
                {loading ? (
                    <div className="p-12 md:p-20 text-center flex flex-col items-center gap-4">
                        <div className="w-8 h-8 md:w-12 md:h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-[9px] md:text-xs font-black uppercase tracking-widest text-uv-gray">{t('socialFeed.syncing')}</p>
                    </div>
                ) : posts.length === 0 ? (
                    <div className="p-12 md:p-20 text-center text-uv-gray font-black uppercase tracking-widest text-[9px] md:text-xs opacity-50">{t('socialFeed.empty')}</div>
                ) : (
                    posts.map((post, rowIndex) => (
                        <div
                            key={`${post.post_id}-${rowIndex}`}
                            className={`feed-card group relative rounded-2xl border p-3 transition-all md:p-5 xl:p-4 ${isSpace ? 'border-white/15 bg-white/[0.07] shadow-[0_8px_32px_-12px_rgba(0,0,0,0.55)] hover:border-primary/30 hover:bg-white/[0.09]' : 'border-uv-border/60 bg-gray-50/90 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.12)] hover:bg-gray-100/90'}`}
                        >
                             {/* Repost Indicator */}
                             {post.reposter_id && (
                                <div className="mb-1 flex items-center gap-1.5 text-[7px] md:text-[10px] font-black text-green-600 uppercase tracking-widest pl-9 md:pl-16 xl:pl-11">
                                    <FiRepeat size={9} /> {post.reposter_id === user?.userId ? t('socialFeed.you') : post.reposter_name} {t('socialFeed.boosted')}
                                </div>
                             )}
  
                            <div className="flex gap-2 md:gap-4 xl:gap-3">
                                <div 
                                    onClick={() => navigate(`/profile/${post.user_id}`)}
                                    className="w-8 h-8 md:w-12 md:h-12 xl:w-10 xl:h-10 2xl:w-12 2xl:h-12 rounded-xl flex items-center justify-center font-black text-primary border border-primary/20 overflow-hidden cursor-pointer text-xs md:text-base xl:text-sm shrink-0 bg-primary/10"
                                >
                                    <FeedAvatarImage
                                        src={post.avatar_url ? resolveMediaUrl(post.avatar_url) : undefined}
                                        initials={getInitials(post.first_name, post.last_name, post.email)}
                                        imgClassName="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-0.5 md:mb-1 text-xs md:text-base xl:text-sm">
                                        <div className="flex items-center gap-1.5 md:gap-2 min-w-0 flex-wrap">
                                            <span 
                                                onClick={() => navigate(`/profile/${post.user_id}`)}
                                                className={`font-black hover:text-primary transition-colors cursor-pointer truncate ${isSpace ? 'text-white' : 'text-uv-black'}`}
                                            >
                                                {post.first_name} {post.last_name}
                                            </span>
                                            <span className={`text-[8px] md:text-[10px] font-bold uppercase tracking-tighter truncate ${isSpace ? 'text-white/60' : 'text-uv-gray'}`}>@{post.email.split('@')[0]}</span>
                                            <span className={isSpace ? 'text-white/40' : 'text-uv-gray'}>·</span>
                                            <span className={`text-[8px] md:text-[10px] font-bold uppercase whitespace-nowrap ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>{formatDate(post.created_at)}</span>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-0.5">
                                        <div className="relative shrink-0" ref={openMenu === rowIndex ? menuRef : undefined}>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (openMenu === rowIndex) {
                                                            setOpenMenu(null);
                                                            setMenuReportScreen(false);
                                                        } else {
                                                            setOpenMenu(rowIndex);
                                                            setMenuReportScreen(false);
                                                        }
                                                    }}
                                                    className={`rounded-lg p-0.5 transition-colors ${
                                                        isSpace ? 'text-white/50 hover:bg-white/10 hover:text-white' : 'text-uv-gray hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <FiMoreHorizontal size={14} />
                                                </button>

                                                {openMenu === rowIndex && (
                                                    <div
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
                                                                        onClick={() => handleDeletePost(post.post_id)}
                                                                        className="flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10"
                                                                    >
                                                                        <FiTrash2 size={14} /> {t('common.delete')}
                                                                    </button>
                                                                )}
                                                                {!isStaff && (
                                                                    <button
                                                                        type="button"
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
                                                                            onClick={() => handleRemoveReport(post.post_id)}
                                                                            className={`w-full px-3 py-2 text-left text-xs font-bold transition-colors ${
                                                                                isSpace
                                                                                    ? 'text-red-300 hover:bg-red-500/20'
                                                                                    : 'text-red-600 hover:bg-red-50'
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
                                                                                onClick={() => handleReportPost(post.post_id, type)}
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
 
                                    <p
                                        className={`font-medium leading-relaxed mb-3 text-xs md:text-[15px] xl:text-sm break-words cursor-pointer ${isSpace ? 'text-white' : 'text-uv-black'}`}
                                        onClick={() => navigate(`/post/${post.post_id}`)}
                                    >{post.content}</p>

                                    {post.image_url && (
                                        <PostAttachment
                                            path={post.image_url}
                                            className="rounded-xl border overflow-hidden mb-3 sm:mb-4 shadow-sm border-uv-border/50 cursor-pointer"
                                            onClick={() => navigate(`/post/${post.post_id}`)}
                                        />
                                    )}
 
                                    {/* Action Deck */}
                                    <div className={`flex items-center gap-6 md:gap-8 xl:gap-5 ${isSpace ? 'text-white/70' : 'text-uv-gray'}`}>
                                        <button onClick={() => toggleComments(post.post_id)} className={`flex items-center gap-1 md:gap-1.5 transition-all ${post.showComments ? 'text-primary' : 'hover:text-primary'}`}>
                                            <FiMessageCircle size={15} className={post.showComments ? 'fill-primary/10' : ''} />
                                            <span className="text-[9px] md:text-[11px] font-black">{post.comments_count}</span>
                                        </button>
                                        <button onClick={() => toggleRepost(post.post_id)} className={`flex items-center gap-1 md:gap-1.5 transition-all ${post.has_reposted ? 'text-green-500' : 'hover:text-green-500'}`}>
                                            <FiRepeat size={15} />
                                            <span className="text-[9px] md:text-[11px] font-black">{post.reposts_count}</span>
                                        </button>
                                        <div className="flex items-center gap-1 md:gap-1.5">
                                            <button onClick={() => toggleLike(post.post_id)} className={`transition-all ${post.has_liked ? 'text-pink-500' : 'hover:text-pink-500'}`}>
                                                <FiHeart size={15} className={post.has_liked ? 'fill-current' : ''} />
                                            </button>
                                            <button onClick={() => handleShowLikes(post.post_id)} className="text-[9px] md:text-[11px] font-black hover:underline">
                                                {post.likes_count}
                                            </button>
                                        </div>
                                        {user ? (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShareSheetPost(post);
                                                    setOpenMenu(null);
                                                    setMenuReportScreen(false);
                                                }}
                                                className="flex shrink-0 items-center gap-1 md:gap-1.5 transition-all hover:text-primary"
                                                title={t('socialFeed.sharePostViaMessage')}
                                                aria-label={t('socialFeed.sharePostViaMessage')}
                                            >
                                                <FiCornerUpRight size={15} strokeWidth={2.2} />
                                            </button>
                                        ) : null}
                                        {((user && isAcademic(user.role) && post.user_id !== user.userId) || isStaff) ? (
                                        <div className="ml-auto flex shrink-0 items-center gap-1">
                                        <AdminModerationMenu
                                            visible={Boolean(user && isAcademic(user.role) && post.user_id !== user.userId)}
                                            variant="post"
                                            onDelete={async () => {
                                                try {
                                                    await api.delete(`/social/posts/${post.post_id}`);
                                                    setPosts((prev) => prev.filter((p) => p.post_id !== post.post_id));
                                                    setOpenMenu(null);
                                                    setMenuReportScreen(false);
                                                } catch {
                                                    await themedAlert(t('socialFeed.deleteFailed'));
                                                }
                                            }}
                                        />
                                        {isStaff && (
                                        <div
                                            className="relative flex items-center gap-1"
                                            ref={warningDropdown === rowIndex ? warningDropdownRef : undefined}
                                        >
                                                <>
                                                    {(post.reports_count ?? 0) > 0 && (
                                                        <span className="text-[9px] font-black text-red-500 mr-0.5">{post.reports_count}</span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); setWarningDropdown(warningDropdown === rowIndex ? null : rowIndex); }}
                                                        className="p-1 text-amber-500 hover:text-amber-400 transition-colors"
                                                        title="Give warning"
                                                    >
                                                        <FiAlertTriangle size={15} />
                                                    </button>
                                                    {warningDropdown === rowIndex && (
                                                        <div className={`absolute right-0 bottom-full mb-1 w-40 py-2 rounded-xl shadow-xl z-20 border ${isSpace ? 'bg-[#0a0a14] border-amber-500/40' : 'bg-[#1a1a1a] border-amber-500/30'}`}>
                                                            <p className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-white/80">Give warning</p>
                                                            {[1, 2, 3].map((tier) => (
                                                                <button key={tier} type="button" onClick={() => handleGiveWarning(post.user_id, tier as 1 | 2 | 3)} className="w-full text-left px-3 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/20">
                                                                    Tier {tier}
                                                                </button>
                                                            ))}
                                                            <button type="button" onClick={() => handleGiveWarning(post.user_id, 4)} className="w-full text-left px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20">
                                                                Ban
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
                                        </div>
                                        )}
                                        </div>
                                        ) : null}
                                    </div>

                                    {/* Inline Comments - Desktop only */}
                                    {post.showComments && (
                                        <div className="hidden md:block">
                                            <div className="mt-2 pt-2 md:mt-6 md:pt-6 border-t border-uv-border space-y-2 md:space-y-4">
                                            <div className="flex gap-2.5 sm:gap-3">
                                                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary/5 rounded-lg flex items-center justify-center text-primary font-black text-[10px] sm:text-xs shrink-0 overflow-hidden">
                                                    <FeedAvatarImage src={meAvatarUrl} initials={meInitials} imgClassName="h-full w-full object-cover" />
                                                </div>
                                                <div className="flex-1 relative">
                                                    <input 
                                                        type="text" 
                                                        placeholder="Add to transmission..." 
                                                        className="w-full bg-gray-50 border-none rounded-lg px-3 md:px-4 py-1 md:py-2 text-[11px] md:text-sm outline-none focus:ring-1 focus:ring-primary pr-8"
                                                        value={newComment[post.post_id] || ''}
                                                        onChange={(e) => setNewComment({ ...newComment, [post.post_id]: e.target.value })}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.post_id)}
                                                    />
                                                    <button onClick={() => handleAddComment(post.post_id)} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-primary hover:bg-white rounded-lg transition-colors"><FiNavigation size={12} /></button>
                                                </div>
                                            </div>
 
                                            {post.loadingComments ? (
                                                <div className="text-center py-1 md:py-4 text-uv-gray text-[8px] font-black animate-pulse">SYNCING REPLIES...</div>
                                            ) : (
                                                <div className="space-y-2 md:space-y-4 border-l border-uv-border/50 pl-2 md:pl-4">
                                                    {post.comments?.map(comment => (
                                                        <div key={comment.comment_id} className="flex gap-2 md:gap-3 opacity-90">
                                                            <div 
                                                                onClick={() => navigate(`/profile/${comment.user_id}`)}
                                                                className="w-5 h-5 md:w-7 md:h-7 bg-gray-100 rounded-md md:rounded-lg flex items-center justify-center text-uv-gray text-[8px] font-black shrink-0 cursor-pointer overflow-hidden"
                                                            >
                                                                <FeedAvatarImage
                                                                    src={comment.avatar_url ? resolveMediaUrl(comment.avatar_url) : undefined}
                                                                    initials={getInitials(comment.first_name, comment.last_name, comment.email)}
                                                                    imgClassName="w-full h-full object-cover rounded-md md:rounded-lg"
                                                                />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-1 md:gap-2 mb-0.5">
                                                                    <span 
                                                                        onClick={() => navigate(`/profile/${comment.user_id}`)}
                                                                        className="font-bold text-uv-black text-[10px] md:text-xs cursor-pointer hover:text-primary transition-colors truncate"
                                                                    >
                                                                        {comment.first_name} {comment.last_name}
                                                                    </span>
                                                                    <span className="text-uv-gray text-[8px] font-bold uppercase whitespace-nowrap">{formatDate(comment.created_at)}</span>
                                                                </div>
                                                                <p className="text-[10px] md:text-xs text-uv-black font-medium leading-snug">{comment.content}</p>
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
                        </div>
                    ))
                )}
            </div>

            {/* Share post via message */}
            {createPortal(
                <AnimatePresence>
                    {shareSheetPost && (
                        <div className="fixed inset-0 z-[115] flex items-end sm:items-center justify-center p-0 sm:p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => !shareSending && setShareSheetPost(null)}
                                className={`absolute inset-0 ${isSpace ? 'bg-black/70' : 'bg-uv-black/50'} backdrop-blur-sm`}
                            />
                            <motion.div
                                initial={{ opacity: 0, y: 40 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 40 }}
                                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                                onClick={(e) => e.stopPropagation()}
                                className={`relative z-10 w-full max-h-[85vh] sm:max-w-md rounded-t-3xl sm:rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
                                    isSpace
                                        ? 'border-white/10 bg-[#0a0a14] text-white'
                                        : 'border-uv-border bg-white text-uv-black'
                                }`}
                            >
                                <div className={`flex items-start justify-between gap-3 p-4 sm:p-5 border-b ${isSpace ? 'border-white/10' : 'border-uv-border'}`}>
                                    <div className="min-w-0">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-primary">{t('socialFeed.sharePostSheetTitle')}</h3>
                                        <p className={`mt-1 text-xs leading-relaxed ${isSpace ? 'text-white/55' : 'text-uv-gray'}`}>{t('socialFeed.sharePostSheetHint')}</p>
                                    </div>
                                    <button
                                        type="button"
                                        disabled={shareSending}
                                        onClick={() => setShareSheetPost(null)}
                                        className={`shrink-0 rounded-xl p-2 transition-colors ${
                                            isSpace ? 'text-white/60 hover:bg-white/10' : 'text-uv-gray hover:bg-gray-100'
                                        }`}
                                        aria-label="Close"
                                    >
                                        <FiX size={18} />
                                    </button>
                                </div>
                                <div className={`px-4 sm:px-5 pb-4 ${isSpace ? 'border-b border-white/10' : 'border-b border-uv-border'}`}>
                                    <p
                                        className={`mb-2 text-[10px] font-black uppercase tracking-widest ${
                                            isSpace ? 'text-white/45' : 'text-uv-gray'
                                        }`}
                                    >
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
                                <div className="p-4 sm:p-5 border-b border-transparent">
                                    <input
                                        type="search"
                                        value={shareSearchQ}
                                        onChange={(e) => setShareSearchQ(e.target.value)}
                                        placeholder={t('socialFeed.sharePostSearchPlaceholder')}
                                        className={`w-full rounded-2xl border px-4 py-3 text-sm font-medium outline-none transition ring-0 focus:ring-2 focus:ring-primary/30 ${
                                            isSpace
                                                ? 'border-white/15 bg-white/5 text-white placeholder:text-white/35'
                                                : 'border-uv-border bg-gray-50 text-uv-black placeholder:text-uv-gray'
                                        }`}
                                    />
                                </div>
                                <div className="flex-1 min-h-0 overflow-y-auto p-2 sm:p-3">
                                    {shareSearchLoading ? (
                                        <div className="flex justify-center py-10">
                                            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
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
                                                        } ${shareSending ? 'opacity-50 pointer-events-none' : ''}`}
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
                                                            <p className={`truncate text-[10px] font-bold uppercase tracking-wide ${isSpace ? 'text-white/45' : 'text-primary/80'}`}>
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

            {/* Interactions Modal - Portaled to Body to avoid parent transform issues */}
            {createPortal(
                <AnimatePresence>
                    {likeModal.isOpen && (
                        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setLikeModal({ isOpen: false, postId: null, users: [] })}
                                className="absolute inset-0 bg-uv-black/40 sm:bg-uv-black/70 backdrop-blur-md"
                            />
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: 100 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 100 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                className="bg-white w-full sm:max-w-md rounded-t-[2.5rem] sm:rounded-tl-none sm:rounded-tr-[3rem] sm:rounded-bl-[3rem] sm:rounded-br-[1rem] overflow-hidden shadow-2xl relative z-10 border border-uv-border mb-0 max-h-[90vh] sm:max-h-[70vh] flex flex-col premium-blur"
                            >
                                {/* Mobile Handle bar */}
                                <div className="w-12 h-1.5 bg-uv-gray/20 rounded-full mx-auto mt-4 mb-2 sm:hidden opacity-50" />

                                {/* Modal Header - HUD Style Theme-Aware */}
                                <div className="p-6 sm:p-8 border-b border-uv-border flex justify-between items-center bg-gradient-to-r from-primary/5 to-transparent relative overflow-hidden">
                                     {/* Decorative background element */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-3xl hidden sm:block" />
                                    
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-primary animate-ping shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
                                                <h3 className="text-xl sm:text-2xl font-black tracking-tighter text-uv-black leading-none uppercase">Transmission Pulse</h3>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-black text-primary px-2 py-0.5 bg-primary/10 rounded-full tracking-widest uppercase">Live Node Data</span>
                                                <span className="text-[9px] font-bold text-uv-gray uppercase tracking-widest">v2.4.0</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setLikeModal({ isOpen: false, postId: null, users: [] })}
                                        className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-white border border-uv-border text-uv-black hover:bg-primary hover:text-white rounded-2xl transition-all shadow-md active:scale-95 group relative z-10"
                                    >
                                        <FiX size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                                    </button>
                                </div>

                                {/* Modal Body */}
                                <div className="overflow-y-auto p-4 sm:p-6 pb-8 space-y-3 scrollbar-hide flex-1 min-h-0">
                                    {loadingLikes ? (
                                        <div className="p-20 text-center flex flex-col items-center gap-6">
                                            <div className="relative">
                                                <div className="w-16 h-16 border-4 border-primary/10 rounded-full" />
                                                <div className="absolute inset-0 w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-xs font-black uppercase tracking-[0.3em] text-primary">Synchronizing Orbit...</p>
                                                <div className="w-32 h-1 bg-uv-border rounded-full mx-auto overflow-hidden">
                                                    <motion.div 
                                                        animate={{ x: [-128, 128] }}
                                                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                                        className="w-full h-full bg-primary"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ) : likeModal.users.length === 0 ? (
                                        <div className="p-20 text-center flex flex-col items-center">
                                            <div className="w-20 h-20 bg-uv-border/10 rounded-[2.5rem] flex items-center justify-center mb-6 border border-dashed border-uv-border group hover:border-primary/50 transition-colors">
                                                <FiHeart size={32} className="text-uv-gray group-hover:text-primary transition-colors opacity-30" />
                                            </div>
                                            <p className="text-xs font-black uppercase text-uv-gray tracking-[0.2em] opacity-50">Pulse flat. No signals detected.</p>
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

                                {/* Modal Footer Theme-Aware */}
                                <div className="p-6 bg-uv-border/5 text-center border-t border-uv-border relative overflow-hidden pb-10 sm:pb-6">
                                    <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--uv-primary) 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
                                    <p className="text-[10px] font-black text-uv-gray uppercase tracking-[0.4em] relative z-10">UniVerse Intelligence Layer</p>
                                    <div className="flex justify-center gap-1 mt-3 relative z-10">
                                        {[1,2,3,4].map(i => <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === 2 ? 'bg-primary animate-pulse shadow-[0_0_5px_var(--uv-primary)]' : 'bg-uv-gray/20'}`} />)}
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Comment Bottom Sheet - Mobile Only */}
            {createPortal(
                <AnimatePresence>
                    {commentSheet.isOpen && commentSheet.post && (
                        <div className="fixed inset-0 z-[110] flex items-end justify-center md:hidden">
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setCommentSheet({ isOpen: false, post: null })}
                                className="absolute inset-0 bg-uv-black/40 backdrop-blur-sm"
                            />
                            <motion.div 
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className={`bg-white w-full rounded-t-[2.5rem] overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[85vh] ${isSpace ? 'space-dimension' : ''}`}
                            >
                                {/* Mobile Handle bar */}
                                <div className="w-12 h-1.5 bg-uv-gray/20 rounded-full mx-auto mt-4 mb-2 opacity-50" />
                                
                                <div className="px-5 py-4 border-b border-uv-border flex justify-between items-center">
                                    <h3 className="text-sm font-black uppercase tracking-widest text-uv-black">Transmission Replies</h3>
                                    <button 
                                        onClick={() => setCommentSheet({ isOpen: false, post: null })}
                                        className="text-uv-gray p-2 hover:bg-gray-100 rounded-full"
                                    >
                                        <FiX size={20} />
                                    </button>
                                </div>

                                {/* Comments List */}
                                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                    {commentSheet.post.loadingComments ? (
                                        <div className="text-center py-10">
                                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                            <p className="text-[10px] font-black uppercase tracking-widest text-uv-gray">Syncing Feed...</p>
                                        </div>
                                    ) : (commentSheet.post.comments || []).length === 0 ? (
                                        <div className="text-center py-20 opacity-50 font-black text-[10px] uppercase tracking-[0.2em]">Silence in the airwaves.</div>
                                    ) : (
                                        commentSheet.post.comments?.map(comment => (
                                            <div key={comment.comment_id} className="flex gap-3">
                                                <div className="w-8 h-8 bg-primary/5 rounded-lg flex items-center justify-center text-primary font-black text-xs shrink-0 overflow-hidden">
                                                    <FeedAvatarImage
                                                        src={comment.avatar_url ? resolveMediaUrl(comment.avatar_url) : undefined}
                                                        initials={getInitials(comment.first_name, comment.last_name, comment.email)}
                                                        imgClassName="w-full h-full object-cover rounded-lg"
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="font-bold text-uv-black text-[11px] truncate">{comment.first_name} {comment.last_name}</span>
                                                        <span className="text-uv-gray text-[9px] font-bold uppercase">{formatDate(comment.created_at)}</span>
                                                    </div>
                                                    <p className="text-[11px] text-uv-black font-medium leading-snug">{comment.content}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Add Comment Footer */}
                                <div className="p-4 border-t border-uv-border bg-gray-50/50 pb-8">
                                    <div className="flex gap-2 relative">
                                        <input 
                                            type="text" 
                                            placeholder="Write your transmission..." 
                                            className={`flex-1 bg-white border border-uv-border rounded-xl px-4 py-2.5 text-xs outline-none focus:ring-1 focus:ring-primary pr-12 ${isSpace ? '!border-white/10' : ''}`}
                                            value={newComment[commentSheet.post!.post_id] || ''}
                                            onChange={(e) => setNewComment({ ...newComment, [commentSheet.post!.post_id]: e.target.value })}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddComment(commentSheet.post!.post_id)}
                                        />
                                        <button 
                                            onClick={() => handleAddComment(commentSheet.post!.post_id)} 
                                            className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 text-primary hover:bg-white rounded-xl transition-colors"
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
        </div>
    );
};

export default SocialFeed;
