import { FiCheckCircle, FiDownload, FiRefreshCcw, FiSmartphone, FiWifiOff, FiX } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { usePwa } from '../context/PwaContext';
import { useTheme } from '../context/ThemeContext';

const PwaSystemOverlay = () => {
  const { t } = useTranslation();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';
  const {
    canInstall,
    showInstallPrompt,
    isRefreshing,
    needRefresh,
    offlineReady,
    promptInstall,
    refreshApp,
    dismissInstallPrompt,
    dismissNeedRefresh,
    dismissOfflineReady,
  } = usePwa();

  return (
    <>
      {needRefresh && (
        <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+5.75rem)] z-[120] sm:left-auto sm:right-4 sm:w-[24rem]">
          <div className={`rounded-[1.75rem] border p-4 shadow-[0_24px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl ${
            isSpace ? 'border-white/10 bg-[#11162a]/92 text-white' : 'border-primary/15 bg-white/96 text-uv-black'
          }`}>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-2xl bg-primary/10 p-2 text-primary">
                <FiRefreshCcw size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black">{t('pwa.updateReadyTitle')}</div>
                <p className={`mt-1 text-xs leading-5 ${isSpace ? 'text-white/72' : 'text-slate-600'}`}>{t('pwa.updateReadyBody')}</p>
              </div>
              <button
                type="button"
                onClick={dismissNeedRefresh}
                className={`rounded-xl p-2 transition ${
                  isSpace ? 'text-white/45 hover:bg-white/8 hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                }`}
                aria-label={t('common.close')}
              >
                <FiX size={16} />
              </button>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => void refreshApp()}
                className="uv-button !px-4 !py-2 !text-[11px]"
                disabled={isRefreshing}
              >
                {isRefreshing ? t('pwa.refreshing') : t('pwa.updateNow')}
              </button>
              <button
                type="button"
                onClick={dismissNeedRefresh}
                className={`rounded-2xl px-3 py-2 text-xs font-semibold transition ${
                  isSpace ? 'text-white/68 hover:bg-white/8' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {t('pwa.later')}
              </button>
            </div>
          </div>
        </div>
      )}

      {!needRefresh && offlineReady && (
        <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+5.75rem)] z-[120] sm:left-auto sm:right-4 sm:w-[21rem]">
          <div className={`rounded-[1.5rem] border p-4 shadow-[0_18px_50px_rgba(0,0,0,0.16)] backdrop-blur-xl ${
            isSpace ? 'border-emerald-500/20 bg-[#081a18]/94 text-emerald-50' : 'border-emerald-200 bg-emerald-50/96 text-emerald-950'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 rounded-2xl p-2 ${isSpace ? 'bg-emerald-400/10 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
                <FiCheckCircle size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black">{t('pwa.offlineReadyTitle')}</div>
                <p className={`mt-1 text-xs leading-5 ${isSpace ? 'text-emerald-100/78' : 'text-emerald-900/80'}`}>{t('pwa.offlineReadyBody')}</p>
              </div>
              <button
                type="button"
                onClick={dismissOfflineReady}
                className={`rounded-xl p-2 transition ${
                  isSpace ? 'text-emerald-100/55 hover:bg-emerald-400/10 hover:text-emerald-50' : 'text-emerald-700/60 hover:bg-emerald-100 hover:text-emerald-900'
                }`}
                aria-label={t('common.close')}
              >
                <FiX size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {showInstallPrompt && (
        <div className="fixed inset-x-3 top-[calc(env(safe-area-inset-top,0px)+0.75rem)] z-[120] sm:left-auto sm:right-4 sm:w-[23rem]">
          <div
            className={`rounded-[1.75rem] border p-4 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl ${
              isSpace
                ? 'border-white/12 bg-[#0d1020]/96 text-white'
                : 'border-slate-200/90 bg-white/96 text-slate-950'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 rounded-2xl p-2 ${
                  isSpace ? 'bg-white/10 text-white' : 'bg-primary/10 text-primary'
                }`}
              >
                {canInstall ? <FiDownload size={18} /> : <FiSmartphone size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black">
                  {canInstall ? t('pwa.installTitle') : t('pwa.installIosTitle')}
                </div>
                <p className={`mt-1 text-xs leading-5 ${isSpace ? 'text-white/78' : 'text-slate-700'}`}>
                  {canInstall ? t('pwa.installBody') : t('pwa.installIosBody')}
                </p>
              </div>
              <button
                type="button"
                onClick={dismissInstallPrompt}
                className={`rounded-xl p-2 transition ${
                  isSpace ? 'text-white/50 hover:bg-white/8 hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
                }`}
                aria-label={t('common.close')}
              >
                <FiX size={16} />
              </button>
            </div>
            <div className="mt-4 flex items-center gap-2">
              {canInstall ? (
                <button type="button" onClick={() => void promptInstall()} className="uv-button !px-4 !py-2 !text-[11px]">
                  {t('pwa.installAction')}
                </button>
              ) : (
                <div
                  className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-[11px] font-semibold ${
                    isSpace ? 'bg-white/10 text-white/88' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <FiWifiOff size={14} />
                  {t('pwa.installIosHint')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PwaSystemOverlay;
