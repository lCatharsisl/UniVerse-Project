import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import tr from './locales/tr.json'

const STORAGE_KEY = 'uniVerseLang'

const getStoredLang = (): string => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'tr' || stored === 'en') return stored
  } catch {
    // ignore
  }
  return 'en'
}

const resources = {
  en: { translation: en as Record<string, unknown> },
  tr: { translation: tr as Record<string, unknown> },
}

i18n.use(initReactI18next).init({
  resources,
  lng: getStoredLang(),
  fallbackLng: 'en',
  compatibilityJSON: 'v4',
  interpolation: {
    escapeValue: false, // React already escapes
  },
})

i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem(STORAGE_KEY, lng)
  } catch {
    // ignore
  }
})

export default i18n
