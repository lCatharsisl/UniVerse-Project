import { useTranslation } from 'react-i18next';

/** Tam ekran yükleme (Suspense / auth kontrolü) */
const FullPageLoader = () => {
  const { t } = useTranslation();
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-3"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
        aria-hidden
      />
      <span className="text-sm text-slate-500">{t('common.loading')}</span>
    </div>
  );
};

export default FullPageLoader;
