import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  FiHeart, 
  FiRepeat, 
  FiMessageCircle, 
  FiArrowLeft, 
  FiCalendar, 
  FiMapPin, 
  FiLink, 
  FiEdit, 
  FiCamera,
  FiUserPlus,
  FiUserCheck,
  FiGrid,
  FiMoreVertical,
  FiMoreHorizontal,
  FiTrash2
} from 'react-icons/fi';
import api from '../api/client';
import { useNavigate, useParams } from 'react-router-dom';

const Profile = () => {
    const { user: currentUser, checkAuth } = useAuth();
    const navigate = useNavigate();
    const { id: profileId } = useParams<{ id?: string }>();
    
    // If no ID in URL, we are viewing our own profile
    const targetUserId = profileId ? parseInt(profileId) : currentUser?.userId;
    const isOwnProfile = targetUserId === currentUser?.userId;

    const [profile, setProfile] = useState<any>(null);
    const [stats, setStats] = useState({ followers: 0, following: 0 });
    const [isFollowing, setIsFollowing] = useState(false);
    const [activeTab, setActiveTab] = useState<'posts' | 'reposts' | 'likes' | 'my-items'>('posts');
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', surname: '', description: '', avatarUrl: '', coverUrl: '', password: '' });
    const [activities, setActivities] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [updateResult, setUpdateResult] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
    const [openMenu, setOpenMenu] = useState<number | null>(null);
    const [openProfileMenu, setOpenProfileMenu] = useState(false);

    useEffect(() => {
        fetchProfileData();
    }, [targetUserId]);

    useEffect(() => {
        if (activeTab === 'my-items') {
            fetchMyItems();
        } else {
            fetchActivities();
        }
    }, [activeTab, targetUserId]);

    const fetchProfileData = async () => {
        if (!targetUserId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [profileRes, statsRes] = await Promise.all([
                api.get(`/auth/profile/${targetUserId}`),
                api.get(`/social/users/${targetUserId}/stats`)
            ]);
            setProfile(profileRes.data);
            setStats(statsRes.data);
            
            if (!isOwnProfile) {
                // Check if we are following this user
                // (Would need a specific endpoint or check stats/followers list)
                // For now, assume false or implement a check
            }

            if (isOwnProfile) {
                setEditForm({
                    name: profileRes.data.name || '',
                    surname: profileRes.data.surname || '',
                    description: profileRes.data.description || '',
                    avatarUrl: profileRes.data.avatarUrl || '',
                    coverUrl: profileRes.data.coverUrl || '',
                    password: ''
                });
            }
        } catch (err) {
            console.error('Failed to fetch profile', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchActivities = async () => {
        if (!targetUserId) return;
        try {
            const typeMap: any = { posts: 'user_posts', likes: 'user_likes', reposts: 'user_reposts' };
            const res = await api.get(`/social/users/${targetUserId}/activities/${typeMap[activeTab]}`);
            setActivities(res.data.items || []);
        } catch (err) {
            console.error('Failed to fetch activities');
        }
    };

    const fetchMyItems = async () => {
        try {
            const [lostRes, foundRes] = await Promise.all([
                api.get('/services/lost-items', { params: { limit: 100 } }),
                api.get('/services/found-items', { params: { limit: 100 } })
            ]);
            const l = (lostRes.data.items || []).filter((i:any) => i.user_id === targetUserId).map((i:any) => ({...i, __type:'lost'}));
            const f = (foundRes.data.items || []).filter((i:any) => i.user_id === targetUserId).map((i:any) => ({...i, __type:'found'}));
            setItems([...l, ...f]);
        } catch (err) {
            console.error('Failed to fetch items');
        }
    };

    const handleToggleFollow = async () => {
        if (isOwnProfile) return;
        try {
            const res = await api.post(`/social/users/${targetUserId}/follow`);
            setIsFollowing(res.data.action === 'followed');
            // Refresh stats
            const statsRes = await api.get(`/social/users/${targetUserId}/stats`);
            setStats(statsRes.data);
        } catch (err) {
            alert('Failed to update follow status');
        }
    };

    const handleSaveProfile = async () => {
        try {
            await api.patch('/auth/profile', editForm);
            setUpdateResult({ type: 'success', msg: 'Core updated! ✨' });
            setIsEditing(false);
            fetchProfileData();
            checkAuth();
        } catch (err) {
            setUpdateResult({ type: 'error', msg: 'Calibration failed.' });
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    };

    const handleDeletePost = async (postId: number) => {
        if (!window.confirm('Are you sure you want to delete this transmission?')) return;
        try {
            await api.delete(`/social/posts/${postId}`);
            setActivities(activities.filter(p => p.post_id !== postId));
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

    const handleCopyProfileLink = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        alert('Profile link copied!');
        setOpenProfileMenu(false);
    };

    if (loading) return (
        <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
        </div>
    );

    if (!profile) return (
        <div className="flex-1 flex items-center justify-center flex-col">
            <div className="text-4xl text-uv-gray mb-4">⚠️</div>
            <h2 className="text-xl font-black text-uv-black tracking-tighter">Profile Not Found</h2>
            <p className="text-uv-gray text-sm mt-2 font-medium">This node might be corrupted or does not exist.</p>
            <button onClick={() => navigate(-1)} className="uv-button mt-6 !px-8">Return</button>
        </div>
    );

    return (
        <div className="flex flex-col min-h-screen bg-white">
            {/* Split Card Header */}
            <div className="relative">
                <div className="h-48 w-full bg-uv-black overflow-hidden relative">
                    {profile.coverUrl ? (
                         <img src={profile.coverUrl} className="w-full h-full object-cover opacity-60" />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent opacity-40" />
                    )}
                    <button 
                        onClick={() => navigate(-1)} 
                        className="absolute top-4 left-4 p-2 bg-white/20 backdrop-blur-md rounded-xl text-white hover:bg-white/40 transition-colors"
                    >
                        <FiArrowLeft size={20} />
                    </button>
                </div>

                {/* Profile Card Overlay */}
                <div className="px-6 -mt-12 relative z-10">
                    <div className="uv-card p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-end bg-white">
                        <div className="relative group/avatar">
                            <div className="w-32 h-32 rounded-tl-[2rem] rounded-br-[2rem] rounded-tr-lg rounded-bl-lg bg-white border-4 border-white shadow-2xl overflow-hidden flex items-center justify-center text-5xl font-black text-primary bg-primary/5">
                                {profile.avatarUrl ? (
                                    <img src={profile.avatarUrl} className="w-full h-full object-cover" />
                                ) : (
                                    profile.name[0].toUpperCase()
                                )}
                            </div>
                            {isOwnProfile && isEditing && (
                                <label className="absolute inset-0 bg-black/40 rounded-tl-[2rem] rounded-br-[2rem] flex items-center justify-center text-white cursor-pointer opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                                    <FiCamera size={24} />
                                    <input type="file" className="hidden" />
                                </label>
                            )}
                        </div>

                        <div className="flex-1">
                            <h1 className="text-3xl font-black tracking-tighter text-uv-black leading-none">
                                {profile.name} {profile.surname}
                            </h1>
                            <p className="text-primary font-bold text-sm tracking-widest uppercase mt-1">
                                {profile.role} {profile.title && `· ${profile.title}`}
                                {profile.departmentName && ` · ${profile.departmentName}`}
                                {profile.facultyName && ` (${profile.facultyName})`}
                            </p>
                            <div className="flex gap-4 mt-4">
                                <div className="text-center">
                                    <p className="text-xl font-black text-uv-black">{stats.followers}</p>
                                    <p className="text-[10px] font-black uppercase text-uv-gray tracking-widest">Followers</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-xl font-black text-uv-black">{stats.following}</p>
                                    <p className="text-[10px] font-black uppercase text-uv-gray tracking-widest">Following</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {isOwnProfile ? (
                                isEditing ? (
                                    <>
                                        <button onClick={() => setIsEditing(false)} className="px-5 py-2 border border-uv-border rounded-tl-xl rounded-br-xl font-bold text-sm">Cancel</button>
                                        <button onClick={handleSaveProfile} className="uv-button !py-2 !px-6 text-sm">Synchronize</button>
                                    </>
                                ) : (
                                    <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-5 py-2 bg-uv-border/50 hover:bg-uv-border rounded-tl-xl rounded-br-xl font-black text-sm transition-all">
                                        <FiEdit size={16} /> CALIBRATE
                                    </button>
                                )
                            ) : (
                                <button 
                                    onClick={handleToggleFollow}
                                    className={`flex items-center gap-2 px-6 py-2 rounded-tl-xl rounded-br-xl font-black text-sm transition-all ${isFollowing ? 'bg-uv-border text-uv-black' : 'bg-primary text-white shadow-lg shadow-primary/20'}`}
                                >
                                    {isFollowing ? <><FiUserCheck /> FOLLOWING</> : <><FiUserPlus /> FOLLOW</>}
                                </button>
                            )}
                            <div className="relative">
                                <button 
                                    onClick={() => setOpenProfileMenu(!openProfileMenu)}
                                    className="p-2 border border-uv-border rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    <FiMoreVertical />
                                </button>
                                {openProfileMenu && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white border border-uv-border rounded-xl shadow-xl z-20 py-2 premium-blur">
                                        <button 
                                            onClick={handleCopyProfileLink}
                                            className="w-full text-left px-4 py-2 text-xs font-black uppercase tracking-widest text-uv-black hover:bg-gray-50 flex items-center gap-2"
                                        >
                                            <FiLink size={14} /> Copy Profile Link
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bio & Details */}
            <div className="px-6 mt-8 max-w-3xl">
                {isEditing ? (
                    <div className="space-y-4 uv-card p-6 border-primary/10">
                        <div className="grid grid-cols-2 gap-4">
                            <input value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Name" className="px-4 py-2 bg-gray-50 border-none rounded-xl outline-none focus:ring-1 focus:ring-primary" />
                            <input value={editForm.surname} onChange={e => setEditForm({...editForm, surname: e.target.value})} placeholder="Surname" className="px-4 py-2 bg-gray-50 border-none rounded-xl outline-none focus:ring-1 focus:ring-primary" />
                        </div>
                        <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} placeholder="Bio - Tell your story..." className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-1 focus:ring-primary min-h-[100px] resize-none" />
                        <div className="grid grid-cols-2 gap-4">
                            <input value={editForm.avatarUrl} onChange={e => setEditForm({...editForm, avatarUrl: e.target.value})} placeholder="Avatar URL (Temporary)" className="px-4 py-2 bg-gray-50 border-none rounded-xl outline-none focus:ring-1 focus:ring-primary text-xs" />
                            <input value={editForm.coverUrl} onChange={e => setEditForm({...editForm, coverUrl: e.target.value})} placeholder="Cover URL (Temporary)" className="px-4 py-2 bg-gray-50 border-none rounded-xl outline-none focus:ring-1 focus:ring-primary text-xs" />
                        </div>
                        {updateResult && (
                            <p className={`text-xs font-bold uppercase tracking-widest ${updateResult.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                [{updateResult.type}] {updateResult.msg}
                            </p>
                        )}
                    </div>
                ) : (
                    <>
                        <p className="text-lg font-medium text-uv-black leading-relaxed">
                            {profile.description || "No transmission recorded. This user is a ghost in the UniVerse."}
                        </p>
                        <div className="flex flex-wrap gap-x-6 gap-y-2 mt-6 text-uv-gray text-xs font-bold uppercase tracking-widest">
                            <div className="flex items-center gap-2"><FiMapPin className="text-primary" /> Campus Node A</div>
                            <div className="flex items-center gap-2 transition-colors hover:text-primary cursor-pointer"><FiLink className="text-primary" /> node.link</div>
                            <div className="flex items-center gap-2"><FiCalendar className="text-primary" /> Connected {formatDate(profile.createdAt || new Date().toISOString())}</div>
                        </div>
                    </>
                )}
            </div>

            {/* Navigation Tabs - Asymmetrical */}
            <div className="mt-10 px-6 overflow-x-auto scrollbar-hide">
                <div className="flex gap-2 p-1 bg-uv-border/30 rounded-tl-2xl rounded-br-2xl w-fit">
                    {['posts', 'reposts', 'likes', 'my-items'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-6 py-2 rounded-tl-xl rounded-br-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-primary shadow-sm' : 'text-uv-gray hover:text-uv-black'}`}
                        >
                            {tab.replace('-', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Feed */}
            <div className="px-6 mt-6 pb-20 flex-1">
                {activeTab === 'my-items' ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {items.length === 0 ? <p className="p-10 text-center text-uv-gray font-bold uppercase tracking-widest text-xs">No assets detected.</p> : items.map(item => (
                            <div 
                                key={item.lost_item_id || item.found_item_id} 
                                className="uv-card p-5 group cursor-pointer"
                                onClick={() => navigate(`/item/${item.__type}/${item.lost_item_id || item.found_item_id}`)}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center text-primary"><FiGrid /></div>
                                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase border ${item.__type === 'lost' ? 'text-red-500 border-red-500/20 bg-red-50' : 'text-green-500 border-green-500/20 bg-green-50'}`}>
                                        {item.__type}
                                    </span>
                                </div>
                                <h4 className="font-black text-uv-black group-hover:text-primary transition-colors">{item.lost_item_name || item.found_item_name}</h4>
                                <p className="text-xs text-uv-gray font-bold mt-1 flex items-center gap-1"><FiMapPin size={12} /> {item.location}</p>
                            </div>
                        ))}
                     </div>
                ) : (
                    <div className="space-y-4">
                        {activities.length === 0 ? (
                            <div className="p-20 text-center text-uv-gray font-black uppercase tracking-widest text-xs opacity-50">Empty transmission.</div>
                        ) : activities.map(post => (
                            <div key={post.post_id} className="uv-card p-6 uv-card-hover group">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-primary/5 rounded-tl-xl rounded-br-xl flex items-center justify-center font-black text-primary border border-primary/10 overflow-hidden">
                                        {post.avatar_url ? <img src={post.avatar_url} /> : post.email[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-uv-black group-hover:text-primary transition-colors">
                                                    {post.first_name} {post.last_name}
                                                </span>
                                                <span className="text-[10px] font-black uppercase text-uv-gray tracking-tighter">@{post.email.split('@')[0]}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-uv-gray uppercase">{new Date(post.created_at).toLocaleDateString()}</span>
                                                <div className="relative">
                                                    <button 
                                                        onClick={() => setOpenMenu(openMenu === post.post_id ? null : post.post_id)}
                                                        className="text-uv-gray p-1 hover:bg-gray-50 rounded-lg transition-colors"
                                                    >
                                                        <FiMoreHorizontal />
                                                    </button>
                                                    {openMenu === post.post_id && (
                                                        <div className="absolute right-0 mt-2 w-40 bg-white border border-uv-border rounded-xl shadow-xl z-20 py-2 premium-blur">
                                                            <button 
                                                                onClick={() => handleCopyLink(post.post_id)}
                                                                className="w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-uv-black hover:bg-gray-50 flex items-center gap-2"
                                                            >
                                                                <FiLink size={12} /> Copy Link
                                                            </button>
                                                            {(post.user_id === currentUser?.userId || post.reposter_id === currentUser?.userId) && (
                                                                <button 
                                                                    onClick={() => handleDeletePost(post.post_id)}
                                                                    className="w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 flex items-center gap-2"
                                                                >
                                                                    <FiTrash2 size={12} /> Delete
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-uv-black font-medium leading-relaxed">{post.content}</p>
                                        <div className="flex items-center gap-6 mt-6 text-uv-gray">
                                            <button className="flex items-center gap-1.5 hover:text-primary transition-colors"><FiMessageCircle size={18} /><span className="text-xs font-black">{post.comments_count}</span></button>
                                            <button className={`flex items-center gap-1.5 ${post.has_reposted ? 'text-green-500' : 'hover:text-green-500'}`}><FiRepeat size={18} /><span className="text-xs font-black">{post.reposts_count}</span></button>
                                            <button className={`flex items-center gap-1.5 ${post.has_liked ? 'text-pink-500' : 'hover:text-pink-500'}`}><FiHeart size={18} className={post.has_liked ? 'fill-current' : ''} /><span className="text-xs font-black">{post.likes_count}</span></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
