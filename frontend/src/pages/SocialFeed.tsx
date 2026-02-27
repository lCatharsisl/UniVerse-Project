import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { FiHeart, FiRepeat, FiMessageCircle, FiImage, FiTrash2, FiMoreHorizontal, FiSend, FiNavigation } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

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
    avatar_url?: string;
    // UI state
    showComments?: boolean;
    comments?: any[];
    loadingComments?: boolean;
}

const SocialFeed = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [content, setContent] = useState('');
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [newComment, setNewComment] = useState<{ [key: number]: string }>({});
    const [openMenu, setOpenMenu] = useState<number | null>(null);

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            const res = await api.get('/social/posts');
            setPosts(res.data.items || []);
        } catch (err) {
            console.error('Failed to load feed', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePost = async (postId: number) => {
        if (!window.confirm('Are you sure you want to delete this transmission?')) return;
        try {
            await api.delete(`/social/posts/${postId}`);
            setPosts(posts.filter(p => p.post_id !== postId));
            setOpenMenu(null);
        } catch (err) {
            alert('Failed to delete post');
        }
    };

    const handleCopyLink = (postId: number) => {
        const url = `${window.location.origin}/post/${postId}`;
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
        setOpenMenu(null);
    };

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

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
        } catch (err) {
            alert('Failed to create post');
        } finally {
            setSubmitting(false);
        }
    };

    const toggleLike = async (postId: number) => {
        setPosts(posts.map(post => {
            if (post.post_id === postId) {
                const liked = !post.has_liked;
                const _count = parseInt(post.likes_count);
                return {
                    ...post,
                    has_liked: liked,
                    likes_count: String(liked ? _count + 1 : _count - 1)
                };
            }
            return post;
        }));
        try { await api.post(`/social/posts/${postId}/like`); } catch (err) { fetchPosts(); }
    };

    const toggleRepost = async (postId: number) => {
        setPosts(posts.map(post => {
            if (post.post_id === postId) {
                const reposted = !post.has_reposted;
                const _count = parseInt(post.reposts_count);
                return {
                    ...post,
                    has_reposted: reposted,
                    reposts_count: String(reposted ? _count + 1 : _count - 1)
                };
            }
            return post;
        }));
        try { 
            await api.post(`/social/posts/${postId}/repost`);
            fetchPosts();
        } catch (err) { fetchPosts(); }
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
        setPosts(posts.map(p => p.post_id === postId ? { ...p, showComments: !p.showComments } : p));
        const post = posts.find(p => p.post_id === postId);
        if (post && !post.showComments && !post.comments) {
            handleFetchComments(postId);
        }
    };

    const handleFetchComments = async (postId: number) => {
        setPosts(prev => prev.map(p => p.post_id === postId ? { ...p, loadingComments: true } : p));
        try {
            const res = await api.get(`/social/posts/${postId}/comments`);
            setPosts(prev => prev.map(p => p.post_id === postId ? { ...p, comments: res.data, loadingComments: false } : p));
        } catch (err) {
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
        } catch (err) {
            alert('Failed to add comment');
        }
    };

    return (
        <div className="flex flex-col min-h-screen">
            {/* Unique Header */}
            <div className="sticky top-0 premium-blur border-b border-uv-border z-10 px-6 py-4 flex items-center justify-between">
                <div>
                   <h2 className="text-2xl font-black tracking-tighter text-uv-black leading-none">The Hub</h2>
                   <p className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Real-time Campus Stream</p>
                </div>
                <div className="flex gap-1 p-1 bg-uv-border/50 rounded-tl-xl rounded-br-xl">
                    <button className="px-4 py-1.5 bg-white text-primary text-xs font-black uppercase tracking-widest rounded-tl-lg rounded-br-lg shadow-sm">All</button>
                    <button className="px-4 py-1.5 text-uv-gray text-xs font-black uppercase tracking-widest rounded-tl-lg rounded-br-lg hover:bg-white/50 transition-all">Circle</button>
                </div>
            </div>

            {/* UniVerse Composer */}
            <div className="p-6">
                <div className="uv-card p-5 !rounded-tl-none border-primary/20 bg-primary/5 shadow-inner">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-white rounded-tl-xl rounded-br-xl flex items-center justify-center text-primary font-black border border-primary/10 shrink-0 shadow-sm">
                            {user?.email[0].toUpperCase()}
                        </div>
                        <form onSubmit={handleCreatePost} className="flex-1">
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Broadcast to the campus..."
                                className="w-full bg-transparent border-none focus:ring-0 text-lg font-medium text-uv-black resize-none min-h-[60px] placeholder:text-primary/30"
                                disabled={submitting}
                            />
                            
                            {selectedImage && (
                                <div className="relative mb-4">
                                    <img src={URL.createObjectURL(selectedImage)} className="max-h-80 w-full object-cover rounded-2xl border-2 border-white shadow-xl" />
                                    <button type="button" onClick={() => setSelectedImage(null)} className="absolute top-2 right-2 bg-uv-black/80 text-white rounded-full p-2 hover:bg-uv-black transition-all">
                                        <FiTrash2 size={16} />
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center justify-between mt-4">
                                <label className="flex items-center gap-2 p-2 hover:bg-white/50 rounded-xl cursor-pointer transition-all text-primary">
                                    <FiImage size={24} />
                                    <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Attach Data</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setSelectedImage(e.target.files?.[0] || null)} disabled={submitting} />
                                </label>
                                <button
                                    type="submit"
                                    disabled={!content.trim() || submitting}
                                    className="uv-button !py-2 !px-8 text-sm flex items-center gap-2"
                                >
                                    {submitting ? 'Transmitting...' : <><FiSend /> BROADCAST</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            {/* Feed Stream */}
            <div className="px-6 space-y-6 pb-20">
                {loading ? (
                    <div className="p-20 text-center flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs font-black uppercase tracking-widest text-uv-gray">Syncing Feed...</p>
                    </div>
                ) : posts.length === 0 ? (
                    <div className="p-20 text-center text-uv-gray font-black uppercase tracking-widest text-xs opacity-50">Pulse is flat. Start the heartbeat.</div>
                ) : (
                    posts.map((post) => (
                        <div key={post.post_id} className="uv-card p-6 uv-card-hover group relative overflow-hidden">
                             {/* Repost Indicator */}
                             {post.reposter_id && (
                                <div className="absolute top-0 right-0 bg-green-50 px-4 py-1 pr-6 rounded-bl-3xl border-l border-b border-green-100 flex items-center gap-2 text-[10px] font-black text-green-600 uppercase tracking-widest">
                                    <FiRepeat size={12} /> {post.reposter_id === user?.userId ? 'YOU' : post.reposter_name} BOOSTED
                                </div>
                             )}

                            <div className="flex gap-4">
                                <div 
                                    onClick={() => navigate(`/profile/${post.user_id}`)}
                                    className="w-12 h-12 bg-primary/5 rounded-tl-xl rounded-br-xl flex items-center justify-center font-black text-primary border border-primary/10 overflow-hidden cursor-pointer"
                                >
                                    {post.avatar_url ? <img src={post.avatar_url} /> : post.email[0].toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span 
                                                onClick={() => navigate(`/profile/${post.user_id}`)}
                                                className="font-black text-uv-black hover:text-primary transition-colors cursor-pointer"
                                            >
                                                {post.first_name} {post.last_name}
                                            </span>
                                            <span className="text-[10px] font-black uppercase text-uv-gray tracking-tighter">@{post.email.split('@')[0]}</span>
                                            <span className="text-uv-gray text-[10px]">·</span>
                                            <span className="text-uv-gray text-[10px] font-bold uppercase">{formatDate(post.created_at)}</span>
                                        </div>
                                        <div className="relative">
                                            <button 
                                                onClick={() => setOpenMenu(openMenu === post.post_id ? null : post.post_id)}
                                                className="text-uv-gray p-1.5 hover:bg-gray-50 rounded-xl transition-colors"
                                            >
                                                <FiMoreHorizontal />
                                            </button>
                                            
                                            {openMenu === post.post_id && (
                                                <div className="absolute right-0 mt-2 w-48 bg-white border border-uv-border rounded-xl shadow-xl z-20 py-2 premium-blur">
                                                    <button 
                                                        onClick={() => handleCopyLink(post.post_id)}
                                                        className="w-full text-left px-4 py-2 text-xs font-black uppercase tracking-widest text-uv-black hover:bg-gray-50 flex items-center gap-2"
                                                    >
                                                        <FiSend size={14} /> Copy Link
                                                    </button>
                                                    {(post.user_id === user?.userId || post.reposter_id === user?.userId) && (
                                                        <button 
                                                            onClick={() => handleDeletePost(post.post_id)}
                                                            className="w-full text-left px-4 py-2 text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-50 flex items-center gap-2"
                                                        >
                                                            <FiTrash2 size={14} /> Delete
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <p className="text-uv-black font-medium leading-relaxed mb-4">{post.content}</p>

                                    {post.image_url && (
                                        <div className="rounded-2xl border border-uv-border overflow-hidden mb-4 shadow-sm">
                                            <img src={`http://localhost:3000${post.image_url}`} loading="lazy" className="max-h-[512px] w-full object-cover" />
                                        </div>
                                    )}

                                    {/* Action Deck */}
                                    <div className="flex items-center gap-8 text-uv-gray">
                                        <button onClick={() => toggleComments(post.post_id)} className={`flex items-center gap-2 transition-all ${post.showComments ? 'text-primary' : 'hover:text-primary'}`}>
                                            <FiMessageCircle size={20} className={post.showComments ? 'fill-primary/10' : ''} />
                                            <span className="text-xs font-black">{post.comments_count}</span>
                                        </button>
                                        <button onClick={() => toggleRepost(post.post_id)} className={`flex items-center gap-2 transition-all ${post.has_reposted ? 'text-green-500' : 'hover:text-green-500'}`}>
                                            <FiRepeat size={20} />
                                            <span className="text-xs font-black">{post.reposts_count}</span>
                                        </button>
                                        <button onClick={() => toggleLike(post.post_id)} className={`flex items-center gap-2 transition-all ${post.has_liked ? 'text-pink-500' : 'hover:text-pink-500'}`}>
                                            <FiHeart size={20} className={post.has_liked ? 'fill-current' : ''} />
                                            <span className="text-xs font-black">{post.likes_count}</span>
                                        </button>
                                    </div>

                                    {/* Inline Comments */}
                                    {post.showComments && (
                                        <div className="mt-6 pt-6 border-t border-uv-border space-y-4">
                                            <div className="flex gap-3">
                                                <div className="w-8 h-8 bg-primary/5 rounded-lg flex items-center justify-center text-primary font-black text-xs shrink-0">
                                                    {user?.email[0].toUpperCase()}
                                                </div>
                                                <div className="flex-1 relative">
                                                    <input 
                                                        type="text" 
                                                        placeholder="Add to transmission..." 
                                                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-primary pr-12"
                                                        value={newComment[post.post_id] || ''}
                                                        onChange={(e) => setNewComment({ ...newComment, [post.post_id]: e.target.value })}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.post_id)}
                                                    />
                                                    <button onClick={() => handleAddComment(post.post_id)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-primary hover:bg-white rounded-lg transition-colors"><FiNavigation size={14} /></button>
                                                </div>
                                            </div>

                                            {post.loadingComments ? (
                                                <div className="text-center py-4 text-uv-gray text-[10px] font-black animate-pulse">SYNCING REPLIES...</div>
                                            ) : (
                                                <div className="space-y-4 ml-2 border-l-2 border-uv-border/50 pl-4">
                                                    {post.comments?.map(comment => (
                                                        <div key={comment.comment_id} className="flex gap-3 opacity-90">
                                                            <div 
                                                                onClick={() => navigate(`/profile/${comment.user_id}`)}
                                                                className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-uv-gray text-[10px] font-black shrink-0 cursor-pointer"
                                                            >
                                                                {comment.email[0].toUpperCase()}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-0.5">
                                                                    <span 
                                                                        onClick={() => navigate(`/profile/${comment.user_id}`)}
                                                                        className="font-bold text-uv-black text-xs cursor-pointer hover:text-primary transition-colors"
                                                                    >
                                                                        {comment.first_name} {comment.last_name}
                                                                    </span>
                                                                    <span className="text-uv-gray text-[10px] font-bold uppercase">{formatDate(comment.created_at)}</span>
                                                                </div>
                                                                <p className="text-xs text-uv-black font-medium">{comment.content}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default SocialFeed;
