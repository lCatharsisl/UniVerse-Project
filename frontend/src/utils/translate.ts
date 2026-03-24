/**
 * Turkish to English translation for menu items.
 * Uses MyMemory API (free, no key) with localStorage cache.
 */

const CACHE_KEY = 'menu-translations';
const LANG_PAIR = 'tr|en';

function getCache(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string' && !MYMEMORY_WARNING.test(v)) clean[k] = v;
    }
    return clean;
  } catch {
    return {};
  }
}

function setCache(cache: Record<string, string>) {
  try {
    const entries = Object.entries(cache).slice(-500);
    localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    /* ignore */
  }
}

const pending = new Map<string, Promise<string>>();

const INVALID_PATTERN = /<|>|id\s*=|^<g\s|svg|path\s+d=|xmlns=/i;
const MYMEMORY_WARNING = /MYMEMORY WARNING|YOU USED ALL AVAILABLE FREE TRANSLATIONS|VISIT HTTPS:\/\/MYMEMORY/i;

const TR_MONTH_TO_EN: Record<string, string> = {
  OCAK: 'January', ŞUBAT: 'February', MART: 'March', NİSAN: 'April',
  MAYIS: 'May', HAZİRAN: 'June', TEMMUZ: 'July', AĞUSTOS: 'August',
  EYLÜL: 'September', EKİM: 'October', KASIM: 'November', ARALIK: 'December',
};

export function formatPeriodLabel(label?: string): string {
  if (!label) return 'Menu';
  const m = label.match(/^(\w+)\s+Ayı$/i);
  return m && TR_MONTH_TO_EN[m[1].toUpperCase()] ? TR_MONTH_TO_EN[m[1].toUpperCase()] : label;
}

export async function translateToEnglish(text: string): Promise<string> {
  const trimmed = text?.trim();
  if (!trimmed || /^[\d\s.,\-/]+$/.test(trimmed)) return trimmed;
  if (INVALID_PATTERN.test(trimmed)) return '';

  const cache = getCache();
  if (cache[trimmed]) return cache[trimmed];

  const existing = pending.get(trimmed);
  if (existing) return existing;

  const promise = fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${LANG_PAIR}`
  )
    .then((r) => r.json())
    .then((data) => {
      const translated = data?.responseData?.translatedText;
      if (translated && translated !== trimmed && !MYMEMORY_WARNING.test(translated)) {
        cache[trimmed] = translated;
        setCache(cache);
        return translated;
      }
      return trimmed;
    })
    .catch(() => trimmed)
    .finally(() => {
      pending.delete(trimmed);
    });

  pending.set(trimmed, promise);
  return promise;
}

export async function translateAll(texts: string[]): Promise<string[]> {
  const unique = [...new Set(texts.filter(Boolean))];
  const results = await Promise.all(unique.map(translateToEnglish));
  const map = Object.fromEntries(unique.map((t, i) => [t, results[i]]));
  return texts.map((t) => map[t] ?? t);
}
