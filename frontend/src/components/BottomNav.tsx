import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { FiHome, FiBox, FiMap, FiUser, FiPlus, FiSettings } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';

interface BottomNavProps {
  onPostClick: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ onPostClick }) => {
  const { t } = useTranslation();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';

  const navItems = [
    { icon: <FiHome size={20} />, path: '/feed', label: t('bottomNav.hub') },
    { icon: <FiBox size={20} />, path: '/lost-found', label: t('bottomNav.lAndF') },
    { icon: <FiMap size={20} />, path: '/campus-map', label: t('bottomNav.map') },
    { icon: <FiUser size={20} />, path: '/profile', label: t('bottomNav.profile') },
    { icon: <FiSettings size={20} />, path: '/settings', label: t('bottomNav.settings') },
  ];

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-[60] flex items-center justify-around px-2 py-2 border-t backdrop-blur-xl md:hidden ${
        isSpace
          ? 'bg-[#0a0a1a]/95 border-white/10'
          : 'bg-white/95 border-gray-100'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
    >
      {navItems.slice(0, 2).map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0 px-3 py-1 rounded-lg transition-all ${
              isActive
                ? 'text-primary'
                : isSpace
                ? 'text-white/50'
                : 'text-gray-400'
            }`
          }
        >
          {item.icon}
          <span className="text-[8px] font-black uppercase tracking-tight">{item.label}</span>
        </NavLink>
      ))}

      {/* Center Post Button */}
      <button
        onClick={onPostClick}
        className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-white shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all -mt-3"
      >
        <FiPlus size={20} />
      </button>

      {navItems.slice(2, 4).map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0 px-3 py-1 rounded-lg transition-all ${
              isActive
                ? 'text-primary'
                : isSpace
                ? 'text-white/50'
                : 'text-gray-400'
            }`
          }
        >
          {item.icon}
          <span className="text-[8px] font-black uppercase tracking-tight">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;
