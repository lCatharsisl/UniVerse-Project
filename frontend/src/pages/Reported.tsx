import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, isAcademic } from '../context/AuthContext';
import api from '../api/client';
import { FiAlertTriangle, FiTrash2, FiChevronDown, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { themedAlert, themedConfirm } from '../utils/themedDialog';

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

const Reported = () => {
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
    setTimeout(() => { ignoreNextTriggerRef.current = false; }, 150);
  };
  const REPORT_TYPE_OPTIONS = [
    { value: '', label: 'All types' },
    { value: 'spam', label: 'Spam' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'inappropriate', label: 'Inappropriate' },
    { value: 'other', label: 'Other' },
  ];

  const loadReported = async () => {
    if (!isStaff) return;
    setLoading(true);
    try {
      const [postsRes, usersRes] = await Promise.all([
        api.get('/social/reported/posts', { params: reportTypePosts ? { reportType: reportTypePosts } : {} }),
        api.get('/social/reported/users', { params: reportTypeUsers ? { reportType: reportTypeUsers } : {} }),
      ]);
      setReportedPosts(postsRes.data || []);
      const usersData = usersRes.data || [];
      setReportedUsers(usersData.map((u: any) => ({ ...u, userId: u.userId ?? u.user_id, avatarUrl: u.avatarUrl ?? u.avatar_url })));
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
    if (!(await themedConfirm('Are you sure you want to delete this post?'))) return;
    try {
      await api.delete(`/social/posts/${postId}`);
      setReportedPosts((prev) => prev.filter((p) => p.post_id !== postId));
    } catch (err) {
      await themedAlert('Failed to delete post');
    }
  };

  const handleShowReporters = async (type: 'post' | 'user', id: number) => {
    setLoadingReporters(true);
    setReportersModal({ type, id, list: [] });
    try {
      const endpoint = type === 'post' ? `/social/posts/${id}/reporters` : `/social/users/${id}/reporters`;
      const res = await api.get(endpoint);
      setReportersModal((prev) => (prev ? { ...prev, list: res.data || [] } : null));
    } catch (err) {
      setReportersModal(null);
    } finally {
      setLoadingReporters(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const formatPostDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase();

  if (!user) return null;
  if (!isStaff) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center p-6">
        <FiAlertTriangle className="text-red-500 w-12 h-12 mb-4" />
        <h2 className="text-xl font-black text-uv-black dark:text-white mb-2">Access restricted</h2>
        <p className="text-uv-gray text-sm text-center">Only academic staff can view reported content.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen ${isSpace ? 'bg-[#050510]' : 'bg-white'}`}>
      <div className="sticky top-0 premium-blur border-b border-uv-border z-20 px-4 md:px-8 py-4">
        <div className="max-w-[1600px] mx-auto w-full">
          <h2 className={`text-sm md:text-2xl font-black tracking-tighter leading-none ${isSpace ? 'text-white' : 'text-uv-black'}`}>
            Reported
          </h2>
          <p className="text-[8px] md:text-[10px] font-black text-red-500 uppercase tracking-widest mt-0.5">
            Moderation
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="max-w-[1600px] mx-auto w-full px-4 md:px-8 lg:px-10 py-6 flex-1">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 xl:gap-10">
            {/* Reported posts */}
            <div className={`rounded-2xl border p-5 md:p-6 min-w-0 flex flex-col ${isSpace ? 'bg-[#0d0d1a] border-white/10' : 'bg-white border-uv-border shadow-sm'}`}>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 min-w-0">
                <h3 className={`text-sm font-black uppercase tracking-widest shrink-0 ${isSpace ? 'text-white' : 'text-uv-black'}`}>
                  Reported posts
                </h3>
                <div className="relative w-full sm:w-auto min-w-[200px] max-w-[220px] shrink-0" ref={filterPostsRef}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleFilterTrigger('posts'); }}
                    className={`w-full flex items-center justify-between gap-2 text-xs font-bold rounded-lg px-3 py-2.5 border-2 cursor-pointer outline-none focus:ring-2 focus:ring-red-500/50 ${isSpace ? 'bg-[#1a1a2e] border-red-500/70 text-white hover:bg-[#252540]' : 'bg-gray-50 border-uv-border text-uv-black hover:bg-gray-100'}`}
                  >
                    <span className="truncate">{REPORT_TYPE_OPTIONS.find(o => o.value === reportTypePosts)?.label || 'All types'}</span>
                    <FiChevronDown className={`w-4 h-4 shrink-0 transition-transform ${openFilter === 'posts' ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {openFilter === 'posts' && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute top-full left-0 mt-1 z-50 rounded-lg border-2 shadow-xl py-1 min-w-[200px] w-full box-border ${isSpace ? 'bg-[#1a1a2e] border-red-500/70' : 'bg-white border-uv-border'}`}
                      >
                        {REPORT_TYPE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value || 'all'}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleFilterSelect('posts', opt.value); }}
                            className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors whitespace-nowrap ${isSpace ? 'text-white hover:bg-red-500/20' : 'text-uv-black hover:bg-gray-100'}`}
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
              <p className={`text-xs font-bold uppercase tracking-widest ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>
                No reported posts
              </p>
            ) : (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                {reportedPosts.map((post) => (
                  <div
                    key={post.post_id}
                    className={`rounded-2xl border p-3 md:p-5 transition-all ${isSpace ? 'bg-white/5 border-white/10 hover:bg-white/[0.07]' : 'bg-gray-50/80 border-uv-border/50 hover:bg-gray-100/80'}`}
                  >
                    <div className="flex gap-2 md:gap-4">
                      <button
                        onClick={() => navigate(`/profile/${post.user_id}`)}
                        className={`w-8 h-8 md:w-12 md:h-12 rounded-xl flex items-center justify-center font-black text-primary border shrink-0 cursor-pointer bg-primary/10 border-primary/20 ${isSpace ? 'text-white border-white/20' : ''}`}
                      >
                        {(post.email || '?')[0].toUpperCase()}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-0.5 md:mb-1">
                          <div className="flex flex-wrap items-baseline gap-x-1.5 md:gap-x-2 min-w-0">
                            <span
                              onClick={() => navigate(`/profile/${post.user_id}`)}
                              className={`font-black hover:text-primary transition-colors cursor-pointer text-sm md:text-base break-words ${isSpace ? 'text-white' : 'text-uv-black'}`}
                            >
                              {post.first_name} {post.last_name}
                            </span>
                            <span className={`text-[8px] md:text-[10px] font-bold uppercase tracking-tighter break-all ${isSpace ? 'text-white/60' : 'text-uv-gray'}`}>
                              @{(post.email || '').split('@')[0]}
                            </span>
                            <span className={isSpace ? 'text-white/40' : 'text-uv-gray'}>·</span>
                            <span className={`text-[8px] md:text-[10px] font-bold uppercase ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>
                              {formatPostDate(post.created_at)}
                            </span>
                          </div>
                          <span className="text-[10px] font-black text-red-500 shrink-0">{post.reports_count} reports</span>
                        </div>
                        <p className={`font-medium leading-relaxed mb-3 text-xs md:text-[15px] break-words ${isSpace ? 'text-white' : 'text-uv-black'}`}>
                          {post.content}
                        </p>
                        {post.image_url && (
                          <div className="rounded-xl border overflow-hidden mb-3 md:mb-4 shadow-sm border-uv-border/50">
                            <img
                              src={`http://localhost:3000${post.image_url}`}
                              alt=""
                              className="max-h-48 md:max-h-80 w-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-3 md:gap-4 pt-1">
                          <button
                            onClick={() => handleShowReporters('post', post.post_id)}
                            className="text-[10px] md:text-xs font-black uppercase tracking-widest text-red-500 hover:underline"
                          >
                            View reporters
                          </button>
                          <button
                            onClick={() => navigate(`/profile/${post.user_id}`)}
                            className="text-[10px] md:text-xs font-black uppercase tracking-widest text-primary hover:underline"
                          >
                            Go to profile
                          </button>
                          <button
                            onClick={() => handleDeletePost(post.post_id)}
                            className="text-[10px] md:text-xs font-black uppercase tracking-widest text-red-500 hover:underline flex items-center gap-1"
                          >
                            <FiTrash2 size={10} /> Delete post
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>

            {/* Reported users */}
            <div className={`rounded-2xl border p-5 md:p-6 min-w-0 flex flex-col ${isSpace ? 'bg-[#0d0d1a] border-white/10' : 'bg-white border-uv-border shadow-sm'}`}>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 min-w-0">
                <h3 className={`text-sm font-black uppercase tracking-widest shrink-0 ${isSpace ? 'text-white' : 'text-uv-black'}`}>
                  Reported users
                </h3>
                <div className="relative w-full sm:w-auto min-w-[200px] max-w-[220px] shrink-0" ref={filterUsersRef}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleFilterTrigger('users'); }}
                    className={`w-full flex items-center justify-between gap-2 text-xs font-bold rounded-lg px-3 py-2.5 border-2 cursor-pointer outline-none focus:ring-2 focus:ring-red-500/50 ${isSpace ? 'bg-[#1a1a2e] border-red-500/70 text-white hover:bg-[#252540]' : 'bg-gray-50 border-uv-border text-uv-black hover:bg-gray-100'}`}
                  >
                    <span className="truncate">{REPORT_TYPE_OPTIONS.find(o => o.value === reportTypeUsers)?.label || 'All types'}</span>
                    <FiChevronDown className={`w-4 h-4 shrink-0 transition-transform ${openFilter === 'users' ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {openFilter === 'users' && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute top-full left-0 mt-1 z-50 rounded-lg border-2 shadow-xl py-1 min-w-[200px] w-full box-border ${isSpace ? 'bg-[#1a1a2e] border-red-500/70' : 'bg-white border-uv-border'}`}
                      >
                        {REPORT_TYPE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value || 'all-u'}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); handleFilterSelect('users', opt.value); }}
                            className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors whitespace-nowrap ${isSpace ? 'text-white hover:bg-red-500/20' : 'text-uv-black hover:bg-gray-100'}`}
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
              <p className={`text-xs font-bold uppercase tracking-widest ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>
                No reported users
              </p>
            ) : (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                {reportedUsers.map((u) => (
                  <div
                    key={u.userId}
                    className={`rounded-2xl border p-3 md:p-5 transition-all ${isSpace ? 'bg-white/5 border-white/10 hover:bg-white/[0.07]' : 'bg-gray-50/80 border-uv-border/50 hover:bg-gray-100/80'}`}
                  >
                    <div className="flex gap-2 md:gap-4">
                      <button
                        onClick={() => navigate(`/profile/${u.userId}`)}
                        className={`w-8 h-8 md:w-12 md:h-12 rounded-xl flex items-center justify-center font-black text-primary border shrink-0 cursor-pointer overflow-hidden bg-primary/10 border-primary/20 ${isSpace ? 'text-white border-white/20' : ''}`}
                      >
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl.startsWith('http') ? u.avatarUrl : `http://localhost:3000${u.avatarUrl}`} alt="" className="w-full h-full object-cover" />
                        ) : (
                          ((u.name || u.surname || u.email || '?')[0] || '?').toUpperCase()
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 mb-0.5 md:mb-1">
                          <div className="flex flex-wrap items-baseline gap-x-1.5 md:gap-x-2 min-w-0">
                            <span
                              onClick={() => navigate(`/profile/${u.userId}`)}
                              className={`font-black hover:text-primary transition-colors cursor-pointer text-sm md:text-base break-words ${isSpace ? 'text-white' : 'text-uv-black'}`}
                            >
                              {u.name} {u.surname}
                            </span>
                            <span className={`text-[8px] md:text-[10px] font-bold uppercase tracking-tighter break-all ${isSpace ? 'text-white/60' : 'text-uv-gray'}`}>
                              @{(u.email || '').split('@')[0]}
                            </span>
                          </div>
                          <span className="text-[10px] font-black text-red-500 shrink-0">{u.reports_count} reports</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 md:gap-4 pt-1">
                          <button
                            onClick={() => handleShowReporters('user', u.userId)}
                            className="text-[10px] md:text-xs font-black uppercase tracking-widest text-red-500 hover:underline"
                          >
                            View reporters
                          </button>
                          <button
                            onClick={() => navigate(`/profile/${u.userId}`)}
                            className="text-[10px] md:text-xs font-black uppercase tracking-widest text-primary hover:underline"
                          >
                            Go to profile
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            </div>
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
              className="relative bg-white dark:bg-[#0d0d1a] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[70vh] flex flex-col border border-uv-border dark:border-white/10"
            >
              <div className="flex items-center justify-between p-4 border-b border-uv-border dark:border-white/10">
                <h3 className="font-black uppercase tracking-widest text-uv-black dark:text-white">
                  {reportersModal.type === 'post' ? 'Post reporters' : 'User reporters'}
                </h3>
                <button onClick={() => setReportersModal(null)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10">
                  <FiX size={18} />
                </button>
              </div>
              <div className="overflow-y-auto p-4 space-y-2">
                {loadingReporters ? (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : reportersModal.list.length === 0 ? (
                  <p className="text-center text-uv-gray text-sm">No reporters</p>
                ) : (
                  reportersModal.list.map((r: any) => (
                    <button
                      key={r.user_id}
                      onClick={() => {
                        setReportersModal(null);
                        navigate(`/profile/${r.user_id}`);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 text-left"
                    >
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-sm">
                        {(r.first_name || r.email)?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-sm truncate">{r.first_name} {r.last_name}</p>
                        <p className="text-[10px] text-uv-gray truncate">@{r.email?.split('@')[0]}</p>
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
