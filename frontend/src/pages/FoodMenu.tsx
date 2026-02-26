import React, { useState, useMemo } from 'react';
import { FiCoffee, FiCalendar } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';

type MenuItem = {
  main: string;
  side?: string;
  availableUntil: string;
  location: string;
};

// Sample menu data for 2–8 March (replace with API later)
const MENU_BY_DATE: Record<string, MenuItem> = {
  '2026-03-02': { main: 'Creamy Mushroom Pasta & Seasoned Salad', availableUntil: '14:30', location: 'Cafeteria A' },
  '2026-03-03': { main: 'Grilled Chicken with Rice', side: 'Mixed vegetables', availableUntil: '14:00', location: 'Cafeteria A' },
  '2026-03-04': { main: 'Lentil Soup', side: 'Bread & Olive Salad', availableUntil: '15:00', location: 'Cafeteria B' },
  '2026-03-05': { main: 'Beef Stew with Mashed Potato', side: 'Green beans', availableUntil: '14:30', location: 'Cafeteria A' },
  '2026-03-06': { main: 'Vegetable Lasagna', side: 'Caesar salad', availableUntil: '14:00', location: 'Cafeteria A' },
  '2026-03-07': { main: 'Fish & Chips', side: 'Coleslaw', availableUntil: '15:00', location: 'Cafeteria B' },
  '2026-03-08': { main: 'Chicken Wrap', side: 'Fries & Dip', availableUntil: '14:30', location: 'Cafeteria A' },
};

const DEFAULT_TODAY_MENU: MenuItem = {
  main: 'Creamy Mushroom Pasta & Seasoned Salad',
  availableUntil: '14:30',
  location: 'Cafeteria A',
};

function formatDateLabel(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

const FoodMenu: React.FC = () => {
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';

  const today = useMemo(() => {
    const t = new Date();
    return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(today);

  const menu = useMemo((): MenuItem | null => {
    return MENU_BY_DATE[selectedDate] ?? null;
  }, [selectedDate]);

  const minDate = '2026-03-02';
  const maxDate = '2026-03-08';

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
            <FiCoffee size={24} className="text-primary" />
          </div>
          <div>
            <h2
              className={`text-2xl font-black tracking-tighter leading-none ${
                isSpace ? 'text-white' : 'text-uv-black'
              }`}
            >
              Food Menu
            </h2>
          </div>
        </div>
      </div>

      {/* Date picker */}
      <div
        className={`p-6 border-b ${
          isSpace ? 'border-white/5 bg-[#0a0a1a]/40' : 'border-gray-100 bg-gray-50/50'
        }`}
      >
        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-uv-gray mb-2">
          <FiCalendar /> Date
        </label>
        <input
          type="date"
          value={selectedDate}
          min={minDate}
          max={maxDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className={`w-full max-w-xs uv-card px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/30 ${
            isSpace ? 'bg-white/5 text-white border-white/10' : 'bg-white text-uv-black border-uv-border'
          }`}
        />
        <p className={`mt-2 text-xs font-medium ${isSpace ? 'text-[#e1e1e6]/60' : 'text-uv-gray'}`}>
          Sample data: 2–8 March 2026. Other dates will show today’s default menu.
        </p>
      </div>

      {/* Menu content */}
      <div className="flex-1 p-6">
        {!menu ? (
          <div
            className={`uv-card p-8 border-l-4 border-l-accent bg-accent/5 ${
              isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border'
            }`}
          >
            <p className={`font-bold text-sm ${isSpace ? 'text-white' : 'text-uv-black'}`}>
              {DEFAULT_TODAY_MENU.main}
            </p>
            {DEFAULT_TODAY_MENU.side && (
              <p className={`text-sm mt-1 ${isSpace ? 'text-[#e1e1e6]/80' : 'text-uv-gray'}`}>
                {DEFAULT_TODAY_MENU.side}
              </p>
            )}
            <p className={`text-xs mt-2 font-medium ${isSpace ? 'text-[#e1e1e6]/60' : 'text-uv-gray'}`}>
              Available until {DEFAULT_TODAY_MENU.availableUntil} at {DEFAULT_TODAY_MENU.location}
            </p>
          </div>
        ) : (
          <div
            className={`uv-card p-6 border-l-4 border-l-accent bg-accent/5 ${
              isSpace ? 'border-white/10 bg-white/5' : 'border-uv-border'
            }`}
          >
            <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${isSpace ? 'text-primary' : 'text-accent'}`}>
              {formatDateLabel(selectedDate)}
            </p>
            <p className={`font-bold text-lg ${isSpace ? 'text-white' : 'text-uv-black'}`}>
              {menu.main}
            </p>
            {menu.side && (
              <p className={`text-sm mt-1 ${isSpace ? 'text-[#e1e1e6]/80' : 'text-uv-gray'}`}>
                {menu.side}
              </p>
            )}
            <p className={`text-xs mt-3 font-medium ${isSpace ? 'text-[#e1e1e6]/60' : 'text-uv-gray'}`}>
              Available until {menu.availableUntil} at {menu.location}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FoodMenu;
