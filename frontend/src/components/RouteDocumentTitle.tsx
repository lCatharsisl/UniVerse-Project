import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const BRAND = 'UniVerse';

function routeSegment(pathname: string): string {
  const first = pathname.split('/').filter(Boolean)[0];
  return first ?? 'default';
}

/** Sekme başlığını rota + dil ile günceller */
const RouteDocumentTitle = () => {
  const location = useLocation();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const key = routeSegment(location.pathname);
    const page = t(`pageTitle.${key}`, { defaultValue: '' });
    document.title = page ? `${page} · ${BRAND}` : BRAND;
  }, [location.pathname, t, i18n.language]);

  return null;
};

export default RouteDocumentTitle;
