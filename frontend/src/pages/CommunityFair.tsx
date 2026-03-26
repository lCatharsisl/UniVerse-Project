import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { COMMUNITY_CATEGORY_CODES, COMMUNITY_CATEGORY_LABEL_KEYS, type CommunityCategoryCode } from '../constants/communityCategories';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronLeft, FiChevronRight, FiUsers } from 'react-icons/fi';

const CommunityFair = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';

  const [selectedCategory, setSelectedCategory] = useState<CommunityCategoryCode | null>(null);
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const categories = useMemo(() => COMMUNITY_CATEGORY_CODES as CommunityCategoryCode[], []);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/community/fair', {
        params: selectedCategory ? { category: selectedCategory } : undefined,
      });
      setCommunities(res.data?.items || []);
      setActiveIndex(0);
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

  const current = communities[activeIndex];

  const canPrev = activeIndex > 0;
  const canNext = activeIndex < communities.length - 1;

  const next = () => setActiveIndex((i) => Math.min(i + 1, communities.length - 1));
  const prev = () => setActiveIndex((i) => Math.max(i - 1, 0));

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
      <div className="max-w-3xl mx-auto space-y-4">
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
          <div className="relative">
            <div className="flex items-center justify-between gap-4 mb-3">
              <button
                type="button"
                onClick={prev}
                disabled={!canPrev}
                className={`p-2 rounded-xl transition-all ${!canPrev ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/50'}`}
              >
                <FiChevronLeft size={20} className={isSpace ? 'text-white' : 'text-uv-black'} />
              </button>
              <div className={`text-[10px] font-black uppercase tracking-widest ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>
                {activeIndex + 1} / {communities.length}
              </div>
              <button
                type="button"
                onClick={next}
                disabled={!canNext}
                className={`p-2 rounded-xl transition-all ${!canNext ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/50'}`}
              >
                <FiChevronRight size={20} className={isSpace ? 'text-white' : 'text-uv-black'} />
              </button>
            </div>

            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.community_id}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  drag="x"
                  onDragEnd={(e, info) => {
                    if (info.offset.x <= -80) next();
                    if (info.offset.x >= 80) prev();
                  }}
                  className={`rounded-3xl overflow-hidden shadow-2xl border ${
                    isSpace ? 'bg-white/5 border-white/10' : 'bg-white border-uv-border'
                  }`}
                >
                  <div className="relative h-40 md:h-52">
                    {current.cover_url ? (
                      <img src={`http://localhost:3000${current.cover_url}`} alt={current.community_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full ${isSpace ? 'bg-primary/20' : 'bg-primary/10'}`} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                    <div className="absolute left-4 bottom-3 flex items-center gap-3">
                      {current.avatar_url ? (
                        <img
                          src={`http://localhost:3000${current.avatar_url}`}
                          alt={current.community_name}
                          className="w-12 h-12 md:w-14 md:h-14 rounded-2xl border-2 border-white/30 object-cover bg-white"
                        />
                      ) : (
                        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center font-black ${isSpace ? 'bg-white/10 text-white' : 'bg-primary/10 text-primary'} border-2 border-white/30`}>
                          {current.community_name?.[0]?.toUpperCase() || 'C'}
                        </div>
                      )}
                      <div>
                        <h2 className={`text-xl md:text-2xl font-black ${isSpace ? 'text-white' : 'text-white'}`}>{current.community_name}</h2>
                        <div className={`text-[10px] font-black uppercase tracking-widest ${isSpace ? 'text-white/70' : 'text-white/70'} flex items-center gap-1`}>
                          <FiUsers size={12} /> {current.member_count || 0}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 md:p-5">
                    <p className={`text-sm md:text-[15px] ${isSpace ? 'text-white/80' : 'text-uv-black/90'} line-clamp-3`}>
                      {current.description || t('communityFair.noDescription')}
                    </p>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {(current.category_codes || []).slice(0, 3).map((code: string) => (
                        <span key={code} className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-xl border ${isSpace ? 'bg-white/5 border-white/10 text-white/70' : 'bg-primary/10 border-primary/20 text-primary'}`}>
                          {t(COMMUNITY_CATEGORY_LABEL_KEYS[code as CommunityCategoryCode] || 'communityCategory.other')}
                        </span>
                      ))}
                      {(!current.category_codes || current.category_codes.length === 0) && (
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-xl border ${isSpace ? 'bg-white/5 border-white/10 text-white/70' : 'bg-primary/10 border-primary/20 text-primary'}`}>
                          {t('communityCategory.other')}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => navigate(`/community/${current.community_id}`)}
                      className={`w-full mt-4 bg-primary text-white font-black py-3 rounded-2xl hover:brightness-95 transition-all active:scale-[0.98]`}
                    >
                      {t('communityFair.viewProfile')}
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2 justify-center mt-4">
              {communities.map((c, idx) => (
                <button
                  key={c.community_id}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${idx === activeIndex ? 'bg-primary' : isSpace ? 'bg-white/20' : 'bg-gray-200'}`}
                  aria-label={`Go to ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityFair;

