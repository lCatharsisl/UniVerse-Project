import React, { useState, useRef, useEffect } from 'react';
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
  FiPlus,
  FiLogOut,
  FiAlertTriangle
} from 'react-icons/fi';
import { useAuth, isAcademic } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
  onPostClick: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onPostClick }) => {
  const { user, logout } = useAuth();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';
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
    { icon: <FiHome />, label: 'Hub', path: '/feed' },
    { icon: <FiBox />, label: 'Lost & Found', path: '/lost-found' },
    { icon: <FiSearch />, label: 'Discover', path: '/explore' },
    { icon: <FiBell />, label: 'Alerts', path: '/notifications' },
    { icon: <FiMessageSquare />, label: 'Chats', path: '/messages' },
    { icon: <FiMap />, label: 'Campus Map', path: '/campus-map' },
    ...(isAcademic(user?.role || '') ? [{ icon: <FiAlertTriangle />, label: 'Reported', path: '/reported', red: true }] : []),
    { icon: <FiUser />, label: 'My Space', path: '/profile' },
  ];
  const menuItems = baseMenuItems as { icon: React.ReactNode; label: string; path: string; red?: boolean }[];

  return (
    <div className="flex flex-col h-screen h-svh sticky top-0 p-4">
      {/* Brand Logo */}
      <div 
        className="mb-8 flex items-center gap-4 cursor-pointer group"
        onClick={() => navigate('/feed')}
      >
        <div className="w-16 h-16 flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden p-1 shrink-0">
          <img src="/logo.svg" alt="UniVerse Logo" className="w-full h-full object-contain" />
        </div>
        <div className="hidden xl:block">
          <h1 className={`text-2xl font-black tracking-tighter leading-none mb-1 ${isSpace ? 'text-white' : 'text-uv-black'}`}>UniVerse</h1>
          <p className="text-[11px] font-bold text-primary uppercase tracking-widest leading-none">Your Campus Digital</p>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex flex-col gap-2 mb-8">
        {menuItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            className={({ isActive }) => {
              const active = isActive && (item as any).red ? 'active-link-reported' : isActive ? 'active-link' : '';
              const inactiveStyle = (item as any).red
                ? 'text-red-500 hover:text-red-400'
                : isSpace ? 'text-[#e1e1e6]/70 hover:text-white' : 'text-uv-gray';
              return `sidebar-link ${active ? active : inactiveStyle}`;
            }}
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="hidden xl:inline font-bold">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Action Button */}
      <button 
        onClick={onPostClick}
        className="uv-button mb-8 flex items-center justify-center gap-2"
      >
        <FiPlus size={24} />
        <span className="hidden xl:inline">Broadcast</span>
      </button>

      {/* User Card */}
      <div className="mt-auto relative" ref={menuRef}>
        <div 
          onClick={() => setShowUserMenu(!showUserMenu)}
          className={`flex items-center gap-3 p-3 rounded-tl-2xl rounded-br-2xl border transition-all cursor-pointer group overflow-hidden ${
            showUserMenu
              ? isSpace ? 'bg-white/10 border-white/20 shadow-sm' : 'bg-gray-100 border-uv-border shadow-sm'
              : isSpace ? 'hover:bg-white/10 border-transparent hover:border-white/20' : 'hover:bg-gray-50 border-transparent hover:border-uv-border'
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 border ${isSpace ? 'bg-primary/20 text-primary border-primary/30' : 'bg-primary/10 text-primary border-primary/20'}`}>
            {user?.email[0].toUpperCase()}
          </div>
          <div className="hidden xl:flex flex-col flex-1 min-w-0">
            <span className={`font-black text-sm truncate leading-tight ${isSpace ? 'text-white' : 'text-uv-black'}`}>
                {user?.profile?.student_name || user?.profile?.staff_name || user?.email.split('@')[0]}
            </span>
            <span className={`text-[10px] font-bold uppercase tracking-tight ${isSpace ? 'text-[#e1e1e6]/80' : 'text-uv-gray'}`}>
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
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isSpace ? 'text-[#e1e1e6]/60' : 'text-uv-gray'}`}>Account</p>
                    <p className={`text-xs font-bold truncate ${isSpace ? 'text-white' : 'text-uv-black'}`}>{user?.email}</p>
                </div>
                <button 
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className={`w-full text-left p-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors ${isSpace ? 'hover:bg-white/10 text-red-400' : 'hover:bg-red-50 text-red-600'}`}
                >
                    <FiLogOut />
                    Log out
                </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Sidebar;
