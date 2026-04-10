import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { FiHeart, FiRepeat, FiMessageCircle, FiImage, FiTrash2, FiMoreHorizontal, FiSend, FiNavigation, FiX, FiUser, FiAlertTriangle } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { isAcademic } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useTheme } from '../context/ThemeContext';
import { themedAlert, themedConfirm } from '../utils/themedDialog';
import PostAttachment from '../components/PostAttachment';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';

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
    comments?: any[];
    loadingComments?: boolean;
}

const SocialFeed = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [content, setContent] = useState('');
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [newComment, setNewComment] = useState<{ [key: number]: string }>({});
    const [openMenu, setOpenMenu] = useState<number | null>(null);
    const [likeModal, setLikeModal] = useState<{ isOpen: boolean; postId: number | null; users: any[] }>({ isOpen: false, postId: null, users: [] });
    const [loadingLikes, setLoadingLikes] = useState(false);
    const [commentSheet, setCommentSheet] = useState<{ isOpen: boolean; post: Post | null }>({ isOpen: false, post: null });
    const [reportDropdown, setReportDropdown] = useState<number | null>(null);
    const [warningDropdown, setWarningDropdown] = useState<number | null>(null);
    const [reportSuccessMessage, setReportSuccessMessage] = useState<string | null>(null);
    const reportDropdownRef = useRef<HTMLDivElement>(null);
    const warningDropdownRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const { dimension } = useTheme();

    useEffect(() => {
        if (openMenu === null) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpenMenu(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, [openMenu]);

    useEffect(() => {
        if (!reportSuccessMessage) return;
        const t = setTimeout(() => setReportSuccessMessage(null), 3000);
        return () => clearTimeout(t);
    }, [reportSuccessMessage]);
    const isStaff = user && isAcademic(user.role);

    useEffect(() => {
        if (reportDropdown === null) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (reportDropdownRef.current && !reportDropdownRef.current.contains(e.target as Node)) {
                setReportDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, [reportDropdown]);
    useEffect(() => {
        if (warningDropdown === null) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (warningDropdownRef.current && !warningDropdownRef.current.contains(e.target as Node)) {
                setWarningDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside, true);
        return () => document.removeEventListener('mousedown', handleClickOutside, true);
    }, [warningDropdown]);
    const isSpace = dimension === 'space';

    useEffect(() => {
        fetchPosts();
    }, []);

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

    const composerPreviewUrl = useMemo(
        () => (selectedImage ? URL.createObjectURL(selectedImage) : null),
        [selectedImage]
    );
    useEffect(() => {
        return () => {
            if (composerPreviewUrl) URL.revokeObjectURL(composerPreviewUrl);
        };
    }, [composerPreviewUrl]);

    const fetchPosts = async () => {
        try {
            const res = await api.get('/social/feed');
            setPosts(res.data.items || []);
        } catch (err) {
            console.error('Failed to load feed', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePost = async (postId: number) => {
        if (!(await themedConfirm(t('socialFeed.deleteConfirm')))) return;
        try {
            await api.delete(`/social/posts/${postId}`);
            setPosts(posts.filter(p => p.post_id !== postId));
            setOpenMenu(null);
        } catch {
            await themedAlert(t('socialFeed.deleteFailed'));
        }
    };

    const handleCopyLink = async (postId: number) => {
        const url = `${window.location.origin}/post/${postId}`;
        navigator.clipboard.writeText(url);
        await themedAlert(t('socialFeed.linkCopied'));
        setOpenMenu(null);
    };

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() && !selectedImage) return;

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('content', content);
            if (selectedImage) {
                formData.append('images', selectedImage);
            }

            await api.post('/social/posts', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setContent('');
            setSelectedImage(null);
            fetchPosts();
        } catch {
            await themedAlert(t('socialFeed.createFailed'));
        } finally {
            setSubmitting(false);
        }
    };

    const toggleLike = async (postId: number) => {
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
    };

    const toggleRepost = async (postId: number) => {
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
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const diff = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (diff < 60) return `${diff}s`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

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
            setReportDropdown(null);
            setReportSuccessMessage(t('socialFeed.reportSubmitted'));
            setPosts(prev => prev.map(p => p.post_id === postId ? { ...p, has_reported: true, my_report_type: reportType } : p));
        } catch (err: any) {
            const status = err?.response?.status;
            let msg =
                (err?.response?.data?.error as string) ||
                err?.message ||
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
            setReportDropdown(null);
            setReportSuccessMessage(t('socialFeed.reportRemoved'));
            setPosts(prev => prev.map(p => p.post_id === postId ? { ...p, has_reported: false, my_report_type: null } : p));
        } catch (err: any) {
            const msg = (err?.response?.data?.error as string) || err?.message || t('socialFeed.removeReportFailed');
            await themedAlert(msg);
        }
    };

    const handleGiveWarning = async (userId: number, tier: 1 | 2 | 3 | 4) => {
        try {
            await api.post(`/social/users/${userId}/warning`, { tier });
            setWarningDropdown(null);
            setReportSuccessMessage(tier === 4 ? t('socialFeed.userBanned') : t('socialFeed.warningApplied', { tier }));
        } catch (err: any) {
            await themedAlert((err?.response?.data?.error as string) || t('socialFeed.warningFailed'));
        }
    };

    const handleShowLikes = async (postId: number) => {
        setLikeModal({ isOpen: true, postId, users: [] });
        setLoadingLikes(true);
        try {
            const res = await api.get(`/social/posts/${postId}/likes`);
            setLikeModal(prev => ({ ...prev, users: res.data }));
        } catch {
            console.error('Failed to fetch likes');
        } finally {
            setLoadingLikes(false);
        }
    };

    if (user?.isBanned) {
        return (
            <div className="flex flex-col min-h-screen items-center justify-center p-6">
                <p className="text-center font-black uppercase tracking-widest text-uv-gray mb-2">{t('socialFeed.restrictedTitle')}</p>
                <p className="text-sm text-center text-uv-gray">{t('socialFeed.restrictedDesc')}</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen">
            {/* Report success toast */}
            {reportSuccessMessage && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-bold shadow-lg">
                    {reportSuccessMessage}
                </div>
            )}
            {/* Unique Header */}
            <div className="sticky top-0 premium-blur border-b border-uv-border z-20 px-3 md:px-6 py-1.5 md:py-4 flex items-center justify-between gap-2">
                <div className="min-w-0">
                   <h2 className="text-sm md:text-2xl font-black tracking-tighter text-uv-black leading-none">{t('socialFeed.title')}</h2>
                   <p className="text-[8px] md:text-[10px] font-black text-primary uppercase tracking-widest mt-0.5 whitespace-nowrap">{t('socialFeed.subtitle')}</p>
                </div>
                <div className="flex gap-1 p-0.5 bg-uv-border/50 rounded-tl-lg rounded-br-lg md:rounded-tl-xl md:rounded-br-xl">
                    <button className="px-2 md:px-4 py-1 bg-white text-primary text-[9px] md:text-xs font-black uppercase tracking-widest rounded-tl-md rounded-br-md shadow-sm">{t('socialFeed.all')}</button>
                </div>
            </div>

            {/* UniVerse Composer */}
            <div className="p-2 md:p-6 pb-1 border-b border-uv-border/10">
                <div className="p-2 md:p-5">
                    <div className="flex gap-2 md:gap-4">
                        <div className="w-8 h-8 md:w-12 md:h-12 bg-primary/5 rounded-tl-lg rounded-br-lg md:rounded-tl-xl md:rounded-br-xl flex items-center justify-center text-primary font-black border border-primary/10 shrink-0 text-xs md:text-base">
                            {user?.email[0].toUpperCase()}
                        </div>
                        <form onSubmit={handleCreatePost} className="flex-1 min-w-0">
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder={t('socialFeed.broadcastPlaceholder')}
                                className="w-full bg-transparent border-none focus:ring-0 text-xs md:text-lg font-medium text-uv-black resize-none min-h-[36px] md:min-h-[52px] placeholder:text-primary/30 py-1"
                                disabled={submitting}
                            />
                            
                            {composerPreviewUrl && selectedImage && (
                                <div className="relative mb-2 md:mb-4">
                                    {selectedImage.type.startsWith('video/') ? (
                                        <video
                                            src={composerPreviewUrl}
                                            controls
                                            playsInline
                                            className="max-h-40 md:max-h-80 w-full rounded-xl border-2 border-white shadow-lg bg-black object-contain"
                                        />
                                    ) : (
                                        <img
                                            src={composerPreviewUrl}
                                            alt=""
                                            className="max-h-40 md:max-h-80 w-full object-cover rounded-xl border-2 border-white shadow-lg"
                                        />
                                    )}
                                    <button type="button" onClick={() => setSelectedImage(null)} className="absolute top-1.5 right-1.5 bg-uv-black/80 text-white rounded-full p-1.5 hover:bg-uv-black transition-all">
                                        <FiTrash2 size={12} />
                                    </button>
                                </div>
                            )}
 
                            <div className="flex items-center justify-between mt-0.5 md:mt-4">
                                <label className="flex items-center gap-1 p-1 md:p-2 hover:bg-white/50 rounded-lg cursor-pointer transition-all text-primary">
                                    <FiImage size={16} />
                                    <span className="text-[8px] font-black uppercase tracking-widest hidden md:inline">{t('socialFeed.attach')}</span>
                                    <input
                                        type="file"
                                        accept="image/*,video/mp4,.mp4"
                                        className="hidden"
                                        onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
                                        disabled={submitting}
                                    />
                                </label>
                                <button
                                    type="submit"
                                    disabled={(!content.trim() && !selectedImage) || submitting}
                                    className="uv-button !py-1 md:!py-2 !px-3 md:!px-8 text-[10px] md:text-sm flex items-center gap-1.5"
                                >
                                    {submitting ? t('socialFeed.sending') : <><FiSend size={12} /> <span className="hidden md:inline">{t('socialFeed.broadcast')}</span><span className="md:hidden">{t('socialFeed.send')}</span></>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Feed Stream */}
            <div className="pb-24 px-1">
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
                            className={`p-3 md:p-5 rounded-2xl border transition-all group relative mb-3 ${isSpace ? 'bg-white/5 border-white/10 hover:bg-white/[0.07]' : 'bg-gray-50/80 border-uv-border/50 hover:bg-gray-100/80'}`}
                        >
                             {/* Repost Indicator */}
                             {post.reposter_id && (
                                <div className="mb-1 flex items-center gap-1.5 text-[7px] md:text-[10px] font-black text-green-600 uppercase tracking-widest pl-9 md:pl-16">
                                    <FiRepeat size={9} /> {post.reposter_id === user?.userId ? t('socialFeed.you') : post.reposter_name} {t('socialFeed.boosted')}
                                </div>
                             )}
  
                            <div className="flex gap-2 md:gap-4">
                                <div 
                                    onClick={() => navigate(`/profile/${post.user_id}`)}
                                    className="w-8 h-8 md:w-12 md:h-12 rounded-xl flex items-center justify-center font-black text-primary border border-primary/20 overflow-hidden cursor-pointer text-xs md:text-base shrink-0 bg-primary/10"
                                >
                                    {post.avatar_url ? (
                                        <img src={resolveMediaUrl(post.avatar_url)} className="w-full h-full object-cover" alt="" />
                                    ) : (
                                        getInitials(post.first_name, post.last_name, post.email)
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-0.5 md:mb-1 text-xs md:text-base">
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
                                        <div className="relative shrink-0" ref={openMenu === rowIndex ? menuRef : undefined}>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === rowIndex ? null : rowIndex); }}
                                                className="text-uv-gray p-0.5 hover:bg-gray-50 rounded-lg transition-colors"
                                            >
                                                <FiMoreHorizontal size={14} />
                                            </button>
                                            
                                            {openMenu === rowIndex && (
                                                <div className={`absolute right-0 mt-2 w-48 rounded-xl shadow-xl z-20 py-2 border ${isSpace ? 'bg-[#0d0d1a] border-white/10' : 'bg-white border-uv-border'}`}>
                                                    <button 
                                                        onClick={() => handleCopyLink(post.post_id)}
                                                        className={`w-full text-left px-4 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-2 ${isSpace ? 'text-white hover:bg-white/10' : 'text-uv-black hover:bg-gray-50'}`}
                                                    >
                                                        <FiSend size={14} /> {t('socialFeed.copyLink')}
                                                    </button>
                                                    {(post.user_id === user?.userId || post.reposter_id === user?.userId) && (
                                                        <button 
                                                            onClick={() => handleDeletePost(post.post_id)}
                                                            className="w-full text-left px-4 py-2 text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 flex items-center gap-2"
                                                        >
                                                            <FiTrash2 size={14} /> {t('common.delete')}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
 
                                    <p className={`font-medium leading-relaxed mb-3 text-xs md:text-[15px] break-words ${isSpace ? 'text-white' : 'text-uv-black'}`}>{post.content}</p>
 
                                    {post.image_url && (
                                        <PostAttachment
                                            path={post.image_url}
                                            className="rounded-xl border overflow-hidden mb-3 sm:mb-4 shadow-sm border-uv-border/50"
                                        />
                                    )}
 
                                    {/* Action Deck */}
                                    <div className={`flex items-center gap-6 md:gap-8 ${isSpace ? 'text-white/70' : 'text-uv-gray'}`}>
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
                                        <div
                                            className="relative ml-auto flex items-center gap-1"
                                            ref={isStaff ? (warningDropdown === rowIndex ? warningDropdownRef : undefined) : (reportDropdown === rowIndex ? reportDropdownRef : undefined)}
                                        >
                                            {isStaff ? (
                                                <>
                                                    {(post.reports_count ?? 0) > 0 && (
                                                        <span className="text-[9px] font-black text-red-500 mr-0.5">{post.reports_count}</span>
                                                    )}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setWarningDropdown(warningDropdown === rowIndex ? null : rowIndex); }}
                                                        className="p-1 text-amber-500 hover:text-amber-400 transition-colors"
                                                        title="Give warning"
                                                    >
                                                        <FiAlertTriangle size={15} />
                                                    </button>
                                                    {warningDropdown === rowIndex && (
                                                        <div className={`absolute right-0 bottom-full mb-1 w-40 py-2 rounded-xl shadow-xl z-20 border ${isSpace ? 'bg-[#0a0a14] border-amber-500/40' : 'bg-[#1a1a1a] border-amber-500/30'}`}>
                                                            <p className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-white/80">Give warning</p>
                                                            {[1, 2, 3].map((t) => (
                                                                <button key={t} onClick={() => handleGiveWarning(post.user_id, t as 1 | 2 | 3)} className="w-full text-left px-3 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/20">
                                                                    Tier {t}
                                                                </button>
                                                            ))}
                                                            <button onClick={() => handleGiveWarning(post.user_id, 4)} className="w-full text-left px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20">
                                                                Ban
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setReportDropdown(reportDropdown === rowIndex ? null : rowIndex); }}
                                                        className="p-1 text-red-500 hover:text-red-600 transition-colors"
                                                        title={post.has_reported ? t('socialFeed.reported') : t('socialFeed.report')}
                                                    >
                                                        <FiAlertTriangle size={15} />
                                                    </button>
                                                    {post.has_reported && (
                                                        <span className="text-[9px] font-black text-red-500 ml-0.5">{t('socialFeed.reported')}</span>
                                                    )}
                                                    {reportDropdown === rowIndex && (
                                                        <div className={`absolute right-0 bottom-full mb-1 w-44 py-2 rounded-xl shadow-xl z-20 border ${isSpace ? 'bg-[#0a0a14] border-red-500/40' : 'bg-[#1a1a1a] border-red-500/30'}`}>
                                                            {post.has_reported ? (
                                                                <>
                                                                    <p className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-white/80">{t('socialFeed.youReportedAs')}</p>
                                                                    <p className="px-3 py-1 text-xs font-bold capitalize text-red-400">{post.my_report_type || 'other'}</p>
                                                                    <button onClick={() => handleRemoveReport(post.post_id)} className="w-full text-left px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/20 transition-colors">
                                                                        {t('socialFeed.removeReport')}
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <p className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-white/80">{t('socialFeed.reportType')}</p>
                                                                    {REPORT_TYPES.map((type) => (
                                                                        <button key={type} onClick={() => handleReportPost(post.post_id, type)} className="w-full text-left px-3 py-2 text-xs font-bold capitalize text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors">
                                                                            {type}
                                                                        </button>
                                                                    ))}
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Inline Comments - Desktop only */}
                                    {post.showComments && (
                                        <div className="hidden md:block">
                                            <div className="mt-2 pt-2 md:mt-6 md:pt-6 border-t border-uv-border space-y-2 md:space-y-4">
                                            <div className="flex gap-2.5 sm:gap-3">
                                                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary/5 rounded-lg flex items-center justify-center text-primary font-black text-[10px] sm:text-xs shrink-0">
                                                    {user?.email[0].toUpperCase()}
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
                                                                className="w-5 h-5 md:w-7 md:h-7 bg-gray-100 rounded-md md:rounded-lg flex items-center justify-center text-uv-gray text-[8px] font-black shrink-0 cursor-pointer"
                                                            >
                                                                {comment.avatar_url ? (
                                                                    <img src={resolveMediaUrl(comment.avatar_url)} className="w-full h-full object-cover rounded-md md:rounded-lg" alt="" />
                                                                ) : (
                                                                    getInitials(comment.first_name, comment.last_name, comment.email)
                                                                )}
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
                                                <motion.div 
                                                    key={u.user_id}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    onClick={() => {
                                                        setLikeModal({ isOpen: false, postId: null, users: [] });
                                                        navigate(`/profile/${u.user_id}`);
                                                    }}
                                                    className="flex items-center gap-5 p-4 bg-uv-border/5 hover:bg-primary/[0.05] rounded-[1.8rem] transition-all cursor-pointer group border border-transparent hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5"
                                                >
                                                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-2xl flex items-center justify-center font-black text-xl sm:text-2xl text-primary border-2 border-uv-border group-hover:border-primary/50 group-hover:scale-105 transition-all shadow-sm shrink-0 overflow-hidden relative">
                                                        <span className="relative z-10">{u.first_name?.[0].toUpperCase() || u.email[0].toUpperCase()}</span>
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
                                                            <span className="text-[10px] sm:text-xs font-black text-primary/70 uppercase tracking-widest truncate">@{u.email.split('@')[0]}</span>
                                                            <span className="w-1 h-1 bg-uv-gray/30 rounded-full" />
                                                            <span className="text-[9px] sm:text-[10px] font-bold text-uv-gray uppercase tracking-tighter">Campus Node verified</span>
                                                        </div>
                                                    </div>
                                                    <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-uv-black text-white rounded-2xl opacity-0 translate-x-8 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500 shadow-2xl shrink-0">
                                                        <FiUser size={18} />
                                                    </div>
                                                </motion.div>
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
                                                <div className="w-8 h-8 bg-primary/5 rounded-lg flex items-center justify-center text-primary font-black text-xs shrink-0">
                                                    {comment.avatar_url ? (
                                                        <img src={resolveMediaUrl(comment.avatar_url)} className="w-full h-full object-cover rounded-lg" alt="" />
                                                    ) : (
                                                        getInitials(comment.first_name, comment.last_name, comment.email)
                                                    )}
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
