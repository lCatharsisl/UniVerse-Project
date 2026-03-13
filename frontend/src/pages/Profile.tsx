import { useState, useEffect, useRef } from 'react';
import { useAuth, isAcademic } from '../context/AuthContext';
import { 
  FiHeart, FiRepeat, FiMessageCircle, FiArrowLeft, FiCalendar,
  FiMapPin, FiLink, FiEdit, FiUserPlus, FiUserCheck,
  FiGrid, FiMoreVertical, FiMoreHorizontal, FiTrash2, FiX, FiUsers
} from 'react-icons/fi';
import api from '../api/client';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

// ─── Follow List Modal ────────────────────────────────────────────────────────
interface FollowUser { user_id: number; email: string; name: string; surname: string; avatar_url?: string; }

const FollowListModal = ({
  type, userId, onClose, onNavigate
}: { type: 'followers' | 'following'; userId: number; onClose: () => void; onNavigate: (id: number) => void }) => {
  const [list, setList] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/social/users/${userId}/${type}`)
      .then(r => setList(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, type]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-black text-base text-uv-black uppercase tracking-widest">
            {type === 'followers' ? 'Followers' : 'Following'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
            <FiX size={18} />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full" />
            </div>
          ) : list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-uv-gray">
              <FiUsers size={32} className="mb-3 opacity-30" />
              <p className="text-xs font-bold uppercase tracking-widest">No users yet</p>
            </div>
          ) : (
            <div>
              {list.map(u => (
                <button
                  key={u.user_id}
                  onClick={() => { onNavigate(u.user_id); onClose(); }}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center text-primary font-black shrink-0">
                    {u.avatar_url
                      ? <img src={u.avatar_url} className="w-full h-full object-cover" />
                      : <span className="text-sm">{(u.name || u.email)?.[0]?.toUpperCase()}</span>
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-sm text-uv-black truncate">{u.name} {u.surname}</p>
                    <p className="text-xs text-uv-gray truncate">@{u.email?.split('@')[0]}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Profile ──────────────────────────────────────────────────────────────────
const Profile = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { id: profileId } = useParams<{ id?: string }>();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';

  const targetUserId = profileId ? parseInt(profileId) : currentUser?.userId;
  const isOwnProfile = targetUserId === currentUser?.userId;

  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ followers: 0, following: 0, isFollowing: false });
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'reposts' | 'likes' | 'my-items'>('posts');
  const [activities, setActivities] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [openProfileMenu, setOpenProfileMenu] = useState(false);
  const [followModal, setFollowModal] = useState<'followers' | 'following' | null>(null);
  const [warningPanel, setWarningPanel] = useState(false);
  const [warningManageOpen, setWarningManageOpen] = useState(false);
  const [reportUserOpen, setReportUserOpen] = useState(false);
  const [reportSuccessMessage, setReportSuccessMessage] = useState<string | null>(null);
  const [userReportStatus, setUserReportStatus] = useState<{ has_reported: boolean; my_report_type: string | null }>({ has_reported: false, my_report_type: null });

  const isStaff = currentUser && isAcademic(currentUser.role);

  useEffect(() => {
    if (!reportSuccessMessage) return;
    const t = setTimeout(() => setReportSuccessMessage(null), 3000);
    return () => clearTimeout(t);
  }, [reportSuccessMessage]);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const warningManageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeProfileMenu = () => {
      setOpenProfileMenu(false);
      setReportUserOpen(false);
      setWarningPanel(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        closeProfileMenu();
      }
      if (warningManageRef.current && !warningManageRef.current.contains(e.target as Node)) {
        setWarningManageOpen(false);
      }
    };
    if (openProfileMenu || warningManageOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openProfileMenu, warningManageOpen]);

  useEffect(() => { fetchProfileData(); }, [targetUserId]);
  useEffect(() => {
    if (activeTab === 'my-items') fetchMyItems();
    else fetchActivities();
  }, [activeTab, targetUserId]);

  const fetchProfileData = async () => {
    if (!targetUserId) { setLoading(false); return; }
    setLoading(true);
    try {
      const requests: Promise<any>[] = [
        api.get(`/auth/profile/${targetUserId}`),
        api.get(`/social/users/${targetUserId}/stats`)
      ];
      if (!isOwnProfile) requests.push(api.get(`/social/users/${targetUserId}/my-report`));
      const results = await Promise.all(requests);
      const profileRes = results[0];
      const statsRes = results[1];
      setProfile(profileRes.data);
      setStats(statsRes.data);
      setIsFollowing(statsRes.data.isFollowing || false);
      if (isOwnProfile) setUserReportStatus({ has_reported: false, my_report_type: null });
      else if (results[2]) setUserReportStatus(results[2].data);
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
    } catch (err) { console.error('Failed to fetch activities'); }
  };

  const fetchMyItems = async () => {
    try {
      const [lostRes, foundRes] = await Promise.all([
        api.get('/services/lost-items', { params: { limit: 100 } }),
        api.get('/services/found-items', { params: { limit: 100 } })
      ]);
      const l = (lostRes.data.items || []).filter((i: any) => i.user_id === targetUserId).map((i: any) => ({ ...i, __type: 'lost' }));
      const f = (foundRes.data.items || []).filter((i: any) => i.user_id === targetUserId).map((i: any) => ({ ...i, __type: 'found' }));
      setItems([...l, ...f]);
    } catch (err) { console.error('Failed to fetch items'); }
  };

  const handleToggleFollow = async () => {
    if (isOwnProfile) return;
    try {
      const res = await api.post(`/social/users/${targetUserId}/follow`);
      const followed = res.data.action === 'followed';
      setIsFollowing(followed);
      setStats(prev => ({ ...prev, followers: prev.followers + (followed ? 1 : -1) }));
    } catch (err) { alert('Failed to update follow status'); }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

  const REPORT_TYPES = ['spam', 'harassment', 'inappropriate', 'other'] as const;
  const handleReportUser = async (reportType: string) => {
    try {
      await api.post(`/social/users/${targetUserId}/report`, { reportType });
      setReportUserOpen(false);
      setOpenProfileMenu(false);
      setReportSuccessMessage('Report submitted successfully.');
      setUserReportStatus({ has_reported: true, my_report_type: reportType });
    } catch (err) {
      alert('Failed to submit report');
    }
  };

  const handleRemoveReportUser = async () => {
    try {
      await api.delete(`/social/users/${targetUserId}/report`);
      setReportUserOpen(false);
      setOpenProfileMenu(false);
      setReportSuccessMessage('Report removed.');
      setUserReportStatus({ has_reported: false, my_report_type: null });
    } catch (err: any) {
      alert((err?.response?.data?.error as string) || 'Failed to remove report');
    }
  };

  const handleGiveWarning = async (tier: 1 | 2 | 3 | 4) => {
    if (tier === 4 && !window.confirm('Are you sure you want to ban this user?')) return;
    try {
      await api.post(`/social/users/${targetUserId}/warning`, { tier });
      setWarningPanel(false);
      setOpenProfileMenu(false);
      fetchProfileData();
    } catch (err) {
      alert('Failed to apply warning');
    }
  };

  const handleWarningAction = async (action: string, tier?: number) => {
    const confirmMsg = action === 'remove_warning' ? 'Are you sure you want to remove the warning?' :
      action === 'ban' ? 'Are you sure you want to ban this user?' :
      action === 'unban' ? 'Are you sure you want to remove the ban?' : null;
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    try {
      if (action === 'remove_warning') await api.patch(`/social/users/${targetUserId}/warning`, { action: 'remove_warning' });
      else if (action === 'set_tier' && tier !== undefined) await api.patch(`/social/users/${targetUserId}/warning`, { action: 'set_tier', tier });
      else if (action === 'ban') await api.patch(`/social/users/${targetUserId}/warning`, { action: 'ban' });
      else if (action === 'unban') await api.patch(`/social/users/${targetUserId}/warning`, { action: 'unban' });
      setWarningManageOpen(false);
      fetchProfileData();
    } catch (err) {
      alert('Failed to update');
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!window.confirm('Bu gönderiyi silmek istediğine emin misin?')) return;
    try {
      await api.delete(`/social/posts/${postId}`);
      setActivities(activities.filter(p => p.post_id !== postId));
      setOpenMenu(null);
    } catch (err) { alert('Failed to delete post'); }
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );

  if (!profile) return (
    <div className="flex-1 flex items-center justify-center flex-col gap-4">
      <div className="text-4xl">⚠️</div>
      <h2 className="text-xl font-black text-uv-black tracking-tighter">Profile Not Found</h2>
      <button onClick={() => navigate(-1)} className="uv-button mt-2">Return</button>
    </div>
  );

  const coverSrc = profile.coverUrl || '';
  const avatarSrc = profile.avatarUrl || '';

  return (
    <div className={`flex flex-col min-h-screen ${isSpace ? 'bg-[#050510]' : 'bg-white'}`}>

      {/* Report success toast */}
      {reportSuccessMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-bold shadow-lg">
          {reportSuccessMessage}
        </div>
      )}

      {/* ── Cover Photo ─────────────────────────────────── */}
      <div className="relative h-36 md:h-56 w-full bg-uv-black overflow-hidden">
        {coverSrc ? (
          <img src={coverSrc.startsWith('http') ? coverSrc : `http://localhost:3000${coverSrc}`} className="w-full h-full object-cover" alt="Cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/60 to-accent opacity-70" />
        )}

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-3 left-3 md:top-4 md:left-4 p-2 bg-black/30 backdrop-blur-md rounded-xl text-white hover:bg-black/50 transition-colors z-20"
        >
          <FiArrowLeft size={18} />
        </button>

        {/* Profili düzenle — only for own profile */}
        {isOwnProfile && (
          <button
            onClick={() => navigate('/profile/edit')}
            className="absolute top-3 right-3 md:top-4 md:right-4 flex items-center gap-1.5 px-3 py-1.5 bg-black/30 backdrop-blur-md rounded-xl text-white text-[10px] font-black uppercase hover:bg-black/50 transition-colors z-20"
          >
            <FiEdit size={12} /> Profili düzenle
          </button>
        )}
      </div>

      {/* ── Profile Card ─────────────────────────────────── */}
      <div className="px-3 md:px-6 -mt-10 md:-mt-16 relative z-10">
        <div className={`rounded-2xl p-4 md:p-6 shadow-xl border flex flex-col sm:flex-row gap-4 md:gap-6 items-start ${isSpace ? 'bg-[#0d0d1a] border-white/10' : 'bg-white border-gray-100'}`}>

          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 md:w-28 md:h-28 rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-primary/10 flex items-center justify-center text-3xl font-black text-primary">
              {avatarSrc
                ? <img src={avatarSrc.startsWith('http') ? avatarSrc : `http://localhost:3000${avatarSrc}`} className="w-full h-full object-cover" alt="Avatar" />
                : <span>{profile.name?.[0]?.toUpperCase() || '?'}</span>
              }
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className={`text-xl md:text-3xl font-black tracking-tighter leading-tight ${isSpace ? 'text-white' : 'text-uv-black'}`}>
                {profile.name} {profile.surname}
              </h1>
              {(profile.warningTier > 0 || profile.isBanned) && (
                <div className="relative" ref={warningManageRef}>
                  <button
                    onClick={() => isStaff && setWarningManageOpen(!warningManageOpen)}
                    className={`w-5 h-5 rounded-full border-2 shrink-0 ${profile.isBanned ? 'bg-red-500 border-red-600' : profile.warningTier === 3 ? 'bg-red-400 border-red-500' : profile.warningTier === 2 ? 'bg-orange-400 border-orange-500' : 'bg-yellow-400 border-yellow-500'}`}
                    title={profile.isBanned ? 'Banned' : `Tier ${profile.warningTier} warning`}
                  />
                  {isStaff && warningManageOpen && (
                    <div className="absolute left-0 top-full mt-1 w-52 py-2 bg-[#0d0d1a] border border-red-500/30 rounded-xl shadow-xl z-30">
                      <button onClick={() => handleWarningAction('remove_warning')} className="w-full text-left px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20 hover:text-red-300">Remove warning</button>
                      <button onClick={() => handleWarningAction('set_tier', 1)} className="w-full text-left px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20 hover:text-red-300">Set to Tier 1</button>
                      <button onClick={() => handleWarningAction('set_tier', 2)} className="w-full text-left px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20 hover:text-red-300">Set to Tier 2</button>
                      <button onClick={() => handleWarningAction('set_tier', 3)} className="w-full text-left px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20 hover:text-red-300">Set to Tier 3</button>
                      {profile.isBanned ? (
                        <button onClick={() => handleWarningAction('unban')} className="w-full text-left px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20 hover:text-red-300">Remove ban</button>
                      ) : (
                        <button onClick={() => handleGiveWarning(4)} className="w-full text-left px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-500/20">Ban</button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-primary font-bold text-[9px] md:text-xs tracking-widest uppercase mt-0.5">
              {profile.role}{profile.title && ` · ${profile.title}`}{profile.departmentName && ` · ${profile.departmentName}`}
            </p>

            {/* Followers / Following — tıklanabilir */}
            <div className="flex gap-5 mt-3">
              <button
                onClick={() => setFollowModal('followers')}
                className={`text-left hover:opacity-70 transition-opacity ${isOwnProfile ? 'cursor-pointer' : ''}`}
              >
                <p className={`text-base md:text-xl font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>{stats.followers}</p>
                <p className="text-[8px] md:text-[10px] font-black uppercase text-uv-gray tracking-widest">Followers</p>
              </button>
              <button
                onClick={() => setFollowModal('following')}
                className="text-left hover:opacity-70 transition-opacity"
              >
                <p className={`text-base md:text-xl font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>{stats.following}</p>
                <p className="text-[8px] md:text-[10px] font-black uppercase text-uv-gray tracking-widest">Following</p>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 w-full sm:w-auto sm:items-start sm:flex-col md:flex-row mt-auto sm:mt-0">
            {!isOwnProfile && (
              <button
                onClick={handleToggleFollow}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl font-black text-xs transition-all ${isFollowing ? 'bg-gray-100 text-uv-black hover:bg-red-50 hover:text-red-500' : 'bg-primary text-white shadow-lg shadow-primary/25 hover:brightness-110'}`}
              >
                {isFollowing ? <><FiUserCheck size={13} /> Following</> : <><FiUserPlus size={13} /> Follow</>}
              </button>
            )}

            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setOpenProfileMenu(!openProfileMenu)}
                className={`p-2 border rounded-xl transition-colors ${isSpace ? 'border-white/20 text-white hover:bg-white/10' : 'border-uv-border hover:bg-gray-50'}`}
              >
                <FiMoreVertical size={16} />
              </button>
              <AnimatePresence>
                {openProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className={`absolute right-0 mt-2 w-48 py-2 rounded-xl shadow-xl z-20 ${isSpace ? 'bg-[#0d0d1a] border border-white/10' : 'bg-white border border-uv-border'}`}
                  >
                    <button
                      onClick={() => { navigator.clipboard.writeText(window.location.href); setOpenProfileMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-2 ${isSpace ? 'text-white hover:bg-white/10' : 'text-uv-black hover:bg-gray-50'}`}
                    >
                      <FiLink size={13} /> Copy profile link
                    </button>
                    {isOwnProfile && (
                      <>
                        <button
                          onClick={() => { navigate('/profile/edit'); setOpenProfileMenu(false); }}
                          className={`w-full text-left px-4 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-2 ${isSpace ? 'text-white hover:bg-white/10' : 'text-uv-black hover:bg-gray-50'}`}
                        >
                          <FiEdit size={13} /> Profili düzenle
                        </button>
                        <button
                          onClick={() => { navigate('/profile/change-password'); setOpenProfileMenu(false); }}
                          className={`w-full text-left px-4 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-2 ${isSpace ? 'text-white hover:bg-white/10' : 'text-uv-black hover:bg-gray-50'}`}
                        >
                          Şifre değiştir
                        </button>
                      </>
                    )}
                    {!isOwnProfile && (
                      isStaff ? (
                        <>
                          <button onClick={() => setWarningPanel(!warningPanel)} className="w-full text-left px-4 py-2 text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 flex items-center gap-2">
                            Give warning
                          </button>
                          {warningPanel && (
                            <div className="border-t border-red-500/20 pt-2 mt-1">
                              <p className="px-3 py-1 text-[9px] font-black uppercase tracking-widest text-red-400">Warning type</p>
                              {[1, 2, 3, 4].map((t) => (
                                <button key={t} onClick={() => handleGiveWarning(t as 1 | 2 | 3 | 4)} className="w-full text-left px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/20 hover:text-red-300">
                                  {t === 4 ? 'Ban' : `Tier ${t}`}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <button onClick={() => setReportUserOpen(!reportUserOpen)} className="w-full text-left px-4 py-2 text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-500/10 flex items-center gap-2">
                            Report user
                            {userReportStatus.has_reported && <span className="text-[9px] normal-case font-bold text-red-400">(Reported)</span>}
                          </button>
                          {reportUserOpen && (
                            <div className="border-t border-red-500/20 pt-2 mt-1">
                              {userReportStatus.has_reported ? (
                                <>
                                  <p className="px-3 py-1 text-[9px] font-black uppercase tracking-widest text-red-400">You reported as</p>
                                  <p className="px-3 py-1 text-xs font-bold capitalize text-red-400">{userReportStatus.my_report_type || 'other'}</p>
                                  <button onClick={handleRemoveReportUser} className="w-full text-left px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/20">
                                    Remove report
                                  </button>
                                </>
                              ) : (
                                <>
                                  <p className="px-3 py-1 text-[9px] font-black uppercase tracking-widest text-red-400">Report type</p>
                                  {REPORT_TYPES.map((type) => (
                                    <button key={type} onClick={() => handleReportUser(type)} className="w-full text-left px-3 py-2 text-xs font-bold capitalize text-red-400 hover:bg-red-500/20 hover:text-red-300">
                                      {type}
                                    </button>
                                  ))}
                                </>
                              )}
                            </div>
                          )}
                        </>
                      )
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bio ─────────────────────────────────────────── */}
      <div className="px-4 md:px-6 mt-5 max-w-3xl">
        <p className={`text-sm md:text-base font-medium leading-relaxed ${isSpace ? 'text-white/80' : 'text-uv-black'}`}>
          {profile.description || 'No transmission recorded. This user is a ghost in the UniVerse.'}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-uv-gray text-[9px] md:text-xs font-bold uppercase tracking-widest">
          <div className="flex items-center gap-1.5"><FiMapPin size={10} className="text-primary" /> Campus Node A</div>
          <div className="flex items-center gap-1.5"><FiLink size={10} className="text-primary" /> node.link</div>
          <div className="flex items-center gap-1.5"><FiCalendar size={10} className="text-primary" /> Connected {formatDate(profile.createdAt || new Date().toISOString())}</div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────── */}
      <div className="mt-6 px-3 md:px-6 overflow-x-auto scrollbar-hide">
        <div className={`flex gap-1 p-1 rounded-xl w-fit ${isSpace ? 'bg-white/5' : 'bg-gray-100'}`}>
          {['posts', 'reposts', 'likes', 'my-items'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-1.5 rounded-lg text-[9px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab
                ? 'bg-white text-primary shadow-sm'
                : isSpace ? 'text-white/50 hover:text-white' : 'text-uv-gray hover:text-uv-black'
              }`}
            >
              {tab.replace('-', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────── */}
      <div className="px-3 md:px-6 mt-5 pb-20 flex-1">
        {activeTab === 'my-items' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.length === 0 ? (
              <p className="col-span-2 p-10 text-center text-uv-gray font-bold uppercase tracking-widest text-xs">No assets detected.</p>
            ) : items.map(item => (
              <div
                key={item.lost_item_id || item.found_item_id}
                className={`rounded-2xl p-5 cursor-pointer border transition-all hover:shadow-lg ${isSpace ? 'bg-white/5 border-white/10 hover:border-primary/30' : 'bg-white border-gray-100 hover:border-primary/30'}`}
                onClick={() => navigate(`/item/${item.__type}/${item.lost_item_id || item.found_item_id}`)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><FiGrid size={18} /></div>
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${item.__type === 'lost' ? 'text-red-500 border-red-200 bg-red-50' : 'text-green-500 border-green-200 bg-green-50'}`}>
                    {item.__type}
                  </span>
                </div>
                <h4 className={`font-black text-sm ${isSpace ? 'text-white' : 'text-uv-black'}`}>{item.lost_item_name || item.found_item_name}</h4>
                <p className="text-xs text-uv-gray font-bold mt-1 flex items-center gap-1"><FiMapPin size={11} /> {item.location}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-0 divide-y divide-gray-100">
            {activities.length === 0 ? (
              <div className="p-16 text-center text-uv-gray font-black uppercase tracking-widest text-[9px] opacity-40">Empty transmission.</div>
            ) : activities.map(post => (
              <div key={post.post_id} className={`py-4 transition-all group ${isSpace ? 'hover:bg-white/3' : 'hover:bg-gray-50/50'}`}>
                <div className="flex gap-3">
                  <div className="w-9 h-9 md:w-11 md:h-11 bg-primary/10 rounded-xl flex items-center justify-center font-black text-sm text-primary border border-primary/10 overflow-hidden shrink-0">
                    {post.avatar_url
                      ? <img src={post.avatar_url} className="w-full h-full object-cover" />
                      : post.email?.[0]?.toUpperCase() || '?'
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`font-black text-xs md:text-sm truncate ${isSpace ? 'text-white' : 'text-uv-black'}`}>{post.first_name} {post.last_name}</span>
                        <span className="text-[8px] font-black text-uv-gray">@{post.email?.split('@')[0]}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[8px] font-bold text-uv-gray">{new Date(post.created_at).toLocaleDateString()}</span>
                        <div className="relative">
                          <button onClick={() => setOpenMenu(openMenu === post.post_id ? null : post.post_id)} className="p-0.5 text-uv-gray hover:text-uv-black rounded-lg transition-colors">
                            <FiMoreHorizontal size={12} />
                          </button>
                          {openMenu === post.post_id && (
                            <div className="absolute right-0 mt-1 w-36 bg-white border border-uv-border rounded-xl shadow-xl z-20 py-1.5">
                              <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/post/${post.post_id}`); setOpenMenu(null); }} className="w-full text-left px-3 py-1.5 text-[9px] font-black uppercase text-uv-black hover:bg-gray-50 flex items-center gap-2">
                                <FiLink size={10} /> Copy Link
                              </button>
                              {(post.user_id === currentUser?.userId || post.reposter_id === currentUser?.userId) && (
                                <button onClick={() => handleDeletePost(post.post_id)} className="w-full text-left px-3 py-1.5 text-[9px] font-black uppercase text-red-500 hover:bg-red-50 flex items-center gap-2">
                                  <FiTrash2 size={10} /> Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className={`text-sm leading-relaxed ${isSpace ? 'text-white/80' : 'text-uv-black'}`}>{post.content}</p>
                    <div className="flex items-center gap-5 mt-3 text-uv-gray">
                      <button className="flex items-center gap-1 hover:text-primary transition-colors">
                        <FiMessageCircle size={13} /><span className="text-[9px] font-black">{post.comments_count}</span>
                      </button>
                      <button className={`flex items-center gap-1 ${post.has_reposted ? 'text-green-500' : 'hover:text-green-500 transition-colors'}`}>
                        <FiRepeat size={13} /><span className="text-[9px] font-black">{post.reposts_count}</span>
                      </button>
                      <button className={`flex items-center gap-1 ${post.has_liked ? 'text-pink-500' : 'hover:text-pink-500 transition-colors'}`}>
                        <FiHeart size={13} className={post.has_liked ? 'fill-current' : ''} /><span className="text-[9px] font-black">{post.likes_count}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Follow List Modal ─────────────────────────────── */}
      <AnimatePresence>
        {followModal && (
          <FollowListModal
            type={followModal}
            userId={targetUserId!}
            onClose={() => setFollowModal(null)}
            onNavigate={(id) => navigate(`/profile/${id}`)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
