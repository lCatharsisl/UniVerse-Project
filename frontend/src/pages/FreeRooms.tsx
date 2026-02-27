import React, { useState, useMemo } from 'react';
import { FiClock, FiMapPin, FiLayers, FiCalendar } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
type DayKey = (typeof DAYS)[number];

const BUILDINGS = [
  { id: 'M', name: 'M Block' },
  { id: 'Y', name: 'Y Block' },
  { id: 'S', name: 'S Block' },
] as const;

const ROOMS_BY_BUILDING: Record<string, string[]> = {
  M: ['M116', 'M201', 'M202', 'M301'],
  Y: ['Y101', 'Y102', 'Y201'],
  S: ['S001', 'S102'],
};

const TIME_SLOTS = [
  '08:30-09:20',
  '09:30-10:20',
  '10:30-11:20',
  '11:30-12:20',
  '13:40-14:30',
  '14:40-15:30',
  '15:40-16:30',
] as const;

// Sample occupancy: roomId -> { day -> { slot -> course } }
type SlotCourse = { courseName: string; code: string; start: string; end: string };
const SAMPLE_OCCUPANCY: Record<string, Partial<Record<DayKey, Partial<Record<string, SlotCourse>>>>> = {
  M116: {
    Monday: { '13:40-14:30': { courseName: 'Data Structures', code: 'BIL201', start: '13:40', end: '14:30' } },
    Wednesday: { '09:30-10:20': { courseName: 'Algorithms', code: 'BIL101', start: '09:30', end: '10:20' } },
  },
  M201: {
    Monday: { '13:40-14:30': { courseName: 'Business Mathematics', code: 'ISL102', start: '13:40', end: '14:30' } },
  },
  Y101: {
    Tuesday: { '10:30-11:20': { courseName: 'General Chemistry', code: 'KIM101', start: '10:30', end: '11:20' } },
  },
};

function getRoomsForBuilding(buildingId: string | null): string[] {
  if (!buildingId) {
    return Object.values(ROOMS_BY_BUILDING).flat();
  }
  return ROOMS_BY_BUILDING[buildingId] ?? [];
}

function isRoomOccupied(
  roomId: string,
  day: DayKey,
  slot: string
): SlotCourse | null {
  const dayOcc = SAMPLE_OCCUPANCY[roomId]?.[day];
  if (!dayOcc) return null;
  return (dayOcc as Record<string, SlotCourse>)[slot] ?? null;
}

const FreeRooms: React.FC = () => {
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';

  const [selectedDay, setSelectedDay] = useState<DayKey | ''>('');
  const [selectedBuilding, setSelectedBuilding] = useState<string | ''>('');
  const [selectedRoom, setSelectedRoom] = useState<string | ''>('');
  const [selectedSlot, setSelectedSlot] = useState<string | ''>('');

  const rooms = useMemo(
    () => getRoomsForBuilding(selectedBuilding || null),
    [selectedBuilding]
  );

  const filteredSlots = useMemo(() => {
    if (!selectedSlot) return [...TIME_SLOTS];
    return [selectedSlot];
  }, [selectedSlot]);

  const results = useMemo(() => {
    if (!selectedDay) return [];
    const day = selectedDay as DayKey;
    const list: { roomId: string; buildingId: string; slot: string; course: SlotCourse | null }[] = [];
    const roomSet = selectedRoom ? [selectedRoom] : rooms;
    for (const roomId of roomSet) {
      const buildingId = BUILDINGS.find((b) => ROOMS_BY_BUILDING[b.id]?.includes(roomId))?.id ?? '';
      for (const slot of filteredSlots) {
        const course = isRoomOccupied(roomId, day, slot);
        list.push({ roomId, buildingId, slot, course });
      }
    }
    return list;
  }, [selectedDay, selectedRoom, rooms, filteredSlots]);

  return (
    <div
      className={`flex flex-col min-h-screen transition-colors duration-500 ${
        isSpace ? 'bg-[#050510]' : 'bg-white'
      } selection:bg-primary selection:text-white`}
    >
      {/* Header */}
      <div
        className={`flex-shrink-0 sticky top-0 backdrop-blur-xl border-b z-30 px-6 py-5 ${
          isSpace ? 'bg-[#0a0a1a]/80 border-white/5' : 'bg-white/90 border-gray-100'
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl ${
              isSpace ? 'bg-primary/20 border border-primary/30' : 'bg-uv-black'
            }`}
          >
            <FiClock size={24} className="text-primary" />
          </div>
          <div>
            <h2
              className={`text-2xl font-black tracking-tighter leading-none ${
                isSpace ? 'text-white' : 'text-uv-black'
              }`}
            >
              Free Rooms
            </h2>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div
        className={`p-6 border-b ${
          isSpace ? 'border-white/5 bg-[#0a0a1a]/40' : 'border-gray-100 bg-gray-50/50'
        }`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Day - required */}
          <div>
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-uv-gray mb-2">
              <FiCalendar /> Day <span className="text-primary">*</span>
            </label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value as DayKey | '')}
              className={`w-full px-4 py-3 text-sm font-bold outline-none rounded-xl focus:ring-2 focus:ring-primary/30 ${
                isSpace ? 'bg-[#050510] text-white border border-white/20' : 'bg-white text-uv-black border border-uv-border'
              }`}
            >
              <option value="">Select</option>
              {DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Building - optional */}
          <div>
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-uv-gray mb-2">
              <FiMapPin /> Building
            </label>
            <select
              value={selectedBuilding}
              onChange={(e) => {
                setSelectedBuilding(e.target.value);
                setSelectedRoom('');
              }}
              className={`w-full px-4 py-3 text-sm font-bold outline-none rounded-xl focus:ring-2 focus:ring-primary/30 ${
                isSpace ? 'bg-[#050510] text-white border border-white/20' : 'bg-white text-uv-black border border-uv-border'
              }`}
            >
              <option value="">All campus</option>
              {BUILDINGS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Room - optional */}
          <div>
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-uv-gray mb-2">
              <FiLayers /> Room
            </label>
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className={`w-full px-4 py-3 text-sm font-bold outline-none rounded-xl focus:ring-2 focus:ring-primary/30 ${
                isSpace ? 'bg-[#050510] text-white border border-white/20' : 'bg-white text-uv-black border border-uv-border'
              }`}
            >
              <option value="">All</option>
              {rooms.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Time - optional */}
          <div>
            <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-uv-gray mb-2">
              <FiClock /> Time
            </label>
            <select
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
              className={`w-full px-4 py-3 text-sm font-bold outline-none rounded-xl focus:ring-2 focus:ring-primary/30 ${
                isSpace ? 'bg-[#050510] text-white border border-white/20' : 'bg-white text-uv-black border border-uv-border'
              }`}
            >
              <option value="">All day</option>
              {TIME_SLOTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 p-6">
        {!selectedDay ? (
          <div
            className={`uv-card p-12 text-center ${
              isSpace ? 'bg-white/5 border-white/10' : 'bg-white border-uv-border'
            }`}
          >
            <p className={`text-sm font-bold ${isSpace ? 'text-[#e1e1e6]/60' : 'text-uv-gray'}`}>
              Select a day to list free rooms.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map(({ roomId, buildingId, slot, course }) => (
              <div
                key={`${roomId}-${slot}`}
                className={`uv-card p-4 flex flex-wrap items-center justify-between gap-4 ${
                  isSpace ? 'bg-white/5 border-white/10' : 'bg-white border-uv-border'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`font-black text-lg ${
                      course ? (isSpace ? 'text-amber-400' : 'text-amber-600') : isSpace ? 'text-emerald-400' : 'text-emerald-600'
                    }`}
                  >
                    {roomId}
                  </span>
                  <span className={`text-xs font-bold uppercase tracking-widest ${isSpace ? 'text-uv-gray' : 'text-uv-gray'}`}>
                    {BUILDINGS.find((b) => b.id === buildingId)?.name ?? buildingId}
                  </span>
                  <span className={`text-xs font-bold ${isSpace ? 'text-[#e1e1e6]/70' : 'text-uv-gray'}`}>
                    {slot}
                  </span>
                </div>
                {course ? (
                  <div className={`text-right text-sm ${isSpace ? 'text-[#e1e1e6]' : 'text-uv-black'}`}>
                    <p className="font-bold">{course.courseName}</p>
                    <p className="text-xs font-medium text-uv-gray">{course.code}</p>
                    <p className="text-xs text-uv-gray">
                      {course.start} – {course.end}
                    </p>
                  </div>
                ) : (
                  <span
                    className={`text-xs font-black uppercase tracking-widest ${
                      isSpace ? 'text-emerald-400' : 'text-emerald-600'
                    }`}
                  >
                    Free
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FreeRooms;
