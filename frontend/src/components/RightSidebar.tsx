import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiSearch, FiClock, FiBook, FiCoffee, FiInfo, FiArrowRight, FiCalendar, FiPercent } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useTranslatedMenu } from '../hooks/useTranslatedMenu';
import { formatPeriodLabel } from '../utils/translate';

interface DayMenu {
  date?: string;
  weekday?: string;
  soup?: string;
  main?: string;
  side?: string;
  salad?: string;
  yogurt?: string;
  dessert?: string;
  fruit?: string;
}

interface TodaysMenu {
  lunch?: DayMenu;
  dinner?: DayMenu;
  breakfast?: DayMenu;
  notices?: string[];
  pricing?: string[];
  allergenWarning?: string;
  periodLabel?: string;
  lastUpdated?: string;
  sourceUrl?: string;
}

function formatMenuLine(menu: DayMenu): string {
  const parts = [menu.soup, menu.main, menu.side, menu.salad, menu.dessert, menu.fruit].filter(Boolean);
  return parts.slice(0, 3).join(' · ');
}

function parsePricingSummary(pricing: string[]): string[] {
  const pairs: string[] = [];
  for (let i = 0; i < pricing.length - 1; i++) {
    const curr = pricing[i].trim();
    const next = pricing[i + 1].trim();
    if (/^\d+[,.]?\d*\s*TL$/i.test(next)) {
      const m = curr.match(/([A-Za-zğüşıöçĞÜŞİÖÇ\s]+?)\s*FİYATI\s*;?\s*$/i);
      const label = (m ? m[1].trim() : curr.slice(-12)).slice(0, 18);
      if (label) pairs.push(`${label}: ${next}`);
    }
  }
  return pairs.slice(0, 6);
}

const RightSidebar: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [recentItem, setRecentItem] = useState<any>(null);
  const [todaysMenu, setTodaysMenu] = useState<TodaysMenu | null>(null);

  useEffect(() => {
    fetchRecentItem();
  }, []);

  useEffect(() => {
    api.get<TodaysMenu>('/campus/menu').then((r) => setTodaysMenu(r.data)).catch(() => {});
  }, []);

  const { lunch: tLunch, dinner: tDinner } = useTranslatedMenu(
    todaysMenu?.lunch,
    todaysMenu?.dinner
  );

  const fetchRecentItem = async () => {
    try {
      const res = await api.get('/services/lost-items', { params: { limit: 1 } });
      if (res.data.items && res.data.items.length > 0) {
        setRecentItem(res.data.items[0]);
      }
    } catch (err) {
      console.error('Failed to fetch recent item');
    }
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
      {/* Search Bar - Marginal Style */}
      <div className="sticky top-0 bg-white pt-1 pb-3 z-10">
        <div className="flex items-center gap-3 bg-uv-border/50 border border-transparent focus-within:bg-white focus-within:border-primary/30 focus-within:ring-4 focus-within:ring-primary/5 px-5 py-3 rounded-tl-2xl rounded-br-2xl transition-all">
          <FiSearch className="text-uv-gray" />
          <input 
            type="text" 
            placeholder={t('rightSidebar.searchHub')} 
            className="bg-transparent border-none outline-none text-sm w-full font-medium"
          />
        </div>
      </div>

      {/* Campus Pulse Grid */}
      <div className="space-y-4">
        <h3 className="px-1 font-black text-2xl tracking-tighter text-uv-black flex items-center gap-2">
            {t('rightSidebar.campusPulse')} <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
            {/* Free Rooms Widget */}
            <div 
                onClick={() => navigate('/free-rooms')}
                className="uv-card p-4 hover:border-primary/30 uv-card-hover group"
            >
                <div className="w-10 h-10 bg-indigo-50 text-primary rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <FiClock size={20} />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-uv-gray mb-1">{t('rightSidebar.status')}</p>
                <p className="text-sm font-bold text-uv-black">{t('rightSidebar.freeRooms')}</p>
            </div>

            {/* Academic Calendar Widget */}
            <div 
                onClick={() => navigate('/academic-calendar')}
                className="uv-card p-4 hover:border-primary/30 uv-card-hover group"
            >
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <FiCalendar size={20} />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-uv-gray mb-1">{t('rightSidebar.academic')}</p>
                <p className="text-sm font-bold text-uv-black">{t('rightSidebar.academicCalendar')}</p>
            </div>

            {/* Library Widget */}
            <div className="uv-card p-4 hover:border-primary/30 uv-card-hover group">
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <FiBook size={20} />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-uv-gray mb-1">{t('rightSidebar.resources')}</p>
                <p className="text-sm font-bold text-uv-black">{t('rightSidebar.libraryHub')}</p>
            </div>

            {/* Grade Calculator Widget */}
            <div
                onClick={() => navigate('/grade-calculator')}
                className="uv-card p-4 hover:border-primary/30 uv-card-hover group cursor-pointer"
            >
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <FiPercent size={20} />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-uv-gray mb-1">{t('rightSidebar.tools')}</p>
                <p className="text-sm font-bold text-uv-black">{t('rightSidebar.gradeCalculator')}</p>
            </div>
        </div>

        {/* Food Widget - Today's Menu */}
        <div 
            onClick={() => navigate('/food-menu')}
            className="uv-card p-5 border-l-4 border-l-accent bg-accent/5 hover:border-primary/30 uv-card-hover cursor-pointer group"
        >
            <div className="flex justify-between items-start mb-2">
                <div className="w-10 h-10 bg-white text-accent rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <FiCoffee size={20} />
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="bg-white/50 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-black uppercase text-accent border border-accent/10">{t('foodMenu.todaysMenu')}</span>
                  {todaysMenu?.periodLabel && (
                    <span className="text-[10px] font-bold text-uv-gray">{formatPeriodLabel(todaysMenu.periodLabel)}</span>
                  )}
                </div>
            </div>
            {(tLunch ?? todaysMenu?.lunch) ? (
              <div className="space-y-2.5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-uv-gray mb-0.5">{t('foodMenu.lunch')}</p>
                  <p className="font-bold text-uv-black text-sm leading-tight">{formatMenuLine((tLunch ?? todaysMenu?.lunch)!)}</p>
                </div>
                {(tDinner ?? todaysMenu?.dinner) && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-uv-gray mb-0.5">{t('foodMenu.dinner')}</p>
                    <p className="font-medium text-uv-black text-xs leading-tight">{formatMenuLine((tDinner ?? todaysMenu?.dinner)!)}</p>
                  </div>
                )}
                {todaysMenu.notices && todaysMenu.notices.length > 0 && (
                  <div className="pt-1.5 border-t border-uv-border/50 space-y-0.5">
                    {todaysMenu.notices.map((n, i) => (
                      <p key={i} className="text-[10px] font-medium text-uv-gray">{n}</p>
                    ))}
                  </div>
                )}
                {todaysMenu.pricing && todaysMenu.pricing.length > 0 && (
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                    {parsePricingSummary(todaysMenu.pricing).slice(0, 4).map((p, i) => (
                      <span key={i} className="text-[9px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded">{p}</span>
                    ))}
                  </div>
                )}
                {todaysMenu.allergenWarning && (
                  <p className="text-[9px] text-uv-gray/80 leading-tight line-clamp-2" title={todaysMenu.allergenWarning}>
                    {todaysMenu.allergenWarning.substring(0, 80)}…
                  </p>
                )}
                <p className="text-[9px] text-uv-gray/60">{t('foodMenu.clickForDetails')}</p>
              </div>
            ) : (
              <>
                <p className="font-bold text-uv-black text-sm">{t('foodMenu.title')}</p>
                <p className="text-uv-gray text-xs mt-1 font-medium">{t('foodMenu.clickForDetails')}</p>
              </>
            )}
        </div>

        {/* Bulletin Widget */}
        <div className="uv-card p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                <FiInfo size={64} />
            </div>
            <h4 className="text-xs font-black uppercase text-uv-gray tracking-widest mb-3">{t('rightSidebar.communityBulletin')}</h4>
            {recentItem ? (
                <div className="space-y-2">
                    <p className="text-sm font-bold text-uv-black leading-tight">{t('rightSidebar.newReport')}: {recentItem.lost_item_name}</p>
                    <p className="text-xs text-uv-gray font-medium flex items-center gap-1">
                        <FiInfo /> {t('rightSidebar.lostNear')} {recentItem.location}
                    </p>
                    <button 
                        onClick={() => navigate(`/item/lost/${recentItem.lost_item_id}`)}
                        className="mt-2 flex items-center gap-2 text-primary font-black text-xs hover:gap-3 transition-all"
                    >
                        {t('rightSidebar.viewDetails')} <FiArrowRight />
                    </button>
                </div>
            ) : (
                <p className="text-sm font-bold text-uv-black">{t('rightSidebar.noUrgentAnnouncements')}</p>
            )}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-auto pt-8 px-2 border-t border-uv-border">
        <div className="flex items-center gap-2 mb-4 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-crosshair">
            <div className="w-6 h-6 bg-uv-black rounded-lg flex items-center justify-center text-white font-black text-[10px]">U</div>
            <span className="font-black tracking-tighter text-sm uppercase">{t('rightSidebar.universeEcosystem')}</span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-uv-gray text-[10px] font-bold uppercase tracking-widest">
            <a href="#" className="hover:text-primary">{t('rightSidebar.legal')}</a>
            <a href="#" className="hover:text-primary">{t('rightSidebar.privacy')}</a>
            <a href="#" className="hover:text-primary">{t('rightSidebar.credits')}</a>
            <span>© 2026</span>
        </div>
      </div>
    </div>
  );
};

export default RightSidebar;
