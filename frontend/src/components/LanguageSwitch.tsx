import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FiGlobe } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'tr', label: 'TR' },
] as const;

const LanguageSwitch: React.FC = () => {
  const { i18n } = useTranslation();
  const { dimension } = useTheme();
  const isSpace = dimension === 'space';
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const currentLang = i18n.language?.startsWith('tr') ? 'tr' : 'en';
  const handleSelect = (code: 'en' | 'tr') => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all group border border-white/10 ${isSpace ? 'bg-primary text-white' : 'bg-uv-black text-white'}`}
        title={currentLang === 'tr' ? 'Türkçe' : 'English'}
        aria-label={currentLang === 'tr' ? 'Switch to English' : 'Türkçe\'ye geç'}
      >
        <FiGlobe size={22} />
        <span className={`absolute right-16 text-[10px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none ${isSpace ? 'bg-white text-uv-black' : 'bg-uv-black text-white'}`}>
          {currentLang === 'tr' ? 'EN' : 'TR'}
        </span>
      </button>

      {open && (
        <div
          className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 py-2 rounded-xl shadow-2xl border z-[90] min-w-[100px] ${isSpace ? 'bg-[#0a0a1a] border-white/20' : 'bg-white border-uv-border'}`}
        >
          {LANGUAGES.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              onClick={() => handleSelect(code)}
              className={`w-full px-4 py-2 text-left text-sm font-black uppercase tracking-widest transition-colors ${currentLang === code ? 'text-primary' : isSpace ? 'text-white/70 hover:text-white' : 'text-uv-gray hover:text-uv-black'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitch;
