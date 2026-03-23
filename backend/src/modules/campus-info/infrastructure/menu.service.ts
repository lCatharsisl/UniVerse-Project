import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import type { PDFParser as PDFParserType } from 'pdf2json';
// pdf2json CJS default export is the parser class
const PDFParser = require('pdf2json') as typeof PDFParserType;
import { parseMenuText, type ParsedMenu, type DayMenu } from './menu.parser';

const CACHE_PATH = path.join(process.cwd(), 'data', 'menu_cache.json');
const PDF_URL = process.env.YASAR_MENU_PDF_URL || 'https://www.yasar.edu.tr/yemek-liste.pdf';
const FETCH_TIMEOUT_MS = 15_000;
const MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024;

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

export async function fetchAndParseMenu(forceRefresh = false): Promise<ParsedMenu> {
  const existing = loadCache();

  const response = await fetch(PDF_URL, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { 'User-Agent': 'UniVerse/1.0' },
  });
  if (!response.ok) {
    if (existing?.parsed) return existing.parsed;
    throw new Error(`PDF fetch failed: ${response.status}`);
  }

  const ab = await response.arrayBuffer();
  const buffer = Buffer.from(ab);

  if (buffer.length > MAX_PDF_SIZE_BYTES) {
    if (existing?.parsed) return existing.parsed;
    throw new Error('PDF too large');
  }

  const hash = bufferToHash(buffer);
  if (!forceRefresh && existing && existing.hash === hash) {
    return existing.parsed;
  }

  const rawText = await parsePdfBuffer(buffer);
  const parsed = parseMenuText(rawText);

  saveCache({
    hash,
    fetchedAt: new Date().toISOString(),
    sourceUrl: PDF_URL,
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
    const day = section.days?.find((d) => d.date === today);
    if (day) {
      if (section.type === 'lunch') result.lunch = day;
      else if (section.type === 'dinner') result.dinner = day;
      else if (section.type === 'breakfast') result.breakfast = day;
    }
  }

  return result;
}

export function getFullMenu(): MenuCache | null {
  return loadCache();
}

export function getMenuByDate(dateStr: string): { lunch?: DayMenu; dinner?: DayMenu; breakfast?: DayMenu } | null {
  const cache = loadCache();
  if (!cache?.parsed?.sections) return null;

  const out: { lunch?: DayMenu; dinner?: DayMenu; breakfast?: DayMenu } = {};
  for (const section of cache.parsed.sections) {
    const day = section.days?.find((d) => d.date === dateStr);
    if (day) {
      if (section.type === 'lunch') out.lunch = day;
      else if (section.type === 'dinner') out.dinner = day;
      else if (section.type === 'breakfast') out.breakfast = day;
    }
  }
  return Object.keys(out).length ? out : null;
}
