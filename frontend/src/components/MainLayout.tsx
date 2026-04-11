import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';
import PostModal from './PostModal';
import BottomNav from './BottomNav';
import LanguageSwitch from './LanguageSwitch';
import { useTheme } from '../context/ThemeContext';
import SpaceBackground from './SpaceBackground';
import { FiGlobe, FiCloud, FiActivity, FiX } from 'react-icons/fi';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const location = useLocation();
  const { dimension, toggleDimension } = useTheme();
  const isMap = location.pathname === '/campus-map';
  const isSpace = dimension === 'space';

  useEffect(() => {
    setShowPulse(false);
  }, [location.pathname]);

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
          title={isSpace ? t('mainLayout.switchToGround') : t('mainLayout.switchToSpace')}
        >
          {isSpace ? <FiGlobe size={22} /> : <FiCloud size={22} />}
          <span className={`absolute left-16 text-[10px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none ${isSpace ? 'bg-white text-uv-black' : 'bg-uv-black text-white'}`}>
            {isSpace ? t('mainLayout.restoreGravity') : t('mainLayout.igniteEngines')}
          </span>
        </button>
      </div>

      {/* Language Switch + Pulse Toggle — mobile: above bottom nav, desktop: bottom-right */}
      <div className="fixed z-[80] bottom-24 right-4 md:bottom-6 md:right-6 flex flex-col gap-3 items-end">
        <LanguageSwitch />
        <button
          onClick={() => setShowPulse(!showPulse)}
          className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all group border border-white/10 ${isSpace ? 'bg-primary text-white' : 'bg-uv-black text-white'}`}
          title="Campus Pulse"
        >
          <FiActivity size={22} className={showPulse ? 'animate-pulse text-primary' : ''} />
          <span className={`absolute right-16 text-[10px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none ${isSpace ? 'bg-white text-uv-black' : 'bg-uv-black text-white'}`}>
            {showPulse ? t('mainLayout.mutePulse') : t('mainLayout.activatePulse')}
          </span>
        </button>
      </div>

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
          {location.pathname === '/messages' ? (
            <div className={`min-h-0 h-full ${isMap ? 'h-full flex flex-col' : ''}`}>{children}</div>
          ) : (
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
          )}
        </main>

        {/* Placeholder to balance flex layout */}
        {!isMap && <div className="flex-grow hidden lg:block w-[80px] xl:w-[280px]" />}
      </div>

      {/* ── Mobile Layout (<md) ── */}
      <div className="md:hidden relative z-10 w-full min-h-screen">
        <main
          className={`w-full min-h-screen ${isSpace ? 'bg-[#0a0a1a]/40' : 'bg-white/80'} pb-20`}
        >
          {location.pathname === '/messages' ? (
            <div className="w-full">{children}</div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav onPostClick={() => setIsPostModalOpen(true)} />

      {/* Campus Pulse Drawer — global, works on mobile and desktop */}
      <AnimatePresence>
        {showPulse && (
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed right-0 top-0 h-screen ${isSpace ? 'bg-[#0a0a1a]/95 border-white/5' : 'bg-white/95 border-uv-border'} backdrop-blur-xl border-l z-[70] shadow-[-20px_0_50px_rgba(0,0,0,0.05)] w-full sm:w-[380px] max-w-[100vw] flex flex-col`}
          >
            <button
              onClick={() => setShowPulse(false)}
              className={`absolute top-4 right-4 z-10 w-10 h-10 rounded-xl flex items-center justify-center ${isSpace ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              aria-label={t('common.close')}
            >
              <FiX size={20} />
            </button>
            <RightSidebar />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Global Post Interface — portaled to document.body inside PostModal */}
      {isPostModalOpen && <PostModal onClose={() => setIsPostModalOpen(false)} />}
    </div>
  );
};

export default MainLayout;
