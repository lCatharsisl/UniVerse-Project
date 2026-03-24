import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { DEPARTMENTS_DATA } from '../constants/departments';

type AvailabilitySlot = {
  weekday: number;
  start_time?: string;
  end_time?: string;
  startTime?: string;
  endTime?: string;
};

/** 50 dk ders, aralarda 10 dk; öğle 12:30–13:30; son slot 18:30’da biter. */
const TIME_SLOTS: [string, string][] = [
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

const toClockHm = (raw: string) => {
  const s = (raw || '').trim();
  if (!s) return '';
  return s.length >= 5 ? s.slice(0, 5) : s;
};

const slotGridKey = (startHm: string, endHm: string) => `${toClockHm(startHm)}|${toClockHm(endHm)}`;

const Appointments = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { dimension } = useTheme();
  const [searchParams] = useSearchParams();
  const isSpace = dimension === 'space';
  const isStaff = user?.role === 'staff';

  const [staffList, setStaffList] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [filters, setFilters] = useState({ name: '', department: '' });
  const [selectedStaff, setSelectedStaff] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [staffAvailabilityDate, setStaffAvailabilityDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [selectedSlot, setSelectedSlot] = useState<{ startTime: string; endTime: string } | null>(null);
  const [topic, setTopic] = useState('');
  const [notes, setNotes] = useState('');
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [myAppointments, setMyAppointments] = useState<any[]>([]);
  const [archiveAppointments, setArchiveAppointments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [weeklyGrid, setWeeklyGrid] = useState<Record<string, boolean>>({});
  const allDepartments = useMemo(
    () => Object.values(DEPARTMENTS_DATA).flat().sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    []
  );

  useEffect(() => {
    const preselectedStaff = searchParams.get('staff');
    if (preselectedStaff) setSelectedStaff(Number(preselectedStaff));
  }, [searchParams]);

  const loadStaff = async () => {
    const res = await api.get('/academic/staff/search', { params: filters });
    setStaffList(res.data || []);
  };

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
    const slots = res.data || [];
    setAvailability(slots);

    if (isStaff && user?.userId === staffUserId) {
      const map: Record<string, boolean> = {};
      for (const slot of slots) {
        const st = slot.start_time || slot.startTime || '';
        const en = slot.end_time || slot.endTime || '';
        map[slotGridKey(st, en)] = true;
      }
      setWeeklyGrid(map);
    }
  };

  useEffect(() => {
    loadMyData().catch(() => {});
  }, []);
  const handleSearch = async () => {
    try {
      await loadStaff();
      setHasSearched(true);
    } catch {
      setHasSearched(true);
      setStaffList([]);
    }
  };


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
    if (!isStaff || !user?.userId) return;
    loadAvailability(user.userId, staffAvailabilityDate).catch(() => {});
  }, [isStaff, user?.userId, staffAvailabilityDate]);

  const availableSlotsForDate = useMemo(() => {
    if (!selectedDate) return [];
    const unique = new Map<string, { startTime: string; endTime: string }>();
    availability
      .map((s) => ({
        startTime: (s.start_time || s.startTime || '').slice(0, 5),
        endTime: (s.end_time || s.endTime || '').slice(0, 5),
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
    setSelectedSlot(null);
  }, [selectedDate, selectedStaff]);

  const toggleGrid = (startTime: string, endTime: string) => {
    const key = slotGridKey(startTime, endTime);
    setWeeklyGrid((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const saveAvailability = async () => {
    setSaving(true);
    setError('');
    try {
      const slots = Object.entries(weeklyGrid)
        .filter(([, active]) => active)
        .map(([key]) => {
          const [startTime, endTime] = key.split('|');
          return { startTime, endTime };
        });
      await api.put('/academic/staff/availability/date', { date: staffAvailabilityDate, slots });
      if (user?.userId) await loadAvailability(user.userId, staffAvailabilityDate);
    } catch (e: any) {
      setError(e?.response?.data?.error || t('appointments.errors.saveAvailability'));
    } finally {
      setSaving(false);
    }
  };

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
    } catch (e: any) {
      setError(e?.response?.data?.error || t('appointments.errors.create'));
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: number, status: 'approved' | 'rejected' | 'cancelled') => {
    const reason = status === 'rejected' || status === 'cancelled'
      ? window.prompt(t('appointments.reasonPrompt')) || ''
      : '';
    await api.patch(`/academic/appointments/${id}/status`, { status, reason });
    await loadMyData();
  };

  const markRead = async (id: number) => {
    await api.patch(`/academic/appointments/notifications/${id}/read`);
    await loadMyData();
  };

  const formatAppointmentDate = (rawDate: string) => {
    // Backend may serialize DATE fields as ISO midnight UTC.
    // Use only the date segment to avoid timezone day shift confusion.
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

  return (
    <div className={`min-h-screen p-4 md:p-6 ${isSpace ? 'bg-[#050510]' : 'bg-white'}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className={`text-2xl font-black ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('appointments.title')}</h1>

        {error && <div className="p-3 rounded-xl bg-red-100 text-red-700 text-sm font-bold">{error}</div>}

        {isStaff && (
          <div className={`rounded-2xl p-4 border ${isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-white'}`}>
            <h2 className={`font-black mb-3 ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('appointments.availabilityTitle')}</h2>
            <input
              type="date"
              className="uv-input mb-3"
              value={staffAvailabilityDate}
              onChange={(e) => setStaffAvailabilityDate(e.target.value)}
            />
            <div className="overflow-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left p-2">{t('appointments.time')}</th>
                    <th className="p-2">{new Date(staffAvailabilityDate).toLocaleDateString()}</th>
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map(([start, end]) => {
                    const key = slotGridKey(start, end);
                    const active = !!weeklyGrid[key];
                    return (
                      <tr key={key}>
                        <td className="p-2 font-bold">{start} – {end}</td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => toggleGrid(start, end)}
                            className={`w-8 h-8 rounded-lg border ${active ? 'bg-primary text-white border-primary' : 'border-gray-300'}`}
                          >
                            {active ? '✓' : ''}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button onClick={saveAvailability} disabled={saving} className="uv-button mt-4">
              {saving ? t('common.loading') : t('appointments.saveAvailability')}
            </button>
          </div>
        )}

        {!isStaff && (
          <div className={`rounded-2xl p-4 border ${isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-white'}`}>
            <h2 className={`font-black mb-3 ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('appointments.bookTitle')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input placeholder={t('appointments.searchByName')} className="uv-input" value={filters.name} onChange={(e) => setFilters((p) => ({ ...p, name: e.target.value }))} />
              <select
                className={`uv-input appearance-none ${
                  isSpace
                    ? `bg-white/5 border-white/10 ${filters.department ? 'text-white' : 'text-gray-500'}`
                    : `bg-white border-uv-border ${filters.department ? 'text-uv-black' : 'text-uv-gray/40'}`
                }`}
                value={filters.department}
                onChange={(e) => setFilters((p) => ({ ...p, department: e.target.value }))}
              >
                <option
                  value=""
                  className={isSpace ? 'bg-[#0a0a1a] text-white' : 'bg-white text-uv-black'}
                >
                  {t('appointments.searchByDepartment')}
                </option>
                {allDepartments.map((department) => (
                  <option
                    key={department.id}
                    value={department.name}
                    className={isSpace ? 'bg-[#0a0a1a] text-white' : 'bg-white text-uv-black'}
                  >
                    {t(`departments.departments.${department.name}`) || department.name}
                  </option>
                ))}
              </select>
            </div>
            <button className="uv-button mt-3" onClick={handleSearch}>{t('common.search')}</button>

            {hasSearched && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {staffList.map((s) => (
                  <button key={s.staff_user_id} onClick={() => setSelectedStaff(s.staff_user_id)} className={`text-left p-3 rounded-xl border ${selectedStaff === s.staff_user_id ? 'border-primary' : 'border-gray-300'}`}>
                    <p className="font-black">{s.staff_name} {s.staff_surname}</p>
                    <p className="text-xs text-uv-gray">{s.staff_title || '-'} · {s.department_name || '-'}</p>
                  </button>
                ))}
                {staffList.length === 0 && (
                  <p className="text-xs font-bold text-uv-gray">{t('appointments.noStaffFound')}</p>
                )}
              </div>
            )}

            {selectedStaff && (
              <div className="mt-4 space-y-3">
                <input type="date" className="uv-input w-full" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                <div className="flex flex-wrap gap-2">
                  {availableSlotsForDate.map((slot) => {
                    const active = selectedSlot?.startTime === slot.startTime && selectedSlot?.endTime === slot.endTime;
                    return (
                      <button key={`${slot.startTime}-${slot.endTime}`} onClick={() => setSelectedSlot(slot)} className={`px-3 py-2 rounded-lg border text-xs font-bold ${active ? 'bg-primary text-white border-primary' : 'border-gray-300'}`}>
                        {slot.startTime} - {slot.endTime}
                      </button>
                    );
                  })}
                </div>
                {selectedDate && availableSlotsForDate.length === 0 && (
                  <p className="text-xs font-bold text-red-400">{t('appointments.noSlotsForDate')}</p>
                )}
                <input
                  placeholder={t('appointments.topic')}
                  className="uv-input w-full"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
                <textarea
                  placeholder={t('appointments.notes')}
                  className="uv-input w-full min-h-24"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <button onClick={createAppointment} disabled={saving || !selectedSlot} className="uv-button">
                  {t('appointments.create')}
                </button>
              </div>
            )}
          </div>
        )}

        <div className={`rounded-2xl p-4 border ${isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-white'}`}>
          <h2 className={`font-black mb-3 ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('appointments.activeAppointments')}</h2>
          <div className="space-y-2">
            {myAppointments.map((a) => (
              <div key={a.appointment_id} className="p-3 rounded-xl border border-gray-200">
                <p className="font-bold text-sm">
                  {formatAppointmentDate(a.appointment_date)} • {a.start_time?.slice(0, 5)}-{a.end_time?.slice(0, 5)} • {formatStatus(a.status)}
                </p>
                <p className="text-xs text-uv-gray">
                  {a.staff_name} {a.staff_surname} / {a.student_name} {a.student_surname}
                </p>
                {a.topic && (
                  <p className="text-xs mt-1">
                    <span className="font-bold">{t('appointments.topic')}:</span> {a.topic}
                  </p>
                )}
                {a.notes && (
                  <p className="text-xs mt-1">
                    <span className="font-bold">{t('appointments.notes')}:</span> {a.notes}
                  </p>
                )}
                {a.rejection_reason && (
                  <p className="text-xs mt-1 text-red-500">
                    <span className="font-bold">{t('appointments.rejectionReason')}:</span> {a.rejection_reason}
                  </p>
                )}
                {a.cancellation_reason && (
                  <p className="text-xs mt-1 text-orange-500">
                    <span className="font-bold">{t('appointments.cancellationReason')}:</span> {a.cancellation_reason}
                  </p>
                )}
                <div className="flex gap-2 mt-2">
                  {isStaff && a.status === 'pending' && (
                    <>
                      <button className="px-2 py-1 text-xs rounded bg-green-600 text-white" onClick={() => updateStatus(a.appointment_id, 'approved')}>{t('appointments.approve')}</button>
                      <button className="px-2 py-1 text-xs rounded bg-red-600 text-white" onClick={() => updateStatus(a.appointment_id, 'rejected')}>{t('appointments.reject')}</button>
                    </>
                  )}
                  {(a.status === 'pending' || a.status === 'approved') && (
                    <button className="px-2 py-1 text-xs rounded bg-gray-700 text-white" onClick={() => updateStatus(a.appointment_id, 'cancelled')}>{t('appointments.cancel')}</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-2xl p-4 border ${isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-white'}`}>
          <h2 className={`font-black mb-3 ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('appointments.archive')}</h2>
          <div className="space-y-2">
            {archiveAppointments.map((a) => (
              <div key={a.appointment_id} className="p-3 rounded-xl border border-gray-200 text-sm">
                {formatAppointmentDate(a.appointment_date)} • {a.start_time?.slice(0, 5)}-{a.end_time?.slice(0, 5)} • {formatStatus(a.status)}
                {a.topic && <div className="text-xs mt-1"><span className="font-bold">{t('appointments.topic')}:</span> {a.topic}</div>}
                {a.notes && <div className="text-xs mt-1"><span className="font-bold">{t('appointments.notes')}:</span> {a.notes}</div>}
                {a.rejection_reason && (
                  <div className="text-xs mt-1 text-red-500">
                    <span className="font-bold">{t('appointments.rejectionReason')}:</span> {a.rejection_reason}
                  </div>
                )}
                {a.cancellation_reason && (
                  <div className="text-xs mt-1 text-orange-500">
                    <span className="font-bold">{t('appointments.cancellationReason')}:</span> {a.cancellation_reason}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className={`rounded-2xl p-4 border ${isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border bg-white'}`}>
          <h2 className={`font-black mb-3 ${isSpace ? 'text-white' : 'text-uv-black'}`}>{t('appointments.notifications')}</h2>
          <div className="space-y-2">
            {notifications.map((n) => (
              <button key={n.notification_id} className={`w-full text-left p-3 rounded-xl border ${n.is_read ? 'border-gray-200' : 'border-primary'}`} onClick={() => markRead(n.notification_id)}>
                <p className="text-sm font-bold">{n.message}</p>
                <p className="text-xs text-uv-gray">{new Date(n.created_at).toLocaleString()}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Appointments;
