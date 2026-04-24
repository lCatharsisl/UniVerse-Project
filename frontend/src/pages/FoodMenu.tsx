import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FiCoffee,
  FiCalendar,
  FiExternalLink,
  FiDollarSign,
  FiAlertTriangle,
  FiSun,
  FiMoon,
} from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';
import api from '../api/client';
import { useTranslatedMenu } from '../hooks/useTranslatedMenu';
import { useTranslatedStrings } from '../hooks/useTranslatedStrings';
import { menuPeriodHeading } from '../utils/translate';

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
  extras?: string[];
}

interface MenuByDate {
  lunch?: DayMenu;
  dinner?: DayMenu;
  breakfast?: DayMenu;
  notices: string[];
  pricing?: string[];
  allergenWarning?: string;
  periodLabel?: string;
  lastUpdated?: string;
  sourceUrl?: string;
  /** Backend: PDF/cache’de gün yok; çorba alanında açıklama metni */
  isPlaceholder?: boolean;
}

type MenuValueKey = 'soup' | 'main' | 'side' | 'salad' | 'yogurt' | 'dessert' | 'fruit';

const MENU_ITEM_KEYS: MenuValueKey[] = ['soup', 'main', 'side', 'salad', 'yogurt', 'dessert', 'fruit'];

/** Backend `YASAR_MENU_PDF_URL` ile aynı varsayılan — görüntüleme yönlendirmesi */
const OFFICIAL_MENU_PDF_URL = 'https://www.yasar.edu.tr/yemek-liste.pdf';

function menuPdfPublicHref(sourceUrl: string | undefined | null): string {
  if (sourceUrl && /^https?:\/\//i.test(sourceUrl) && !sourceUrl.startsWith('file:')) {
    return sourceUrl;
  }
  return OFFICIAL_MENU_PDF_URL;
}

function sanitizeDisplay(val: string | undefined): string {
  if (!val) return '';
  const s = val.trim();
  if (/<|>|id\s*=|^<g\s|svg|path\s+d=/i.test(s)) return '';
  return s;
}

function formatDateLabel(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function parsePricingSummary(pricing: string[]): { label: string; price: string }[] {
  const pairs: { label: string; price: string }[] = [];
  for (let i = 0; i < pricing.length - 1; i++) {
    const curr = pricing[i].trim();
    const next = pricing[i + 1].trim();
    if (/^\d+[,.]?\d*\s*TL$/i.test(next)) {
      const m = curr.match(/([A-Za-zğüşıöçĞÜŞİÖÇ\s]+?)\s*FİYATI\s*;?\s*$/i);
      const label = (m ? m[1].trim() : curr.slice(-18)).replace(/\s+/g, ' ').slice(0, 22);
      if (label) pairs.push({ label, price: next });
    }
  }
  return pairs.slice(0, 8);
}

function MenuCard({
  menu,
  title,
  Icon,
  accentColor,
  isSpace,
}: {
  menu: DayMenu;
  title: string;
  Icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  accentColor: string;
  isSpace: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border backdrop-blur-sm transition-all duration-300 ${
        isSpace
          ? 'border-primary/20 bg-gradient-to-br from-indigo-950/40 to-slate-900/60'
          : 'border-slate-200 bg-white shadow-sm'
      }`}
      style={isSpace ? { boxShadow: '0 0 40px -10px rgba(79, 70, 229, 0.15)' } : undefined}
    >
      <div
        className={`absolute top-0 left-0 w-1 h-full ${accentColor}`}
        aria-hidden
      />
      <div className="p-4 sm:p-5 lg:p-6">
        <div className="flex items-center gap-3 mb-4 sm:mb-5">
          <div
            className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-lg ${
              isSpace ? 'bg-primary/20 text-primary' : 'bg-slate-100 text-slate-600'
            }`}
          >
            <Icon size={18} className="sm:w-5 sm:h-5" strokeWidth={2.5} />
          </div>
          <h3
            className={`text-sm sm:text-base font-bold tracking-tight ${
              isSpace ? 'text-indigo-100' : 'text-slate-800'
            }`}
          >
            {title}
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:gap-3">
          {MENU_ITEM_KEYS.map(
            (key) => {
              const raw = menu[key];
              const val = typeof raw === 'string' ? sanitizeDisplay(raw) : '';
              if (!val) return null;
              return (
                <div
                  key={key}
                  className={`flex flex-col gap-0.5 p-2.5 sm:p-3 rounded-xl border min-w-0 ${
                    isSpace
                      ? 'border-primary/10 bg-white/[0.03]'
                      : 'border-slate-100 bg-slate-50/80'
                  }`}
                >
                  <p
                    className={`text-[10px] font-semibold uppercase tracking-wider ${
                      isSpace ? 'text-primary/80' : 'text-slate-500'
                    }`}
                  >
                    {t(`foodMenu.${key}`)}
                  </p>
                  <p
                    className={`text-xs sm:text-sm font-medium leading-snug break-words ${
                      isSpace ? 'text-slate-200' : 'text-slate-800'
                    }`}
                    title={val}
                  >
                    {val}
                  </p>
                </div>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
}

const FoodMenu: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';

  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [data, setData] = useState<MenuByDate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ min: string; max: string } | null>(null);

  const officialPdfHref = useMemo(() => menuPdfPublicHref(data?.sourceUrl), [data?.sourceUrl]);

  const cachedRangeHint = useMemo(() => {
    if (!dateRange?.min || !dateRange?.max) return null;
    const fmt = (iso: string) =>
      new Date(iso + 'T12:00:00').toLocaleDateString(
        i18n.language?.startsWith('tr') ? 'tr-TR' : 'en-US',
        { day: 'numeric', month: 'short' }
      );
    return `${fmt(dateRange.min)} – ${fmt(dateRange.max)}`;
  }, [dateRange, i18n.language]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Önce tarih: backend bu gün yoksa PDF çeker ve cache’i günceller. Paralelde /menu/full
        // eski ayı döndürüp min/max aralığını (ve bazen hata) bozuyordu.
        const dateRes = await api.get<MenuByDate>(`/campus/menu/date/${selectedDate}`);
        const fullRes = await api.get<{ sections?: { type: string; days: DayMenu[] }[] }>('/campus/menu/full');
        if (cancelled) return;
        const sections = fullRes.data?.sections || [];
        const lunchSection = sections.find((s) => s.type === 'lunch');
        const days = lunchSection?.days || [];
        if (days.length > 0) {
          const dates = days
            .map((d) => d.date)
            .filter((date): date is string => Boolean(date))
            .sort();
          if (dates.length > 0) {
            setDateRange({ min: dates[0], max: dates[dates.length - 1] });
          }
        }
        setData(dateRes.data);
      } catch (e: unknown) {
        if (cancelled) return;
        const msg = e && typeof e === 'object' && 'response' in e ? (e as { response?: { data?: { error?: string } } }).response?.data?.error : 'Failed to load menu';
        setError(String(msg));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedDate]);

  const lunch = data?.lunch;
  const dinner = data?.dinner;
  const breakfast = data?.breakfast;

  const { lunch: tLunch, dinner: tDinner, breakfast: tBreakfast } = useTranslatedMenu(
    lunch,
    dinner,
    breakfast
  );

  const pricingPairs = useMemo(
    () => (data?.pricing ? parsePricingSummary(data.pricing) : []),
    [data?.pricing]
  );
  const translatedPricingLabels = useTranslatedStrings(pricingPairs.map((p) => p.label));
  const translatedPricing = useMemo(
    () =>
      pricingPairs.map((p, i) => ({ ...p, label: translatedPricingLabels[i] ?? p.label })),
    [pricingPairs, translatedPricingLabels]
  );

  const allergenTranslated = useTranslatedStrings(
    data?.allergenWarning ? [data.allergenWarning] : []
  );
  const noticesTranslated = useTranslatedStrings(data?.notices ?? []);

  return (
    <div
      className={`relative flex flex-col min-h-screen transition-colors duration-500 ${
        isSpace
          ? 'bg-[#030712] selection:bg-primary/30 selection:text-white'
          : 'bg-slate-50 selection:bg-primary selection:text-white'
      }`}
    >
      {isSpace && (
        <div
          className="pointer-events-none fixed inset-0 overflow-hidden"
          aria-hidden
        >
          <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-primary/[0.03] to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/2 w-1/2 h-full bg-gradient-to-tr from-indigo-500/[0.02] to-transparent rounded-full blur-3xl" />
        </div>
      )}

      <header
        className={`relative flex-shrink-0 sticky top-0 z-30 backdrop-blur-xl border-b ${
          isSpace ? 'bg-slate-900/70 border-primary/10' : 'bg-white/90 border-slate-200'
        }`}
      >
        <div className="px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3 sm:gap-4">
            <div
              className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex-shrink-0 ${
                isSpace ? 'bg-primary/20 border border-primary/30' : 'bg-slate-900'
              }`}
            >
              <FiCoffee size={20} className={isSpace ? 'text-primary' : 'text-white'} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isSpace ? 'text-indigo-50' : 'text-slate-900'}`}>
                {t('foodMenu.title')}
              </h1>
              <p className={`text-[10px] sm:text-xs font-medium uppercase tracking-wider ${isSpace ? 'text-primary/70' : 'text-slate-500'}`}>
                Yaşar University
              </p>
            </div>
            <a
              href={officialPdfHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold transition-colors ${
                isSpace
                  ? 'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30'
                  : 'bg-primary text-white hover:brightness-110'
              }`}
            >
              {t('foodMenu.viewOfficialPdf')} <FiExternalLink size={14} />
            </a>
          </div>
        </div>
      </header>

      <div
        className={`relative px-4 py-4 sm:px-6 sm:py-5 border-b ${
          isSpace ? 'border-primary/10 bg-slate-900/30' : 'border-slate-200 bg-white'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <label className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
              <FiCalendar size={12} />
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={`w-full sm:max-w-[200px] px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/40 transition-all ${
                isSpace
                  ? 'bg-slate-800/50 text-indigo-50 border border-primary/20'
                  : 'bg-white text-slate-800 border border-slate-200'
              }`}
            />
            {cachedRangeHint && (
              <p className={`mt-1.5 text-[10px] font-medium ${isSpace ? 'text-primary/60' : 'text-slate-500'}`}>
                {cachedRangeHint}
              </p>
            )}
          </div>
        </div>
      </div>

      <main className="relative flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 overflow-y-auto pb-24">
        <div className="mx-auto w-full max-w-6xl space-y-6 sm:space-y-8">
          {loading && (
            <div className={`rounded-2xl p-6 sm:p-8 animate-pulse ${
              isSpace ? 'bg-slate-800/40' : 'bg-slate-200/60'
            }`}>
              <div className="h-4 rounded bg-slate-400/30 w-3/4 mb-4" />
              <div className="h-3 rounded bg-slate-400/20 w-1/2" />
            </div>
          )}
          {error && !loading && (
            <div className={`rounded-2xl p-6 border-l-4 border-red-500 ${
              isSpace ? 'bg-red-500/10 border-primary/10' : 'bg-red-50'
            }`}>
              <p className="font-semibold text-red-600">{error}</p>
            </div>
          )}
          {!loading && !error && (
            <>
              {data?.isPlaceholder && (
                <div
                  className={`rounded-2xl border-l-4 p-4 sm:p-5 ${
                    isSpace
                      ? 'border-amber-400/60 bg-amber-500/10 border border-primary/10'
                      : 'border-amber-500 bg-amber-50'
                  }`}
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    <FiAlertTriangle
                      size={20}
                      className={isSpace ? 'text-amber-400 shrink-0 mt-0.5' : 'text-amber-600 shrink-0 mt-0.5'}
                    />
                    <p
                      className={`text-sm leading-relaxed ${
                        isSpace ? 'text-amber-100/90' : 'text-amber-900'
                      }`}
                    >
                      {t('foodMenu.placeholderBanner')}
                    </p>
                  </div>
                </div>
              )}
              <div className={`text-center py-3 sm:py-4 ${isSpace ? 'text-primary/90' : 'text-slate-600'}`}>
                <p className="text-[10px] font-semibold uppercase tracking-widest">
                  {menuPeriodHeading(data?.periodLabel, selectedDate, i18n.language)}
                </p>
                <p className={`text-base sm:text-lg font-bold mt-1 ${isSpace ? 'text-indigo-50' : 'text-slate-900'}`}>
                  {formatDateLabel(selectedDate)}
                </p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
                {tLunch ? (
                  <MenuCard
                    menu={tLunch}
                    title="Lunch"
                    Icon={FiSun}
                    accentColor={isSpace ? 'bg-primary' : 'bg-amber-500'}
                    isSpace={isSpace}
                  />
                ) : (
                  <EmptyCard isSpace={isSpace} text="No lunch menu for this date." />
                )}
                {tDinner ? (
                  <MenuCard
                    menu={tDinner}
                    title="Dinner"
                    Icon={FiMoon}
                    accentColor={isSpace ? 'bg-primary' : 'bg-indigo-400'}
                    isSpace={isSpace}
                  />
                ) : (
                  <EmptyCard isSpace={isSpace} text="No dinner menu for this date." />
                )}
              </div>

              {tBreakfast && (
                <MenuCard
                  menu={tBreakfast}
                  title="Breakfast"
                  Icon={FiCoffee}
                  accentColor={isSpace ? 'bg-amber-500/80' : 'bg-amber-400'}
                  isSpace={isSpace}
                />
              )}

              {data?.pricing && data.pricing.length > 0 && (
                <div className={`rounded-2xl border p-4 sm:p-5 ${
                  isSpace
                    ? 'border-primary/20 bg-slate-800/30'
                    : 'border-slate-200 bg-white'
                }`}>
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <FiDollarSign size={16} className={isSpace ? 'text-primary' : 'text-slate-600'} />
                    <h4 className={`text-xs sm:text-sm font-semibold uppercase tracking-wider ${
                      isSpace ? 'text-primary' : 'text-slate-600'
                    }`}>
                      Price Information
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {translatedPricing.map((p, i) => (
                      <span
                        key={i}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold ${
                          isSpace
                            ? 'bg-primary/15 text-indigo-300 border border-primary/20'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <span className="opacity-80">{p.label}</span>
                        <span>{p.price}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {data?.allergenWarning && (
                <div className={`rounded-2xl border-l-4 border-amber-500/50 p-4 ${
                  isSpace ? 'bg-amber-500/5 border-primary/10' : 'bg-amber-50/80'
                }`}>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <FiAlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold uppercase text-amber-600 mb-1">Allergen Warning</p>
                      <p className="text-xs text-slate-600 leading-relaxed">{allergenTranslated[0] ?? data.allergenWarning}</p>
                    </div>
                  </div>
                </div>
              )}

              {data?.notices && data.notices.length > 0 && (
                <div className={`rounded-2xl p-4 text-sm ${
                  isSpace ? 'text-slate-400 bg-slate-800/20' : 'text-slate-600 bg-slate-100/80'
                }`}>
                  <p className="font-semibold mb-2 text-slate-700">Information</p>
                  <ul className="list-disc list-inside space-y-1">
                    {noticesTranslated.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

function EmptyCard({ isSpace, text }: { isSpace: boolean; text: string }) {
  return (
    <div
      className={`flex items-center justify-center min-h-[200px] rounded-2xl border ${
        isSpace ? 'border-primary/10 bg-slate-800/20' : 'border-slate-200 bg-slate-50'
      }`}
    >
      <p className={`text-sm ${isSpace ? 'text-slate-400' : 'text-slate-500'}`}>{text}</p>
    </div>
  );
}

export default FoodMenu;
