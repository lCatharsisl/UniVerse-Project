/** 50 dk ders, aralarda 10 dk; öğle 12:30–13:30; son slot 18:30’da biter. */
export const APPOINTMENT_TIME_SLOTS: [string, string][] = [
  ['08:40', '09:30'],
  ['09:40', '10:30'],
  ['10:40', '11:30'],
  ['11:40', '12:30'],
  ['13:30', '14:20'],
  ['14:30', '15:20'],
  ['15:30', '16:20'],
  ['16:30', '17:20'],
  ['17:40', '18:30'],
];

export function toClockHm(raw: string): string {
  const s = (raw || '').trim();
  if (!s) return '';
  return s.length >= 5 ? s.slice(0, 5) : s;
}

export const slotGridKey = (startHm: string, endHm: string) =>
  `${toClockHm(startHm)}|${toClockHm(endHm)}`;

export function calendarDateKey(raw: unknown): string {
  return String(raw ?? '').split('T')[0].slice(0, 10);
}

export function isTruthyBooked(v: unknown): boolean {
  if (v === true || v === 1) return true;
  if (typeof v === 'string') {
    const t = v.toLowerCase();
    return t === 'true' || t === 't' || t === 'yes' || t === '1';
  }
  return false;
}

/** Takvim / liste: bekleyen veya onaylı randevu (API farklı casing gönderebilir) */
export function isPendingOrApprovedStatus(status: unknown): boolean {
  const s = String(status ?? '').trim().toLowerCase();
  return s === 'pending' || s === 'approved';
}

/**
 * Randevu satırındaki start/end (PostgreSQL time metni veya ISO datetime) → grid ile aynı HH:MM
 */
export function normalizeApptTime(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  const afterT = s.includes('T')
    ? (s.split('T')[1] || '').replace(/Z$/i, '').split('.')[0] || s
    : s;
  const m = afterT.match(/^(\d{1,2}):(\d{2})/);
  if (m) {
    return `${m[1].padStart(2, '0')}:${m[2].padStart(2, '0')}`;
  }
  return toClockHm(s);
}

export function startOfWeekMondayIso(d = new Date()): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const dayNum = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayNum}`;
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Pazartesiden itibaren 7 gün (Pzt–Paz); hafta içi için `.slice(0, 5)` kullanılabilir. */
export function weekDayDatesFromMonday(mondayIso: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    out.push(addDaysIso(mondayIso, i));
  }
  return out;
}
