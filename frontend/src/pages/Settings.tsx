import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/client';
import Cropper from 'react-easy-crop';
import {
  FiUser, FiLock, FiShield, FiTrash2, FiCamera, FiPlus, FiX,
  FiLinkedin, FiGithub, FiGlobe, FiInstagram, FiAlertTriangle, FiBell,
  FiMonitor, FiLogOut, FiSun, FiMoon, FiArrowLeft, FiSave,
  FiEye, FiEyeOff, FiCheck
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function getCroppedImg(imageSrc: string, croppedAreaPixels: any): Promise<Blob> {
  const image = new window.Image();
  image.src = imageSrc;
  await new Promise(resolve => { image.onload = resolve; });
  const canvas = document.createElement('canvas');
  canvas.width = croppedAreaPixels.width;
  canvas.height = croppedAreaPixels.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, croppedAreaPixels.x, croppedAreaPixels.y, croppedAreaPixels.width, croppedAreaPixels.height, 0, 0, croppedAreaPixels.width, croppedAreaPixels.height);
  return new Promise(resolve => canvas.toBlob(blob => resolve(blob!), 'image/jpeg', 0.9));
}

function parseImageUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return url; // served via Vite proxy /uploads/...
}

// ─── Crop Modal ───────────────────────────────────────────────────────────────
const CropModal = ({
  src, aspect, onDone, onCancel
}: { src: string; aspect: number; onDone: (blob: Blob) => void; onCancel: () => void }) => {
  const { t } = useTranslation();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  return createPortal(
    <div className="fixed inset-0 z-[1000] bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg h-60 sm:h-80 md:h-96 rounded-2xl overflow-hidden shadow-2xl border border-white/10 mt-auto sm:mt-0">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
        />
      </div>
      <div className="w-full max-w-lg mt-6 mb-4 px-2">
        <label className="text-xs font-black uppercase text-white/50 tracking-widest mb-2 block text-center">{t('settings.zoomLevel')}</label>
        <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="w-full accent-primary" />
      </div>
      <div className="flex gap-4 w-full max-w-lg sm:w-auto mb-auto sm:mb-0">
        <button onClick={onCancel} className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-sm transition-colors border border-white/10">{t('settings.cropCancel')}</button>
        <button onClick={async () => { const b = await getCroppedImg(src, croppedAreaPixels); onDone(b); }} className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-black text-sm shadow-xl shadow-primary/20 transition-all">{t('settings.cropSave')}</button>
      </div>
    </div>,
    document.body
  );
};

// ─── Tab types ────────────────────────────────────────────────────────────────
type Tab = 'profile' | 'security' | 'privacy' | 'notifications' | 'appearance' | 'account';

// ─── Main Component ────────────────────────────────────────────────────────────
const Settings = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { dimension, toggleDimension } = useTheme();
  const isSpace = dimension === 'space';

  const [activeTab, setActiveTab] = useState<Tab>('profile');
  // ─── Notifications Preferences ─────────────────────────────────────────────
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({});
  const [notifPrefsLoading, setNotifPrefsLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== 'notifications') return;
    setNotifPrefsLoading(true);
    api
      .get('/notifications/preferences')
      .then((r) => setNotifPrefs((r.data?.prefs || {}) as Record<string, boolean>))
      .catch(() => {})
      .finally(() => setNotifPrefsLoading(false));
  }, [activeTab]);

  const setPref = (key: string, enabled: boolean) => {
    setNotifPrefs((p) => ({ ...p, [key]: enabled }));
  };

  const saveNotifPrefs = async () => {
    setSaving(true);
    try {
      await api.put('/notifications/preferences', { prefs: notifPrefs });
      showToast('success', 'Notification preferences saved!');
    } catch (err: any) {
      showToast('error', err?.response?.data?.error || 'Failed to save notification preferences.');
    } finally {
      setSaving(false);
    }
  };
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  // ─── Profile State ─────────────────────────────────────────────────────────
  const [profileForm, setProfileForm] = useState({
    name: '', surname: '', description: '', phoneNumber: '',
    linkedin: '', github: '', website: '', instagram: ''
  });
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [coverPreview, setCoverPreview] = useState('');
  const [cropState, setCropState] = useState<{ src: string; aspect: number; field: 'avatar' | 'cover' } | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.userId) return;
    api.get(`/auth/profile/${user.userId}`).then(r => {
      const d = r.data;
      setProfileForm({
        name: d.name || '',
        surname: d.surname || '',
        description: d.description || '',
        phoneNumber: d.phoneNumber || '',
        linkedin: d.socialLinks?.linkedin || '',
        github: d.socialLinks?.github || '',
        website: d.socialLinks?.website || '',
        instagram: d.socialLinks?.instagram || '',
      });
      setInterests(d.interests || []);
      setAvatarPreview(parseImageUrl(d.avatarUrl));
      setCoverPreview(parseImageUrl(d.coverUrl));
    }).catch(() => {}).finally(() => setProfileLoading(false));
  }, [user?.userId]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, field: 'avatar' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const src = URL.createObjectURL(file);
    setCropState({ src, aspect: field === 'avatar' ? 1 : 3, field });
    e.target.value = '';
  };

  const handleCropDone = (blob: Blob) => {
    if (!cropState) return;
    const file = new File([blob], `${cropState.field}.jpg`, { type: 'image/jpeg' });
    const preview = URL.createObjectURL(blob);
    if (cropState.field === 'avatar') { setAvatarFile(file); setAvatarPreview(preview); }
    else { setCoverFile(file); setCoverPreview(preview); }
    setCropState(null);
  };

  const handleAddInterest = () => {
    const tag = interestInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (tag && !interests.includes(tag) && interests.length < 10) {
      setInterests([...interests, tag]);
      setInterestInput('');
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', profileForm.name);
      fd.append('surname', profileForm.surname);
      fd.append('description', profileForm.description);
      fd.append('phoneNumber', profileForm.phoneNumber);
      fd.append('socialLinks', JSON.stringify({
        linkedin: profileForm.linkedin,
        github: profileForm.github,
        website: profileForm.website,
        instagram: profileForm.instagram,
      }));
      fd.append('interests', JSON.stringify(interests));
      if (avatarFile) fd.append('avatar', avatarFile);
      if (coverFile) fd.append('cover', coverFile);
      await api.patch('/auth/profile', fd);
      setAvatarFile(null);
      setCoverFile(null);
      showToast('success', 'Profile saved successfully!');
    } catch (err: any) {
      showToast('error', err?.response?.data?.error || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Security State ────────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false });
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== 'security') return;
    setSessionsLoading(true);
    api.get('/auth/sessions').then(r => setSessions(r.data || [])).catch(() => {}).finally(() => setSessionsLoading(false));
  }, [activeTab]);

  const handleChangePassword = async () => {
    if (!pwForm.current) return showToast('error', 'Current password is required.');
    if (pwForm.newPw.length < 8) return showToast('error', 'Password must be at least 8 characters.');
    if (pwForm.newPw !== pwForm.confirm) return showToast('error', 'Passwords do not match.');
    setSaving(true);
    try {
      await api.patch('/auth/profile', { currentPassword: pwForm.current, password: pwForm.newPw });
      setPwForm({ current: '', newPw: '', confirm: '' });
      showToast('success', 'Password changed successfully!');
    } catch (err: any) {
      showToast('error', err?.response?.data?.error || 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  const handleTerminateSession = async (sessionId: number) => {
    try {
      await api.delete(`/auth/sessions/${sessionId}`);
      setSessions(prev => prev.filter(s => s.session_id !== sessionId));
      showToast('success', 'Session terminated.');
    } catch {
      showToast('error', 'Failed to terminate session.');
    }
  };

  // ─── Privacy State ─────────────────────────────────────────────────────────
  const [isPrivate, setIsPrivate] = useState(false);
  const [mutedWords, setMutedWords] = useState<string[]>([]);
  const [mutedInput, setMutedInput] = useState('');
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [privacyLoading, setPrivacyLoading] = useState(false);

  useEffect(() => {
    if (activeTab !== 'privacy') return;
    setPrivacyLoading(true);
    Promise.all([
      api.get(`/auth/profile/${user?.userId}`),
    ]).then(([profileRes]) => {
      setIsPrivate(profileRes.data.isPrivate || false);
      setMutedWords(profileRes.data.mutedWords || []);
    }).catch(() => {}).finally(() => setPrivacyLoading(false));
  }, [activeTab, user?.userId]);

  const handleSavePrivacy = async () => {
    setSaving(true);
    try {
      await api.patch('/auth/privacy', { isPrivate, mutedWords });
      showToast('success', 'Privacy settings saved!');
    } catch (err: any) {
      showToast('error', err?.response?.data?.error || 'Failed to save privacy settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleUnblock = async (userId: number) => {
    try {
      await api.post(`/auth/block/${userId}`);
      setBlockedUsers(prev => prev.filter(u => u.user_id !== userId));
      showToast('success', 'User unblocked.');
    } catch {
      showToast('error', 'Failed to unblock user.');
    }
  };
  // ─── Account ───────────────────────────────────────────────────────────────
  const [deactivateConfirm, setDeactivateConfirm] = useState('');
  const handleDeactivate = async () => {
    if (deactivateConfirm !== 'DELETE') return showToast('error', 'Type DELETE to confirm.');
    setSaving(true);
    try {
      await api.delete('/auth/account');
      logout();
      navigate('/login');
    } catch (err: any) {
      showToast('error', err?.response?.data?.error || 'Failed to deactivate account.');
    } finally {
      setSaving(false);
    }
  };

  // ─── UI Helpers ─────────────────────────────────────────────────────────────
  const bg = isSpace ? 'bg-[#050510]' : 'bg-gray-50';
  const card = isSpace ? 'bg-[#0d0d1a] border-white/10' : 'bg-white border-gray-100';
  const text = isSpace ? 'text-white' : 'text-uv-black';
  const muted = isSpace ? 'text-white/50' : 'text-uv-gray';
  const input = `w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-primary/30 text-sm transition-all ${isSpace ? 'bg-white/5 border-white/10 text-white placeholder:text-white/30' : 'bg-gray-50 border-gray-200 text-uv-black'}`;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'profile', label: 'Profile', icon: <FiUser size={16} /> },
    { key: 'security', label: 'Security', icon: <FiLock size={16} /> },
    { key: 'privacy', label: 'Privacy', icon: <FiShield size={16} /> },
    { key: 'notifications', label: 'Notifications', icon: <FiBell size={16} /> },
    { key: 'appearance', label: 'Appearance', icon: <FiSun size={16} /> },
    { key: 'account', label: 'Account', icon: <FiAlertTriangle size={16} /> },
  ];

  return (
    <div className={`flex flex-col min-h-screen ${bg}`}>
      {/* Crop Modal */}
      {cropState && (
        <CropModal
          src={cropState.src}
          aspect={cropState.aspect}
          onDone={handleCropDone}
          onCancel={() => setCropState(null)}
        />
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className={`fixed top-5 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-xl text-white text-sm font-bold shadow-2xl flex items-center gap-2 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}
          >
            {toast.type === 'success' ? <FiCheck size={16} /> : <FiAlertTriangle size={16} />}
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className={`sticky top-0 z-10 flex items-center gap-3 px-4 py-3 md:px-8 border-b ${isSpace ? 'border-white/10 bg-[#050510]/90 backdrop-blur-md' : 'border-gray-200 bg-white'}`}>
        <button onClick={() => navigate(-1)} className={`p-2 rounded-xl border transition-colors ${isSpace ? 'border-white/10 text-white hover:bg-white/5' : 'border-gray-200 hover:bg-gray-100'}`}>
          <FiArrowLeft size={18} />
        </button>
        <h1 className={`text-xl font-black tracking-tight ${text}`}>{t('settings.title')}</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-0 md:gap-8 px-4 md:px-8 py-6 max-w-4xl mx-auto w-full">
        {/* Sidebar Tabs */}
        <div className="flex flex-row md:flex-col gap-1 mb-6 md:mb-0 md:w-52 shrink-0 overflow-x-auto scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all text-left
                ${activeTab === tab.key
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : isSpace ? 'text-white/60 hover:bg-white/5 hover:text-white' : 'text-uv-gray hover:bg-gray-100 hover:text-uv-black'
                }`}
            >
              {tab.icon}
              <span className="hidden md:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="flex-1 space-y-5">

          {/* ── PROFILE TAB ─────────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <>
              {profileLoading ? (
                <div className="flex justify-center py-20"><div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" /></div>
              ) : (
                <>
                  {/* Photos */}
                  <div className={`rounded-2xl border overflow-hidden ${card}`}>
                    {/* Cover */}
                    <div className="relative h-36 bg-gradient-to-br from-primary/30 to-primary/10">
                      {coverPreview && <img src={coverPreview} className="w-full h-full object-cover" alt="cover" />}
                      <label className="absolute inset-0 flex items-center justify-center gap-2 text-white bg-black/40 hover:bg-black/50 cursor-pointer transition-colors">
                        <FiCamera size={20} />
                        <span className="text-xs font-black uppercase tracking-widest">Change Cover</span>
                        <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageSelect(e, 'cover')} />
                      </label>
                    </div>
                    {/* Avatar + Info */}
                    <div className="p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                      <div className="relative shrink-0">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-primary/10 border-4 border-white shadow-xl flex items-center justify-center text-2xl font-black text-primary">
                          {avatarPreview
                            ? <img src={avatarPreview} className="w-full h-full object-cover" alt="avatar" />
                            : <span>{(profileForm.name || user?.email || '?')[0].toUpperCase()}</span>
                          }
                        </div>
                        <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-full flex items-center justify-center cursor-pointer shadow-lg">
                          <FiCamera size={13} className="text-white" />
                          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageSelect(e, 'avatar')} />
                        </label>
                      </div>
                      <div>
                        <p className={`font-black text-base ${text}`}>{profileForm.name} {profileForm.surname}</p>
                        <p className={`text-sm ${muted}`}>{user?.email}</p>
                        <p className={`text-xs mt-1 ${muted}`}>Click the camera icon to change your photos</p>
                      </div>
                    </div>
                  </div>

                  {/* Basic Info */}
                  <div className={`rounded-2xl border p-5 space-y-4 ${card}`}>
                    <h3 className={`text-xs font-black uppercase tracking-widest ${muted}`}>Basic Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-xs font-black uppercase tracking-widest mb-1.5 ${muted}`}>First Name</label>
                        <input className={input} value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} placeholder="First name" />
                      </div>
                      <div>
                        <label className={`block text-xs font-black uppercase tracking-widest mb-1.5 ${muted}`}>Last Name</label>
                        <input className={input} value={profileForm.surname} onChange={e => setProfileForm(p => ({ ...p, surname: e.target.value }))} placeholder="Last name" />
                      </div>
                    </div>
                    <div>
                      <label className={`block text-xs font-black uppercase tracking-widest mb-1.5 ${muted}`}>Phone Number</label>
                      <input className={input} value={profileForm.phoneNumber} onChange={e => setProfileForm(p => ({ ...p, phoneNumber: e.target.value }))} placeholder="+90 5XX XXX XX XX" />
                    </div>
                    <div>
                      <label className={`block text-xs font-black uppercase tracking-widest mb-1.5 ${muted}`}>Bio</label>
                      <textarea className={`${input} resize-none`} rows={3} value={profileForm.description} onChange={e => setProfileForm(p => ({ ...p, description: e.target.value }))} placeholder="Tell the UniVerse who you are..." />
                    </div>
                  </div>

                  {/* Social Links */}
                  <div className={`rounded-2xl border p-5 space-y-4 ${card}`}>
                    <h3 className={`text-xs font-black uppercase tracking-widest ${muted}`}>Social Links</h3>
                    {[
                      { key: 'linkedin', icon: <FiLinkedin size={16} className="text-[#0077B5]" />, placeholder: 'linkedin.com/in/username' },
                      { key: 'github', icon: <FiGithub size={16} className={isSpace ? 'text-white' : 'text-gray-800'} />, placeholder: 'github.com/username' },
                      { key: 'website', icon: <FiGlobe size={16} className="text-primary" />, placeholder: 'yourwebsite.com' },
                      { key: 'instagram', icon: <FiInstagram size={16} className="text-[#E1306C]" />, placeholder: 'instagram.com/username' },
                    ].map(({ key, icon, placeholder }) => (
                      <div key={key} className="flex items-center gap-3">
                        <span className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border border-uv-border bg-gray-50">{icon}</span>
                        <input
                          className={input}
                          value={(profileForm as any)[key]}
                          onChange={e => setProfileForm(p => ({ ...p, [key]: e.target.value }))}
                          placeholder={placeholder}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Interests */}
                  <div className={`rounded-2xl border p-5 space-y-4 ${card}`}>
                    <h3 className={`text-xs font-black uppercase tracking-widest ${muted}`}>Interests & Tags <span className="normal-case font-normal">(max 10)</span></h3>
                    <div className="flex gap-2">
                      <input
                        className={`${input} flex-1`}
                        value={interestInput}
                        onChange={e => setInterestInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddInterest())}
                        placeholder="e.g. machine-learning, basketball..."
                      />
                      <button onClick={handleAddInterest} className="px-4 rounded-xl bg-primary text-white font-black text-sm hover:bg-primary/90 transition-colors shrink-0">
                        <FiPlus size={18} />
                      </button>
                    </div>
                    {interests.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {interests.map(tag => (
                          <span key={tag} className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-xl text-xs font-black">
                            #{tag}
                            <button onClick={() => setInterests(interests.filter(t => t !== tag))} className="hover:text-red-500 transition-colors">
                              <FiX size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button onClick={handleSaveProfile} disabled={saving} className="w-full uv-button py-3 font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                    <FiSave size={16} />
                    {saving ? 'Saving...' : 'Save Profile'}
                  </button>
                </>
              )}
            </>
          )}

          {/* ── SECURITY TAB ────────────────────────────────────────── */}
          {activeTab === 'security' && (
            <>
              {/* Change Password */}
              <div className={`rounded-2xl border p-5 space-y-4 ${card}`}>
                <h3 className={`text-xs font-black uppercase tracking-widest ${muted}`}>Change Password</h3>
                {[
                  { field: 'current', label: 'Current Password', placeholder: 'Enter current password' },
                  { field: 'newPw', label: 'New Password', placeholder: 'At least 8 characters' },
                  { field: 'confirm', label: 'Confirm New Password', placeholder: 'Repeat new password' },
                ].map(({ field, label, placeholder }) => (
                  <div key={field}>
                    <label className={`block text-xs font-black uppercase tracking-widest mb-1.5 ${muted}`}>{label}</label>
                    <div className="relative">
                      <input
                        type={(showPw as any)[field] ? 'text' : 'password'}
                        className={input}
                        value={(pwForm as any)[field]}
                        onChange={e => setPwForm(p => ({ ...p, [field]: e.target.value }))}
                        placeholder={placeholder}
                      />
                      <button type="button" onClick={() => setShowPw(p => ({ ...p, [field]: !(p as any)[field] }))} className={`absolute right-3 top-1/2 -translate-y-1/2 ${muted}`}>
                        {(showPw as any)[field] ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      </button>
                    </div>
                  </div>
                ))}
                <button onClick={handleChangePassword} disabled={saving} className="w-full uv-button py-3 font-black text-sm disabled:opacity-60">
                  {saving ? 'Updating...' : 'Update Password'}
                </button>
              </div>

              {/* Active Sessions */}
              <div className={`rounded-2xl border p-5 space-y-4 ${card}`}>
                <h3 className={`text-xs font-black uppercase tracking-widest ${muted}`}>Active Sessions</h3>
                {sessionsLoading ? (
                  <div className="flex justify-center py-8"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
                ) : sessions.length === 0 ? (
                  <p className={`text-sm ${muted} text-center py-4`}>No active sessions found.</p>
                ) : (
                  <div className="space-y-3">
                    {sessions.map(s => (
                      <div key={s.session_id} className={`flex items-center justify-between gap-4 p-3 rounded-xl border ${isSpace ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-50'}`}>
                        <div className="flex items-center gap-3 min-w-0">
                          <FiMonitor size={20} className={muted} />
                          <div className="min-w-0">
                            <p className={`text-xs font-bold truncate ${text}`}>{s.user_agent?.split('(')[0]?.trim() || 'Unknown device'}</p>
                            <p className={`text-[10px] ${muted}`}>{s.ip_address || 'Unknown IP'} · {new Date(s.last_active_at).toLocaleString()}</p>
                          </div>
                        </div>
                        <button onClick={() => handleTerminateSession(s.session_id)} className="shrink-0 flex items-center gap-1 text-[10px] font-black text-red-500 hover:text-red-600 transition-colors px-2 py-1 rounded-lg hover:bg-red-50">
                          <FiLogOut size={12} /> End
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── PRIVACY TAB ─────────────────────────────────────────── */}
          {activeTab === 'privacy' && (
            <>
              {privacyLoading ? (
                <div className="flex justify-center py-20"><div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" /></div>
              ) : (
                <>
                  {/* Private Account */}
                  <div className={`rounded-2xl border p-5 ${card}`}>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className={`font-black text-sm ${text}`}>Private Account</p>
                        <p className={`text-xs mt-0.5 ${muted}`}>Only your followers can see your posts and bio.</p>
                      </div>
                      <button
                        onClick={() => setIsPrivate(v => !v)}
                        className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${isPrivate ? 'bg-primary' : 'bg-gray-300'}`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${isPrivate ? 'translate-x-7' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Muted Words */}
                  <div className={`rounded-2xl border p-5 space-y-4 ${card}`}>
                    <h3 className={`text-xs font-black uppercase tracking-widest ${muted}`}>Muted Words</h3>
                    <p className={`text-xs ${muted}`}>Posts containing these words will be hidden from your feed.</p>
                    <div className="flex gap-2">
                      <input
                        className={`${input} flex-1`}
                        value={mutedInput}
                        onChange={e => setMutedInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const w = mutedInput.trim().toLowerCase();
                            if (w && !mutedWords.includes(w)) setMutedWords([...mutedWords, w]);
                            setMutedInput('');
                          }
                        }}
                        placeholder="Add a word to mute..."
                      />
                      <button onClick={() => {
                        const w = mutedInput.trim().toLowerCase();
                        if (w && !mutedWords.includes(w)) setMutedWords([...mutedWords, w]);
                        setMutedInput('');
                      }} className="px-4 rounded-xl bg-primary text-white font-black text-sm hover:bg-primary/90 transition-colors shrink-0">
                        <FiPlus size={18} />
                      </button>
                    </div>
                    {mutedWords.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {mutedWords.map(word => (
                          <span key={word} className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border ${isSpace ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-100 border-gray-200 text-uv-black'}`}>
                            {word}
                            <button onClick={() => setMutedWords(mutedWords.filter(w => w !== word))} className="hover:text-red-500 transition-colors">
                              <FiX size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button onClick={handleSavePrivacy} disabled={saving} className="w-full uv-button py-3 font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                    <FiSave size={16} />
                    {saving ? 'Saving...' : 'Save Privacy Settings'}
                  </button>

                  {/* Blocked Users */}
                  {blockedUsers.length > 0 && (
                    <div className={`rounded-2xl border p-5 space-y-3 ${card}`}>
                      <h3 className={`text-xs font-black uppercase tracking-widest ${muted}`}>Blocked Users</h3>
                      {blockedUsers.map(u => (
                        <div key={u.user_id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${isSpace ? 'border-white/10 bg-white/5' : 'border-gray-100 bg-gray-50'}`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-black text-primary shrink-0">
                              {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover rounded-full" alt="" /> : (u.name || u.email || '?')[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className={`text-xs font-black truncate ${text}`}>{u.name} {u.surname}</p>
                              <p className={`text-[10px] truncate ${muted}`}>@{u.email?.split('@')[0]}</p>
                            </div>
                          </div>
                          <button onClick={() => handleUnblock(u.user_id)} className="shrink-0 text-[10px] font-black text-primary hover:underline">Unblock</button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── NOTIFICATIONS TAB ───────────────────────────────────── */}
          {activeTab === 'notifications' && (
            <div className={`rounded-2xl border p-5 space-y-4 ${card}`}>
              <h3 className={`text-xs font-black uppercase tracking-widest ${muted}`}>Notification Preferences</h3>
              <p className={`text-xs ${muted}`}>Choose which notifications you want to receive.</p>

              {notifPrefsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="space-y-2">
                  {[
                    { key: 'social.like', label: 'Likes' },
                    { key: 'social.comment', label: 'Comments' },
                    { key: 'social.follow', label: 'Follows' },
                    { key: 'social.repost', label: 'Reposts' },
                    { key: 'messaging.message', label: 'Messages' },
                    { key: 'academic.appointment_request', label: 'Appointment requests' },
                    { key: 'academic.appointment_status', label: 'Appointment updates' },
                    { key: 'community.job_post_created', label: 'Community job posts' },
                    { key: 'community.event_created', label: 'Community events' },
                  ].map((row) => {
                    const enabled = notifPrefs[row.key] ?? true;
                    return (
                      <button
                        key={row.key}
                        type="button"
                        onClick={() => setPref(row.key, !enabled)}
                        className={`w-full flex items-center justify-between gap-4 p-4 rounded-2xl border transition-colors ${
                          isSpace ? 'border-white/10 bg-white/5 hover:bg-white/10' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="text-left">
                          <p className={`font-black text-sm ${text}`}>{row.label}</p>
                          <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${muted}`}>{row.key}</p>
                        </div>
                        <span className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${enabled ? 'bg-primary' : 'bg-gray-300'}`}>
                          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${enabled ? 'translate-x-7' : 'translate-x-1'}`} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <button onClick={saveNotifPrefs} disabled={saving} className="w-full uv-button py-3 font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                <FiSave size={16} />
                {saving ? 'Saving...' : 'Save Notification Preferences'}
              </button>
            </div>
          )}

          {/* ── APPEARANCE TAB ──────────────────────────────────────── */}
          {activeTab === 'appearance' && (
            <div className={`rounded-2xl border p-5 space-y-4 ${card}`}>
              <h3 className={`text-xs font-black uppercase tracking-widest ${muted}`}>Dimension</h3>
              <p className={`text-xs ${muted}`}>Choose how UniVerse looks and feels.</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'ground', label: 'Ground Mode', desc: 'Clean and minimal', icon: <FiSun size={22} /> },
                  { value: 'space', label: 'Space Mode', desc: 'Dark and cosmic', icon: <FiMoon size={22} /> },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { if (dimension !== opt.value) toggleDimension(); }}
                    className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all font-bold text-sm ${dimension === opt.value ? 'border-primary bg-primary/10 text-primary' : isSpace ? 'border-white/10 text-white/50 hover:border-white/20' : 'border-gray-200 text-uv-gray hover:border-gray-300'}`}
                  >
                    {opt.icon}
                    <span className="font-black text-xs">{opt.label}</span>
                    <span className={`text-[10px] ${muted}`}>{opt.desc}</span>
                    {dimension === opt.value && <FiCheck size={14} className="text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── ACCOUNT TAB ─────────────────────────────────────────── */}
          {activeTab === 'account' && (
            <div className={`rounded-2xl border border-red-200 p-5 space-y-4 ${isSpace ? 'bg-red-900/10' : 'bg-red-50'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center"><FiTrash2 size={18} className="text-red-500" /></div>
                <div>
                  <p className="font-black text-sm text-red-600">Deactivate Account</p>
                  <p className="text-xs text-red-400 mt-0.5">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-xs text-red-500 leading-relaxed">
                Your account will be deactivated and all your sessions will be terminated. You will not be able to log in again without admin assistance.
              </p>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-red-500 mb-1.5">Type <span className="font-mono bg-red-100 px-1 rounded">DELETE</span> to confirm</label>
                <input
                  className="w-full px-4 py-3 rounded-xl border border-red-300 outline-none focus:ring-2 focus:ring-red-300 text-sm bg-white text-red-600 placeholder:text-red-300"
                  value={deactivateConfirm}
                  onChange={e => setDeactivateConfirm(e.target.value)}
                  placeholder="DELETE"
                />
              </div>
              <button
                onClick={handleDeactivate}
                disabled={saving || deactivateConfirm !== 'DELETE'}
                className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Deactivating...' : 'Deactivate My Account'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Settings;
