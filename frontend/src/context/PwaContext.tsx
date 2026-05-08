/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

type PwaContextType = {
  canInstall: boolean;
  installHintAvailable: boolean;
  showInstallPrompt: boolean;
  isStandalone: boolean;
  isRefreshing: boolean;
  needRefresh: boolean;
  offlineReady: boolean;
  promptInstall: () => Promise<boolean>;
  refreshApp: () => Promise<void>;
  dismissInstallPrompt: () => void;
  dismissNeedRefresh: () => void;
  dismissOfflineReady: () => void;
};

const PwaContext = createContext<PwaContextType | undefined>(undefined);

const isStandaloneDisplayMode = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.matchMedia('(display-mode: window-controls-overlay)').matches ||
  (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIosDevice = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);
const INSTALL_PROMPT_DISMISSED_KEY = 'pwa-install-prompt-dismissed';

export const PwaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const updateServiceWorkerRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installHintAvailable, setInstallHintAvailable] = useState(false);
  const [installPromptDismissed, setInstallPromptDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setInstallPromptDismissed(window.sessionStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY) === '1');
    setIsStandalone(isStandaloneDisplayMode());
    setInstallHintAvailable(isIosDevice() && !isStandaloneDisplayMode());

    const updateDisplayMode = () => {
      const standalone = isStandaloneDisplayMode();
      setIsStandalone(standalone);
      setInstallHintAvailable(isIosDevice() && !standalone);
      if (standalone) {
        window.sessionStorage.removeItem(INSTALL_PROMPT_DISMISSED_KEY);
        setInstallPromptDismissed(false);
      }
    };

    const beforeInstallPromptHandler = (event: Event) => {
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    const appInstalledHandler = () => {
      deferredPromptRef.current = null;
      setCanInstall(false);
      window.sessionStorage.removeItem(INSTALL_PROMPT_DISMISSED_KEY);
      setInstallPromptDismissed(false);
      updateDisplayMode();
    };

    if (import.meta.env.DEV) {
      void (async () => {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map((registration) => registration.unregister()));
          const cacheKeys = await caches.keys();
          await Promise.all(cacheKeys.map((key) => caches.delete(key)));
        } catch (error) {
          console.warn('Failed to clear dev PWA state:', error);
        }
      })();
      setCanInstall(false);
      setNeedRefresh(false);
      setOfflineReady(false);
      updateServiceWorkerRef.current = null;
      registrationRef.current = null;
    } else {
      const updateServiceWorker = registerSW({
        immediate: true,
        onNeedRefresh() {
          setNeedRefresh(true);
        },
        onOfflineReady() {
          setOfflineReady(true);
        },
        onRegisteredSW(_swUrl, registration) {
          registrationRef.current = registration ?? null;
        },
        onRegisterError(error) {
          console.error('PWA registration failed:', error);
        },
      });

      updateServiceWorkerRef.current = updateServiceWorker;
    }

    window.addEventListener('beforeinstallprompt', beforeInstallPromptHandler);
    window.addEventListener('appinstalled', appInstalledHandler);
    window.matchMedia('(display-mode: standalone)').addEventListener('change', updateDisplayMode);
    window.addEventListener('focus', updateDisplayMode);

    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstallPromptHandler);
      window.removeEventListener('appinstalled', appInstalledHandler);
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', updateDisplayMode);
      window.removeEventListener('focus', updateDisplayMode);
    };
  }, []);

  const promptInstall = async () => {
    if (import.meta.env.DEV) return false;
    const prompt = deferredPromptRef.current;
    if (!prompt) return false;

    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === 'accepted') {
      deferredPromptRef.current = null;
      setCanInstall(false);
      return true;
    }

    return false;
  };

  const refreshApp = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);

    try {
      await registrationRef.current?.update();

      if (needRefresh && updateServiceWorkerRef.current) {
        await updateServiceWorkerRef.current(true);
        return;
      }

      window.location.reload();
    } finally {
      window.setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  return (
    <PwaContext.Provider
      value={{
        canInstall,
        installHintAvailable,
        showInstallPrompt: (canInstall || installHintAvailable) && !installPromptDismissed,
        isStandalone,
        isRefreshing,
        needRefresh,
        offlineReady,
        promptInstall,
        refreshApp,
        dismissInstallPrompt: () => {
          window.sessionStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, '1');
          setInstallPromptDismissed(true);
        },
        dismissNeedRefresh: () => setNeedRefresh(false),
        dismissOfflineReady: () => setOfflineReady(false),
      }}
    >
      {children}
    </PwaContext.Provider>
  );
};

export const usePwa = () => {
  const context = useContext(PwaContext);
  if (!context) {
    throw new Error('usePwa must be used within PwaProvider');
  }
  return context;
};
