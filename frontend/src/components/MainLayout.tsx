import React, { useCallback, useEffect, lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import RightSidebar from './RightSidebar';
import BottomNav from './BottomNav';
import LanguageSwitch from './LanguageSwitch';
import RouteContentFallback from './RouteContentFallback';
import { usePwa } from '../context/PwaContext';
import { useTheme } from '../context/ThemeContext';
import { NotificationsProvider } from '../context/NotificationsContext';
import { MessagingUnreadProvider } from '../context/MessagingUnreadContext';
import {
  MessagesThreadLayoutProvider,
  useMessagesThreadLayout,
} from '../context/MessagesThreadLayoutContext';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useVisualKeyboardInset } from '../hooks/useVisualKeyboardInset';
import { PULL_REFRESH_EVENT, type PullRefreshRequestDetail } from '../types/pullRefresh';
import SpaceBackground from './SpaceBackground';
import { FiMoon, FiCloud, FiActivity, FiRefreshCcw, FiX } from 'react-icons/fi';

const PostModal = lazy(() => import('./PostModal'));

interface MainLayoutProps {
  children: React.ReactNode;
}

/** Hub: biraz dar üst sınır — sol menü tipografisi büyüdükçe üç sütun dengesi korunur. */
const HUB_MAIN_CLASS =
  'relative h-full min-h-0 min-w-0 flex-1 max-w-[46rem] 2xl:max-w-3xl overflow-x-hidden overflow-y-auto';

/** xl: Space/Ground düğmesi; dar ekranda biraz sıkı, 2xl’de tam hizalı. */
const XL_INSET_AFTER_DIMENSION_FAB =
  'xl:pl-[calc(env(safe-area-inset-left,0px)+1.25rem+3.25rem+0.375rem)] 2xl:pl-[calc(env(safe-area-inset-left,0px)+1.5rem+3.5rem+0.5rem)]';

const MainLayoutInner: React.FC<MainLayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const { mobileMessagesThreadOpen } = useMessagesThreadLayout();
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  const [mobileMainElement, setMobileMainElement] = useState<HTMLElement | null>(null);
  const location = useLocation();
  const { isKeyboardObscuring } = useVisualKeyboardInset();
  const { dimension, toggleDimension } = useTheme();
  const { isRefreshing } = usePwa();
  const isMap = location.pathname === '/campus-map';
  const isMessages = location.pathname === '/messages';
  /** Harita ve mesajlar: orta sütun tam genişlik; sağda pulse rezervi yok */
  const isFullWidthMain = isMap || isMessages;
  /** Masaüstünde sağda Pulse genişliği her zaman rezerve; içerik showPulse ile */
  const showDockedPulseContent = showPulse && !isFullWidthMain;
  const isSpace = dimension === 'space';
  const handlePullRefresh = useCallback(async () => {
    const queuedTasks: Promise<unknown>[] = [];
    const refreshEvent = new CustomEvent<PullRefreshRequestDetail>(PULL_REFRESH_EVENT, {
      cancelable: true,
      detail: {
        path: location.pathname,
        enqueue: (task) => {
          queuedTasks.push(task);
        },
      },
    });

    window.dispatchEvent(refreshEvent);
    if (queuedTasks.length > 0) {
      await Promise.allSettled(queuedTasks);
    }
  }, [location.pathname]);
  const { isPulling, isReady, isRefreshing: isPullRefreshing, pullDistance } = usePullToRefresh(mobileMainElement, {
    onRefresh: handlePullRefresh,
    activationDistance: 20,
    threshold: 96,
    maxPull: 132,
  });

  /** Sadece giriş (wait+exit=0 tüm sütun yanıp söner); çıkış yok = boşluk/flash yok */
  const pageEnter = {
    initial: { opacity: 0.92, y: 4 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.18, ease: [0.25, 0.1, 0.25, 1] as const },
  };

  /** Desktop dışındaki layout'ta route değişince pulse çekmecesini kapat */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(max-width: 1279px)').matches) {
      const frame = window.requestAnimationFrame(() => setShowPulse(false));
      return () => window.cancelAnimationFrame(frame);
    }
  }, [location.pathname]);

  /** xl+ ilk yüklemede Pulse içeriği açık */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setShowPulse(window.matchMedia('(min-width: 1280px)').matches);
  }, []);

  /** Dar/geniş geçişinde: xl altına inince kapat; xl'e çıkınca tekrar aç (aynı xl içinde X ile kapatma korunur) */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1280px)');
    const onChange = (e: MediaQueryListEvent) => {
      setShowPulse(e.matches);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return (
    <NotificationsProvider>
      <MessagingUnreadProvider>
    <div
      className={`selection:bg-primary selection:text-white transition-colors duration-700 ${
        isMessages
          ? 'flex min-h-0 h-dvh max-h-dvh flex-col overflow-hidden'
          : 'min-h-screen xl:h-dvh xl:max-h-dvh xl:min-h-0 xl:overflow-hidden'
      } ${isSpace ? 'bg-[#050510] text-[#e1e1e6]' : 'bg-white text-uv-black'}`}
    >
      {isSpace && <SpaceBackground />}

      {/* Background Decor (Ground Only) */}
      {!isSpace && (
        <div className="fixed inset-0 opacity-[0.02] pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>
      )}

      {!isMessages && (
        <>
          {/* xl+: dil + Space/Ground sol alt; mobil/tablet: dil sağda Pulse üstünde (aynı blok içinde) */}
          <div className="fixed bottom-6 left-6 z-[80] hidden flex-col items-start gap-3 xl:flex">
            <LanguageSwitch dock="left" />
            <button
              type="button"
              onClick={toggleDimension}
              className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 shadow-2xl transition-all hover:scale-105 active:scale-95 group md:h-14 md:w-14 ${isSpace ? 'bg-primary text-white' : 'bg-uv-black text-white'}`}
              title={isSpace ? t('mainLayout.switchToGround') : t('mainLayout.switchToSpace')}
            >
              {isSpace ? <FiMoon size={22} /> : <FiCloud size={22} />}
              <span className={`pointer-events-none absolute left-full top-1/2 z-10 ml-2 -translate-y-1/2 whitespace-nowrap rounded-lg px-3 py-1.5 text-[10px] font-black opacity-0 transition-opacity group-hover:opacity-100 ${isSpace ? 'bg-white text-uv-black' : 'bg-uv-black text-white'}`}>
                {isSpace ? t('mainLayout.restoreGravity') : t('mainLayout.igniteEngines')}
              </span>
            </button>
          </div>

          {/* Mobil/tablet: dil düğmesi sağda Pulse FAB üstünde; Pulse çekmecesi açıkken gizli (xl+ sol sütunda ayrı) */}
          <div className="fixed z-[80] bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] right-2 flex flex-col items-end gap-3 sm:right-3 xl:bottom-6 xl:right-6">
            {!showPulse && (
              <div className="shrink-0 xl:hidden">
                <LanguageSwitch dock="right" />
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowPulse(!showPulse)}
              className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 shadow-2xl transition-all hover:scale-105 active:scale-95 group md:h-14 md:w-14 ${isSpace ? 'bg-primary text-white' : 'bg-uv-black text-white'}`}
              title="Campus Pulse"
            >
              <FiActivity
                size={22}
                className={
                  showPulse
                    ? `animate-pulse ${isSpace ? 'text-white' : 'text-primary'}`
                    : undefined
                }
              />
              <span className={`pointer-events-none absolute right-full top-1/2 z-10 mr-2 -translate-y-1/2 whitespace-nowrap rounded-lg px-3 py-1.5 text-[10px] font-black opacity-0 transition-opacity group-hover:opacity-100 ${isSpace ? 'bg-white text-uv-black' : 'bg-uv-black text-white'}`}>
                {showPulse ? t('mainLayout.mutePulse') : t('mainLayout.activatePulse')}
              </span>
            </button>
          </div>
        </>
      )}

      {/* ── Desktop Layout (xl+) ──
          Satır h-dvh: sayfa gövdesi kaymaz. Kaydırma sadece orta <main> içinde (ve pulse içi uzunsa o panelde).
          Sol menü + sağ Campus Pulse sütunu görünürde sabit, Hub/feed alanı arada scroll olur. */}
      <div
        className={`hidden min-w-0 xl:flex xl:items-stretch relative z-10 w-full ${
          isMessages
            ? 'min-h-0 h-full max-h-full flex-1 max-w-none'
            : 'h-dvh max-h-dvh min-h-0 w-full min-w-0 overflow-hidden'
        } ${XL_INSET_AFTER_DIMENSION_FAB}`}
      >
        {/* Navigation — xl daha dar (w-64), 2xl tam 280px */}
        <header className="flex w-[80px] flex-shrink-0 justify-start self-stretch min-h-0 min-w-0 overflow-hidden xl:w-60 xl:max-w-[264px] 2xl:w-[272px] 2xl:max-w-[280px]">
          <div className="h-full w-full min-w-0 min-h-0">
            <Sidebar />
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
          <div className="flex min-h-0 min-w-0 flex-1 overflow-x-hidden">
            <main className={HUB_MAIN_CLASS}>
              <div
                className={`min-h-full w-full border-x transition-[background-color,backdrop-filter,box-shadow,border-color] duration-200 ease-out ${isSpace ? 'border-white/10 bg-[#0a0a1a]/70' : 'border-gray-200/90 bg-white/95'} backdrop-blur-[6px] shadow-[0_0_60px_rgba(0,0,0,0.18)]`}
              >
                <Suspense
                  fallback={<RouteContentFallback isSpace={isSpace} isMessages={isMessages} />}
                >
                  <motion.div
                    key={location.pathname}
                    className="min-h-0 w-full min-w-0 px-3 sm:px-4 md:px-5 xl:px-4 2xl:px-5 [will-change:opacity,transform] transform-gpu"
                    {...pageEnter}
                  >
                    {children}
                  </motion.div>
                </Suspense>
              </div>
            </main>
            {!isFullWidthMain && (
              <aside
                className={`relative ml-3 flex h-full min-h-0 w-[380px] shrink-0 flex-col self-stretch overflow-hidden border-l 2xl:ml-4 2xl:w-[400px] ${
                  showDockedPulseContent
                    ? isSpace
                      ? 'border-white/5 bg-[#0a0a1a]/40 backdrop-blur-[4px] shadow-[0_0_50px_rgba(0,0,0,0.02)]'
                      : 'border-gray-100 bg-white/80 backdrop-blur-[4px] shadow-[0_0_50px_rgba(0,0,0,0.02)]'
                    : isSpace
                      ? 'border-white/[0.08] bg-[#050510]/60'
                      : 'border-gray-200/50 bg-gray-50/50'
                }`}
                aria-label={t('rightSidebar.campusPulse')}
              >
                {showDockedPulseContent ? (
                  <>
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
                    <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable]">
                      <RightSidebar />
                    </div>
                  </>
                ) : (
                  <div className="min-h-0 min-w-0 flex-1 shrink-0" aria-hidden />
                )}
              </aside>
            )}
          </div>
        )}
      </div>

      {/* ── Mobile + Tablet Layout (<xl) ── */}
      <div
        className={`relative z-10 xl:hidden w-full ${
          isMessages ? 'flex min-h-0 max-h-dvh h-dvh flex-1 flex-col overflow-hidden' : 'flex min-h-[100svh] max-h-[100svh] flex-col overflow-hidden'
        }`}
      >
        <div
          className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+0.5rem)] z-[105] flex justify-center transition-transform duration-200"
          style={{
            transform: `translateY(${Math.min(56, pullDistance)}px)`,
            opacity: isPulling || isRefreshing || isPullRefreshing ? 1 : 0,
          }}
        >
          <div
            className={`flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-black shadow-lg backdrop-blur-xl ${
              isSpace
                ? 'border-white/10 bg-[#0a0a1a]/88 text-white'
                : 'border-white/70 bg-white/92 text-slate-700'
            }`}
          >
            <FiRefreshCcw
              size={14}
              className={`${isRefreshing || isPullRefreshing || isReady ? 'animate-spin' : ''} ${isReady ? 'text-primary' : ''}`}
            />
            <span>
              {isRefreshing || isPullRefreshing
                ? t('pwa.refreshing')
                : isReady
                  ? t('pwa.pullToReload')
                  : t('pwa.pullToRefresh')}
            </span>
          </div>
        </div>
        <main
          ref={setMobileMainElement}
          className={`w-full ${
            isMessages
              ? 'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden overscroll-y-contain'
              : 'flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain'
          } ${isSpace ? 'bg-[#0a0a1a]/40' : 'bg-white/80'} ${
            isMessages
              ? `${
                  isKeyboardObscuring || mobileMessagesThreadOpen
                    ? 'pb-[env(safe-area-inset-bottom,0px)]'
                    : 'pb-[calc(env(safe-area-inset-bottom,0px)+3.5rem)]'
                } pt-[calc(env(safe-area-inset-top,0px)+0.5rem)]`
              : 'pb-20 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)]'
          }`}
          style={{
            transform: !isRefreshing && !isPullRefreshing && pullDistance > 0 ? `translate3d(0, ${Math.min(pullDistance, 72)}px, 0)` : undefined,
            transition: isPulling ? 'none' : 'transform 180ms ease-out',
          }}
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

      {/* Mobil alt tab: mesaj sohbeti açıkken tamamen kaldır (liste görünümünde kalır) */}
      {!(isMessages && mobileMessagesThreadOpen) && (
        <BottomNav
          onPostClick={() => setIsPostModalOpen(true)}
          slideOffscreen={location.pathname === '/messages' && isKeyboardObscuring && !mobileMessagesThreadOpen}
        />
      )}

      {/* Campus Pulse: mobil + tablet = çekmece; xl+ sağda sabit rezerv sütun (içerik showPulse ile) */}
      <AnimatePresence>
        {showPulse && !isFullWidthMain && (
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed right-0 top-0 h-screen w-full sm:w-[380px] max-w-[100vw] flex flex-col border-l backdrop-blur-xl shadow-[-20px_0_50px_rgba(0,0,0,0.05)] xl:hidden z-[70] ${
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
      {isPostModalOpen && (
        <Suspense
          fallback={
            <div
              className="fixed inset-0 z-[500] bg-black/35 backdrop-blur-sm"
              aria-hidden
            />
          }
        >
          <PostModal onClose={() => setIsPostModalOpen(false)} />
        </Suspense>
      )}
    </div>
      </MessagingUnreadProvider>
    </NotificationsProvider>
  );
};

const MainLayout: React.FC<MainLayoutProps> = (props) => (
  <MessagesThreadLayoutProvider>
    <MainLayoutInner {...props} />
  </MessagesThreadLayoutProvider>
);

export default MainLayout;
