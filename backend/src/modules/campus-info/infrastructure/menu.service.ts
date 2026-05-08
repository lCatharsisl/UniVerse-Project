import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type { PDFParser as PDFParserType } from 'pdf2json';
// pdf2json CJS default export is the parser class
const PDFParser = require('pdf2json') as typeof PDFParserType;
import { parseMenuText, type ParsedMenu, type DayMenu } from './menu.parser';

const CACHE_PATH = path.join(process.cwd(), 'data', 'menu_cache.json');
const PDF_URL = process.env.YASAR_MENU_PDF_URL || 'https://www.yasar.edu.tr/yemek-liste.pdf';
/** Kurumsal site 403/503 verdiğinde kullanılacak yerel PDF (admin tarafından indirilmiş). */
const LOCAL_PDF_PATH =
  process.env.YASAR_MENU_PDF_LOCAL_PATH ||
  path.join(process.cwd(), 'data', 'yemek-liste.pdf');
const FETCH_TIMEOUT_MS = 15_000;
const MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOW_BROWSER_MENU_FETCH =
  process.env.YASAR_MENU_BROWSER_FALLBACK === '1' ||
  process.env.YASAR_MENU_BROWSER_FALLBACK === 'true';

/** Sunucu tarafı fetch bazen Cloudflare/WAF tarafından engellenir; tarayıcıya yakın header denemesi. */
const PDF_FETCH_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  Accept: 'application/pdf,application/octet-stream,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
  Referer: 'https://www.yasar.edu.tr/',
};

function isDifferentCalendarMonth(a: Date, b: Date): boolean {
  return a.getFullYear() !== b.getFullYear() || a.getMonth() !== b.getMonth();
}

export interface MenuCache {
  hash: string;
  fetchedAt: string;
  sourceUrl: string;
  parsed: ParsedMenu;
}

export interface TodaysMenuResult {
  lunch?: DayMenu;
  dinner?: DayMenu;
  breakfast?: DayMenu;
  notices: string[];
  pricing: string[];
  allergenWarning?: string;
  periodLabel?: string;
  lastUpdated: string;
  sourceUrl: string;
}

let cachedData: MenuCache | null = null;
let cacheLoadedAt = 0;

function loadCache(): MenuCache | null {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      const stat = fs.statSync(CACHE_PATH);
      const mtime = stat.mtimeMs;
      if (cachedData && cacheLoadedAt >= mtime) return cachedData;
      const raw = fs.readFileSync(CACHE_PATH, 'utf8');
      cachedData = JSON.parse(raw) as MenuCache;
      cacheLoadedAt = mtime;
      return cachedData;
    }
  } catch {
    // ignore
  }
  cachedData = null;
  return null;
}

function saveCache(data: MenuCache): void {
  const dir = path.dirname(CACHE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2), 'utf8');
  cachedData = data;
  cacheLoadedAt = Date.now();
}

function bufferToHash(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function parsePdfBuffer(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    pdfParser.on('pdfParser_dataError', (err: unknown) => {
      const msg = err && typeof err === 'object' && 'parserError' in err ? String((err as { parserError: unknown }).parserError) : 'PDF parse error';
      reject(new Error(msg));
    });
    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      const pages = pdfData.Pages || pdfData.formImage?.Pages || [];
      const allTexts: { page: number; y: number; x: number; text: string }[] = [];
      pages.forEach((p: any, pi: number) => {
        (p.Texts || []).forEach((t: any) => {
          const txt = (t.R || []).map((r: any) => decodeURIComponent(r.T || '')).join('');
          if (txt.trim()) {
            allTexts.push({ page: pi + 1, y: t.y || 0, x: t.x || 0, text: txt });
          }
        });
      });
      allTexts.sort((a, b) => (a.page - b.page) || (a.y - b.y) || (a.x - b.x));
      const full = allTexts.map((t) => t.text).join(' ');
      resolve(full);
    });
    pdfParser.parseBuffer(buffer);
  });
}

async function fetchRemotePdfBuffer(): Promise<Buffer> {
  const response = await fetch(PDF_URL, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: PDF_FETCH_HEADERS,
  });
  if (!response.ok) {
    const hint =
      response.status === 403 || response.status === 503
        ? ' (Cloudflare sunucu IP’sini engelliyor; headless tarayıcı denenecek.)'
        : '';
    throw Object.assign(new Error(`PDF fetch failed: ${response.status}${hint}`), {
      httpStatus: response.status,
    });
  }
  const ab = await response.arrayBuffer();
  return Buffer.from(ab);
}

/** Headless Chrome ile Cloudflare challenge’ını geçip PDF’i indir. */
async function fetchViaBrowser(): Promise<{ buffer: Buffer; source: string } | null> {
  if (!ALLOW_BROWSER_MENU_FETCH) {
    console.warn(
      '[menu] Headless tarayıcı fallback kapalı. Etkinleştirmek için YASAR_MENU_BROWSER_FALLBACK=1 kullanın.'
    );
    return null;
  }

  try {
    const mod = await import('./menu-browser-fetcher');
    const result = await mod.downloadMenuPdfViaBrowser(PDF_URL, FETCH_TIMEOUT_MS + 15_000);
    return { buffer: result.buffer, source: result.url };
  } catch (err) {
    console.warn(`[menu] Headless tarayıcı denemesi başarısız: ${(err as Error).message}`);
    return null;
  }
}

function tryLoadLocalPdfBuffer(): { buffer: Buffer; source: string } | null {
  try {
    if (!fs.existsSync(LOCAL_PDF_PATH)) return null;
    const stat = fs.statSync(LOCAL_PDF_PATH);
    if (stat.size === 0 || stat.size > MAX_PDF_SIZE_BYTES) return null;
    const buffer = fs.readFileSync(LOCAL_PDF_PATH);
    return { buffer, source: `file://${path.resolve(LOCAL_PDF_PATH)}` };
  } catch {
    return null;
  }
}

function writeLocalFallback(buffer: Buffer): void {
  try {
    const dir = path.dirname(LOCAL_PDF_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LOCAL_PDF_PATH, buffer);
  } catch (err) {
    console.warn(`[menu] Yerel PDF kopyası yazılamadı: ${(err as Error).message}`);
  }
}

export async function fetchAndParseMenu(forceRefresh = false): Promise<ParsedMenu> {
  const existing = loadCache();
  const now = new Date();
  const lastFetch = existing?.fetchedAt ? new Date(existing.fetchedAt) : null;
  /** Yeni ay: hash aynı kalsa da PDF/metin yeniden işlensin; üniversite gecikmeli yüklediyse aynı hash nadir. */
  const newCalendarMonth =
    lastFetch == null || isDifferentCalendarMonth(lastFetch, now);
  const shouldBypassHashMatch = forceRefresh || newCalendarMonth;

  let buffer: Buffer | null = null;
  let sourceUrl = PDF_URL;
  let usedFallback: 'remote' | 'browser' | 'local' = 'remote';

  try {
    buffer = await fetchRemotePdfBuffer();
  } catch (remoteErr) {
    console.warn(`[menu] Uzak PDF alınamadı: ${(remoteErr as Error).message}`);

    // 1) Headless tarayıcı dene (Cloudflare challenge’ı için sistem Chrome’u kullanır).
    const viaBrowser = await fetchViaBrowser();
    if (viaBrowser) {
      buffer = viaBrowser.buffer;
      sourceUrl = viaBrowser.source;
      usedFallback = 'browser';
      writeLocalFallback(buffer);
      console.log('[menu] PDF headless tarayıcı ile indirildi ve yerel kopya güncellendi.');
    } else {
      // 2) Yerel kopyaya düş.
      const local = tryLoadLocalPdfBuffer();
      if (local) {
        console.warn(`[menu] Yerel PDF’e düşüldü: ${local.source}`);
        buffer = local.buffer;
        sourceUrl = local.source;
        usedFallback = 'local';
      } else if (existing?.parsed) {
        return existing.parsed;
      } else {
        throw remoteErr;
      }
    }
  }

  if (!buffer) {
    if (existing?.parsed) return existing.parsed;
    throw new Error('PDF alınamadı ve yerel yedek yok.');
  }

  if (buffer.length > MAX_PDF_SIZE_BYTES) {
    if (existing?.parsed) return existing.parsed;
    throw new Error('PDF too large');
  }

  const hash = bufferToHash(buffer);
  const isFallback = usedFallback !== 'remote';
  if (!shouldBypassHashMatch && !isFallback && existing && existing.hash === hash) {
    return existing.parsed;
  }
  if (shouldBypassHashMatch && existing && existing.hash === hash) {
    console.log(
      '[menu] Ay değişimi/zorunlu yenileme: aynı hash, yine de yeniden parse edilip cache yazılıyor.'
    );
  }

  const rawText = await parsePdfBuffer(buffer);
  const parsed = parseMenuText(rawText);

  saveCache({
    hash,
    fetchedAt: new Date().toISOString(),
    sourceUrl,
    parsed: { ...parsed, sourceText: undefined },
  });

  return parsed;
}

/**
 * Parse a local PDF file and update cache (for testing/admin when remote fetch fails).
 */
export async function parseAndCacheFromFile(filePath: string): Promise<ParsedMenu> {
  const buffer = fs.readFileSync(filePath);
  const hash = bufferToHash(buffer);
  const rawText = await parsePdfBuffer(buffer);
  const parsed = parseMenuText(rawText);
  saveCache({
    hash,
    fetchedAt: new Date().toISOString(),
    sourceUrl: `file://${path.resolve(filePath)}`,
    parsed: { ...parsed, sourceText: undefined },
  });
  return parsed;
}

/** PDF bazen farklı yılda ISO tarih üretir; aynı ay-günü eşle. */
function findDayForDate(days: DayMenu[] | undefined, dateStr: string): DayMenu | undefined {
  if (!days?.length) return undefined;
  const exact = days.find((d) => d.date === dateStr);
  if (exact) return exact;
  if (dateStr.length < 10) return undefined;
  const monthDay = dateStr.slice(5);
  return days.find((d) => d.date && d.date.length >= 10 && d.date.slice(5) === monthDay);
}

function weekdayTr(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00');
  return d.toLocaleDateString('tr-TR', { weekday: 'long' });
}

const PLACEHOLDER_MSG =
  'PDF menü bu tarih için sunucuda yok (site erişim engeli veya henüz güncellenmedi). Üstteki "Resmi menü (PDF)" ile güncel listeye bakın.';

function buildPlaceholderMeals(dateStr: string): { lunch: DayMenu; dinner: DayMenu } {
  const wd = weekdayTr(dateStr);
  const base: DayMenu = { date: dateStr, weekday: wd, soup: PLACEHOLDER_MSG };
  return { lunch: { ...base }, dinner: { ...base } };
}

function normalizeDayForRequest(d: DayMenu, requestedIso: string): DayMenu {
  if (d.date === requestedIso) return d;
  return { ...d, date: requestedIso, weekday: weekdayTr(requestedIso) };
}

export function getTodaysMenu(): TodaysMenuResult | null {
  const cache = loadCache();
  if (!cache?.parsed) return null;

  const today = new Date().toISOString().slice(0, 10);
  const result: TodaysMenuResult = {
    notices: cache.parsed.notices || [],
    pricing: cache.parsed.pricing || [],
    allergenWarning: cache.parsed.allergenWarning,
    periodLabel: cache.parsed.periodLabel,
    lastUpdated: cache.fetchedAt,
    sourceUrl: cache.sourceUrl,
  };

  for (const section of cache.parsed.sections || []) {
    const day = findDayForDate(section.days, today);
    if (day) {
      const n = normalizeDayForRequest(day, today);
      if (section.type === 'lunch') result.lunch = n;
      else if (section.type === 'dinner') result.dinner = n;
      else if (section.type === 'breakfast') result.breakfast = n;
    }
  }

  if (!result.lunch && !result.dinner && !result.breakfast) return null;

  return result;
}

export function getFullMenu(): MenuCache | null {
  return loadCache();
}

/** Cache yok veya son çekim takvimde şu aydan farklıysa (ör. Mart → Nisan) sunucu PDF tazelemeli. */
export function isMenuCacheStaleByCalendarMonth(): boolean {
  const c = loadCache();
  if (!c?.fetchedAt) return true;
  return isDifferentCalendarMonth(new Date(c.fetchedAt), new Date());
}

/** Cache’te bugünün tarihi hiçbir öğün bölümünde yok → PDF güncellenmiş olabilir, tazeleme denenmeli. */
export function shouldRefreshMenuForCoverage(): boolean {
  const cache = loadCache();
  if (!cache?.parsed?.sections?.length) return false;
  const today = new Date().toISOString().slice(0, 10);
  for (const section of cache.parsed.sections) {
    if (findDayForDate(section.days, today)) return false;
  }
  return true;
}

export interface MenuByDateResult {
  lunch?: DayMenu;
  dinner?: DayMenu;
  breakfast?: DayMenu;
  isPlaceholder: boolean;
}

/**
 * Tarih bazlı menü. Cache yoksa null.
 * Tarih bulunamazsa (PDF çekilemiyor / eski ay): varsayılan olarak placeholder + isPlaceholder
 * (404 yerine UI’da açıklama). Kapatmak: MENU_PLACEHOLDER_WHEN_EMPTY=0
 */
export function getMenuByDate(dateStr: string): MenuByDateResult | null {
  const cache = loadCache();
  if (!cache?.parsed?.sections) return null;

  const out: { lunch?: DayMenu; dinner?: DayMenu; breakfast?: DayMenu } = {};
  for (const section of cache.parsed.sections) {
    const day = findDayForDate(section.days, dateStr);
    if (day) {
      const n = normalizeDayForRequest(day, dateStr);
      if (section.type === 'lunch') out.lunch = n;
      else if (section.type === 'dinner') out.dinner = n;
      else if (section.type === 'breakfast') out.breakfast = n;
    }
  }
  if (Object.keys(out).length) {
    return { ...out, isPlaceholder: false };
  }
  const allowPlaceholder =
    process.env.MENU_PLACEHOLDER_WHEN_EMPTY !== '0' &&
    String(process.env.MENU_PLACEHOLDER_WHEN_EMPTY).toLowerCase() !== 'false';
  if (!allowPlaceholder) return null;
  const ph = buildPlaceholderMeals(dateStr);
  return { lunch: ph.lunch, dinner: ph.dinner, isPlaceholder: true };
}
