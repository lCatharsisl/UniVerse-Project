import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiHome,
  FiBox,
  FiMap,
  FiPlus,
  FiGrid,
  FiSearch,
  FiBell,
  FiMessageSquare,
  FiCalendar,
  FiBriefcase,
  FiAlertTriangle,
  FiUser,
  FiSettings,
  FiCompass,
  FiGlobe,
  FiLogOut,
} from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';
import { useAuth, isAcademic } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import { useMessagingUnread } from '../context/MessagingUnreadContext';
import { NavIconBadge } from './NavIconBadge';

interface BottomNavProps {
  onPostClick: () => void;
  /** Mesajlar + klavye: iOS’ta tab bar görsel viewport ortasında kalmasın */
  slideOffscreen?: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({ onPostClick, slideOffscreen = false }) => {
  const { t } = useTranslation();
  const { dimension } = useTheme();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { messagesUnreadCount } = useMessagingUnread();
  const location = useLocation();
  const isSpace = dimension === 'space';
  const [moreOpen, setMoreOpen] = useState(false);

  const barItems = [
    { icon: <FiHome size={20} />, path: '/feed', label: t('bottomNav.hub') },
    {
      icon: (
        <span className="relative inline-flex items-center justify-center text-xl shrink-0">
          <FiBell />
          <NavIconBadge count={unreadCount} tone="alerts" />
        </span>
      ),
      path: '/notifications',
      label: t('sidebar.alerts'),
    },
    {
      icon: (
        <span className="relative inline-flex items-center justify-center text-xl shrink-0">
          <FiMessageSquare />
          <NavIconBadge count={messagesUnreadCount} tone="messages" />
        </span>
      ),
      path: '/messages',
      label: t('sidebar.chats'),
    },
  ];

  const moreMenuItems = useMemo(
    () =>
      [
        { icon: <FiSearch className="text-xl shrink-0" />, label: t('bottomNav.search'), path: '/search' },
        { icon: <FiCompass className="text-xl shrink-0" />, label: t('bottomNav.fair'), path: '/explore' },
        { icon: <FiGlobe className="text-xl shrink-0" />, label: t('sidebar.discover'), path: '/discover' },
        { icon: <FiBox className="text-xl shrink-0" />, label: t('bottomNav.lAndF'), path: '/lost-found' },
        { icon: <FiMap className="text-xl shrink-0" />, label: t('bottomNav.map'), path: '/campus-map' },
        { icon: <FiCalendar className="text-xl shrink-0" />, label: t('sidebar.appointments'), path: '/appointments' },
        { icon: <FiBriefcase className="text-xl shrink-0" />, label: t('sidebar.jobBoard'), path: '/job-board' },
        ...(isAcademic(user?.role || '')
          ? [{ icon: <FiAlertTriangle className="text-xl shrink-0 text-red-500" />, label: t('sidebar.reported'), path: '/reported', red: true }]
          : []),
        { icon: <FiUser className="text-xl shrink-0" />, label: t('sidebar.mySpace'), path: '/profile' },
        { icon: <FiSettings className="text-xl shrink-0" />, label: t('sidebar.settings'), path: '/settings' },
      ] as { icon: React.ReactNode; label: string; path: string; red?: boolean }[],
    [t, user?.role]
  );

  const morePaths = useMemo(() => moreMenuItems.map((i) => i.path), [moreMenuItems]);

  const isPathActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const isMoreActive = morePaths.some((p) => isPathActive(p));

  useEffect(() => {
    if (!moreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [moreOpen]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  return (
    <>
      <nav
        className={`fixed bottom-0 left-0 right-0 z-[60] flex items-center justify-around px-1 py-2 border-t backdrop-blur-xl xl:hidden transition-[transform,opacity] duration-200 ease-out ${
          isSpace ? 'bg-[#0a0a1a]/95 border-white/10' : 'bg-white/95 border-gray-100'
        } ${slideOffscreen ? 'translate-y-full opacity-0 pointer-events-none' : ''}`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
      >
        {barItems.slice(0, 2).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0 px-2 py-1 rounded-lg transition-all min-w-0 flex-1 max-w-[4.5rem] ${
                isActive ? 'text-primary' : isSpace ? 'text-white/50' : 'text-gray-400'
              }`
            }
          >
            {item.icon}
            <span className="text-[8px] font-black uppercase tracking-tight truncate w-full text-center">{item.label}</span>
          </NavLink>
        ))}

        <button
          type="button"
          onClick={onPostClick}
          className="flex items-center justify-center w-10 h-10 shrink-0 rounded-xl bg-primary text-white shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all -mt-3"
          aria-label={t('sidebar.broadcast')}
        >
          <FiPlus size={20} />
        </button>

        <NavLink
          to={barItems[2].path}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0 px-2 py-1 rounded-lg transition-all min-w-0 flex-1 max-w-[4.5rem] ${
              isActive ? 'text-primary' : isSpace ? 'text-white/50' : 'text-gray-400'
            }`
          }
        >
          {barItems[2].icon}
          <span className="text-[8px] font-black uppercase tracking-tight truncate w-full text-center">{barItems[2].label}</span>
        </NavLink>

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={`flex flex-col items-center gap-0 px-2 py-1 rounded-lg transition-all min-w-0 flex-1 max-w-[4.5rem] ${
            isMoreActive ? 'text-primary' : isSpace ? 'text-white/50' : 'text-gray-400'
          }`}
          aria-expanded={moreOpen}
          aria-haspopup="dialog"
          aria-label={t('bottomNav.moreMenu')}
        >
          <FiGrid size={20} />
          <span className="text-[8px] font-black uppercase tracking-tight">{t('bottomNav.more')}</span>
        </button>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.button
              type="button"
              aria-label={t('common.close')}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[65] bg-black/50 xl:hidden"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={t('bottomNav.moreMenu')}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className={`fixed left-0 right-0 bottom-0 z-[70] max-h-[min(92svh,44rem)] rounded-t-3xl border-t shadow-2xl flex flex-col xl:hidden ${
                isSpace ? 'bg-[#0a0a1a] border-white/10' : 'bg-white border-gray-200'
              }`}
              style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
            >
              <div className="flex justify-center pt-3 pb-2 shrink-0">
                <span className={`w-10 h-1 rounded-full ${isSpace ? 'bg-white/20' : 'bg-gray-300'}`} />
              </div>
              <p
                className={`px-5 pb-2 text-[10px] font-black uppercase tracking-widest shrink-0 ${
                  isSpace ? 'text-white/50' : 'text-uv-gray'
                }`}
              >
                {t('bottomNav.moreMenu')}
              </p>
              <nav className="overflow-y-auto overscroll-contain px-3 pb-2 flex flex-col gap-0.5 min-h-0">
                {moreMenuItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) => {
                      const base =
                        'flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-colors';
                      if (item.red) {
                        return `${base} ${isActive ? 'bg-red-500/15 text-red-400' : isSpace ? 'text-red-400/90 hover:bg-white/5' : 'text-red-600 hover:bg-red-50'}`;
                      }
                      return `${base} ${
                        isActive
                          ? isSpace
                            ? 'bg-primary/20 text-primary'
                            : 'bg-primary/10 text-primary'
                          : isSpace
                            ? 'text-[#e1e1e6] hover:bg-white/5'
                            : 'text-uv-black hover:bg-gray-50'
                      }`;
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                ))}
                <div className={`my-2 mx-1 h-px shrink-0 ${isSpace ? 'bg-white/10' : 'bg-gray-200'}`} aria-hidden />
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    logout();
                  }}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-colors w-full text-left ${
                    isSpace ? 'text-red-400 hover:bg-white/5' : 'text-red-600 hover:bg-red-50'
                  }`}
                >
                  <FiLogOut className="text-xl shrink-0" />
                  <span>{t('sidebar.logOut')}</span>
                </button>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default BottomNav;
