/**
 * Generates tr.json from en.json using MyMemory API (en -> tr).
 * Caches translations to avoid repeated API calls.
 * Run: npx tsx scripts/generate-translations.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LANG_PAIR = 'en|tr';
const CACHE_FILE = path.join(__dirname, '.translation-cache.json');

type JsonValue = string | Record<string, JsonValue> | JsonValue[];
type FlatRecord = Record<string, string>;

function flatten(obj: Record<string, unknown>, prefix = ''): FlatRecord {
  const result: FlatRecord = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flatten(value as Record<string, unknown>, fullKey));
    } else if (typeof value === 'string') {
      result[fullKey] = value;
    }
  }
  return result;
}

function unflatten(flat: FlatRecord): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let current: Record<string, unknown> = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!(p in current)) current[p] = {};
      current = current[p] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
  }
  return result;
}

async function translate(text: string, cache: FlatRecord): Promise<string> {
  const trimmed = text?.trim();
  if (!trimmed) return text;
  if (/^[\d\s.,\-/]+$/.test(trimmed)) return text;
  if (trimmed.includes('{{')) return text; // Keep interpolation placeholders

  if (cache[trimmed]) return cache[trimmed];

  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${LANG_PAIR}`;
  const res = await fetch(url);
  const data = await res.json();
  const translated = data?.responseData?.translatedText;
  if (translated && translated !== trimmed) {
    cache[trimmed] = translated;
    return translated;
  }
  return trimmed;
}

async function translateWithRateLimit(
  text: string,
  cache: FlatRecord,
  delayMs = 150
): Promise<string> {
  const result = await translate(text, cache);
  await new Promise((r) => setTimeout(r, delayMs));
  return result;
}

async function main() {
  const enPath = path.join(__dirname, '../src/i18n/locales/en.json');
  const trPath = path.join(__dirname, '../src/i18n/locales/tr.json');

  let cache: FlatRecord = {};
  if (fs.existsSync(CACHE_FILE)) {
    try {
      cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    } catch {
      /* ignore */
    }
  }

  const enRaw = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
  const flatEn = flatten(enRaw);
  const flatTr: FlatRecord = {};

  const entries = Object.entries(flatEn);
  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i];
    process.stdout.write(`\r[${i + 1}/${entries.length}] ${key.slice(0, 40)}...`);
    flatTr[key] = await translateWithRateLimit(value, cache);
  }

  const trObj = unflatten(flatTr);
  fs.writeFileSync(trPath, JSON.stringify(trObj, null, 2), 'utf-8');
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');

  console.log('\nDone. tr.json generated.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
