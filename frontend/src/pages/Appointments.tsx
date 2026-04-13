import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { DEPARTMENTS_DATA } from '../constants/departments';
import { themedConfirm, themedPrompt } from '../utils/themedDialog';
import {
  addDaysIso,
  calendarDateKey,
  isPendingOrApprovedStatus,
  isTruthyBooked,
  normalizeApptTime,
  slotGridKey,
  startOfWeekMondayIso,
  toClockHm,
  weekDayDatesFromMonday,
} from '../constants/appointmentTimeSlots';
import { StaffWeekCalendar } from '../components/appointments/StaffWeekCalendar';
import { FiArchive, FiBell, FiCalendar, FiClock, FiInbox, FiSend, FiUser } from 'react-icons/fi';

type AvailabilitySlot = {
  weekday: number;
  start_time?: string;
  end_time?: string;
  startTime?: string;
  endTime?: string;
  is_booked?: boolean;
  isBooked?: boolean;
  is_active?: boolean;
};

const Appointments = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { dimension } = useTheme();
  const [searchParams] = useSearchParams();
  const isSpace = dimension === 'space';
  const isStaff = user?.role === 'staff';

  const [staffList, setStaffList] = useState<any[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [filters, setFilters] = useState({ name: '', departmentId: '' });
  const [debouncedName, setDebouncedName] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [weekMondayIso, setWeekMondayIso] = useState(() => startOfWeekMondayIso());
  const [weekRangeSlots, setWeekRangeSlots] = useState<any[]>([]);
  const [bookingWeekMondayIso, setBookingWeekMondayIso] = useState(() => startOfWeekMondayIso());
  const [studentWeekRangeSlots, setStudentWeekRangeSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ startTime: string; endTime: string } | null>(null);
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [myAppointments, setMyAppointments] = useState<any[]>([]);
  const [archiveAppointments, setArchiveAppointments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const allDepartments = useMemo(
    () => Object.values(DEPARTMENTS_DATA).flat().sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    []
  );

  useEffect(() => {
    const preselectedStaff = searchParams.get('staff');
    if (preselectedStaff) setSelectedStaff(Number(preselectedStaff));
  }, [searchParams]);

  const staffFetchGen = useRef(0);
  const prevDepartmentIdRef = useRef<string | undefined>(undefined);

  const loadMyData = async () => {
    const [activeRes, archiveRes, notificationsRes] = await Promise.all([
      api.get('/academic/appointments'),
      api.get('/academic/appointments', { params: { archive: true } }),
      api.get('/academic/appointments/notifications'),
    ]);
    setMyAppointments(activeRes.data || []);
    setArchiveAppointments(archiveRes.data || []);
    setNotifications(notificationsRes.data || []);
  };

  const loadAvailability = async (staffUserId: number, date?: string) => {
    const endpoint = date
      ? `/academic/staff/${staffUserId}/availability/date`
      : `/academic/staff/${staffUserId}/availability`;
    const res = await api.get(endpoint, date ? { params: { date } } : undefined);
    setAvailability(res.data || []);
  };

  const loadWeekRange = useCallback(async () => {
    if (!isStaff || !user?.userId) return;
    const from = weekMondayIso;
    const to = addDaysIso(weekMondayIso, 6);
    try {
      const res = await api.get(`/academic/staff/${user.userId}/availability/range`, {
        params: { from, to },
      });
      setWeekRangeSlots(res.data || []);
    } catch (e) {
      console.error('Staff availability range failed', e);
      setWeekRangeSlots([]);
    }
  }, [isStaff, user?.userId, weekMondayIso]);

  const loadStudentWeekRange = useCallback(async () => {
    if (isStaff || !selectedStaff) return;
    const from = bookingWeekMondayIso;
    const to = addDaysIso(bookingWeekMondayIso, 6);
    try {
      const res = await api.get(`/academic/staff/${selectedStaff}/availability/range`, {
        params: { from, to },
      });
      setStudentWeekRangeSlots(res.data || []);
    } catch (e) {
      console.error('Student availability range failed', e);
      setStudentWeekRangeSlots([]);
    }
  }, [isStaff, selectedStaff, bookingWeekMondayIso]);

  useEffect(() => {
    loadMyData().catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedName(filters.name), 300);
    return () => clearTimeout(t);
  }, [filters.name]);

  useEffect(() => {
    if (isStaff) return;
    const hasDept = Boolean(filters.departmentId);
    const hasName = Boolean(debouncedName.trim());
    if (!hasDept && !hasName) {
      staffFetchGen.current += 1;
      setStaffList([]);
      setStaffLoading(false);
      return;
    }
    const gen = ++staffFetchGen.current;
    setStaffLoading(true);
    const ac = new AbortController();
    api
      .get('/academic/staff/search', {
        params: {
          ...(hasName ? { name: debouncedName.trim() } : {}),
          ...(hasDept ? { departmentId: filters.departmentId } : {}),
        },
        signal: ac.signal,
      })
      .then((res) => {
        if (gen === staffFetchGen.current) setStaffList(res.data || []);
      })
      .catch((e: unknown) => {
        const err = e as { name?: string; code?: string };
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
        if (gen === staffFetchGen.current) setStaffList([]);
      })
      .finally(() => {
        if (gen === staffFetchGen.current) setStaffLoading(false);
      });
    return () => ac.abort();
  }, [debouncedName, filters.departmentId, isStaff]);

  const nameSearchPending =
    Boolean(filters.name.trim()) && filters.name.trim() !== debouncedName.trim();

  const staffSearchReady = Boolean(filters.departmentId) || Boolean(filters.name.trim());

  useEffect(() => {
    if (prevDepartmentIdRef.current !== undefined && prevDepartmentIdRef.current !== filters.departmentId) {
      setSelectedStaff(null);
    }
    prevDepartmentIdRef.current = filters.departmentId;
  }, [filters.departmentId]);

  useEffect(() => {
    if (!selectedStaff) return;
    if (!selectedDate) {
      setAvailability([]);
      return;
    }
    loadAvailability(selectedStaff, selectedDate).catch(() => {
      setAvailability([]);
    });
  }, [selectedStaff, selectedDate]);

  useEffect(() => {
    loadWeekRange().catch(() => {});
  }, [loadWeekRange]);

  useEffect(() => {
    loadStudentWeekRange().catch(() => {});
  }, [loadStudentWeekRange]);

  useEffect(() => {
    if (isStaff || !selectedStaff) return;
    setBookingWeekMondayIso(startOfWeekMondayIso());
    setSelectedDate('');
    setSelectedSlot(null);
  }, [selectedStaff, isStaff]);

  const staffWeekAppointments = useMemo(() => {
    if (!isStaff || !user?.userId) return [];
    const mon = weekMondayIso;
    const sun = addDaysIso(weekMondayIso, 6);
    return myAppointments.filter((a) => {
      const d = calendarDateKey(a.appointment_date);
      return d >= mon && d <= sun && isPendingOrApprovedStatus(a.status);
    });
  }, [isStaff, user?.userId, weekMondayIso, myAppointments]);

  const studentWeekAppointments = useMemo(() => {
    if (isStaff || !selectedStaff) return [];
    const mon = bookingWeekMondayIso;
    const sun = addDaysIso(bookingWeekMondayIso, 6);
    return myAppointments.filter((a: { staff_user_id?: number; appointment_date?: string; status?: string }) => {
      if (Number(a.staff_user_id) !== Number(selectedStaff)) return false;
      const d = calendarDateKey(a.appointment_date);
      return d >= mon && d <= sun && isPendingOrApprovedStatus(a.status);
    });
  }, [isStaff, selectedStaff, bookingWeekMondayIso, myAppointments]);

  const selectedBookingKey = useMemo(() => {
    if (!selectedDate || !selectedSlot) return null;
    return `${selectedDate}|${slotGridKey(selectedSlot.startTime, selectedSlot.endTime)}`;
  }, [selectedDate, selectedSlot]);

  const pendingAppointments = useMemo(
    () => myAppointments.filter((a) => String(a.status ?? '').trim().toLowerCase() === 'pending'),
    [myAppointments]
  );

  const upcomingNonPendingAppointments = useMemo(
    () => myAppointments.filter((a) => String(a.status ?? '').trim().toLowerCase() !== 'pending'),
    [myAppointments]
  );

  const selectedStaffRow = useMemo(() => {
    if (!selectedStaff) return null;
    return staffList.find((s) => Number(s.staff_user_id) === Number(selectedStaff)) ?? null;
  }, [staffList, selectedStaff]);

  const availableSlotsForDate = useMemo(() => {
    if (!selectedDate) return [];
    const unique = new Map<string, { startTime: string; endTime: string; booked: boolean }>();
    availability
      .filter((s) => s.is_active !== false)
      .map((s) => ({
        startTime: (s.start_time || s.startTime || '').slice(0, 5),
        endTime: (s.end_time || s.endTime || '').slice(0, 5),
        booked: Boolean(s.is_booked ?? s.isBooked),
      }))
      .forEach((slot) => {
        const key = `${slot.startTime}-${slot.endTime}`;
        if (slot.startTime && slot.endTime && !unique.has(key)) {
          unique.set(key, slot);
        }
      });
    return Array.from(unique.values());
  }, [availability, selectedDate]);

  useEffect(() => {
    if (!selectedSlot) return;
    const match = availableSlotsForDate.find(
      (s) => s.startTime === selectedSlot.startTime && s.endTime === selectedSlot.endTime
    );
    if (match?.booked) setSelectedSlot(null);
  }, [availableSlotsForDate, selectedSlot]);

  const handleStaffAvailabilityToggle = useCallback(
    async (dateIso: string, start: string, end: string, available: boolean) => {
      if (!isStaff || !user?.userId) return;
      const key = slotGridKey(start, end);
      const slotKeyFn = (s: { start_time?: string; end_time?: string }) =>
        slotGridKey(toClockHm(s.start_time || ''), toClockHm(s.end_time || ''));

      const appt = staffWeekAppointments.find((a) => {
        if (!isPendingOrApprovedStatus(a.status)) return false;
        return (
          calendarDateKey(a.appointment_date) === dateIso &&
          slotGridKey(normalizeApptTime(a.start_time), normalizeApptTime(a.end_time)) === key
        );
      });
      if (appt) return;

      setSaving(true);
      setError('');
      try {
        const freshRes = await api.get(`/academic/staff/${user.userId}/availability/date`, {
          params: { date: dateIso },
        });
        const daySlots: Array<{ start_time?: string; end_time?: string; is_booked?: unknown; is_active?: boolean }> =
          freshRes.data || [];

        const row = daySlots.find((s) => slotKeyFn(s) === key);
        const booked = row ? isTruthyBooked(row.is_booked) : false;
        if (booked) return;

        const hasOpenAvailability = Boolean(row && row.is_active !== false && !booked);

        const openRows = daySlots.filter((s) => s.is_active !== false && !isTruthyBooked(s.is_booked));

        let newSlots: { startTime: string; endTime: string }[];

        if (available) {
          if (hasOpenAvailability) return;
          newSlots = [
            ...openRows.map((s) => ({
              startTime: toClockHm(s.start_time || ''),
              endTime: toClockHm(s.end_time || ''),
            })),
            { startTime: start, endTime: end },
          ];
        } else {
          if (!hasOpenAvailability) return;
          newSlots = openRows
            .filter((s) => slotKeyFn(s) !== key)
            .map((s) => ({
              startTime: toClockHm(s.start_time || ''),
              endTime: toClockHm(s.end_time || ''),
            }));
        }

        const seen = new Set<string>();
        newSlots = newSlots.filter((s) => {
          const k = slotGridKey(s.startTime, s.endTime);
          if (!s.startTime || !s.endTime || seen.has(k)) return false;
          seen.add(k);
          return true;
        });

        await api.put('/academic/staff/availability/date', { date: dateIso, slots: newSlots });
        await loadWeekRange();
      } catch (e: any) {
        setError(e?.response?.data?.error || t('appointments.errors.saveAvailability'));
      } finally {
        setSaving(false);
      }
    },
    [isStaff, user?.userId, staffWeekAppointments, loadWeekRange, t]
  );

  const handleSetWeeklyDefault = useCallback(async () => {
    if (!isStaff || !user?.userId) return;
    const workDays = new Set(weekDayDatesFromMonday(weekMondayIso).slice(0, 5));
    const byKey = new Map<string, { weekday: number; startTime: string; endTime: string }>();
    for (const row of weekRangeSlots) {
      const iso = calendarDateKey(row.specific_date);
      if (!workDays.has(iso)) continue;
      if (row.is_active === false) continue;
      if (isTruthyBooked(row.is_booked)) continue;
      const dow = new Date(`${iso}T12:00:00`).getDay();
      const st = toClockHm(row.start_time || '');
      const et = toClockHm(row.end_time || '');
      const k = `${dow}|${st}|${et}`;
      if (!byKey.has(k)) byKey.set(k, { weekday: dow, startTime: st, endTime: et });
    }
    const slots = Array.from(byKey.values()).sort(
      (a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime)
    );
    setSaving(true);
    setError('');
    try {
      await api.put('/academic/staff/availability', { slots });
      await loadWeekRange();
    } catch (e: any) {
      setError(e?.response?.data?.error || t('appointments.errors.saveDefaultAvailability'));
    } finally {
      setSaving(false);
    }
  }, [isStaff, user?.userId, weekRangeSlots, weekMondayIso, loadWeekRange, t]);

  const handleClearWeeklyDefault = useCallback(async () => {
    if (!isStaff || !user?.userId) return;
    const ok = await themedConfirm(t('appointments.clearDefaultConfirm'), t('appointments.clearDefaultTitle'));
    if (!ok) return;
    setSaving(true);
    setError('');
    try {
      await api.put('/academic/staff/availability', { slots: [] });
      await loadWeekRange();
    } catch (e: any) {
      setError(e?.response?.data?.error || t('appointments.errors.clearDefaultAvailability'));
    } finally {
      setSaving(false);
    }
  }, [isStaff, user?.userId, loadWeekRange, t]);

  const createAppointment = async () => {
    if (!selectedStaff || !selectedDate || !selectedSlot) return;
    setSaving(true);
    setError('');
    try {
      await api.post('/academic/appointments', {
        staffUserId: selectedStaff,
        date: selectedDate,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        topic,
        notes,
      });
      setTopic('');
      setNotes('');
      setSelectedSlot(null);
      await loadMyData();
      await loadAvailability(selectedStaff, selectedDate);
      await loadStudentWeekRange();
    } catch (e: any) {
      setError(e?.response?.data?.error || t('appointments.errors.create'));
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: number, status: 'approved' | 'rejected' | 'cancelled') => {
    const reason =
      status === 'rejected' || status === 'cancelled' ? (await themedPrompt(t('appointments.reasonPrompt'))) || '' : '';
    await api.patch(`/academic/appointments/${id}/status`, { status, reason });
    await loadMyData();
    if (isStaff) await loadWeekRange();
  };

  const markRead = async (id: number) => {
    await api.patch(`/academic/appointments/notifications/${id}/read`);
    await loadMyData();
  };

  const formatAppointmentDate = (rawDate: string) => {
    const datePart = (rawDate || '').split('T')[0];
    if (!datePart) return rawDate;
    const [year, month, day] = datePart.split('-');
    return `${day}.${month}.${year}`;
  };

  const formatStatus = (status: string) => {
    const map: Record<string, string> = {
      pending: t('appointments.statusPending'),
      approved: t('appointments.statusApproved'),
      rejected: t('appointments.statusRejected'),
      cancelled: t('appointments.statusCancelled'),
    };
    return map[status] || status;
  };

  const appointmentStatusBadgeClass = (status: string) => {
    const base =
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide border shrink-0';
    switch (status) {
      case 'pending':
        return `${base} ${isSpace ? 'border-amber-400/40 bg-amber-500/10 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-900'}`;
      case 'approved':
        return `${base} ${isSpace ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`;
      case 'rejected':
        return `${base} ${isSpace ? 'border-red-400/40 bg-red-500/10 text-red-200' : 'border-red-200 bg-red-50 text-red-900'}`;
      case 'cancelled':
        return `${base} ${isSpace ? 'border-white/20 bg-white/5 text-white/55' : 'border-gray-200 bg-gray-100 text-gray-700'}`;
      default:
        return `${base} ${isSpace ? 'border-white/15 bg-white/5 text-white/70' : 'border-gray-200 bg-gray-50 text-gray-800'}`;
    }
  };

  const detailBoxClass = isSpace ? 'rounded-lg border border-white/10 bg-black/20 px-3 py-2' : 'rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2';

  const pastArchiveFootnote = (status: string) => {
    const s = String(status);
    if (s === 'approved') return null;
    if (s === 'cancelled') return t('appointments.pastFootnoteCancelled');
    if (s === 'rejected') return t('appointments.pastFootnoteRejected');
    if (s === 'pending') return t('appointments.pastFootnotePending');
    return null;
  };

  return (
    <div className={`min-h-screen p-4 md:p-6 ${isSpace ? 'bg-[#050510]' : 'bg-white'}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className={`text-2xl font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('appointments.title')}</h1>

        {error && <div className="p-3 rounded-xl bg-red-100 text-red-700 text-sm font-bold">{error}</div>}

        {isStaff && (
          <div className={`rounded-2xl p-4 md:p-6 border ${isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-white'}`}>
            <h2 className={`font-black text-lg mb-1 ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('appointments.availabilityTitle')}</h2>
            <p className={`text-xs font-medium mb-4 ${isSpace ? 'text-white/55' : 'text-uv-gray'}`}>{t('appointments.gridClickHint')}</p>

            <StaffWeekCalendar
              weekMondayIso={weekMondayIso}
              rangeSlots={weekRangeSlots}
              weekAppointments={staffWeekAppointments}
              onPrevWeek={() => setWeekMondayIso((w) => addDaysIso(w, -7))}
              onNextWeek={() => setWeekMondayIso((w) => addDaysIso(w, 7))}
              onThisWeek={() => setWeekMondayIso(startOfWeekMondayIso())}
              onAvailabilityToggle={(dateIso, start, end, available) => void handleStaffAvailabilityToggle(dateIso, start, end, available)}
              saving={saving}
              isSpace={isSpace}
              t={t}
            />
            <div className={`mt-4 flex flex-col gap-3 pt-4 border-t ${isSpace ? 'border-white/10' : 'border-uv-border'}`}>
              <p className={`text-xs font-medium max-w-xl ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>{t('appointments.setAsDefaultHint')}</p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="uv-button-secondary px-4 py-2.5 text-xs font-black shrink-0"
                  disabled={saving}
                  onClick={() => void handleSetWeeklyDefault()}
                >
                  {t('appointments.setAsDefault')}
                </button>
                <button
                  type="button"
                  className={`px-4 py-2.5 text-xs font-black shrink-0 rounded-tl-xl rounded-br-xl border transition-opacity ${
                    isSpace ? 'border-white/20 text-white/90 hover:bg-white/10' : 'border-uv-border text-uv-black hover:bg-gray-50'
                  } ${saving ? 'opacity-50 pointer-events-none' : ''}`}
                  disabled={saving}
                  onClick={() => void handleClearWeeklyDefault()}
                >
                  {t('appointments.clearDefault')}
                </button>
              </div>
            </div>
          </div>
        )}

        {!isStaff && (
          <div className={`rounded-2xl p-4 md:p-6 border ${isSpace ? 'border-primary/25 bg-gradient-to-b from-primary/10 to-white/[0.02]' : 'border-uv-border bg-white shadow-sm'}`}>
            <h2 className={`font-black text-lg mb-1 ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('appointments.bookTitle')}</h2>
            <p className={`text-xs font-medium mb-4 ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>{t('appointments.bookSectionBlurb')}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input placeholder={t('appointments.searchByName')} className="uv-input" value={filters.name} onChange={(e) => setFilters((p) => ({ ...p, name: e.target.value }))} />
              <select
                className={`uv-input appearance-none ${
                  isSpace
                    ? `bg-white/5 border-white/10 ${filters.departmentId ? 'text-white' : 'text-gray-500'}`
                    : `bg-white border-uv-border ${filters.departmentId ? 'text-uv-black' : 'text-uv-gray/40'}`
                }`}
                value={filters.departmentId}
                onChange={(e) => setFilters((p) => ({ ...p, departmentId: e.target.value }))}
              >
                <option value="" className={isSpace ? 'bg-[#0a0a1a] text-white' : 'bg-white text-uv-black'}>
                  {t('appointments.searchByDepartment')}
                </option>
                {allDepartments.map((department) => (
                  <option key={department.id} value={String(department.id)} className={isSpace ? 'bg-[#0a0a1a] text-white' : 'bg-white text-uv-black'}>
                    {t(`departments.departments.${department.name}`) || department.name}
                  </option>
                ))}
              </select>
            </div>
            <p className={`text-xs font-medium mt-3 ${isSpace ? 'text-white/45' : 'text-uv-gray'}`}>{t('appointments.staffListHint')}</p>
            {!staffSearchReady ? null : staffLoading || nameSearchPending ? (
              <p className={`text-xs font-bold mt-4 ${isSpace ? 'text-gray-400' : 'text-uv-gray'}`}>{t('common.loading')}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {staffList.map((s) => (
                  <button
                    key={s.staff_user_id}
                    type="button"
                    onClick={() => setSelectedStaff(s.staff_user_id)}
                    className={`text-left rounded-xl border p-3.5 transition-colors ${
                      selectedStaff === s.staff_user_id
                        ? isSpace
                          ? 'border-primary bg-primary/10 ring-1 ring-primary/40'
                          : 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : isSpace
                          ? 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/90'
                    }`}
                  >
                    <p className={`font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>
                      {s.staff_name} {s.staff_surname}
                    </p>
                    <p className={`text-xs mt-0.5 ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>
                      {s.staff_title || '—'} · {s.department_name || '—'}
                    </p>
                  </button>
                ))}
                {staffList.length === 0 && <p className={`text-xs font-bold ${isSpace ? 'text-white/40' : 'text-uv-gray'}`}>{t('appointments.noStaffFound')}</p>}
              </div>
            )}

            {selectedStaff && (
              <div className="mt-4 space-y-3">
                {selectedStaffRow && (
                  <p className={`text-sm font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>
                    {selectedStaffRow.staff_name} {selectedStaffRow.staff_surname}
                    <span className={`font-bold text-xs ml-2 ${isSpace ? 'text-white/50' : 'text-uv-gray'}`}>— {selectedStaffRow.department_name || '—'}</span>
                  </p>
                )}
                <p className={`text-xs font-medium ${isSpace ? 'text-white/55' : 'text-uv-gray'}`}>{t('appointments.studentCalendarHint')}</p>
                <StaffWeekCalendar
                  mode="book"
                  weekMondayIso={bookingWeekMondayIso}
                  rangeSlots={studentWeekRangeSlots}
                  weekAppointments={studentWeekAppointments}
                  onPrevWeek={() => {
                    setBookingWeekMondayIso((w) => addDaysIso(w, -7));
                    setSelectedDate('');
                    setSelectedSlot(null);
                  }}
                  onNextWeek={() => {
                    setBookingWeekMondayIso((w) => addDaysIso(w, 7));
                    setSelectedDate('');
                    setSelectedSlot(null);
                  }}
                  onThisWeek={() => {
                    setBookingWeekMondayIso(startOfWeekMondayIso());
                    setSelectedDate('');
                    setSelectedSlot(null);
                  }}
                  onSlotSelect={(dateIso, start, end) => {
                    setSelectedDate(dateIso);
                    setSelectedSlot({ startTime: start, endTime: end });
                  }}
                  selectedBookingKey={selectedBookingKey}
                  saving={saving}
                  isSpace={isSpace}
                  t={t}
                />
                {selectedDate && selectedSlot && (
                  <p className={`text-xs font-bold ${isSpace ? 'text-emerald-300/90' : 'text-primary'}`}>
                    {t('appointments.selectedSlotSummary', {
                      date: formatAppointmentDate(selectedDate),
                      start: selectedSlot.startTime,
                      end: selectedSlot.endTime,
                    })}
                  </p>
                )}
                <input placeholder={t('appointments.topic')} className="uv-input w-full" value={topic} onChange={(e) => setTopic(e.target.value)} />
                <textarea placeholder={t('appointments.notes')} className="uv-input w-full min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} />
                <button onClick={createAppointment} disabled={saving || !selectedSlot || !selectedDate} className="uv-button">
                  {t('appointments.create')}
                </button>
              </div>
            )}
          </div>
        )}

        <div
          className={`rounded-2xl overflow-hidden border ${
            isSpace ? 'border-white/10 bg-gradient-to-b from-amber-500/[0.12] to-white/[0.02]' : 'border-uv-border bg-white shadow-sm'
          }`}
        >
          <div
            className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b ${
              isSpace ? 'border-white/10 bg-white/[0.03]' : 'border-amber-100/80 bg-amber-50/50'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  isSpace ? 'bg-amber-500/25 text-amber-100' : 'bg-amber-100 text-amber-900'
                }`}
              >
                <FiSend className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className={`font-black text-base leading-tight ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('appointments.pendingRequestsTitle')}</h2>
                <p className={`text-[11px] font-medium mt-0.5 ${isSpace ? 'text-white/45' : 'text-uv-gray'}`}>{t('appointments.pendingRequestsBlurb')}</p>
              </div>
            </div>
            {pendingAppointments.length > 0 && (
              <span
                className={`text-xs font-black px-2.5 py-1 rounded-full shrink-0 ${
                  isSpace ? 'bg-amber-500/20 text-amber-100 border border-amber-400/25' : 'bg-amber-200 text-amber-950'
                }`}
              >
                {pendingAppointments.length}
              </span>
            )}
          </div>
          <div className="p-4 space-y-3">
            {pendingAppointments.length === 0 ? (
              <p className={`text-sm text-center py-10 font-medium ${isSpace ? 'text-white/40' : 'text-uv-gray'}`}>{t('appointments.emptyPendingRequests')}</p>
            ) : (
              pendingAppointments.map((a) => (
                <div
                  key={a.appointment_id}
                  className={`rounded-xl border p-4 transition-colors ${
                    isSpace
                      ? 'border-amber-400/20 bg-amber-500/[0.06] hover:border-amber-400/35'
                      : 'border-amber-200/90 bg-amber-50/40 hover:border-amber-300'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 min-w-0">
                      <span className={`inline-flex items-center gap-1.5 text-sm font-bold ${isSpace ? 'text-white' : 'text-uv-black'}`}>
                        <FiCalendar className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                        {formatAppointmentDate(a.appointment_date)}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${isSpace ? 'text-white/70' : 'text-uv-gray'}`}>
                        <FiClock className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                        {a.start_time?.slice(0, 5)}–{a.end_time?.slice(0, 5)}
                      </span>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide border ${
                        isSpace ? 'border-amber-400/40 bg-amber-500/15 text-amber-100' : 'border-amber-300 bg-amber-100 text-amber-950'
                      }`}
                    >
                      {t('appointments.requestAwaitingBadge')}
                    </span>
                  </div>
                  <div className={`mt-3 pt-3 border-t flex items-start gap-2 ${isSpace ? 'border-white/10' : 'border-amber-200/60'}`}>
                    <FiUser className={`h-4 w-4 shrink-0 mt-0.5 ${isSpace ? 'text-white/35' : 'text-uv-gray'}`} aria-hidden />
                    <p className={`text-xs leading-relaxed ${isSpace ? 'text-white/75' : 'text-uv-gray'}`}>
                      <span className={isSpace ? 'text-white/90' : 'text-uv-black'}>
                        {a.staff_name} {a.staff_surname}
                      </span>
                      <span className={`mx-1.5 ${isSpace ? 'text-white/30' : 'text-gray-300'}`}>/</span>
                      <span className={isSpace ? 'text-white/90' : 'text-uv-black'}>
                        {a.student_name} {a.student_surname}
                      </span>
                    </p>
                  </div>
                  {(a.topic || a.notes) && (
                    <div className={`mt-3 space-y-2 ${isSpace ? 'text-white/85' : 'text-uv-black'}`}>
                      {a.topic && (
                        <div className={detailBoxClass}>
                          <span className={`text-[10px] font-black uppercase tracking-wider ${isSpace ? 'text-white/45' : 'text-uv-gray'}`}>{t('appointments.topic')}</span>
                          <p className="text-xs mt-1 font-medium">{a.topic}</p>
                        </div>
                      )}
                      {a.notes && (
                        <div className={detailBoxClass}>
                          <span className={`text-[10px] font-black uppercase tracking-wider ${isSpace ? 'text-white/45' : 'text-uv-gray'}`}>{t('appointments.notes')}</span>
                          <p className="text-xs mt-1 font-medium whitespace-pre-wrap">{a.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {isStaff && (
                      <>
                        <button
                          type="button"
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                          onClick={() => updateStatus(a.appointment_id, 'approved')}
                        >
                          {t('appointments.approve')}
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-500"
                          onClick={() => updateStatus(a.appointment_id, 'rejected')}
                        >
                          {t('appointments.reject')}
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg ${isSpace ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                      onClick={() => updateStatus(a.appointment_id, 'cancelled')}
                    >
                      {t('appointments.cancel')}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div
          className={`rounded-2xl overflow-hidden border ${
            isSpace ? 'border-white/10 bg-gradient-to-b from-emerald-500/[0.08] to-white/[0.02]' : 'border-uv-border bg-white shadow-sm'
          }`}
        >
          <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b ${isSpace ? 'border-white/10 bg-white/[0.03]' : 'border-gray-100 bg-gray-50/70'}`}>
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  isSpace ? 'bg-emerald-500/20 text-emerald-200' : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                <FiInbox className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className={`font-black text-base leading-tight ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('appointments.activeAppointments')}</h2>
                <p className={`text-[11px] font-medium mt-0.5 ${isSpace ? 'text-white/45' : 'text-uv-gray'}`}>{t('appointments.activeSectionBlurb')}</p>
              </div>
            </div>
            {upcomingNonPendingAppointments.length > 0 && (
              <span className={`text-xs font-black px-2.5 py-1 rounded-full shrink-0 ${isSpace ? 'bg-white/10 text-white/85' : 'bg-emerald-100 text-emerald-900'}`}>
                {upcomingNonPendingAppointments.length}
              </span>
            )}
          </div>
          <div className="p-4 space-y-3">
            {upcomingNonPendingAppointments.length === 0 ? (
              <p className={`text-sm text-center py-10 font-medium ${isSpace ? 'text-white/40' : 'text-uv-gray'}`}>{t('appointments.emptyActiveAppointments')}</p>
            ) : (
              upcomingNonPendingAppointments.map((a) => (
                <div
                  key={a.appointment_id}
                  className={`rounded-xl border p-4 transition-colors ${
                    isSpace ? 'border-white/10 bg-white/[0.04] hover:border-white/18' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 min-w-0">
                      <span className={`inline-flex items-center gap-1.5 text-sm font-bold ${isSpace ? 'text-white' : 'text-uv-black'}`}>
                        <FiCalendar className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                        {formatAppointmentDate(a.appointment_date)}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${isSpace ? 'text-white/70' : 'text-uv-gray'}`}>
                        <FiClock className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                        {a.start_time?.slice(0, 5)}–{a.end_time?.slice(0, 5)}
                      </span>
                    </div>
                    <span className={appointmentStatusBadgeClass(String(a.status))}>{formatStatus(a.status)}</span>
                  </div>
                  <div className={`mt-3 pt-3 border-t flex items-start gap-2 ${isSpace ? 'border-white/10' : 'border-gray-100'}`}>
                    <FiUser className={`h-4 w-4 shrink-0 mt-0.5 ${isSpace ? 'text-white/35' : 'text-uv-gray'}`} aria-hidden />
                    <p className={`text-xs leading-relaxed ${isSpace ? 'text-white/75' : 'text-uv-gray'}`}>
                      <span className={isSpace ? 'text-white/90' : 'text-uv-black'}>
                        {a.staff_name} {a.staff_surname}
                      </span>
                      <span className={`mx-1.5 ${isSpace ? 'text-white/30' : 'text-gray-300'}`}>/</span>
                      <span className={isSpace ? 'text-white/90' : 'text-uv-black'}>
                        {a.student_name} {a.student_surname}
                      </span>
                    </p>
                  </div>
                  {(a.topic || a.notes) && (
                    <div className={`mt-3 space-y-2 ${isSpace ? 'text-white/85' : 'text-uv-black'}`}>
                      {a.topic && (
                        <div className={detailBoxClass}>
                          <span className={`text-[10px] font-black uppercase tracking-wider ${isSpace ? 'text-white/45' : 'text-uv-gray'}`}>{t('appointments.topic')}</span>
                          <p className="text-xs mt-1 font-medium">{a.topic}</p>
                        </div>
                      )}
                      {a.notes && (
                        <div className={detailBoxClass}>
                          <span className={`text-[10px] font-black uppercase tracking-wider ${isSpace ? 'text-white/45' : 'text-uv-gray'}`}>{t('appointments.notes')}</span>
                          <p className="text-xs mt-1 font-medium whitespace-pre-wrap">{a.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {a.rejection_reason && (
                    <p className={`text-xs mt-2 font-medium ${isSpace ? 'text-red-400' : 'text-red-600'}`}>
                      <span className="font-bold">{t('appointments.rejectionReason')}:</span> {a.rejection_reason}
                    </p>
                  )}
                  {a.cancellation_reason && (
                    <p className={`text-xs mt-2 font-medium ${isSpace ? 'text-orange-300/95' : 'text-orange-700'}`}>
                      <span className="font-bold">{t('appointments.cancellationReason')}:</span> {a.cancellation_reason}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {a.status === 'approved' && (
                      <button
                        type="button"
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg ${isSpace ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                        onClick={() => updateStatus(a.appointment_id, 'cancelled')}
                      >
                        {t('appointments.cancel')}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div
          className={`rounded-2xl overflow-hidden border ${
            isSpace ? 'border-white/10 bg-gradient-to-b from-slate-500/[0.12] to-white/[0.02]' : 'border-uv-border bg-white shadow-sm'
          }`}
        >
          <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b ${isSpace ? 'border-white/10 bg-white/[0.03]' : 'border-gray-100 bg-gray-50/70'}`}>
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  isSpace ? 'bg-slate-500/25 text-slate-200' : 'bg-slate-100 text-slate-700'
                }`}
              >
                <FiArchive className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className={`font-black text-base leading-tight ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('appointments.archive')}</h2>
                <p className={`text-[11px] font-medium mt-0.5 ${isSpace ? 'text-white/45' : 'text-uv-gray'}`}>{t('appointments.archiveSectionBlurb')}</p>
              </div>
            </div>
            {archiveAppointments.length > 0 && (
              <span className={`text-xs font-black px-2.5 py-1 rounded-full shrink-0 ${isSpace ? 'bg-white/10 text-white/85' : 'bg-slate-200 text-slate-800'}`}>
                {archiveAppointments.length}
              </span>
            )}
          </div>
          <div className="p-4 space-y-3">
            {archiveAppointments.length === 0 ? (
              <p className={`text-sm text-center py-10 font-medium ${isSpace ? 'text-white/40' : 'text-uv-gray'}`}>{t('appointments.emptyArchiveAppointments')}</p>
            ) : (
              archiveAppointments.map((a) => (
                <div key={a.appointment_id} className={`rounded-xl border p-4 ${isSpace ? 'border-white/10 bg-white/[0.03]' : 'border-gray-200 bg-gray-50/40'}`}>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 min-w-0">
                    <span className={`inline-flex items-center gap-1.5 text-sm font-bold ${isSpace ? 'text-white/90' : 'text-uv-black'}`}>
                      <FiCalendar className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                      {formatAppointmentDate(a.appointment_date)}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${isSpace ? 'text-white/55' : 'text-uv-gray'}`}>
                      <FiClock className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                      {a.start_time?.slice(0, 5)}–{a.end_time?.slice(0, 5)}
                    </span>
                  </div>
                  {pastArchiveFootnote(String(a.status)) && (
                    <p className={`text-[11px] font-semibold mt-2 ${isSpace ? 'text-white/40' : 'text-uv-gray'}`}>{pastArchiveFootnote(String(a.status))}</p>
                  )}
                  <div className={`mt-3 pt-3 border-t flex items-start gap-2 ${isSpace ? 'border-white/10' : 'border-gray-100'}`}>
                    <FiUser className={`h-4 w-4 shrink-0 mt-0.5 ${isSpace ? 'text-white/35' : 'text-uv-gray'}`} aria-hidden />
                    <p className={`text-xs leading-relaxed ${isSpace ? 'text-white/70' : 'text-uv-gray'}`}>
                      <span className={isSpace ? 'text-white/85' : 'text-uv-black'}>
                        {a.staff_name} {a.staff_surname}
                      </span>
                      <span className={`mx-1.5 ${isSpace ? 'text-white/25' : 'text-gray-300'}`}>/</span>
                      <span className={isSpace ? 'text-white/85' : 'text-uv-black'}>
                        {a.student_name} {a.student_surname}
                      </span>
                    </p>
                  </div>
                  {(a.topic || a.notes || a.rejection_reason || a.cancellation_reason) && (
                    <div className={`mt-3 space-y-2 ${isSpace ? 'text-white/80' : 'text-uv-black'}`}>
                      {a.topic && (
                        <div className={detailBoxClass}>
                          <span className={`text-[10px] font-black uppercase tracking-wider ${isSpace ? 'text-white/40' : 'text-uv-gray'}`}>{t('appointments.topic')}</span>
                          <p className="text-xs mt-1 font-medium">{a.topic}</p>
                        </div>
                      )}
                      {a.notes && (
                        <div className={detailBoxClass}>
                          <span className={`text-[10px] font-black uppercase tracking-wider ${isSpace ? 'text-white/40' : 'text-uv-gray'}`}>{t('appointments.notes')}</span>
                          <p className="text-xs mt-1 font-medium whitespace-pre-wrap">{a.notes}</p>
                        </div>
                      )}
                      {a.rejection_reason && (
                        <p className={`text-xs font-medium pt-1 ${isSpace ? 'text-red-400' : 'text-red-600'}`}>
                          <span className="font-bold">{t('appointments.rejectionReason')}:</span> {a.rejection_reason}
                        </p>
                      )}
                      {a.cancellation_reason && (
                        <p className={`text-xs font-medium ${isSpace ? 'text-orange-300/90' : 'text-orange-700'}`}>
                          <span className="font-bold">{t('appointments.cancellationReason')}:</span> {a.cancellation_reason}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div
          className={`rounded-2xl overflow-hidden border ${
            isSpace ? 'border-white/10 bg-gradient-to-b from-violet-500/[0.1] to-white/[0.02]' : 'border-uv-border bg-white shadow-sm'
          }`}
        >
          <div className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b ${isSpace ? 'border-white/10 bg-white/[0.03]' : 'border-gray-100 bg-gray-50/70'}`}>
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  isSpace ? 'bg-violet-500/25 text-violet-200' : 'bg-violet-100 text-violet-800'
                }`}
              >
                <FiBell className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className={`font-black text-base leading-tight ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('appointments.notifications')}</h2>
                <p className={`text-[11px] font-medium mt-0.5 ${isSpace ? 'text-white/45' : 'text-uv-gray'}`}>{t('appointments.notificationsSectionBlurb')}</p>
              </div>
            </div>
            {notifications.filter((n) => !n.is_read).length > 0 && (
              <span
                className={`text-xs font-black px-2.5 py-1 rounded-full shrink-0 border ${
                  isSpace ? 'bg-violet-500/25 text-violet-100 border-violet-400/30' : 'bg-violet-100 text-violet-900 border-violet-200'
                }`}
              >
                {notifications.filter((n) => !n.is_read).length}
              </span>
            )}
          </div>
          <div className="p-4 space-y-2">
            {notifications.length === 0 ? (
              <p className={`text-sm text-center py-10 font-medium ${isSpace ? 'text-white/40' : 'text-uv-gray'}`}>{t('appointments.emptyAppointmentNotifications')}</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.notification_id}
                  type="button"
                  className={`w-full text-left rounded-xl border p-3.5 transition-colors ${
                    n.is_read
                      ? isSpace
                        ? 'border-white/10 bg-transparent hover:bg-white/[0.04]'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                      : isSpace
                        ? 'border-violet-400/35 bg-violet-500/10 ring-1 ring-violet-400/20 hover:bg-violet-500/15'
                        : 'border-violet-200 bg-violet-50/80 ring-1 ring-violet-100 hover:bg-violet-50'
                  }`}
                  onClick={() => markRead(n.notification_id)}
                >
                  <div className="flex items-start gap-2">
                    {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-violet-400" aria-hidden />}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-bold leading-snug ${isSpace ? 'text-white' : 'text-uv-black'}`}>{n.message}</p>
                      <p className={`text-[11px] mt-1 font-medium ${isSpace ? 'text-white/45' : 'text-uv-gray'}`}>{new Date(n.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Appointments;
