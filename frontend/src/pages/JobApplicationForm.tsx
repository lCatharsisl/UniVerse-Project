import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { themedAlert } from '../utils/themedDialog';

const JobApplicationForm = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { jobApplicationId } = useParams<{ jobApplicationId: string }>();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [application, setApplication] = useState<any>(null);
  const [post, setPost] = useState<any>(null);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [reason, setReason] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  const load = async () => {
    if (!jobApplicationId) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/community/jobs/applications/${jobApplicationId}`);
      setApplication(res.data?.application || null);
      setPost(res.data?.post || null);
      setPhoneNumber(res.data?.application?.phone_number || '');
      setCoverLetter(res.data?.application?.cover_letter || '');
      setReason(res.data?.application?.reason || '');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load application');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobApplicationId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobApplicationId) return;
    if (!cvFile) {
      await themedAlert(t('communityApplication.cvRequired'));
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const form = new FormData();
      form.append('phone_number', phoneNumber);
      form.append('cover_letter', coverLetter);
      form.append('reason', reason);
      form.append('cv', cvFile);

      await api.patch(`/community/jobs/applications/${jobApplicationId}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      navigate('/job-board');
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = async () => {
    if (!jobApplicationId) return;
    setCancelling(true);
    setCancelError('');
    try {
      await api.patch(`/community/jobs/applications/${jobApplicationId}/cancel`, { note: 'Cancelled by applicant' });
      navigate('/job-board');
    } catch (e: any) {
      setCancelError(e?.response?.data?.error || 'Failed to cancel application');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen p-4 md:p-6 ${isSpace ? 'bg-[#050510]' : 'bg-white'}`}>
        <p className="text-uv-gray font-black uppercase tracking-widest text-[10px]">{t('communityApplication.loading')}</p>
      </div>
    );
  }

  if (error || !application || !post) {
    return (
      <div className={`min-h-screen p-4 md:p-6 ${isSpace ? 'bg-[#050510]' : 'bg-white'}`}>
        <div className="p-4 rounded-2xl border border-red-500/30 bg-red-50 text-red-700 font-bold">{error || t('common.notFound')}</div>
      </div>
    );
  }

  const canSubmit = application.status === 'pending';
  const canCancel = application.status !== 'pending' && !cancelling;

  return (
    <div className={`min-h-screen p-4 md:p-6 ${isSpace ? 'bg-[#050510]' : 'bg-white'}`}>
      <div className="max-w-3xl mx-auto space-y-4">
        <button
          type="button"
          onClick={() => navigate('/job-board')}
          className={`px-4 py-2 rounded-2xl font-black border ${isSpace ? 'border-white/10 text-white/70 hover:bg-white/5' : 'border-uv-border text-uv-gray hover:bg-gray-50'}`}
        >
          {t('common.back')}
        </button>

        <div className={`rounded-3xl border ${isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-gray-50'} p-4 md:p-5`}>
          <h1 className={`text-2xl font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('communityApplication.jobTitle')}</h1>
          <p className={`text-sm mt-2 ${isSpace ? 'text-white/70' : 'text-uv-gray'}`}>
            <span className="font-black">{post.title}</span>
          </p>
          <div className={`text-[10px] font-bold uppercase tracking-widest mt-2 ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>
            {t('communityApplication.statusLabel')}: {t(`communityApplication.status.${application.status}`)}
          </div>
        </div>

        {application.is_submitted && application.cv_file_url && (
          <a
            href={`http://localhost:3000${application.cv_file_url}`}
            target="_blank"
            rel="noreferrer"
            className={`block text-sm font-black ${isSpace ? 'text-primary/90 hover:text-primary' : 'text-primary hover:text-primary'}`}
          >
            {t('communityApplication.viewCv')}
          </a>
        )}

        {canCancel && (
          <div>
            <button
              type="button"
              onClick={() => setConfirmCancelOpen(true)}
              disabled={cancelling}
              className={`w-full bg-white text-uv-black font-black py-3 rounded-2xl border border-uv-border hover:bg-gray-50 transition-all active:scale-[0.98] disabled:opacity-50`}
            >
              {cancelling ? t('common.processing') : t('communityApplication.cancel')}
            </button>
            {cancelError ? (
              <div className="p-3 mt-3 rounded-xl bg-red-100 text-red-700 font-bold">{cancelError}</div>
            ) : null}
          </div>
        )}

        {confirmCancelOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <button
              type="button"
              aria-label="Close modal"
              className={`absolute inset-0 ${isSpace ? 'bg-black/70' : 'bg-black/45'}`}
              onClick={() => setConfirmCancelOpen(false)}
            />
            <div
              className={`relative w-full max-w-md rounded-3xl border p-5 shadow-2xl ${
                isSpace ? 'bg-[#0d0d1a] border-white/10' : 'bg-white border-uv-border'
              }`}
            >
              <h3 className={`text-lg font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>
                {t('communityApplication.cancel')}
              </h3>
              <p className={`mt-2 text-sm ${isSpace ? 'text-white/70' : 'text-uv-gray'}`}>
                {t('communityApplication.cancelConfirm')}
              </p>
              <div className="mt-4 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmCancelOpen(false)}
                  className={`px-4 py-2 rounded-2xl font-black border ${
                    isSpace ? 'border-white/10 text-white/70 hover:bg-white/5' : 'border-uv-border text-uv-gray hover:bg-gray-50'
                  }`}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmCancelOpen(false);
                    cancel().catch(() => {});
                  }}
                  className="px-4 py-2 rounded-2xl bg-primary text-white font-black hover:brightness-95 transition-all"
                >
                  {t('common.approve')}
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={submit} className={`rounded-3xl border ${isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-white'} p-4 md:p-5 space-y-4`}>
          <div className="space-y-1">
            <label className={`text-xs font-black uppercase tracking-widest ${isSpace ? 'text-white/60' : 'text-uv-gray'}`}>
              {t('communityApplication.phone')}
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className={`w-full px-4 py-3 rounded-2xl outline-none border ${isSpace ? 'bg-white/5 border-white/10 text-white placeholder:text-white/40' : 'bg-white border-uv-border text-uv-black'}`}
              required
              disabled={!canSubmit}
            />
          </div>

          <div className="space-y-1">
            <label className={`text-xs font-black uppercase tracking-widest ${isSpace ? 'text-white/60' : 'text-uv-gray'}`}>
              {t('communityApplication.cv')}
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setCvFile(e.target.files?.[0] || null)}
              className={`w-full px-4 py-3 rounded-2xl outline-none border ${isSpace ? 'bg-white/5 border-white/10 text-white placeholder:text-white/40' : 'bg-white border-uv-border text-uv-black'}`}
              disabled={!canSubmit}
              required={!application.is_submitted}
            />
          </div>

          <div className="space-y-1">
            <label className={`text-xs font-black uppercase tracking-widest ${isSpace ? 'text-white/60' : 'text-uv-gray'}`}>
              {t('communityApplication.coverLetter')}
            </label>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              className={`w-full px-4 py-3 rounded-2xl outline-none border min-h-[120px] resize-none ${isSpace ? 'bg-white/5 border-white/10 text-white placeholder:text-white/40' : 'bg-white border-uv-border text-uv-black'}`}
              disabled={!canSubmit}
              required
            />
          </div>

          <div className="space-y-1">
            <label className={`text-xs font-black uppercase tracking-widest ${isSpace ? 'text-white/60' : 'text-uv-gray'}`}>
              {t('communityApplication.reason')}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className={`w-full px-4 py-3 rounded-2xl outline-none border min-h-[90px] resize-none ${isSpace ? 'bg-white/5 border-white/10 text-white placeholder:text-white/40' : 'bg-white border-uv-border text-uv-black'}`}
              disabled={!canSubmit}
              required
            />
          </div>

          {error && <div className="p-3 rounded-xl bg-red-100 text-red-700 font-bold">{error}</div>}

          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className={`w-full bg-primary text-white font-black py-4 rounded-2xl hover:brightness-95 transition-all active:scale-[0.98] disabled:opacity-50`}
          >
            {submitting ? t('common.processing') : t('communityApplication.submit')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default JobApplicationForm;

