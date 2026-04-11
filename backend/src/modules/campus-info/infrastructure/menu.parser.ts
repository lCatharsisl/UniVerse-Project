/**
 * Parser for Yaşar University food menu PDF text.
 * Week 1: Day 1 has 7 items (column-major) between date1-date2; Days 2-N have row-major block after last date.
 * Other weeks: all days row-major after their date block.
 */

const MONTHS = ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN', 'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK'] as const;
const WEEKDAYS = ['PAZAR', 'PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA', 'CUMARTESİ'] as const;

const SECTION_MARKERS = [
  'ÖĞLE YEMEK MENÜSÜ',
  'AKŞAM YEMEK MENÜSÜ',
  'YURT KAHVALTI MENÜSÜ',
] as const;

export type MenuSectionType = 'lunch' | 'dinner' | 'breakfast';

export interface DayMenu {
  date: string;
  weekday: string;
  soup?: string;
  main?: string;
  side?: string;
  salad?: string;
  yogurt?: string;
  dessert?: string;
  fruit?: string;
  extras?: string[];
}

export interface MenuSection {
  type: MenuSectionType;
  title: string;
  periodLabel?: string;
  days: DayMenu[];
}

export interface ParsedMenu {
  notices: string[];
  pricing: string[];
  allergenWarning?: string;
  sections: MenuSection[];
  periodLabel?: string;
  sourceText?: string;
}

const ROW_KEYS: (keyof DayMenu)[] = ['soup', 'main', 'side', 'salad', 'yogurt', 'dessert', 'fruit'];

function parseDateToISO(day: number, month: string, year: string | undefined): string {
  const monthIndex = MONTHS.indexOf(month.toUpperCase() as (typeof MONTHS)[number]);
  const y = year ? parseInt(year, 10) : new Date().getFullYear();
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function sanitizeMenuValue(val: string): string {
  const s = val.replace(/\s+/g, ' ').trim();
  if (/<|>|id\s*=\s*["']|^<g\s|svg|path\s+d=|xmlns=/.test(s)) return '';
  if (s.length > 120) return s.slice(0, 117) + '...';
  return s;
}

function formatCalorie(numStr: string): string {
  if (numStr.includes('/')) {
    const [a, b] = numStr.split('/');
    return `${a}-${b} kcal`;
  }
  return `${numStr} kcal`;
}

function extractFoodTokens(chunk: string): string[] {
  const tokens: string[] = [];
  const pattern = /([A-Za-zğüşıöçĞÜŞİÖÇ0-9\.\-\+\(\)\/',\s]+?)\s+(\d{2,4}(?:\/\d{2,4})?)\s*(?=[A-Za-zğüşıöçĞÜŞİÖÇ]|$)/g;
  const dateRegex = new RegExp(`(\\d{1,2})\\s+(${MONTHS.join('|')})`, 'i');
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(chunk)) !== null) {
    let name = m[1].replace(/\s+/g, ' ').trim();
    name = name.replace(/^ALERJEN\s+KALORİ\s*/i, '');
    if (!name || name === 'ALERJEN' || name === 'KALORİ' || dateRegex.test(name)) continue;
    if (name.length < 2) continue;
    const calorie = m[2] ? ` (${formatCalorie(m[2])})` : '';
    tokens.push(name + calorie);
  }
  const trailerMatch = chunk.match(/(?:^|[^\d])(MEVSİM MEYVESİ\s*\([^)]+\))\s*(?=\d{1,2}\s+MART|$)/i);
  if (trailerMatch && !tokens.some((t) => /MEVSİM MEYVESİ/i.test(t))) {
    tokens.push(trailerMatch[1].replace(/\s+/g, ' ').trim());
  }
  return tokens;
}

export function parseMenuText(raw: string): ParsedMenu {
  const notices: string[] = [];
  const pricing: string[] = [];
  let allergenWarning: string | undefined;
  const sections: MenuSection[] = [];

  let text = raw.replace(/\s+/g, ' ').trim();

  const periodMatch = text.match(/YAŞAR ÜNİVERSİTESİ\s+(\w+)\s+AYI\s/);
  const periodLabel = periodMatch ? `${periodMatch[1]} Ayı` : undefined;

  const pricingBlock = text.match(/MENÜ İÇERİSİNDE[\s\S]*?SU FİYATI;[\s\S]*?[\d,]+\s*TL/);
  if (pricingBlock) {
    const block = pricingBlock[0].replace(/\s+/g, ' ').split(/(\d+,\d+\s*TL)/).filter(Boolean);
    pricing.push(...block.slice(0, 25));
  }

  const allergenBlock = text.match(/YEMEKHANEMİZDE HAZIRLANAN[\s\S]*?SMC YEMEK YETKİLİLERİNE BİLDİRİNİZ/);
  if (allergenBlock) {
    allergenWarning = allergenBlock[0].replace(/\s+/g, ' ').trim();
  }
  if (pricing.length) notices.push('Set menü: 179 TL. Ayrıntılı fiyatlar listelenmiştir.');
  if (allergenWarning) notices.push('Alerjen bilgisi: Yemekhanede tüm yemekler alerjen içerebilir.');

  for (const sectionMarker of SECTION_MARKERS) {
    const idx = text.indexOf(sectionMarker);
    if (idx === -1) continue;

    let sectionText = text.slice(idx);
    const nextIdx = SECTION_MARKERS.filter((m) => m !== sectionMarker)
      .map((m) => sectionText.indexOf(m, 20))
      .filter((i) => i > 0);
    if (nextIdx.length) sectionText = sectionText.slice(0, Math.min(...nextIdx));

    const allergenEnd = sectionText.indexOf('YEMEKHANEMİZDE HAZIRLANAN');
    if (allergenEnd > 0) sectionText = sectionText.slice(0, allergenEnd);

    const dateMatches: { day: number; month: string; year?: string; weekday?: string; start: number; end: number }[] = [];
    let m: RegExpExecArray | null;
    const reg = new RegExp(
      `(\\d{1,2})\\s+(${MONTHS.join('|')})(?:\\s+(\\d{4}))?\\s*(${WEEKDAYS.join('|')})?`,
      'gi'
    );
    while ((m = reg.exec(sectionText)) !== null) {
      dateMatches.push({
        day: parseInt(m[1], 10),
        month: m[2],
        year: m[3],
        weekday: m[4],
        start: m.index,
        end: m.index + m[0].length,
      });
    }

    const dayMenus: DayMenu[] = dateMatches.map((d) => ({
      date: parseDateToISO(d.day, d.month, d.year),
      weekday: d.weekday || '',
    }));

    const chunksWithFood: { dateIdx: number; foods: string[] }[] = [];
    for (let i = 0; i < dateMatches.length; i++) {
      const chunkStart = dateMatches[i].end;
      const chunkEnd = dateMatches[i + 1] ? dateMatches[i + 1].start : sectionText.length;
      const foods = extractFoodTokens(sectionText.slice(chunkStart, chunkEnd));
      if (foods.length >= 7) chunksWithFood.push({ dateIdx: i, foods });
    }

    let dayOffset = 0;
    for (let c = 0; c < chunksWithFood.length; c++) {
      const { dateIdx, foods } = chunksWithFood[c];
      if (foods.length === 7 && dateIdx === dayOffset) {
        const dm = dayMenus[dateIdx];
        if (dm) {
          dm.soup = sanitizeMenuValue(foods[0]);
          dm.main = sanitizeMenuValue(foods[1]);
          dm.side = sanitizeMenuValue(foods[2]);
          dm.salad = sanitizeMenuValue(foods[3]);
          dm.yogurt = sanitizeMenuValue(foods[4]);
          dm.dessert = sanitizeMenuValue(foods[5]);
          dm.fruit = sanitizeMenuValue(foods[6]);
        }
        dayOffset++;
      } else if (foods.length >= 14) {
        const numDays = dateIdx - dayOffset + 1;
        const numRows = ROW_KEYS.length;
        const maxTokens = numRows * numDays;
        const slice = foods.length > maxTokens ? foods.slice(0, maxTokens) : foods;
        for (let row = 0; row < numRows && row * numDays < slice.length; row++) {
          const key = ROW_KEYS[row];
          for (let col = 0; col < numDays; col++) {
            const idxFood = row * numDays + col;
            if (idxFood < slice.length && dayMenus[dayOffset + col]) {
              const v = sanitizeMenuValue(slice[idxFood]);
              ((dayMenus[dayOffset + col] as unknown) as Record<string, string>)[key] = v;
            }
          }
        }
        dayOffset += numDays;
      }
    }

    const typeMap: Record<string, MenuSectionType> = {
      'ÖĞLE YEMEK MENÜSÜ': 'lunch',
      'AKŞAM YEMEK MENÜSÜ': 'dinner',
      'YURT KAHVALTI MENÜSÜ': 'breakfast',
    };
    sections.push({
      type: typeMap[sectionMarker] || 'lunch',
      title: `Yaşar Üniversitesi ${sectionMarker}`,
      periodLabel,
      days: dayMenus,
    });
  }

  return { notices, pricing, allergenWarning, sections, periodLabel };
}
