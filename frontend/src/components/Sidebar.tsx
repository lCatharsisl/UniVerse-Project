/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiHome, 
  FiSearch, 
  FiBell, 
  FiMessageSquare, 
  FiBox, 
  FiMap, 
  FiUser, 
  FiLogOut,
  FiAlertTriangle,
  FiSettings,
  FiCalendar,
  FiBriefcase,
  FiCompass,
  FiGlobe,
} from 'react-icons/fi';
import { useAuth, isAcademic } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationsContext';
import { useMessagingUnread } from '../context/MessagingUnreadContext';
import { NavIconBadge } from './NavIconBadge';
import { getAuthUserAvatarUrl, getAuthUserInitials } from '../utils/authUserDisplay';

function readProfileName(profile: Record<string, unknown> | undefined, key: 'student_name' | 'staff_name') {
  const value = profile?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

const Sidebar: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { messagesUnreadCount } = useMessagingUnread();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';
  const sidebarDisplayName =
    readProfileName(user?.profile, 'student_name') ||
    readProfileName(user?.profile, 'staff_name') ||
    user?.email?.split('@')[0] ||
    'User';
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const baseMenuItems = [
    { icon: <FiHome />, label: t('sidebar.hub'), path: '/feed' },
    { icon: <FiSearch />, label: t('bottomNav.search'), path: '/search' },
    { icon: <FiBox />, label: t('sidebar.lostFound'), path: '/lost-found' },
    { icon: <FiGlobe />, label: t('sidebar.discover'), path: '/discover' },
    { icon: <FiCompass />, label: t('sidebar.communityFair'), path: '/explore' },
    {
      icon: (
        <span className="relative inline-flex items-center justify-center min-w-[2rem] overflow-visible py-0.5 pr-1">
          <FiBell />
          <NavIconBadge count={unreadCount} tone="alerts" />
        </span>
      ),
      label: t('sidebar.alerts'),
      path: '/notifications',
    },
    {
      icon: (
        <span className="relative inline-flex items-center justify-center min-w-[2rem] overflow-visible py-0.5 pr-1">
          <FiMessageSquare />
          <NavIconBadge count={messagesUnreadCount} tone="messages" />
        </span>
      ),
      label: t('sidebar.chats'),
      path: '/messages',
    },
    { icon: <FiMap />, label: t('sidebar.campusMap'), path: '/campus-map' },
    { icon: <FiCalendar />, label: t('sidebar.appointments'), path: '/appointments' },
    { icon: <FiBriefcase />, label: t('sidebar.jobBoard'), path: '/job-board' },
    ...(isAcademic(user?.role || '') ? [{ icon: <FiAlertTriangle />, label: t('sidebar.reported'), path: '/reported', red: true }] : []),
    { icon: <FiUser />, label: t('sidebar.mySpace'), path: '/profile' },
    { icon: <FiSettings />, label: t('sidebar.settings'), path: '/settings' },
  ];
  const menuItems = baseMenuItems as { icon: React.ReactNode; label: string; path: string; red?: boolean }[];

  const sidebarAvatarUrl = getAuthUserAvatarUrl(user);
  const sidebarInitials = getAuthUserInitials(user);

  return (
    <div className="flex h-screen h-svh sticky top-0 flex-col py-3 pl-2 pr-4 xl:py-2.5 xl:pl-3.5 xl:pr-4">
      {/* Brand Logo */}
      <div 
        className="mb-3 flex items-center gap-3.5 cursor-pointer group shrink-0 xl:mb-2.5"
        onClick={() => navigate('/feed')}
      >
        <div className="w-14 h-14 2xl:w-16 2xl:h-16 flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden p-1 shrink-0">
          <img src="/logo.svg" alt="UniVerse Logo" className="w-full h-full object-contain" />
        </div>
        <div className="hidden xl:block min-w-0">
          <h1 className={`text-2xl font-black tracking-tighter leading-none mb-1 2xl:text-[1.65rem] ${isSpace ? 'text-white' : 'text-uv-black'}`}>UniVerse</h1>
          <p className="text-xs font-bold text-primary uppercase tracking-widest leading-tight">{t('sidebar.yourCampusDigital')}</p>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex flex-col gap-1 mb-3 flex-1 min-h-0 justify-start pr-2 md:pr-3 xl:mb-2.5">
        {menuItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            className={({ isActive }) => {
              const active = isActive && (item as any).red ? 'active-link-reported' : isActive ? 'active-link' : '';
              const inactiveStyle = (item as any).red
                ? 'text-red-500 hover:text-red-400'
                : isSpace ? 'text-[#e1e1e6]/70 hover:text-white' : 'text-uv-gray';
              return `sidebar-link shrink-0 ${active ? active : inactiveStyle}`;
            }}
          >
            <span className="inline-flex shrink-0 text-[1.35rem] leading-none xl:text-[1.45rem] 2xl:text-[1.6rem]">{item.icon}</span>
            <span className="hidden xl:inline font-bold text-base leading-snug">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User Card */}
      <div className="mt-auto relative" ref={menuRef}>
        <div 
          onClick={() => setShowUserMenu(!showUserMenu)}
          className={`flex items-center gap-3.5 p-3 rounded-tl-2xl rounded-br-2xl border transition-all cursor-pointer group overflow-hidden ${
            showUserMenu
              ? isSpace ? 'bg-white/10 border-white/20 shadow-sm' : 'bg-gray-100 border-uv-border shadow-sm'
              : isSpace ? 'hover:bg-white/10 border-transparent hover:border-white/20' : 'hover:bg-gray-50 border-transparent hover:border-uv-border'
          }`}
        >
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold shrink-0 border overflow-hidden ${isSpace ? 'bg-primary/20 text-primary border-primary/30' : 'bg-primary/10 text-primary border-primary/20'}`}>
            {sidebarAvatarUrl ? (
              <img src={sidebarAvatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm">{sidebarInitials}</span>
            )}
          </div>
          <div className="hidden xl:flex flex-col flex-1 min-w-0">
            <span className={`font-black text-base truncate leading-tight ${isSpace ? 'text-white' : 'text-uv-black'}`}>
                {sidebarDisplayName}
            </span>
            <span className={`text-[11px] font-bold uppercase tracking-tight ${isSpace ? 'text-[#e1e1e6]/80' : 'text-uv-gray'}`}>
                {user?.role}
            </span>
          </div>
        </div>

        {/* Action Menu */}
        <AnimatePresence>
          {showUserMenu && (
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className={`absolute bottom-full left-0 mb-4 w-56 rounded-2xl shadow-2xl border p-2 z-50 overflow-hidden ${isSpace ? 'bg-[#0a0a1a] border-white/20' : 'bg-white border-uv-border'}`}
            >
                <div className={`p-3 border-b mb-1 ${isSpace ? 'border-white/10' : 'border-gray-50'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isSpace ? 'text-[#e1e1e6]/60' : 'text-uv-gray'}`}>{t('sidebar.account')}</p>
                    <p className={`text-xs font-bold truncate ${isSpace ? 'text-white' : 'text-uv-black'}`}>{user?.email}</p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className={`w-full text-left p-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors ${isSpace ? 'hover:bg-white/10 text-red-400' : 'hover:bg-red-50 text-red-600'}`}
                >
                    <FiLogOut />
                    {t('sidebar.logOut')}
                </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Sidebar;
