/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiHeart, FiRepeat, FiMessageCircle, FiSend, FiUsers } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/client';
import { useNavigate } from 'react-router-dom';
import { themedAlert } from '../utils/themedDialog';
import PostAttachment from './PostAttachment';

interface Post {
  post_id: number;
  content: string;
  created_at: string;
  likes_count: number;
  reposts_count: number;
  comments_count: number;
  has_liked: boolean;
  has_reposted: boolean;
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar_url?: string;
  user_id?: number;
  image_url?: string;
}

interface Props {
  post: Post;
  onClose: () => void;
  onUpdate?: (updated: Post) => void;
}

/** Liked-by list modal */
const LikersModal = ({ postId, onClose }: { postId: number; onClose: () => void }) => {
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';
  const navigate = useNavigate();
  const [likers, setLikers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/social/posts/${postId}/likes`).then(r => setLikers(r.data || [])).catch(() => {}).finally(() => setLoading(false));
  }, [postId]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`w-full max-w-sm rounded-2xl border overflow-hidden shadow-2xl ${isSpace ? 'bg-[#0d0d1a] border-white/10' : 'bg-white border-gray-100'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isSpace ? 'border-white/10' : 'border-gray-100'}`}>
          <div className="flex items-center gap-2">
            <FiUsers size={16} className="text-primary" />
            <span className={`font-black text-sm ${isSpace ? 'text-white' : 'text-uv-black'}`}>Liked by</span>
          </div>
          <button onClick={onClose} className={`p-1.5 rounded-xl hover:bg-white/10 transition-colors ${isSpace ? 'text-white/60' : 'text-uv-gray'}`}>
            <FiX size={16} />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
          ) : likers.length === 0 ? (
            <p className={`text-center py-10 text-xs font-bold ${isSpace ? 'text-white/30' : 'text-uv-gray'}`}>No likes yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {likers.map((u: any) => (
                <button
                  key={u.user_id}
                  onClick={() => { navigate(`/profile/${u.user_id}`); onClose(); }}
                  className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${isSpace ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-black text-primary overflow-hidden shrink-0">
                    {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" alt="" /> : (u.first_name || u.email || '?')[0].toUpperCase()}
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

/** Full post detail modal with comments */
const PostDetailModal = ({ post: initialPost, onClose, onUpdate }: Props) => {
  const { user } = useAuth();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';
  const navigate = useNavigate();

  const [post, setPost] = useState(initialPost);
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showLikers, setShowLikers] = useState(!!(initialPost as any)._openLikers);
  const commentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get(`/social/posts/${post.post_id}/comments`).then(r => setComments(r.data || [])).catch(() => {}).finally(() => setCommentsLoading(false));
  }, [post.post_id]);

  const handleLike = async () => {
    try {
      const prev = post.has_liked;
      const n = Number(post.likes_count) || 0;
      const newPost = { ...post, has_liked: !prev, likes_count: prev ? n - 1 : n + 1 };
      setPost(newPost);
      onUpdate?.(newPost);
      await api.post(`/social/posts/${post.post_id}/like`);
    } catch {
      setPost(post); // revert
    }
  };

  const handleRepost = async () => {
    try {
      const prev = post.has_reposted;
      const n = Number(post.reposts_count) || 0;
      const newPost = { ...post, has_reposted: !prev, reposts_count: prev ? n - 1 : n + 1 };
      setPost(newPost);
      onUpdate?.(newPost);
      await api.post(`/social/posts/${post.post_id}/repost`);
    } catch {
      setPost(post);
    }
  };

  const handleAddComment = async () => {
    const text = newComment.trim();
    if (!text) return;
    setSubmitting(true);
    try {
      await api.post(`/social/posts/${post.post_id}/comments`, { content: text });
      const newPost = { ...post, comments_count: post.comments_count + 1 };
      setPost(newPost);
      onUpdate?.(newPost);
      setComments(prev => [{
        comment_id: Date.now(),
        content: text,
        created_at: new Date().toISOString(),
        first_name: user?.profile?.student_name || user?.profile?.staff_name || '',
        last_name: user?.profile?.student_surname || user?.profile?.staff_surname || '',
        email: user?.email || '',
        avatar_url: user?.profile?.avatar_url || null,
        user_id: user?.userId,
      }, ...prev]);
      setNewComment('');
    } catch {
      await themedAlert('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const bg = isSpace ? 'bg-[#0d0d1a]' : 'bg-white';
  const border = isSpace ? 'border-white/10' : 'border-gray-100';
  const text = isSpace ? 'text-white' : 'text-uv-black';
  const muted = isSpace ? 'text-white/50' : 'text-uv-gray';

  return (
    <>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 24 }}
          transition={{ type: 'spring', damping: 28, stiffness: 340 }}
          className={`w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${bg} ${border}`}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-5 py-4 border-b ${border} shrink-0`}>
            <span className={`font-black text-sm uppercase tracking-widest ${text}`}>Post</span>
            <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${isSpace ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-100 text-uv-gray'}`}>
              <FiX size={16} />
            </button>
          </div>

          {/* Post Content */}
          <div className={`px-5 py-5 border-b ${border} shrink-0`}>
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => { navigate(`/profile/${post.user_id}`); onClose(); }}
                className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-sm text-primary border border-primary/10 overflow-hidden shrink-0"
              >
                {post.avatar_url ? <img src={post.avatar_url} className="w-full h-full object-cover" alt="" /> : (post.first_name || '?')[0].toUpperCase()}
              </button>
              <div>
                <button onClick={() => { navigate(`/profile/${post.user_id}`); onClose(); }} className={`font-black text-sm hover:underline ${text}`}>
                  {post.first_name} {post.last_name}
                </button>
                <p className={`text-[10px] ${muted}`}>{new Date(post.created_at).toLocaleString()}</p>
              </div>
            </div>
            <p className={`text-base leading-relaxed ${text}`}>{post.content}</p>
            {post.image_url && (
              <PostAttachment
                path={post.image_url}
                className="mt-3"
                mediaClassName="rounded-xl w-full max-h-72 object-cover"
              />
            )}

            {/* Actions */}
            <div className={`flex items-center gap-6 mt-5 pt-4 border-t ${border}`}>
              <button onClick={() => commentInputRef.current?.focus()} className={`flex items-center gap-1.5 text-xs font-black transition-colors ${muted} hover:text-primary`}>
                <FiMessageCircle size={16} /> {post.comments_count}
              </button>
              <button onClick={handleRepost} className={`flex items-center gap-1.5 text-xs font-black transition-colors ${post.has_reposted ? 'text-green-500' : `${muted} hover:text-green-500`}`}>
                <FiRepeat size={16} /> {post.reposts_count}
              </button>
              {/* Likes — click count to see who liked */}
              <div className="flex items-center gap-1.5">
                <button onClick={handleLike} className={`flex items-center gap-1.5 text-xs font-black transition-colors ${post.has_liked ? 'text-pink-500' : `${muted} hover:text-pink-500`}`}>
                  <FiHeart size={16} className={post.has_liked ? 'fill-current' : ''} />
                </button>
                <button
                  onClick={() => setShowLikers(true)}
                  className={`text-xs font-black underline-offset-2 transition-colors ${post.has_liked ? 'text-pink-500' : `${muted} hover:text-pink-400`} hover:underline`}
                >
                  {post.likes_count}
                </button>
              </div>
            </div>
          </div>

          {/* Comments list */}
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4 min-h-0">
            {commentsLoading ? (
              <div className="flex justify-center py-6"><div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full" /></div>
            ) : comments.length === 0 ? (
              <p className={`text-center text-xs font-bold py-6 ${muted}`}>Be the first to comment.</p>
            ) : (
              comments.map((c: any) => (
                <div key={c.comment_id} className="flex gap-3">
                  <button onClick={() => { navigate(`/profile/${c.user_id}`); onClose(); }} className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center font-black text-xs text-primary overflow-hidden shrink-0">
                    {c.avatar_url ? <img src={c.avatar_url} className="w-full h-full object-cover" alt="" /> : (c.first_name || '?')[0].toUpperCase()}
                  </button>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <button onClick={() => { navigate(`/profile/${c.user_id}`); onClose(); }} className={`font-black text-xs hover:underline ${text}`}>{c.first_name} {c.last_name}</button>
                      <span className={`text-[9px] ${muted}`}>{new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className={`text-xs mt-0.5 ${isSpace ? 'text-white/75' : 'text-uv-black'}`}>{c.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment Input */}
          <div className={`px-5 py-4 border-t ${border} shrink-0 flex gap-3 items-center`}>
            <input
              ref={commentInputRef}
              className={`flex-1 px-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all ${isSpace ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30' : 'bg-gray-50 border-gray-200 text-uv-black'}`}
              placeholder="Add a comment..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !submitting && handleAddComment()}
            />
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim() || submitting}
              className="p-2.5 rounded-xl bg-primary text-white disabled:opacity-40 hover:bg-primary/90 transition-colors"
            >
              <FiSend size={15} />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Likers modal on top */}
      <AnimatePresence>
        {showLikers && <LikersModal postId={post.post_id} onClose={() => setShowLikers(false)} />}
      </AnimatePresence>
    </>
  );
};

export default PostDetailModal;
