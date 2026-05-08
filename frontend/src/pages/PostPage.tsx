/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiArrowLeft, FiHeart, FiRepeat, FiMessageCircle, FiSend,
  FiMoreHorizontal, FiTrash2, FiLink, FiUsers, FiX,
} from 'react-icons/fi';
import api from '../api/client';
import { useAuth, isAcademic } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { FeedAvatarImage } from '../components/FeedAvatarImage';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';
import PostAttachment from '../components/PostAttachment';
import AdminModerationMenu from '../components/AdminModerationMenu';
import { themedAlert, themedConfirm } from '../utils/themedDialog';

/* ── Types ───────────────────────────────────────────────────── */
interface Post {
  post_id: number; user_id: number; content: string; created_at: string;
  image_url?: string | null; likes_count: number; reposts_count: number;
  comments_count: number; has_liked: boolean; has_reposted: boolean;
  first_name?: string; last_name?: string; email?: string; avatar_url?: string | null;
  reposter_id?: number; reposter_name?: string;
}
interface Comment {
  comment_id: number; user_id: number; content: string; created_at: string;
  first_name?: string; last_name?: string; email?: string; avatar_url?: string | null;
}

function mapPost(raw: any): Post {
  return {
    post_id: Number(raw.post_id), user_id: Number(raw.user_id),
    content: String(raw.content ?? ''), created_at: String(raw.created_at ?? ''),
    image_url: raw.image_url ?? null,
    likes_count: Number(raw.likes_count) || 0,
    reposts_count: Number(raw.reposts_count) || 0,
    comments_count: Number(raw.comments_count) || 0,
    has_liked: Boolean(raw.has_liked), has_reposted: Boolean(raw.has_reposted),
    first_name: raw.first_name ?? undefined, last_name: raw.last_name ?? undefined,
    email: raw.email ?? undefined,
    avatar_url: raw.avatar_url ?? null,
    reposter_id: raw.reposter_id ?? undefined,
    reposter_name: raw.reposter_name ?? undefined,
  };
}

/* ── Likers Modal ────────────────────────────────────────────── */
const LikersModal = ({ postId, onClose }: { postId: number; onClose: () => void }) => {
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';
  const navigate = useNavigate();
  const [likers, setLikers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/social/posts/${postId}/likes`)
      .then(r => setLikers(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [postId]);

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-2xl ${
        isSpace ? 'bg-black/40' : 'bg-black/20'
      }`}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`w-full max-w-sm overflow-hidden rounded-2xl border shadow-[0_8px_32px_-12px_rgba(0,0,0,0.55)] ${
          isSpace
            ? 'border-white/10 bg-[#0d0d1a]/90 backdrop-blur-xl'
            : 'border-uv-border/60 bg-white/75 backdrop-blur-xl'
        }`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isSpace ? 'border-white/10' : 'border-gray-100'}`}>
          <div className="flex items-center gap-2">
            <FiUsers size={16} className="text-primary" />
            <span className={`font-black text-sm ${isSpace ? 'text-white' : 'text-uv-black'}`}>Liked by</span>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-xl transition-colors ${isSpace ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-uv-gray'}`}>
            <FiX size={16} />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : likers.length === 0 ? (
            <p className={`text-center py-10 text-xs font-bold ${isSpace ? 'text-white/30' : 'text-uv-gray'}`}>No likes yet.</p>
          ) : (
            <div className={`divide-y ${isSpace ? 'divide-white/10' : 'divide-gray-100'}`}>
              {likers.map((u: any) => (
                <button
                  key={u.user_id}
                  onClick={() => { navigate(`/profile/${u.user_id}`); onClose(); }}
                  className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${isSpace ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-black shrink-0 overflow-hidden">
                    <FeedAvatarImage
                      src={resolveMediaUrl(u.avatar_url) || undefined}
                      initials={[u.first_name?.[0], u.last_name?.[0]].filter(Boolean).join('').toUpperCase() || (u.email?.[0] || '?').toUpperCase()}
                      className="text-xs text-primary"
                      imgClassName="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className={`font-black text-xs truncate ${isSpace ? 'text-white' : 'text-uv-black'}`}>{u.first_name} {u.last_name}</p>
                    <p className={`text-[10px] truncate ${isSpace ? 'text-white/40' : 'text-uv-gray'}`}>@{u.email?.split('@')[0]}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

/* ── PostPage ────────────────────────────────────────────────── */
const PostPage = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [postLoading, setPostLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [error, setError] = useState('');
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showLikers, setShowLikers] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);

  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const bg = isSpace ? 'bg-[#050510]' : 'premium-blur';
  const border = isSpace ? 'border-white/10' : 'border-uv-border/60';
  const text = isSpace ? 'text-white' : 'text-uv-black';
  const muted = isSpace ? 'text-white/45' : 'text-uv-gray';

  const headerBar = isSpace
    ? 'border-b border-white/10 bg-[#0a0a1a]/85 backdrop-blur-md'
    : 'premium-blur border-b border-uv-border';
  const postCardShell = isSpace
    ? 'mx-3 mt-3 rounded-2xl border border-white/15 bg-white/[0.07] px-4 pb-4 pt-5 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.55)]'
    : 'mx-3 mt-3 rounded-2xl border border-uv-border/60 bg-gray-50/90 px-4 pb-4 pt-5 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.12)]';
  const threadShell = isSpace
    ? 'mx-3 mt-3 mb-8 flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_8px_32px_-12px_rgba(0,0,0,0.35)]'
    : 'mx-3 mt-3 mb-8 flex flex-col overflow-hidden rounded-2xl border border-uv-border/60 bg-gray-50/90 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.1)]';

  /* close menu on outside click */
  useEffect(() => {
    if (!openMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenu]);

  const fetchPost = useCallback(async () => {
    const id = parseInt(String(postId), 10);
    if (Number.isNaN(id)) { setError('invalid'); setPostLoading(false); return; }
    setPostLoading(true);
    try {
      const res = await api.get(`/social/posts/${id}`);
      setPost(mapPost(res.data));
    } catch {
      setError('notfound');
    } finally {
      setPostLoading(false);
    }
  }, [postId]);

  const fetchComments = useCallback(async () => {
    const id = parseInt(String(postId), 10);
    if (Number.isNaN(id)) return;
    setCommentsLoading(true);
    try {
      const res = await api.get(`/social/posts/${id}/comments`);
      setComments(res.data || []);
    } catch {
      /* keep existing comments on failure */
    } finally {
      setCommentsLoading(false);
    }
  }, [postId]);

  useEffect(() => { fetchPost(); fetchComments(); }, [fetchPost, fetchComments]);

  const handleLike = async () => {
    if (!post) return;
    const prev = post.has_liked;
    const n = Number(post.likes_count) || 0;
    setPost({ ...post, has_liked: !prev, likes_count: prev ? n - 1 : n + 1 });
    try { await api.post(`/social/posts/${post.post_id}/like`); }
    catch { setPost(post); }
  };

  const handleRepost = async () => {
    if (!post) return;
    const prev = post.has_reposted;
    const n = Number(post.reposts_count) || 0;
    setPost({ ...post, has_reposted: !prev, reposts_count: prev ? n - 1 : n + 1 });
    try { await api.post(`/social/posts/${post.post_id}/repost`); }
    catch { setPost(post); }
  };

  const handleAddComment = async () => {
    if (!post || !newComment.trim() || submitting) return;
    const text = newComment.trim();
    setSubmitting(true);
    try {
      await api.post(`/social/posts/${post.post_id}/comments`, { content: text });
      setPost({ ...post, comments_count: post.comments_count + 1 });
      setComments(prev => [{
        comment_id: Date.now(),
        content: text,
        created_at: new Date().toISOString(),
        first_name: String(user?.profile?.student_name || user?.profile?.staff_name || ''),
        last_name: String(user?.profile?.student_surname || user?.profile?.staff_surname || ''),
        email: String(user?.email || ''),
        avatar_url: user?.profile?.avatar_url ? String(user.profile.avatar_url) : null,
        user_id: user?.userId ?? 0,
      }, ...prev]);
      setNewComment('');
    } catch {
      await themedAlert('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post) return;
    if (!(await themedConfirm(t('profile.deletePostConfirm')))) return;
    try {
      await api.delete(`/social/posts/${post.post_id}`);
      navigate(-1);
    } catch {
      await themedAlert('Failed to delete post');
    }
  };

  const formatFullDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' +
      d.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  /* ── Loading ── */
  if (postLoading) return (
    <div className={`min-h-screen flex items-center justify-center ${bg}`}>
      <div className="w-9 h-9 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !post) return (
    <div className={`min-h-screen flex flex-col items-center justify-center gap-4 p-6 ${bg}`}>
      <p className={`font-black text-sm uppercase tracking-widest ${muted}`}>{t('postPage.notFound')}</p>
      <button type="button" onClick={() => navigate(-1)} className="uv-button text-xs">{t('postPage.backToHub')}</button>
    </div>
  );

  return (
    <div className={`flex min-h-screen flex-col ${bg}`}>
      {/* ── Header ── */}
      <div className={`sticky top-0 z-30 flex items-center gap-4 px-4 py-3 ${headerBar}`}>
        <button
          onClick={() => navigate(-1)}
          className={`p-2 rounded-full transition-colors ${isSpace ? 'hover:bg-white/10 text-white' : 'hover:bg-gray-100 text-uv-black'}`}
        >
          <FiArrowLeft size={20} />
        </button>
        <span className={`font-black text-base ${text}`}>Gönderi</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col pb-24">
      {/* ── Post ── */}
      <div className={postCardShell}>
        {/* Repost indicator */}
        {post.reposter_id && (
          <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest mb-3 ${isSpace ? 'text-green-400' : 'text-green-600'}`}>
            <FiRepeat size={11} />
            {post.reposter_id === user?.userId ? t('socialFeed.you') : post.reposter_name} {t('socialFeed.boosted')}
          </div>
        )}

        {/* Author row */}
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(`/profile/${post.user_id}`)} className="w-11 h-11 rounded-full bg-primary/10 overflow-hidden shrink-0 border border-primary/10">
            <FeedAvatarImage
              src={resolveMediaUrl(post.avatar_url) || undefined}
              initials={[post.first_name?.[0], post.last_name?.[0]].filter(Boolean).join('').toUpperCase() || (post.email?.[0] || '?').toUpperCase()}
              className="text-sm font-black text-primary"
              imgClassName="w-full h-full object-cover"
            />
          </button>
          <div className="flex-1 min-w-0">
            <button onClick={() => navigate(`/profile/${post.user_id}`)} className={`font-black text-sm hover:underline ${text}`}>
              {post.first_name} {post.last_name}
            </button>
            <p className={`text-[11px] ${muted}`}>@{post.email?.split('@')[0]}</p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOpenMenu(v => !v)}
              className={`p-2 rounded-full transition-colors ${isSpace ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-uv-gray'}`}
            >
              <FiMoreHorizontal size={18} />
            </button>
            <AnimatePresence>
              {openMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className={`absolute right-0 mt-2 w-44 rounded-xl border py-1.5 shadow-xl z-20 ${isSpace ? 'bg-[#0d0d1a] border-white/10' : 'bg-white border-gray-100'}`}
                >
                  <button
                    onClick={() => { navigator.clipboard.writeText(window.location.href); setOpenMenu(false); }}
                    className={`w-full text-left px-4 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-2 ${isSpace ? 'text-white hover:bg-white/10' : 'text-uv-black hover:bg-gray-50'}`}
                  >
                    <FiLink size={13} /> Linki Kopyala
                  </button>
                  {post.user_id === user?.userId && (
                    <button
                      onClick={handleDeletePost}
                      className={`flex w-full items-center gap-2 px-4 py-2 text-left text-xs font-black uppercase tracking-widest ${
                        isSpace ? 'text-red-400 hover:bg-red-500/15' : 'text-red-500 hover:bg-red-50'
                      }`}
                    >
                      <FiTrash2 size={13} /> {t('common.delete')}
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </div>
        </div>

        {/* Content */}
        <p className={`text-[17px] leading-relaxed mb-4 ${text}`}>{post.content}</p>

        {/* Image */}
        {post.image_url && (
          <PostAttachment
            path={post.image_url}
            className={`mb-4 overflow-hidden rounded-2xl border ${isSpace ? 'border-white/10' : 'border-uv-border/60'}`}
            mediaClassName="w-full max-h-[500px] object-cover"
          />
        )}

        {/* Full timestamp */}
        <p className={`text-[13px] mb-4 ${muted}`}>{formatFullDate(post.created_at)}</p>

        {/* Stats row */}
        {(post.reposts_count > 0 || post.likes_count > 0) && (
          <div className={`flex items-center gap-5 py-3 border-t border-b text-sm ${border}`}>
            {post.reposts_count > 0 && (
              <span className={`font-black ${text}`}>
                {post.reposts_count} <span className={`font-normal ${muted}`}>Repost</span>
              </span>
            )}
            {post.likes_count > 0 && (
              <button onClick={() => setShowLikers(true)} className={`font-black hover:underline ${text}`}>
                {post.likes_count} <span className={`font-normal ${muted}`}>Beğeni</span>
              </button>
            )}
          </div>
        )}

        {/* Action bar */}
        <div className={`flex w-full items-center gap-2 pt-3 border-t ${border} ${muted}`}>
          <button
            onClick={() => commentInputRef.current?.focus()}
            className={`flex items-center gap-2 flex-1 justify-center py-2 rounded-full text-sm font-black transition-colors hover:text-primary hover:bg-primary/5 ${muted}`}
          >
            <FiMessageCircle size={20} />
          </button>
          <button
            onClick={handleRepost}
            className={`flex items-center gap-2 flex-1 justify-center py-2 rounded-full text-sm font-black transition-colors ${post.has_reposted ? 'text-green-500' : `${muted} hover:text-green-500 hover:bg-green-500/5`}`}
          >
            <FiRepeat size={20} />
          </button>
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 flex-1 justify-center py-2 rounded-full text-sm font-black transition-colors ${post.has_liked ? 'text-pink-500' : `${muted} hover:text-pink-500 hover:bg-pink-500/5`}`}
          >
            <FiHeart size={20} className={post.has_liked ? 'fill-current' : ''} />
          </button>
          {user && isAcademic(user.role) && post.user_id !== user.userId ? (
            <div className="ml-auto flex shrink-0">
              <AdminModerationMenu
                visible
                variant="post"
                onDelete={async () => {
                  try {
                    await api.delete(`/social/posts/${post.post_id}`);
                    navigate(-1);
                  } catch {
                    await themedAlert('Failed to delete post');
                  }
                }}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className={threadShell}>
      {/* ── Comment Input ── */}
      <div className={`flex items-start gap-3 border-b px-3 py-3 ${isSpace ? 'border-white/10' : 'border-gray-100'}`}>
        <div className="w-9 h-9 rounded-full bg-primary/10 overflow-hidden shrink-0 mt-0.5">
          <FeedAvatarImage
            src={resolveMediaUrl(String(user?.profile?.avatar_url || '')) || undefined}
            initials={String(
              (user?.profile?.student_name || user?.profile?.staff_name || user?.email || '?')
            )
              .trim()[0]
              ?.toUpperCase() || '?'}
            className="text-xs font-black text-primary"
            imgClassName="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <textarea
            ref={commentInputRef}
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !submitting) { e.preventDefault(); handleAddComment(); } }}
            placeholder="Yanıtını yaz..."
            rows={1}
            className={`w-full resize-none bg-transparent text-[15px] outline-none placeholder:${muted} ${text} min-h-[36px] py-1`}
            style={{ fieldSizing: 'content' } as any}
          />
        </div>
        <button
          onClick={handleAddComment}
          disabled={!newComment.trim() || submitting}
          className="shrink-0 mt-0.5 px-4 py-1.5 rounded-full bg-primary text-white text-sm font-black disabled:opacity-40 hover:bg-primary/90 transition-colors"
        >
          <FiSend size={14} />
        </button>
      </div>

      {/* ── Comments ── */}
      <div className="flex-1">
        {commentsLoading ? (
          <div className="space-y-0">
            {[1, 2, 3].map(i => (
              <div key={i} className={`px-4 py-4 border-b ${border} animate-pulse`}>
                <div className="flex gap-3">
                  <div className={`w-9 h-9 rounded-full shrink-0 ${isSpace ? 'bg-white/10' : 'bg-gray-100'}`} />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className={`h-2.5 rounded-full w-1/3 ${isSpace ? 'bg-white/10' : 'bg-gray-100'}`} />
                    <div className={`h-2.5 rounded-full w-3/4 ${isSpace ? 'bg-white/10' : 'bg-gray-100'}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className={`px-4 py-14 text-center text-sm font-bold ${muted}`}>
            Henüz yorum yok. İlk yorumu sen yaz!
          </div>
        ) : (
          comments.map(c => (
            <div key={c.comment_id} className={`flex gap-3 px-4 py-4 border-b ${border} transition-colors ${isSpace ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50/60'}`}>
              <button onClick={() => navigate(`/profile/${c.user_id}`)} className="w-9 h-9 rounded-full bg-primary/10 overflow-hidden shrink-0">
                <FeedAvatarImage
                  src={resolveMediaUrl(c.avatar_url) || undefined}
                  initials={[c.first_name?.[0], c.last_name?.[0]].filter(Boolean).join('').toUpperCase() || (c.email?.[0] || '?').toUpperCase()}
                  className="text-xs font-black text-primary"
                  imgClassName="w-full h-full object-cover"
                />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 flex-wrap mb-0.5">
                  <button onClick={() => navigate(`/profile/${c.user_id}`)} className={`font-black text-sm hover:underline ${text}`}>
                    {c.first_name} {c.last_name}
                  </button>
                  <span className={`text-[11px] ${muted}`}>@{c.email?.split('@')[0]}</span>
                  <span className={`text-[11px] ${muted}`}>·</span>
                  <span className={`text-[11px] ${muted}`}>{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <p className={`text-[15px] leading-relaxed ${text}`}>{c.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
      </div>
      </div>

      {/* Likers modal */}
      <AnimatePresence>
        {showLikers && <LikersModal postId={post.post_id} onClose={() => setShowLikers(false)} />}
      </AnimatePresence>
    </div>
  );
};

export default PostPage;
