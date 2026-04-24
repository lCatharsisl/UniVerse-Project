import { useMemo } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import {
  APPOINTMENT_TIME_SLOTS,
  addDaysIso,
  calendarDateKey,
  isTruthyBooked,
  normalizeApptTime,
  slotGridKey,
} from '../../constants/appointmentTimeSlots';
import type { AppointmentRow } from '../../types/appointments';

type RangeSlotRow = {
  specific_date: string;
  start_time: string;
  end_time: string;
  /** Bekleyen veya onaylı talep (hoca: slot müdahalesi) */
  is_booked?: boolean | string | null;
  /** Yalnızca onaylı randevu (öğrenci: tam doluluk) */
  is_slot_locked?: boolean | string | null;
  is_active?: boolean | null;
  /** Backend: dolu slotta öğrenci (hoca görünümü; öğrenci book modunda kullanılmaz) */
  student_name?: string | null;
  student_surname?: string | null;
  appointment_status?: string | null;
};

type TFn = (key: string, params?: Record<string, string | number>) => string;

export type WeekCalendarMode = 'staff' | 'book';

type Props = {
  mode?: WeekCalendarMode;
  weekMondayIso: string;
  rangeSlots: RangeSlotRow[];
  weekAppointments: AppointmentRow[];
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onThisWeek: () => void;
  onAvailabilityToggle?: (dateIso: string, start: string, end: string, available: boolean) => void;
  onSlotSelect?: (dateIso: string, start: string, end: string) => void;
  selectedBookingKey?: string | null;
  saving?: boolean;
  isSpace?: boolean;
  t: TFn;
  /** Bu Pazartesi’den daha eski haftaya inmeyi engeller (YYYY-MM-DD string karşılaştırması). */
  earliestNavWeekMondayIso?: string;
  /** Bu günden önceki sütunlarda rezervasyon / müsaitlik düzenlemesi yapılamaz (yerel tarih). */
  minSelectableDayIso?: string;
};

/** Backend `eachWeekdayBetween` ile aynı: sunucu/tarayıcı TZ kayması olmadan Pzt–Cum ISO listesi. */
function weekDayDatesFromMonday(mondayIso: string): string[] {
  const p = mondayIso.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!p) return [];
  const y0 = Number(p[1]);
  const mo0 = Number(p[2]);
  const d0 = Number(p[3]);
  const out: string[] = [];
  for (let i = 0; i < 5; i++) {
    const dt = new Date(Date.UTC(y0, mo0 - 1, d0 + i, 12, 0, 0));
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dt.getUTCDate()).padStart(2, '0');
    out.push(`${y}-${m}-${day}`);
  }
  return out;
}

function formatShortWeekdayLabel(iso: string) {
  const p = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const d = p
    ? new Date(Date.UTC(Number(p[1]), Number(p[2]) - 1, Number(p[3]), 12, 0, 0))
    : new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: 'short', timeZone: p ? 'UTC' : undefined });
}

function formatDayMonth(iso: string) {
  const p = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const d = p
    ? new Date(Date.UTC(Number(p[1]), Number(p[2]) - 1, Number(p[3]), 12, 0, 0))
    : new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: p ? 'UTC' : undefined });
}

function appointmentAt(
  weekAppointments: AppointmentRow[],
  iso: string,
  start: string,
  end: string
): AppointmentRow | null {
  const key = slotGridKey(start, end);
  return (
    weekAppointments.find((a) => {
      const ad = calendarDateKey(a.appointment_date);
      if (ad !== iso) return false;
      return slotGridKey(normalizeApptTime(a.start_time), normalizeApptTime(a.end_time)) === key;
    }) ?? null
  );
}

function rangeSlotAt(rangeSlots: RangeSlotRow[], iso: string, start: string, end: string): RangeSlotRow | null {
  const key = slotGridKey(start, end);
  return (
    rangeSlots.find((s) => {
      if (calendarDateKey(s.specific_date) !== iso) return false;
      return (
        slotGridKey(normalizeApptTime(s.start_time), normalizeApptTime(s.end_time)) === key
      );
    }) ?? null
  );
}

export function StaffWeekCalendar({
  mode = 'staff',
  weekMondayIso,
  rangeSlots,
  weekAppointments,
  onPrevWeek,
  onNextWeek,
  onThisWeek,
  onAvailabilityToggle,
  onSlotSelect,
  selectedBookingKey,
  saving,
  isSpace,
  t,
  earliestNavWeekMondayIso,
  minSelectableDayIso,
}: Props) {
  const isBookMode = mode === 'book';
  const dayIsos = useMemo(() => weekDayDatesFromMonday(weekMondayIso), [weekMondayIso]);

  const prevWeekMonday = useMemo(() => addDaysIso(weekMondayIso, -7), [weekMondayIso]);
  const earliestNav = earliestNavWeekMondayIso;
  const prevWeekDisabled =
    typeof earliestNav === 'string' && earliestNav.length > 0 && prevWeekMonday < earliestNav;

  const weekLabel = useMemo(() => {
    const start = new Date(`${dayIsos[0]}T12:00:00`);
    const end = new Date(`${dayIsos[4]}T12:00:00`);
    return `${start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })}`;
  }, [dayIsos]);

  const tableWrapBorder = isSpace ? 'border-white/10' : 'border-gray-200';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className={`text-sm font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>{weekLabel}</div>
        <div className="flex flex-wrap items-center gap-1 text-xs font-bold">
          <button
            type="button"
            disabled={prevWeekDisabled}
            onClick={onPrevWeek}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border transition-colors ${
              isSpace ? 'border-white/15 text-white/80 hover:bg-white/10' : 'border-gray-200 text-uv-black hover:bg-gray-50'
            } ${prevWeekDisabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}`}
          >
            <FiChevronLeft /> {t('appointments.previousWeek')}
          </button>
          <button
            type="button"
            onClick={onThisWeek}
            className={`inline-flex items-center px-2 py-1 rounded-lg border transition-colors ${
              isSpace ? 'border-white/15 text-white/80 hover:bg-white/10' : 'border-gray-200 text-uv-black hover:bg-gray-50'
            }`}
          >
            {t('appointments.thisWeek')}
          </button>
          <button
            type="button"
            onClick={onNextWeek}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border transition-colors ${
              isSpace ? 'border-white/15 text-white/80 hover:bg-white/10' : 'border-gray-200 text-uv-black hover:bg-gray-50'
            }`}
          >
            {t('appointments.nextWeek')} <FiChevronRight />
          </button>
        </div>
      </div>

      <div className={`w-full rounded-xl border ${tableWrapBorder} overflow-hidden`}>
        <table className="w-full table-fixed border-collapse text-[10px] sm:text-xs">
          <colgroup>
            <col className="w-[4.25rem] sm:w-[4.75rem]" />
            <col span={5} />
          </colgroup>
          <thead>
            <tr className={isSpace ? 'bg-white/5' : 'bg-gray-50'}>
              <th
                className={`p-1.5 sm:p-2 text-left font-black border-b align-bottom ${isSpace ? 'border-white/10 text-white/70' : 'border-gray-200 text-uv-gray'}`}
              >
                {t('appointments.time')}
              </th>
              {dayIsos.map((iso) => (
                <th
                  key={iso}
                  className={`p-1 sm:p-1.5 text-center font-black border-b min-w-0 overflow-hidden ${isSpace ? 'border-white/10 text-white' : 'border-gray-200 text-uv-black'}`}
                >
                  <div className="truncate">{formatShortWeekdayLabel(iso)}</div>
                  <div className={`truncate text-[9px] sm:text-[10px] font-bold ${isSpace ? 'text-white/45' : 'text-uv-gray'}`}>
                    {formatDayMonth(iso)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {APPOINTMENT_TIME_SLOTS.map(([slotStart, slotEnd]) => {
              const slotLabel = `${slotStart}–${slotEnd}`;
              return (
                <tr key={slotLabel} className={isSpace ? 'hover:bg-white/5' : 'hover:bg-gray-50'}>
                  <td
                    className={`p-0.5 sm:p-1 font-bold border-t whitespace-nowrap align-middle h-14 max-h-14 ${isSpace ? 'border-white/10 text-white/80' : 'border-gray-100 text-uv-black'}`}
                  >
                    {slotLabel}
                  </td>
                  {dayIsos.map((iso) => {
                    const appt = appointmentAt(weekAppointments, iso, slotStart, slotEnd);
                    const slotRow = rangeSlotAt(rangeSlots, iso, slotStart, slotEnd);
                    const slotHeld = slotRow ? isTruthyBooked(slotRow.is_booked) : false;
                    const slotLocked = slotRow ? isTruthyBooked(slotRow.is_slot_locked) : false;
                    const bookSlotLive = Boolean(slotRow && slotRow.is_active !== false);
                    const staffSlotOpen = Boolean(slotRow && slotRow.is_active !== false && !slotHeld);
                    const pastDayBlocked = Boolean(minSelectableDayIso && iso < minSelectableDayIso);
                    const staffSlotOpenEffective = staffSlotOpen && !pastDayBlocked;
                    const canPickBook = isBookMode && bookSlotLive && !slotLocked && !pastDayBlocked;
                    /** Dolu / kilit: öğrencide onaylı; hocada herhangi talep veya onay */
                    const showAmberFull = isBookMode ? slotLocked : slotHeld;
                    /** Başkasının bekleyen talebi var; öğrenci hâlâ sıraya girebilir */
                    const showAmberQueueBook = isBookMode && slotHeld && !slotLocked;
                    const showGreenTick = isBookMode
                      ? bookSlotLive && !slotHeld && !slotLocked && !pastDayBlocked
                      : staffSlotOpenEffective;
                    const showInnerLabels = showGreenTick || showAmberFull || showAmberQueueBook;

                    const cellBase = `border-t align-middle min-w-0 overflow-hidden h-14 max-h-14 py-0.5 px-0.5 ${isSpace ? 'border-white/10' : 'border-gray-100'}`;

                    const bookingKey = `${iso}|${slotGridKey(slotStart, slotEnd)}`;
                    const isSelectedBook = isBookMode && selectedBookingKey === bookingKey;

                    const slotInnerFrame =
                      'flex h-full max-h-[52px] w-full min-h-0 min-w-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-md border px-0.5 py-0.5';

                    if (appt) {
                      const st = String(appt.status ?? '').trim().toLowerCase();
                      if (isBookMode && st === 'approved') {
                        return (
                          <td key={`${iso}-${slotLabel}`} className={`${cellBase} text-center`}>
                            <div
                              className={`${slotInnerFrame} cursor-default ${
                                isSpace ? 'border-amber-500/45 bg-amber-950/40' : 'border-amber-300 bg-amber-50/90'
                              }`}
                              title={t('appointments.slotBooked')}
                            >
                              <span
                                className={`pointer-events-none inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${
                                  isSpace ? 'border-amber-500/45 bg-amber-950/40' : 'border-amber-300 bg-amber-50/90'
                                }`}
                                aria-hidden
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-300/80" />
                              </span>
                              <div className="w-full min-w-0 text-center">
                                <div
                                  className={`text-[8px] font-black uppercase tracking-tight truncate ${isSpace ? 'text-white/55' : 'text-uv-gray'}`}
                                >
                                  {t('appointments.slotBookedShort')}
                                </div>
                                <div
                                  className={`text-[8px] font-black uppercase tracking-tight truncate ${isSpace ? 'text-amber-200/90' : 'text-amber-900'}`}
                                >
                                  {t('appointments.statusApproved')}
                                </div>
                              </div>
                            </div>
                          </td>
                        );
                      }
                      return (
                        <td key={`${iso}-${slotLabel}`} className={`${cellBase} text-center`}>
                          <div
                            className={`${slotInnerFrame} ${
                              isSpace ? 'border-primary/40 bg-primary/10' : 'border-primary/30 bg-primary/5'
                            }`}
                          >
                            <div className="text-[8px] font-black uppercase tracking-tight opacity-80 truncate w-full min-w-0">
                              {isBookMode ? t('appointments.yourScheduledSlot') : t('appointments.slotModalAppointment')}
                            </div>
                            {!isBookMode && (
                              <div
                                className="text-[8px] font-black leading-tight truncate w-full min-w-0"
                                title={[appt.student_name, appt.student_surname].filter(Boolean).join(' ')}
                              >
                                {[appt.student_name, appt.student_surname].filter(Boolean).join(' ') || '—'}
                              </div>
                            )}
                            <div className="text-[8px] opacity-75 truncate w-full min-w-0">{appt.status}</div>
                          </div>
                        </td>
                      );
                    }

                    /** Liste eşleşmese bile range API öğrenci adı döndürüyorsa (hoca) aynı kartı göster */
                    const staffBookingFromRange =
                      !isBookMode &&
                      slotHeld &&
                      slotRow &&
                      (Boolean(slotRow.student_name) || Boolean(slotRow.student_surname));

                    if (staffBookingFromRange) {
                      return (
                        <td key={`${iso}-${slotLabel}`} className={`${cellBase} text-center`}>
                          <div
                            className={`${slotInnerFrame} ${
                              isSpace ? 'border-primary/40 bg-primary/10' : 'border-primary/30 bg-primary/5'
                            }`}
                          >
                            <div className="text-[8px] font-black uppercase tracking-tight opacity-80 truncate w-full min-w-0">
                              {t('appointments.slotModalAppointment')}
                            </div>
                            <div
                              className="text-[8px] font-black leading-tight truncate w-full min-w-0"
                              title={[slotRow.student_name, slotRow.student_surname].filter(Boolean).join(' ')}
                            >
                              {[slotRow.student_name, slotRow.student_surname].filter(Boolean).join(' ') || '—'}
                            </div>
                            <div className="text-[8px] opacity-75 truncate w-full min-w-0">
                              {slotRow.appointment_status ?? ''}
                            </div>
                          </div>
                        </td>
                      );
                    }

                    const tickBoxClass = showAmberFull
                      ? isSpace
                        ? 'border-amber-500/45 bg-amber-950/40'
                        : 'border-amber-300 bg-amber-50/90'
                      : showAmberQueueBook
                        ? isSpace
                          ? 'border-amber-400/50 bg-amber-950/30'
                          : 'border-amber-400/70 bg-amber-50'
                        : showGreenTick
                          ? isSpace
                            ? 'border-emerald-200/90 bg-emerald-600 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]'
                            : 'border-emerald-600 bg-emerald-600 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]'
                          : isSpace
                            ? 'border-white/45 bg-[#0c0c18]'
                            : 'border-gray-400 bg-white';

                    const innerVisual = (
                      <>
                        <span
                          className={`pointer-events-none inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${tickBoxClass}`}
                          aria-hidden
                        >
                          {showGreenTick ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.35)]" />
                          ) : showAmberFull || showAmberQueueBook ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-300/80" />
                          ) : null}
                        </span>
                        {showInnerLabels && (
                          <div className="w-full min-w-0 flex-1 min-h-0 overflow-hidden text-center flex flex-col justify-center gap-0">
                            {showGreenTick && (
                              <div
                                className={`text-[8px] sm:text-[9px] font-black uppercase tracking-tight truncate ${isSpace ? 'text-emerald-300/95' : 'text-emerald-800'}`}
                              >
                                {t('appointments.availabilityAvailable')}
                              </div>
                            )}
                            {showAmberFull && (
                              <div
                                className={`text-[8px] sm:text-[9px] font-black uppercase tracking-tight truncate ${isSpace ? 'text-amber-200/90' : 'text-amber-900'}`}
                                title={t('appointments.slotBooked')}
                              >
                                {t('appointments.slotBookedShort')}
                              </div>
                            )}
                            {showAmberQueueBook && (
                              <div
                                className={`text-[8px] sm:text-[9px] font-black uppercase tracking-tight truncate ${isSpace ? 'text-amber-200/95' : 'text-amber-900'}`}
                                title={t('appointments.slotPendingOthersSub')}
                              >
                                {t('appointments.slotPendingOthers')}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    );

                    const staffCellClass = `flex flex-col items-center justify-center gap-0.5 w-full h-full max-h-[52px] min-h-0 rounded-md p-0.5 sm:p-1 border cursor-pointer transition-[box-shadow,border-color] min-w-0 overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500/35 ${
                      staffSlotOpenEffective
                        ? isSpace
                          ? 'border-emerald-400/70 ring-2 ring-emerald-500/50 bg-emerald-500/10'
                          : 'border-emerald-500/80 ring-2 ring-emerald-400/60 bg-emerald-50/80'
                        : isSpace
                          ? 'border-white/12 bg-white/[0.03]'
                          : 'border-gray-200 bg-white'
                    } ${saving ? 'pointer-events-none opacity-70' : ''}`;

                    const bookCellClass = `flex flex-col items-center justify-center gap-0.5 w-full h-full max-h-[52px] min-h-0 rounded-md p-0.5 sm:p-1 border min-w-0 overflow-hidden transition-[box-shadow,border-color] ${
                      canPickBook
                        ? showAmberQueueBook
                          ? isSpace
                            ? `border-amber-400/55 ring-2 ring-amber-500/35 bg-amber-950/25 ${isSelectedBook ? 'ring-primary ring-2 ring-offset-2 ring-offset-[#050510]' : ''}`
                            : `border-amber-400/85 ring-2 ring-amber-300/45 bg-amber-50/95 ${isSelectedBook ? 'ring-primary ring-2 ring-offset-2 ring-offset-white' : ''}`
                          : isSpace
                            ? `border-emerald-400/70 ring-2 ring-emerald-500/50 bg-emerald-500/10 ${isSelectedBook ? 'ring-primary ring-2 ring-offset-2 ring-offset-[#050510]' : ''}`
                            : `border-emerald-500/80 ring-2 ring-emerald-400/60 bg-emerald-50/80 ${isSelectedBook ? 'ring-primary ring-2 ring-offset-2 ring-offset-white' : ''}`
                        : isSpace
                          ? 'border-white/12 bg-white/[0.03] opacity-55 cursor-not-allowed'
                          : 'border-gray-200 bg-gray-50/80 opacity-70 cursor-not-allowed'
                    } ${saving ? 'pointer-events-none opacity-60' : ''}`;

                    if (isBookMode) {
                      const canPick = canPickBook;
                      return (
                        <td key={`${iso}-${slotLabel}`} className={`${cellBase} text-center`}>
                          <button
                            type="button"
                            disabled={!canPick || saving}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (canPick && !saving) onSlotSelect?.(iso, slotStart, slotEnd);
                            }}
                            className={`${bookCellClass} max-w-full`}
                            aria-label={canPick ? t('appointments.tapToBookSlot') : t('appointments.slotUnavailableShort')}
                          >
                            {innerVisual}
                          </button>
                        </td>
                      );
                    }

                    const staffAriaLabel = slotHeld
                      ? t('appointments.slotBooked')
                      : pastDayBlocked
                        ? t('appointments.slotUnavailableShort')
                        : staffSlotOpenEffective
                          ? t('appointments.availabilityAvailable')
                          : t('appointments.availabilityUnavailable');

                    return (
                      <td key={`${iso}-${slotLabel}`} className={`${cellBase} text-center`}>
                        {/* label+checkbox tablo hücrelerinde bazı tarayıcılarda tıklama hedefini yanlış sütuna kaydırıyordu; doğrudan button kullan */}
                        <button
                          type="button"
                          disabled={Boolean(saving || slotHeld || pastDayBlocked)}
                          aria-pressed={staffSlotOpenEffective}
                          aria-label={staffAriaLabel}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (slotHeld || saving || pastDayBlocked) return;
                            onAvailabilityToggle?.(iso, slotStart, slotEnd, !staffSlotOpen);
                          }}
                          className={`${staffCellClass} max-w-full`}
                        >
                          {innerVisual}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
