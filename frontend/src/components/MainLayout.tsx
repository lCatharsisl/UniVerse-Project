import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';
import PostModal from './PostModal';
import BottomNav from './BottomNav';
import { useTheme } from '../context/ThemeContext';
import SpaceBackground from './SpaceBackground';
import { FiGlobe, FiCloud, FiActivity } from 'react-icons/fi';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const location = useLocation();
  const { dimension, toggleDimension } = useTheme();
  const isMap = location.pathname === '/campus-map';
  const isSpace = dimension === 'space';

  return (
    <div className={`min-h-screen selection:bg-primary selection:text-white transition-colors duration-700 ${isSpace ? 'bg-[#050510] text-[#e1e1e6]' : 'bg-white text-uv-black'}`}>
      {isSpace && <SpaceBackground />}

      {/* Background Decor (Ground Only) */}
      {!isSpace && (
        <div className="fixed inset-0 opacity-[0.02] pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>
      )}

      {/* Floating Dimension Toggle — desktop only */}
      <div className="fixed bottom-6 left-6 z-[80] hidden md:flex flex-col gap-3">
        <button
          onClick={toggleDimension}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all group border border-white/10 ${isSpace ? 'bg-primary text-white' : 'bg-uv-black text-white'}`}
          title={isSpace ? 'Switch to Ground Mode' : 'Switch to Space Mode'}
        >
          {isSpace ? <FiGlobe size={22} /> : <FiCloud size={22} />}
          <span className={`absolute left-16 text-[10px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none ${isSpace ? 'bg-white text-uv-black' : 'bg-uv-black text-white'}`}>
            {isSpace ? 'RESTORE GRAVITY' : 'IGNITE ENGINES'}
          </span>
        </button>
      </div>

      {/* Floating Pulse Toggle — desktop only */}
      <button
        onClick={() => setShowPulse(!showPulse)}
        className={`fixed bottom-6 right-6 z-[80] w-14 h-14 rounded-2xl hidden md:flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all group border border-white/10 ${isSpace ? 'bg-primary text-white' : 'bg-uv-black text-white'}`}
        title="Toggle Visual Pulse"
      >
        <FiActivity size={22} className={showPulse ? 'animate-pulse text-primary' : ''} />
        <span className={`absolute right-16 text-[10px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none ${isSpace ? 'bg-white text-uv-black' : 'bg-uv-black text-white'}`}>
          {showPulse ? 'MUTE PULSE' : 'ACTIVATE PULSE'}
        </span>
      </button>

      {/* ── Desktop Layout (md+) ── */}
      <div className={`hidden md:flex ${isMap ? 'max-w-[1600px]' : 'max-w-7xl'} mx-auto justify-center relative z-10 w-full`}>
        {/* Navigation Column */}
        <header className={`${isMap ? 'flex-shrink-0' : 'flex-grow'} flex justify-end`}>
          <div className="w-[80px] xl:w-[280px]">
            <Sidebar onPostClick={() => setIsPostModalOpen(true)} />
          </div>
        </header>

        {/* Content Column */}
        <main className={`${isMap ? 'flex-1 min-w-0' : 'flex-shrink-0 w-full max-w-[650px]'} transition-all duration-500 ease-in-out border-x ${isSpace ? 'border-white/5 bg-[#0a0a1a]/40' : 'border-gray-100 bg-white/80'} backdrop-blur-[4px] min-h-screen relative shadow-[0_0_50px_rgba(0,0,0,0.02)]`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={isMap ? 'h-full flex flex-col' : ''}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Placeholder to balance flex layout */}
        {!isMap && <div className="flex-grow hidden lg:block w-[80px] xl:w-[280px]" />}

        {/* Intelligence Column (Sliding Drawer) */}
        <AnimatePresence>
          {showPulse && (
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`fixed right-0 top-0 h-screen ${isSpace ? 'bg-[#0a0a1a]/95 border-white/5' : 'bg-white/95 border-uv-border'} backdrop-blur-xl border-l z-[70] shadow-[-20px_0_50px_rgba(0,0,0,0.05)] w-[380px] hidden lg:block`}
            >
              <RightSidebar />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* ── Mobile Layout (<md) ── */}
      <div className="md:hidden relative z-10 w-full min-h-screen">
        <main
          className={`w-full min-h-screen ${isSpace ? 'bg-[#0a0a1a]/40' : 'bg-white/80'} pb-20`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav onPostClick={() => setIsPostModalOpen(true)} />

      {/* Global Post Interface */}
      <AnimatePresence>
        {isPostModalOpen && (
          <PostModal onClose={() => setIsPostModalOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default MainLayout;
