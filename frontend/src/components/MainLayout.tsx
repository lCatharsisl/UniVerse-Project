import React, { useState, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';
import PostModal from './PostModal';
import BottomNav from './BottomNav';
import LanguageSwitch from './LanguageSwitch';
import RouteContentFallback from './RouteContentFallback';
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
  const isMessages = location.pathname === '/messages';
  /** Harita ve mesajlar: orta sütun tam genişlik; sağda pulse sütunu yok */
  const isFullWidthMain = isMap || isMessages;
  const showDockedPulse = showPulse && !isFullWidthMain;
  const isSpace = dimension === 'space';

  /** Sadece giriş (wait+exit=0 tüm sütun yanıp söner); çıkış yok = boşluk/flash yok */
  const pageEnter = {
    initial: { opacity: 0.92, y: 4 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.18, ease: [0.25, 0.1, 0.25, 1] as const },
  };

  /** Masaüstünde campus pulse açık kalsın; sadece mobilde route değişince çekmecyi kapat */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(max-width: 1023px)').matches) {
      setShowPulse(false);
    }
  }, [location.pathname]);

  /** Geniş ekranda varsayılan olarak pulse sütununu aç (üçlü sütun) */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(min-width: 1024px)').matches) {
      setShowPulse(true);
    }
  }, []);

  return (
    <div
      className={`selection:bg-primary selection:text-white transition-colors duration-700 ${
        isMessages
          ? 'flex min-h-0 h-dvh max-h-dvh flex-col overflow-hidden'
          : 'min-h-screen md:h-dvh md:max-h-dvh md:min-h-0 md:overflow-hidden'
      } ${isSpace ? 'bg-[#050510] text-[#e1e1e6]' : 'bg-white text-uv-black'}`}
    >
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

      {/* Dil + Pulse: her zaman viewport sağ kenarında; pulse sütunu açıkken sola kaydırmıyoruz (orta feed’i kapatıyordu). */}
      <div
        className="fixed z-[80] bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] right-2 flex flex-col gap-3 items-end sm:right-3 md:bottom-6 md:right-3"
      >
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

      {/* ── Desktop Layout (md+) ──
          Satır h-dvh: sayfa gövdesi kaymaz. Kaydırma sadece orta <main> içinde (ve pulse içi uzunsa o panelde).
          Sol menü + sağ Campus Pulse sütunu görünürde sabit, Hub/feed alanı arada scroll olur. */}
      <div
        className={`hidden md:flex md:items-stretch relative z-10 w-full ${
          isMessages
            ? 'min-h-0 h-full max-h-full flex-1 max-w-none'
            : isMap
              ? 'h-dvh max-h-dvh min-h-0 w-full min-w-0 max-w-[1600px] overflow-hidden'
              : 'h-dvh max-h-dvh min-h-0 w-full overflow-hidden'
        }`}
      >
        {/* Navigation Column — her zaman sol kenarda sabit genişlik (Chats ile aynı) */}
        <header className="flex w-[80px] flex-shrink-0 justify-start self-stretch min-h-0 overflow-y-auto xl:w-[280px]">
          <div className="h-full w-full min-w-0 min-h-0">
            <Sidebar onPostClick={() => setIsPostModalOpen(true)} />
          </div>
        </header>

        {/* Hub vb.: orta sütun flex-1; lg+ ve pulse açıksa sağda sabit Campus Pulse sütunu */}
        {isFullWidthMain ? (
          <main
            className={`${
              isMessages
                ? 'flex h-full min-h-0 w-full min-w-0 max-h-full flex-1 flex-col overflow-hidden'
                : 'flex min-h-0 min-w-0 flex-1 flex-col'
            } relative border-x transition-[background-color,backdrop-filter,box-shadow,border-color] duration-200 ease-out ${
              isSpace ? 'border-white/5 bg-[#0a0a1a]/40' : 'border-gray-100 bg-white/80'
            } backdrop-blur-[4px] ${
              !isMessages
                ? isMap
                  ? 'min-h-0 h-full flex-1 overflow-hidden'
                  : 'min-h-0 h-full flex-1 overflow-y-auto'
                : ''
            } shadow-[0_0_50px_rgba(0,0,0,0.02)]`}
          >
            <Suspense
              fallback={<RouteContentFallback isSpace={isSpace} isMessages={isMessages} />}
            >
              <motion.div
                key={location.pathname}
                className={
                  isMessages
                    ? 'flex min-h-0 h-full w-full min-w-0 flex-1 flex-col overflow-hidden [will-change:opacity,transform] transform-gpu'
                    : isMap
                      ? 'min-h-0 h-full w-full flex flex-1 flex-col [will-change:opacity,transform] transform-gpu'
                      : 'min-h-0 [will-change:opacity,transform] transform-gpu'
                }
                {...pageEnter}
              >
                {isMessages ? (
                  <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
                ) : (
                  children
                )}
              </motion.div>
            </Suspense>
          </main>
        ) : (
          <>
            <main
              className={`relative min-h-0 w-full min-w-0 flex-1 overflow-y-auto border-x transition-[background-color,backdrop-filter,box-shadow,border-color] duration-200 ease-out ${
                isSpace ? 'border-white/5 bg-[#0a0a1a]/40' : 'border-gray-100 bg-white/80'
              } backdrop-blur-[4px] shadow-[0_0_50px_rgba(0,0,0,0.02)]`}
            >
              <Suspense
                fallback={<RouteContentFallback isSpace={isSpace} isMessages={isMessages} />}
              >
                <motion.div
                  key={location.pathname}
                  className="min-h-0 w-full [will-change:opacity,transform] transform-gpu"
                  {...pageEnter}
                >
                  {children}
                </motion.div>
              </Suspense>
            </main>
            {showDockedPulse && (
              <aside
                className={`relative hidden max-h-full min-h-0 w-[380px] shrink-0 flex-col self-stretch overflow-hidden border-l lg:flex ${
                  isSpace ? 'border-white/5 bg-[#0a0a1a]/40' : 'border-gray-100 bg-white/80'
                } backdrop-blur-[4px] shadow-[0_0_50px_rgba(0,0,0,0.02)]`}
                aria-label={t('rightSidebar.campusPulse')}
              >
                <div
                  className={`flex shrink-0 items-center justify-end border-b px-3 py-2 ${
                    isSpace ? 'border-white/10' : 'border-gray-100'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setShowPulse(false)}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl transition ${
                      isSpace ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    title={t('common.close')}
                    aria-label={t('common.close')}
                  >
                    <FiX size={18} />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]">
                  <RightSidebar />
                </div>
              </aside>
            )}
          </>
        )}
      </div>

      {/* ── Mobile Layout (<md) ── */}
      <div
        className={`relative z-10 md:hidden w-full ${
          isMessages ? 'flex min-h-0 max-h-dvh h-dvh flex-1 flex-col overflow-hidden' : 'min-h-screen'
        }`}
      >
        <main
          className={`w-full ${
            isMessages
              ? 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'
              : 'min-h-screen'
          } ${isSpace ? 'bg-[#0a0a1a]/40' : 'bg-white/80'} ${isMessages ? 'pb-[max(5.25rem,env(safe-area-inset-bottom,0px))]' : 'pb-20'}`}
        >
          <Suspense
            fallback={<RouteContentFallback isSpace={isSpace} isMessages={isMessages} />}
          >
            <motion.div
              key={location.pathname}
              className={
                isMessages
                  ? 'w-full min-h-0 flex-1 flex flex-col overflow-hidden [will-change:opacity,transform] transform-gpu'
                  : 'min-h-0 w-full [will-change:opacity,transform] transform-gpu'
              }
              {...pageEnter}
            >
              {isMessages ? (
                <div className="w-full min-h-0 flex-1 flex flex-col overflow-hidden">{children}</div>
              ) : (
                children
              )}
            </motion.div>
          </Suspense>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav onPostClick={() => setIsPostModalOpen(true)} />

      {/* Campus Pulse: mobil + tablet = çekmece; lg+ bu panel flex üstünde (showDockedPulse) */}
      <AnimatePresence>
        {showPulse && !isFullWidthMain && (
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed right-0 top-0 h-screen w-full sm:w-[380px] max-w-[100vw] flex flex-col border-l backdrop-blur-xl shadow-[-20px_0_50px_rgba(0,0,0,0.05)] lg:hidden z-[70] ${
              isSpace ? 'bg-[#0a0a1a]/95 border-white/5' : 'bg-white/95 border-uv-border'
            }`}
          >
            <button
              onClick={() => setShowPulse(false)}
              className={`absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-xl ${
                isSpace ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
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
