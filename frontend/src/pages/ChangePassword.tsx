import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiLock } from 'react-icons/fi';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const ChangePassword = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.userId) {
      navigate('/login');
      return;
    }
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: t('changePassword.minLengthError') });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: t('changePassword.mismatchError') });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await api.patch('/auth/profile', { password: newPassword });
      setMessage({ type: 'success', text: t('changePassword.passwordUpdated') });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setMessage({ type: 'error', text: (err?.response?.data?.error as string) || t('changePassword.passwordError') });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => navigate('/profile');

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
          {t('changePassword.title')}
        </h1>
      </div>

      <div className="flex-1 px-3 md:px-6 py-8 max-w-md mx-auto w-full">
        {message && (
          <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-bold ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
          </div>
        )}

        <div className={`rounded-2xl p-6 border ${isSpace ? 'bg-[#0d0d1a] border-white/10' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <FiLock size={24} className="text-primary" />
            </div>
            <p className={`text-sm ${isSpace ? 'text-white/80' : 'text-uv-gray'}`}>
              {t('changePassword.instruction')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-uv-gray mb-1.5">{t('changePassword.newPassword')}</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder={t('changePassword.min8Chars')}
                minLength={8}
                className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-primary/30 text-sm ${isSpace ? 'bg-white/5 border-white/10 text-white placeholder:text-white/40' : 'bg-gray-50 border-gray-200 text-uv-black'}`}
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-uv-gray mb-1.5">{t('changePassword.newPasswordRepeat')}</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder={t('changePassword.repeatPassword')}
                minLength={8}
                className={`w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-primary/30 text-sm ${isSpace ? 'bg-white/5 border-white/10 text-white placeholder:text-white/40' : 'bg-gray-50 border-gray-200 text-uv-black'}`}
              />
            </div>
            <div className="flex gap-3 pt-2">
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
                {saving ? t('settings.saving') : t('settings.updatePassword')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;
