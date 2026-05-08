/**
 * Verify menu parser output against expected PDF values.
 * Usage: npx tsx scripts/verify-menu-pdf.ts [path-to-yemek-liste.pdf]
 */
import * as fs from 'fs';
import * as path from 'path';
import { parseMenuText } from '../src/modules/campus-info/infrastructure/menu.parser';

const PDFParser = require('pdf2json');

async function extractRawText(pdfPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    pdfParser.on('pdfParser_dataError', reject);
    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      const pages = pdfData.Pages || pdfData.formImage?.Pages || [];
      const allTexts: { page: number; y: number; x: number; text: string }[] = [];
      pages.forEach((p: any, pi: number) => {
        (p.Texts || []).forEach((t: any) => {
          const txt = (t.R || []).map((r: any) => decodeURIComponent(r.T || '')).join('');
          if (txt.trim()) allTexts.push({ page: pi + 1, y: t.y || 0, x: t.x || 0, text: txt });
        });
      });
      allTexts.sort((a, b) => (a.page - b.page) || (a.y - b.y) || (a.x - b.x));
      resolve(allTexts.map((t) => t.text).join(' '));
    });
    pdfParser.loadPDF(pdfPath);
  });
}

const EXPECTED: Record<string, { lunch?: Partial<Record<string, string>>; dinner?: Partial<Record<string, string>> }> = {
  '2026-03-01': {
    lunch: { soup: 'YAYLA ÇORBASI', main: 'PATLICAN MUSAKKA', side: 'PİRİNÇ PİLAVI' },
  },
  '2026-03-08': {
    lunch: { soup: 'EZOGELİN ÇORBASI', main: 'TAVUK DÖNER' },
  },
  '2026-03-22': {
    lunch: { soup: 'MERCİMEK ÇORBASI', main: 'ETLİ PATATES YEMEĞİ' },
  },
  '2026-03-22_dinner': {
    dinner: { soup: 'EZOGELİN ÇORBA', main: 'TAVUK DÖNER', side: 'NOHUTLU PİRİNÇ PİLAVI' },
  },
};

function compareDay(parsed: any, date: string, expected: Partial<Record<string, string>>, section: 'lunch' | 'dinner') {
  const sec = parsed.sections?.find((s: any) => s.type === section);
  const day = sec?.days?.find((d: any) => d.date === date);
  if (!day) return { ok: false, error: `No ${section} for ${date}` };
  const mismatches: string[] = [];
  for (const [key, expVal] of Object.entries(expected)) {
    const got = (day as any)[key];
    if (got !== expVal) mismatches.push(`${key}: expected "${expVal}", got "${got}"`);
  }
  return mismatches.length ? { ok: false, mismatches } : { ok: true };
}

async function main() {
  const pdfPath = process.argv[2] || path.join(process.env.HOME || '', 'Downloads', 'yemek-liste.pdf');
  if (!fs.existsSync(pdfPath)) {
    console.error('PDF not found:', pdfPath);
    process.exit(1);
  }

  const raw = await extractRawText(pdfPath);
  const parsed = parseMenuText(raw);

  let failed = 0;
  for (const [dateKey, expected] of Object.entries(EXPECTED)) {
    const date = dateKey.replace('_dinner', '');
    const section = dateKey.includes('_dinner') ? 'dinner' : 'lunch';
    const exp = dateKey.includes('_dinner') ? expected.dinner! : expected.lunch!;
    const result = compareDay(parsed, date, exp, section);
    if (result.ok) {
      console.log(`✓ ${date} ${section}: OK`);
    } else {
      console.error(`✗ ${date} ${section}:`, 'error' in result ? result.error : result.mismatches);
      failed++;
    }
  }

  if (failed > 0) {
    console.error('\nVerification failed:', failed, 'checks');
    process.exit(1);
  }
  console.log('\nAll checks passed. API output matches PDF.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
