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
  FiLogOut
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  onPostClick: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onPostClick }) => {
  const { user, logout } = useAuth();
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

  const menuItems = [
    { icon: <FiHome />, label: 'Hub', path: '/feed' },
    { icon: <FiBox />, label: 'Lost & Found', path: '/lost-found' },
    { icon: <FiSearch />, label: 'Discover', path: '/explore' },
    { icon: <FiBell />, label: 'Alerts', path: '/notifications' },
    { icon: <FiMessageSquare />, label: 'Chats', path: '/messages' },
    { icon: <FiMap />, label: 'Campus Map', path: '/campus-map' },
    { icon: <FiUser />, label: 'My Space', path: '/profile' },
  ];

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
          <h1 className="text-2xl font-black tracking-tighter text-uv-black leading-none mb-1">UniVerse</h1>
          <p className="text-[11px] font-bold text-primary uppercase tracking-widest leading-none">Your Campus Digital</p>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex flex-col gap-2 mb-8">
        {menuItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.path}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active-link' : 'text-uv-gray'}`}
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
          className={`flex items-center gap-3 p-3 rounded-tl-2xl rounded-br-2xl border transition-all cursor-pointer group overflow-hidden ${showUserMenu ? 'bg-gray-100 border-uv-border shadow-sm' : 'hover:bg-gray-50 border-transparent hover:border-uv-border'}`}
        >
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold shrink-0 border border-primary/20">
            {user?.email[0].toUpperCase()}
          </div>
          <div className="hidden xl:flex flex-col flex-1 min-w-0">
            <span className="font-black text-sm text-uv-black truncate leading-tight">
                {user?.profile?.student_name || user?.profile?.staff_name || user?.email.split('@')[0]}
            </span>
            <span className="text-uv-gray text-[10px] font-bold uppercase tracking-tight">
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
              className="absolute bottom-full left-0 mb-4 w-56 bg-white rounded-2xl shadow-2xl border border-uv-border p-2 z-50 overflow-hidden"
            >
                <div className="p-3 border-b border-gray-50 mb-1">
                    <p className="text-[10px] font-black text-uv-gray uppercase tracking-widest mb-1">Account</p>
                    <p className="text-xs font-bold text-uv-black truncate">{user?.email}</p>
                </div>
                <button 
                    onClick={() => {
                      setShowUserMenu(false);
                      logout();
                    }}
                    className="w-full text-left p-3 hover:bg-red-50 rounded-xl font-bold text-red-600 text-sm flex items-center gap-2 transition-colors"
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
