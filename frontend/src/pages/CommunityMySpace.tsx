import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiBriefcase,
  FiCompass,
  FiBell,
  FiSettings,
  FiUsers,
  FiExternalLink,
  FiGrid,
} from 'react-icons/fi';
import api from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { resolveMediaUrl } from '../utils/resolveMediaUrl';

type OwnedCommunity = {
  community_id: number;
  community_name: string;
  description?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  member_count?: number;
  is_admin?: boolean;
};

const CommunityMySpace = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';

  const [loading, setLoading] = useState(true);
  const [owned, setOwned] = useState<OwnedCommunity[]>([]);
  const [pendingById, setPendingById] = useState<Record<number, { events: number; members: number }>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get('/community/me');
        const list = (res.data?.communities || []) as OwnedCommunity[];
        const rows = list.filter((c) => c.is_admin);
        if (cancelled) return;
        setOwned(rows);

        const pending: Record<number, { events: number; members: number }> = {};
        await Promise.all(
          rows.map(async (c) => {
            try {
              const [e, m] = await Promise.all([
                api.get(`/community/${c.community_id}/admin/event-applications/pending`),
                api.get(`/community/${c.community_id}/admin/members/pending`),
              ]);
              pending[c.community_id] = {
                events: (e.data?.applications || []).length,
                members: (m.data?.members || []).length,
              };
            } catch {
              pending[c.community_id] = { events: 0, members: 0 };
            }
          })
        );
        if (!cancelled) setPendingById(pending);
      } catch {
        if (!cancelled) setOwned([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className={`flex-1 flex items-center justify-center min-h-[50vh] ${isSpace ? 'bg-[#050510]' : 'bg-white'}`}>
        <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen ${isSpace ? 'bg-[#050510]' : 'bg-white'}`}>
      <div className="px-4 md:px-6 pt-4 pb-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className={`p-2 rounded-xl border transition-colors ${
            isSpace ? 'border-white/15 text-white hover:bg-white/10' : 'border-uv-border text-uv-black hover:bg-gray-50'
          }`}
          aria-label={t('common.back')}
        >
          <FiArrowLeft size={20} />
        </button>
        <div>
          <h1 className={`text-xl md:text-2xl font-black tracking-tight ${isSpace ? 'text-white' : 'text-uv-black'}`}>
            {t('communityMySpace.title')}
          </h1>
          <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${isSpace ? 'text-white/45' : 'text-uv-gray'}`}>
            {t('communityMySpace.subtitle')}
          </p>
        </div>
      </div>

      <div className="px-4 md:px-6 pb-10 max-w-2xl mx-auto w-full space-y-6">
        {owned.length === 0 ? (
          <div
            className={`rounded-3xl border p-8 text-center ${
              isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-gray-50'
            }`}
          >
            <p className={`font-black uppercase tracking-widest text-xs ${isSpace ? 'text-white/60' : 'text-uv-gray'}`}>
              {t('communityMySpace.noOwnedCommunity')}
            </p>
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="mt-4 uv-button text-xs"
            >
              {t('communityMySpace.openSettings')}
            </button>
          </div>
        ) : (
          owned.map((c) => {
            const pend = pendingById[c.community_id] || { events: 0, members: 0 };
            const pendingTotal = pend.events + pend.members;
            return (
              <section
                key={c.community_id}
                className={`rounded-3xl border overflow-hidden shadow-lg ${
                  isSpace ? 'border-white/10 bg-white/[0.04]' : 'border-uv-border bg-white'
                }`}
              >
                <div className="relative h-36 md:h-44">
                  {c.cover_url ? (
                    <img src={resolveMediaUrl(c.cover_url)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/70 to-accent opacity-80" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-end gap-3">
                    <div
                      className={`w-14 h-14 rounded-2xl border-2 border-white/40 overflow-hidden shrink-0 flex items-center justify-center font-black text-lg ${
                        isSpace ? 'bg-white/10 text-white' : 'bg-white text-primary'
                      }`}
                    >
                      {c.avatar_url ? (
                        <img src={resolveMediaUrl(c.avatar_url)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span>{c.community_name?.[0]?.toUpperCase() || 'C'}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg md:text-xl font-black text-white truncate">{c.community_name}</h2>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/75 flex items-center gap-1">
                        <FiUsers size={12} /> {c.member_count ?? 0} {t('communityMySpace.members')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 md:p-5 space-y-3">
                  {c.description ? (
                    <p className={`text-sm line-clamp-3 ${isSpace ? 'text-white/70' : 'text-uv-gray'}`}>{c.description}</p>
                  ) : null}

                  {pendingTotal > 0 ? (
                    <div
                      className={`rounded-2xl px-3 py-2 text-[10px] font-black uppercase tracking-widest ${
                        isSpace ? 'bg-amber-500/15 text-amber-200 border border-amber-500/30' : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {t('communityMySpace.pendingBadge', { count: pendingTotal })}
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => navigate(`/community/${c.community_id}`)}
                      className={`flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                        isSpace
                          ? 'bg-white/10 text-white border border-white/15 hover:bg-white/15'
                          : 'bg-gray-50 text-uv-black border border-uv-border hover:bg-gray-100'
                      }`}
                    >
                      <FiExternalLink size={16} />
                      {t('communityMySpace.publicPage')}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/community/${c.community_id}/admin`)}
                      className="flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-xs uppercase tracking-widest bg-primary text-white hover:brightness-105 transition-all"
                    >
                      <FiGrid size={16} />
                      {t('communityMySpace.adminPanel')}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/notifications')}
                      className={`flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                        isSpace
                          ? 'bg-white/10 text-white border border-white/15 hover:bg-white/15'
                          : 'bg-gray-50 text-uv-black border border-uv-border hover:bg-gray-100'
                      }`}
                    >
                      <FiBell size={16} />
                      {t('communityMySpace.notifications')}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/explore')}
                      className={`flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                        isSpace
                          ? 'bg-white/10 text-white border border-white/15 hover:bg-white/15'
                          : 'bg-gray-50 text-uv-black border border-uv-border hover:bg-gray-100'
                      }`}
                    >
                      <FiCompass size={16} />
                      {t('communityMySpace.fair')}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/job-board')}
                      className={`flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-xs uppercase tracking-widest sm:col-span-2 transition-all ${
                        isSpace
                          ? 'bg-white/10 text-white border border-white/15 hover:bg-white/15'
                          : 'bg-gray-50 text-uv-black border border-uv-border hover:bg-gray-100'
                      }`}
                    >
                      <FiBriefcase size={16} />
                      {t('communityMySpace.jobBoard')}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate('/settings')}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${
                      isSpace ? 'border-white/15 text-white/70 hover:bg-white/5' : 'border-uv-border text-uv-gray hover:bg-gray-50'
                    }`}
                  >
                    <FiSettings size={14} />
                    {t('communityMySpace.accountSettings')}
                  </button>
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CommunityMySpace;
