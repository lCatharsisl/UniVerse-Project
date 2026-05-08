/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCamera } from 'react-icons/fi';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const EditProfile = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';

  const [profile, setProfile] = useState<{ name?: string; surname?: string; description?: string; avatarUrl?: string; coverUrl?: string } | null>(null);
  const [form, setForm] = useState({ name: '', surname: '', description: '' });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [coverPreview, setCoverPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.userId) {
      navigate('/login');
      return;
    }
    const load = async () => {
      try {
        const res = await api.get(`/auth/profile/${user.userId}`);
        const data = res.data;
        setProfile(data);
        setForm({
          name: data.name || '',
          surname: data.surname || '',
          description: data.description || ''
        });
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.userId, navigate]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(t);
  }, [message]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.userId) return;
    setSaving(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('surname', form.surname);
      formData.append('description', form.description);
      if (avatarFile) formData.append('avatar', avatarFile);
      if (coverFile) formData.append('cover', coverFile);
      await api.patch('/auth/profile', formData);
      setMessage({ type: 'success', text: t('editProfile.profileSaved') });
      setAvatarFile(null);
      setCoverFile(null);
      setAvatarPreview('');
      setCoverPreview('');
      const res = await api.get(`/auth/profile/${user.userId}`);
      setProfile(res.data);
    } catch (err: any) {
      setMessage({ type: 'error', text: (err?.response?.data?.error as string) || t('editProfile.saveError') });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/profile');
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-4 min-h-[40vh]">
        <p className="text-uv-gray font-bold">{t('editProfile.loadError')}</p>
        <button onClick={() => navigate('/profile')} className="uv-button">{t('editProfile.backToProfile')}</button>
      </div>
    );
  }

  const coverSrc = coverPreview || profile.coverUrl || '';
  const avatarSrc = avatarPreview || profile.avatarUrl || '';

  return (
    <div className={`flex flex-col min-h-screen ${isSpace ? 'bg-[#050510]' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 flex items-center gap-3 px-3 py-3 md:px-6 border-b ${isSpace ? 'border-white/10 bg-[#050510]/90' : 'border-gray-200 bg-white'}`}>
        <button
          onClick={handleCancel}
          className="p-2 rounded-xl border border-uv-border hover:bg-gray-100 transition-colors"
        >
          <FiArrowLeft size={18} />
        </button>
        <h1 className={`text-lg md:text-xl font-black tracking-tight ${isSpace ? 'text-white' : 'text-uv-black'}`}>
          {t('editProfile.title')}
        </h1>
      </div>

      {message && (
        <div className={`mx-3 md:mx-6 mt-3 px-4 py-2 rounded-xl text-sm font-bold ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex-1 px-3 md:px-6 py-6 max-w-2xl mx-auto w-full space-y-6">
        {/* Cover */}
        <div className="relative h-40 md:h-48 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 border border-uv-border/50">
          {coverSrc ? (
            <img src={coverSrc.startsWith('http') ? coverSrc : `http://localhost:3000${coverSrc}`} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-primary/20" />
          )}
          <label className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white cursor-pointer bg-black/30 hover:bg-black/40 transition-colors">
            <FiCamera size={28} />
            <span className="text-xs font-black uppercase tracking-widest">{t('editProfile.changeCover')}</span>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
          </label>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-primary/10 flex items-center justify-center text-3xl font-black text-primary">
            {avatarSrc ? (
              <img src={avatarSrc.startsWith('http') ? avatarSrc : `http://localhost:3000${avatarSrc}`} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span>{(form.name || form.surname || '?')[0].toUpperCase()}</span>
            )}
          </div>
          <label className="px-4 py-2 rounded-xl border border-uv-border text-sm font-bold cursor-pointer hover:bg-gray-100 transition-colors">
            {t('editProfile.changeAvatar')}
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </label>
        </div>

        {/* Name fields */}
        <div className={`rounded-2xl p-4 md:p-6 border space-y-4 ${isSpace ? 'bg-[#0d0d1a] border-white/10' : 'bg-white border-gray-100'}`}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-uv-gray mb-1.5">{t('editProfile.name')}</label>
              <input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder={t('editProfile.name')}
                className={`w-full px-4 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-primary/30 text-sm ${isSpace ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-uv-black'}`}
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-uv-gray mb-1.5">{t('editProfile.surname')}</label>
              <input
                value={form.surname}
                onChange={e => setForm({ ...form, surname: e.target.value })}
                placeholder={t('editProfile.surname')}
                className={`w-full px-4 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-primary/30 text-sm ${isSpace ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-uv-black'}`}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-uv-gray mb-1.5">{t('editProfile.bio')}</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder={t('editProfile.bioPlaceholder')}
              rows={4}
              className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-primary/30 text-sm resize-none ${isSpace ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-uv-black'}`}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className={`flex-1 py-3 rounded-xl font-bold text-sm border ${isSpace ? 'border-white/20 text-white' : 'border-uv-border text-uv-black'}`}
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 uv-button py-3 text-sm font-bold disabled:opacity-60"
          >
            {saving ? t('settings.saving') : t('common.save')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProfile;
