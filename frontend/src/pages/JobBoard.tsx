import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBriefcase, FiSend } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import { useAuth, isAcademic } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { themedAlert, themedConfirm, themedPrompt } from '../utils/themedDialog';

type JobPost = {
  job_post_id: number;
  created_by_user_id?: number | null;
  title: string;
  company_name: string | null;
  description: string | null;
  post_type: 'job' | 'internship';
  deadline_date: string;
  created_at: string;
  my_job_application_id?: number | null;
  my_job_application_status?: 'pending' | 'approved' | 'rejected' | 'cancelled' | null;
  my_job_application_submitted?: boolean | null;
};

const JobBoard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';
  const navigate = useNavigate();
  const canCreate = isAcademic(user?.role || '');

  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [pendingApps, setPendingApps] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: '',
    company_name: '',
    description: '',
    post_type: 'internship',
    deadline_date: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const jobsRes = await api.get('/community/jobs/board');
      setJobs(jobsRes?.data?.jobs || []);
      if (canCreate) {
        const appsRes = await api.get('/community/jobs/board/applications/pending');
        setPendingApps(appsRes?.data?.applications || []);
      } else {
        setPendingApps([]);
      }
    } catch (e: any) {
      await themedAlert(e?.response?.data?.error || 'Failed to load job board');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
  }, [canCreate]);

  const createPost = async () => {
    if (!form.title.trim() || !form.deadline_date) {
      await themedAlert('Please fill all required fields');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/community/jobs/board', {
        title: form.title.trim(),
        company_name: form.company_name.trim() || null,
        description: form.description.trim() || null,
        post_type: form.post_type,
        deadline_date: form.deadline_date,
      });
      setForm({ title: '', company_name: '', description: '', post_type: 'internship', deadline_date: '' });
      await themedAlert(t('jobBoard.postCreated'));
      await load();
    } catch (e: any) {
      await themedAlert(e?.response?.data?.error || 'Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  const applyToPost = async (jobPostId: number) => {
    try {
      const res = await api.post(`/community/jobs/${jobPostId}/applications/init`);
      navigate(`/community/jobs/applications/${res.data.jobApplicationId}`);
    } catch (e: any) {
      await themedAlert(e?.response?.data?.error || 'Failed to start application');
    }
  };

  const openMyApplication = (job: JobPost) => {
    if (!job.my_job_application_id) return;
    navigate(`/community/jobs/applications/${job.my_job_application_id}`);
  };

  const editPost = async (job: JobPost) => {
    const title = await themedPrompt(t('jobBoard.editTitlePrompt'), undefined, job.title);
    if (title === null) return;
    const companyName = await themedPrompt(
      t('jobBoard.editCompanyPrompt'),
      undefined,
      job.company_name || ''
    );
    if (companyName === null) return;
    const description = await themedPrompt(
      t('jobBoard.editDescriptionPrompt'),
      undefined,
      job.description || ''
    );
    if (description === null) return;
    const deadline = await themedPrompt(
      t('jobBoard.editDeadlinePrompt'),
      undefined,
      job.deadline_date ? new Date(job.deadline_date).toISOString().slice(0, 10) : ''
    );
    if (deadline === null) return;

    try {
      await api.patch(`/community/jobs/board/${job.job_post_id}`, {
        title: title.trim(),
        company_name: companyName.trim() || null,
        description: description.trim() || null,
        post_type: job.post_type,
        deadline_date: deadline,
      });
      await themedAlert(t('jobBoard.updated'));
      await load();
    } catch (e: any) {
      await themedAlert(e?.response?.data?.error || 'Failed to update listing');
    }
  };

  const removePost = async (jobPostId: number) => {
    const ok = await themedConfirm(t('jobBoard.deleteConfirm'));
    if (!ok) return;
    try {
      await api.delete(`/community/jobs/board/${jobPostId}`);
      await themedAlert(t('jobBoard.deleted'));
      await load();
    } catch (e: any) {
      await themedAlert(e?.response?.data?.error || 'Failed to delete listing');
    }
  };

  const decideApplication = async (appId: number, status: 'approved' | 'rejected') => {
    const note =
      status === 'rejected' ? (await themedPrompt(t('jobBoard.decisionNotePrompt'))) || undefined : undefined;
    try {
      await api.patch(`/community/jobs/applications/${appId}/decision`, { status, note });
      await themedAlert(t('jobBoard.decisionSaved'));
      await load();
    } catch (e: any) {
      await themedAlert(e?.response?.data?.error || 'Failed to decide application');
    }
  };

  return (
    <div className={`min-h-screen px-4 py-5 md:px-6 ${isSpace ? 'bg-[#050510]' : 'bg-[#f8f9fc]'}`}>
      <div className="max-w-5xl mx-auto space-y-4">
        <div className={`rounded-3xl border p-5 ${isSpace ? 'bg-[#0d0d1a] border-white/10' : 'bg-white border-uv-border'}`}>
          <h1 className={`text-xl font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('jobBoard.title')}</h1>
          <p className={`text-sm mt-1 ${isSpace ? 'text-white/60' : 'text-uv-gray'}`}>{t('jobBoard.subtitle')}</p>
        </div>

        {canCreate && (
          <div className={`rounded-3xl border p-5 space-y-3 ${isSpace ? 'bg-[#0d0d1a] border-white/10' : 'bg-white border-uv-border'}`}>
            <h2 className={`font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('jobBoard.createTitle')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select
                value={form.post_type}
                onChange={(e) => setForm((p) => ({ ...p, post_type: e.target.value }))}
                className={`px-4 py-3 rounded-2xl border ${
                  isSpace ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-uv-border text-uv-black'
                }`}
              >
                <option value="internship">{t('jobBoard.internship')}</option>
                <option value="job">{t('jobBoard.job')}</option>
              </select>
              <input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder={t('jobBoard.titlePlaceholder')}
                className={`px-4 py-3 rounded-2xl border ${
                  isSpace ? 'bg-white/5 border-white/10 text-white placeholder:text-white/40' : 'bg-white border-uv-border'
                }`}
              />
              <input
                value={form.company_name}
                onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
                placeholder={t('jobBoard.companyPlaceholder')}
                className={`px-4 py-3 rounded-2xl border ${
                  isSpace ? 'bg-white/5 border-white/10 text-white placeholder:text-white/40' : 'bg-white border-uv-border'
                }`}
              />
              <input
                type="date"
                value={form.deadline_date}
                onChange={(e) => setForm((p) => ({ ...p, deadline_date: e.target.value }))}
                className={`px-4 py-3 rounded-2xl border ${
                  isSpace ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-uv-border'
                }`}
              />
            </div>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder={t('jobBoard.descriptionPlaceholder')}
              rows={4}
              className={`w-full px-4 py-3 rounded-2xl border ${
                isSpace ? 'bg-white/5 border-white/10 text-white placeholder:text-white/40' : 'bg-white border-uv-border'
              }`}
            />
            <button
              type="button"
              disabled={submitting}
              onClick={() => createPost().catch(() => {})}
              className="px-5 py-3 rounded-2xl bg-primary text-white font-black inline-flex items-center gap-2 hover:brightness-95 disabled:opacity-60"
            >
              <FiSend /> {submitting ? t('common.processing') : t('jobBoard.publish')}
            </button>
          </div>
        )}

        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : jobs.length === 0 ? (
            <div className={`rounded-3xl border p-6 text-center ${isSpace ? 'bg-[#0d0d1a] border-white/10 text-white/60' : 'bg-white border-uv-border text-uv-gray'}`}>
              {t('jobBoard.empty')}
            </div>
          ) : (
            jobs.map((job) => (
              <div key={job.job_post_id} className={`rounded-3xl border p-5 ${isSpace ? 'bg-[#0d0d1a] border-white/10' : 'bg-white border-uv-border'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    {job.company_name ? (
                      <div className={`text-xs font-black uppercase tracking-widest ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>
                        {job.company_name}
                      </div>
                    ) : null}
                    <h3 className={`text-lg font-black mt-1 ${isSpace ? 'text-white' : 'text-uv-black'}`}>{job.title}</h3>
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-primary/10 text-primary text-xs font-black uppercase">
                    <FiBriefcase />
                    {job.post_type === 'job' ? t('jobBoard.job') : t('jobBoard.internship')}
                  </div>
                </div>
                {job.description ? (
                  <p className={`mt-3 text-sm ${isSpace ? 'text-white/70' : 'text-uv-gray'}`}>{job.description}</p>
                ) : null}
                <div className={`mt-3 text-xs font-bold uppercase tracking-widest ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>
                  {t('jobBoard.deadline')}: {new Date(job.deadline_date).toLocaleDateString()}
                </div>
                <div className="mt-4">
                  {canCreate ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => editPost(job).catch(() => {})}
                        className="px-5 py-3 rounded-2xl border border-uv-border text-uv-gray font-black hover:bg-gray-50"
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => removePost(job.job_post_id).catch(() => {})}
                        className="px-5 py-3 rounded-2xl bg-red-500 text-white font-black hover:brightness-95"
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  ) : (
                    job.my_job_application_id ? (
                      <div className="flex flex-col gap-2">
                        <div className={`text-xs font-black uppercase tracking-widest ${isSpace ? 'text-green-300' : 'text-green-700'}`}>
                          {t('jobBoard.applied')}
                        </div>
                        <button
                          type="button"
                          onClick={() => openMyApplication(job)}
                          className="px-5 py-3 rounded-2xl border border-uv-border text-uv-gray font-black hover:bg-gray-50"
                        >
                          {t('jobBoard.editApplication')}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => applyToPost(job.job_post_id).catch(() => {})}
                        className="px-5 py-3 rounded-2xl bg-primary text-white font-black hover:brightness-95"
                      >
                        {t('common.apply')}
                      </button>
                    )
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {canCreate && (
          <section className={`rounded-3xl border p-5 space-y-3 ${isSpace ? 'bg-[#0d0d1a] border-white/10' : 'bg-white border-uv-border'}`}>
            <h2 className={`font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('jobBoard.pendingApplications')}</h2>
            {pendingApps.length === 0 ? (
              <p className={`${isSpace ? 'text-white/60' : 'text-uv-gray'} text-sm`}>{t('jobBoard.noPending')}</p>
            ) : (
              <div className="space-y-3">
                {pendingApps.map((a: any) => (
                  <div key={a.job_application_id} className={`rounded-2xl border p-4 ${isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-gray-50'}`}>
                    <div className={`font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>{a.post_title}</div>
                    <div className={`text-xs mt-1 ${isSpace ? 'text-white/60' : 'text-uv-gray'}`}>
                      {a.first_name} {a.last_name} · {a.applicant_email}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => decideApplication(a.job_application_id, 'approved').catch(() => {})}
                        className="px-4 py-2 rounded-2xl bg-primary text-white font-black hover:brightness-95"
                      >
                        {t('common.approve')}
                      </button>
                      <button
                        type="button"
                        onClick={() => decideApplication(a.job_application_id, 'rejected').catch(() => {})}
                        className="px-4 py-2 rounded-2xl bg-red-500 text-white font-black hover:brightness-95"
                      >
                        {t('common.reject')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default JobBoard;

