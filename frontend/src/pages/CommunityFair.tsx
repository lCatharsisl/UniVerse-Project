import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { COMMUNITY_CATEGORY_CODES, COMMUNITY_CATEGORY_LABEL_KEYS, type CommunityCategoryCode } from '../constants/communityCategories';
import { motion } from 'framer-motion';
import { FiUsers } from 'react-icons/fi';
import { toImgSrc } from '../utils/resolveMediaUrl';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const } },
};

const CommunityFair = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';

  const [selectedCategory, setSelectedCategory] = useState<CommunityCategoryCode | null>(null);
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const categories = useMemo(
    () => [...COMMUNITY_CATEGORY_CODES] as CommunityCategoryCode[],
    []
  );

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/community/fair', {
        params: selectedCategory ? { category: selectedCategory } : undefined,
      });
      setCommunities(res.data?.items || []);
    } catch (e: any) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      const backendError =
        data?.error ||
        data?.message ||
        (typeof data === 'string' ? data : undefined);

      setError(
        backendError ||
          (status ? `Failed to load communities (HTTP ${status})` : 'Failed to load communities')
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  if (loading) {
    return (
      <div className={`min-h-screen p-4 md:p-6 ${isSpace ? 'bg-[#050510]' : 'bg-white'}`}>
        <p className="text-uv-gray font-black uppercase tracking-widest text-[10px]">{t('communityFair.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen p-4 md:p-6 ${isSpace ? 'bg-[#050510]' : 'bg-white'}`}>
        <div className="p-4 rounded-2xl border border-red-500/30 bg-red-50 text-red-700 font-bold">{error}</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 md:p-6 ${isSpace ? 'bg-[#050510]' : 'bg-white'}`}>
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className={`text-2xl font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('communityFair.title')}</h1>
            <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>
              {t('communityFair.subtitle')}
            </p>
          </div>
        </div>

        <div className={`flex flex-wrap gap-2 ${isSpace ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'} border rounded-2xl p-3`}>
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              selectedCategory === null
                ? isSpace
                  ? 'bg-white/10 text-white'
                  : 'bg-white text-uv-black border'
                : isSpace
                  ? 'text-white/60 hover:text-white'
                  : 'text-uv-gray hover:text-uv-black'
            }`}
          >
            {t('communityFair.all')}
          </button>
          {categories.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setSelectedCategory(code)}
              className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                selectedCategory === code
                  ? isSpace
                    ? 'bg-primary text-white'
                    : 'bg-primary text-white'
                  : isSpace
                    ? 'text-white/60 hover:text-white'
                    : 'text-uv-gray hover:text-uv-black'
              }`}
            >
              {t(COMMUNITY_CATEGORY_LABEL_KEYS[code])}
            </button>
          ))}
        </div>

        {communities.length === 0 ? (
          <div className={`rounded-2xl p-8 text-center border ${isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-gray-50'}`}>
            <p className={`font-black uppercase tracking-widest text-[10px] ${isSpace ? 'text-white/60' : 'text-uv-gray'}`}>
              {t('communityFair.empty')}
            </p>
          </div>
        ) : (
          <motion.div
            key={selectedCategory ?? 'all'}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {communities.map((c) => {
              const cover = toImgSrc(c.cover_url);
              const av = toImgSrc(c.avatar_url);
              return (
              <motion.article
                key={c.community_id}
                variants={cardVariants}
                className={`flex flex-col rounded-3xl overflow-hidden shadow-lg border ${
                  isSpace ? 'bg-white/5 border-white/10' : 'bg-white border-uv-border'
                }`}
              >
                <div className="relative h-36 md:h-40 shrink-0">
                  {cover ? (
                    <img
                      src={cover}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className={`w-full h-full ${isSpace ? 'bg-primary/20' : 'bg-primary/10'}`} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                  <div className="absolute left-3 bottom-2.5 flex items-center gap-2.5 pr-2">
                    {av ? (
                      <img
                        src={av}
                        alt=""
                        className="w-10 h-10 rounded-xl border-2 border-white/30 object-cover bg-white shrink-0"
                      />
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border-2 border-white/30 shrink-0 ${
                          isSpace ? 'bg-white/10 text-white' : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {c.community_name?.[0]?.toUpperCase() || 'C'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h2 className="text-base md:text-lg font-black text-white truncate">{c.community_name}</h2>
                      <div className="text-[9px] font-black uppercase tracking-widest text-white/75 flex items-center gap-1">
                        <FiUsers size={11} /> {c.member_count || 0}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-1 min-h-0">
                  <p
                    className={`text-sm line-clamp-3 flex-1 ${
                      isSpace ? 'text-white/80' : 'text-uv-black/90'
                    }`}
                  >
                    {c.description || t('communityFair.noDescription')}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {(c.category_codes || []).slice(0, 4).map((code: string) => (
                      <span
                        key={code}
                        className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${
                          isSpace ? 'bg-white/5 border-white/10 text-white/70' : 'bg-primary/10 border-primary/20 text-primary'
                        }`}
                      >
                        {t(COMMUNITY_CATEGORY_LABEL_KEYS[code as CommunityCategoryCode] || 'communityCategory.other')}
                      </span>
                    ))}
                    {(!c.category_codes || c.category_codes.length === 0) && (
                      <span
                        className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${
                          isSpace ? 'bg-white/5 border-white/10 text-white/70' : 'bg-primary/10 border-primary/20 text-primary'
                        }`}
                      >
                        {t('communityCategory.other')}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/community/${c.community_id}`)}
                    className="w-full mt-4 bg-primary text-white font-black py-2.5 rounded-2xl hover:brightness-95 transition-all active:scale-[0.98] text-xs"
                  >
                    {t('communityFair.viewProfile')}
                  </button>
                </div>
              </motion.article>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CommunityFair;
