import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiSearch, FiClock, FiBook, FiCoffee, FiArrowRight, FiCalendar, FiPercent, FiMapPin, FiTrash2 } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { runWhenIdle } from '../utils/runWhenIdle';
import { useTranslatedMenu } from '../hooks/useTranslatedMenu';
import { menuPeriodHeading } from '../utils/translate';
import { useAuth } from '../context/AuthContext';
import { themedAlert, themedConfirm } from '../utils/themedDialog';
import { toImgSrc } from '../utils/resolveMediaUrl';

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

const YASAR_LIBRARY_URL = 'https://library.yasar.edu.tr';

interface TodaysCampusEvent {
  event_id: number;
  community_id: number;
  created_by_user_id?: number;
  title: string;
  description?: string | null;
  location?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  community_name: string;
  poster_url?: string | null;
}

function formatEventTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Istanbul' });
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
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hubSearch, setHubSearch] = useState('');
  const [todaysEvents, setTodaysEvents] = useState<TodaysCampusEvent[]>([]);
  const [todaysMenu, setTodaysMenu] = useState<TodaysMenu | null>(null);

  /** Hub ana içeriğiyle yarışmayı azaltmak için yükleme ertelenir; iki çağrı paralel. */
  useEffect(() => {
    let mounted = true;
    const cancelIdle = runWhenIdle(() => {
      void Promise.all([
        api.get<{ events?: TodaysCampusEvent[] }>('/community/events/today'),
        api.get<TodaysMenu>('/campus/menu'),
      ])
        .then(([eventsRes, menuRes]) => {
          if (!mounted) return;
          setTodaysEvents(Array.isArray(eventsRes.data.events) ? eventsRes.data.events : []);
          setTodaysMenu(menuRes.data);
        })
        .catch(() => {});
    }, { timeoutMs: 2600 });

    return () => {
      mounted = false;
      cancelIdle();
    };
  }, []);

  const { lunch: tLunch, dinner: tDinner } = useTranslatedMenu(
    todaysMenu?.lunch,
    todaysMenu?.dinner
  );
  const displayLunch = tLunch ?? todaysMenu?.lunch;
  const displayDinner = tDinner ?? todaysMenu?.dinner;
  const menuNotices = todaysMenu?.notices ?? [];
  const menuPricing = todaysMenu?.pricing ?? [];
  const allergenWarning = todaysMenu?.allergenWarning;

  return (
    <div className="flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 sm:gap-6 sm:p-6 xl:gap-4 xl:p-4">
      {/* Search Bar - Marginal Style */}
      <div className="sticky top-0 bg-white pt-1 pb-3 z-10">
        <div className="flex items-center gap-3 bg-uv-border/50 border border-transparent focus-within:bg-white focus-within:border-primary/30 focus-within:ring-4 focus-within:ring-primary/5 px-4 py-2.5 rounded-tl-2xl rounded-br-2xl transition-all xl:px-3.5 xl:py-2">
          <FiSearch className="text-uv-gray" />
          <input 
            type="text" 
            value={hubSearch}
            onChange={(e) => setHubSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && hubSearch.trim()) {
                const q = hubSearch.trim();
                navigate(`/search?q=${encodeURIComponent(q)}&type=top&sort=relevance`);
              }
            }}
            placeholder={t('rightSidebar.searchHub')} 
            className="bg-transparent border-none outline-none text-sm w-full font-medium"
          />
        </div>
      </div>

      {/* Campus Pulse Grid */}
      <div className="space-y-4">
        <h3 className="px-1 font-black text-2xl tracking-tighter text-uv-black flex items-center gap-2 xl:text-xl">
            {t('rightSidebar.campusPulse')} <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        </h3>
        
        <div className="grid grid-cols-2 gap-3 xl:gap-2">
            {/* Free Rooms Widget */}
            <div 
                onClick={() => navigate('/free-rooms')}
                className="uv-card p-4 hover:border-primary/30 uv-card-hover group xl:p-3"
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
                className="uv-card p-4 hover:border-primary/30 uv-card-hover group xl:p-3"
            >
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <FiCalendar size={20} />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-uv-gray mb-1">{t('rightSidebar.academic')}</p>
                <p className="text-sm font-bold text-uv-black">{t('rightSidebar.academicCalendar')}</p>
            </div>

            {/* Library Widget — Yaşar Üniversitesi kütüphane portalı */}
            <div
                role="link"
                tabIndex={0}
                onClick={() => window.open(YASAR_LIBRARY_URL, '_blank', 'noopener,noreferrer')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    window.open(YASAR_LIBRARY_URL, '_blank', 'noopener,noreferrer');
                  }
                }}
                className="uv-card p-4 hover:border-primary/30 uv-card-hover group cursor-pointer xl:p-3"
            >
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <FiBook size={20} />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-uv-gray mb-1">{t('rightSidebar.resources')}</p>
                <p className="text-sm font-bold text-uv-black">{t('rightSidebar.libraryHub')}</p>
            </div>

            {/* Grade Calculator — sole shortcut in this panel */}
            <div
                onClick={() => navigate('/grade-calculator')}
                className="uv-card p-4 hover:border-primary/30 uv-card-hover group cursor-pointer xl:p-3"
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
            className="uv-card p-5 border-l-4 border-l-accent bg-accent/5 hover:border-primary/30 uv-card-hover cursor-pointer group xl:p-4"
        >
            <div className="flex justify-between items-start mb-2">
                <div className="w-10 h-10 bg-white text-accent rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <FiCoffee size={20} />
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="bg-white/50 backdrop-blur px-2 py-1 rounded-lg text-[10px] font-black uppercase text-accent border border-accent/10">{t('foodMenu.todaysMenu')}</span>
                  <span className="text-[10px] font-bold text-uv-gray">
                    {menuPeriodHeading(
                      todaysMenu?.periodLabel,
                      new Date().toISOString().slice(0, 10),
                      i18n.language
                    )}
                  </span>
                </div>
            </div>
            {displayLunch ? (
              <div className="space-y-2.5">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-uv-gray mb-0.5">{t('foodMenu.lunch')}</p>
                  <p className="font-bold text-uv-black text-sm leading-tight">{formatMenuLine(displayLunch)}</p>
                </div>
                {displayDinner && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-uv-gray mb-0.5">{t('foodMenu.dinner')}</p>
                    <p className="font-medium text-uv-black text-xs leading-tight">{formatMenuLine(displayDinner)}</p>
                  </div>
                )}
                {menuNotices.length > 0 && (
                  <div className="pt-1.5 border-t border-uv-border/50 space-y-0.5">
                    {menuNotices.map((n, i) => (
                      <p key={i} className="text-[10px] font-medium text-uv-gray">{n}</p>
                    ))}
                  </div>
                )}
                {menuPricing.length > 0 && (
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                    {parsePricingSummary(menuPricing).slice(0, 4).map((p, i) => (
                      <span key={i} className="text-[9px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded">{p}</span>
                    ))}
                  </div>
                )}
                {allergenWarning && (
                  <p className="text-[9px] text-uv-gray/80 leading-tight line-clamp-2" title={allergenWarning}>
                    {allergenWarning.substring(0, 80)}…
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

        {/* Bugün kampüste — community_events.start_at (Europe/Istanbul) bugün olanlar */}
        <div className="uv-card p-5 relative overflow-hidden group xl:p-4">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                <FiCalendar size={64} />
            </div>
            <h4 className="text-xs font-black uppercase text-uv-gray tracking-widest mb-3">{t('rightSidebar.todaysCampusEvents')}</h4>
            {todaysEvents.length > 0 ? (
                <ul className="relative z-[1] space-y-3">
                  {todaysEvents.slice(0, 6).map((ev) => {
                    const thumb = toImgSrc(ev.poster_url);
                    return (
                    <li key={ev.event_id} className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-1">
                      <button
                        type="button"
                        onClick={() => navigate(`/community/${ev.community_id}?eventId=${ev.event_id}`)}
                        className="flex min-w-0 flex-1 gap-2 rounded-xl border border-transparent text-left transition hover:border-primary/25 hover:bg-primary/[0.04]"
                      >
                        {thumb ? (
                          <div className="relative mt-0.5 h-14 w-10 shrink-0 overflow-hidden rounded-lg border border-uv-border/40">
                            <img src={thumb} alt="" className="h-full w-full object-cover" />
                          </div>
                        ) : null}
                        <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-uv-black leading-tight line-clamp-2">{ev.title}</p>
                        <p className="mt-0.5 text-[10px] font-black uppercase tracking-tight text-uv-gray">{ev.community_name}</p>
                        {(ev.start_at || ev.location) && (
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium text-uv-gray">
                            {ev.start_at ? (
                              <span className="inline-flex items-center gap-1">
                                <FiClock size={12} className="shrink-0 opacity-70" />
                                {formatEventTime(ev.start_at, i18n.language)}
                              </span>
                            ) : null}
                            {ev.location ? (
                              <span className="inline-flex min-w-0 items-center gap-1">
                                <FiMapPin size={12} className="shrink-0 opacity-70" />
                                <span className="truncate">{ev.location}</span>
                              </span>
                            ) : null}
                          </div>
                        )}
                        <span className="mt-1.5 inline-flex items-center gap-1.5 text-primary font-black text-[10px] uppercase tracking-widest">
                          {t('rightSidebar.viewDetails')} <FiArrowRight size={12} />
                        </span>
                        </div>
                      </button>
                      {user?.role === 'admin' ||
                      (!!user && Number(ev.created_by_user_id) === Number(user.userId)) ? (
                        <button
                          type="button"
                          title={t('communityProfile.removeEventButton')}
                          onClick={async (e) => {
                            e.stopPropagation();
                            const ok = await themedConfirm(t('communityProfile.removeEventConfirm'));
                            if (!ok) return;
                            try {
                              await api.delete(`/community/${ev.community_id}/events/${ev.event_id}`);
                              const eventsRes = await api.get<{ events?: TodaysCampusEvent[] }>('/community/events/today');
                              setTodaysEvents(Array.isArray(eventsRes.data.events) ? eventsRes.data.events : []);
                            } catch (e: unknown) {
                              const msg =
                                e && typeof e === 'object' && 'response' in e
                                  ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
                                  : undefined;
                              void themedAlert(msg || t('communityProfile.eventDeleteFailed'));
                            }
                          }}
                          className="inline-flex shrink-0 items-center justify-center gap-1 self-end rounded-lg border border-red-300 px-2 py-1.5 text-[10px] font-black uppercase tracking-tight text-red-700 transition-colors hover:bg-red-50 sm:self-start sm:pt-0.5"
                        >
                          <FiTrash2 size={13} className="shrink-0" aria-hidden />
                          <span className="hidden min-[380px]:inline">{t('communityProfile.removeEventButton')}</span>
                        </button>
                      ) : null}
                    </li>
                    );
                  })}
                </ul>
            ) : (
                <p className="text-sm font-bold text-uv-black">{t('rightSidebar.noEventsToday')}</p>
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
