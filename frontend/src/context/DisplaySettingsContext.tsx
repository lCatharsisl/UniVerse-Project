/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';

export type TextScale = 'compact' | 'default' | 'large' | 'xlarge' | 'xxlarge' | 'xxxlarge';

type DisplaySettingsContextType = {
  textScale: TextScale;
  setTextScale: (scale: TextScale) => void;
};

const STORAGE_KEY = 'uv_text_scale';

const TEXT_SCALE_VALUES: Record<TextScale, string> = {
  compact: '0.96',
  default: '1.16',
  large: '1.24',
  xlarge: '1.32',
  xxlarge: '1.4',
  xxxlarge: '1.48',
};

const DisplaySettingsContext = createContext<DisplaySettingsContextType | undefined>(undefined);

export const DisplaySettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [textScale, setTextScaleState] = useState<TextScale>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (
        saved === 'compact' ||
        saved === 'default' ||
        saved === 'large' ||
        saved === 'xlarge' ||
        saved === 'xxlarge' ||
        saved === 'xxxlarge'
      ) {
        return saved;
      }
    } catch {
      /* localStorage erişilemezse varsayılan */
    }
    return 'default';
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, textScale);
    } catch {
      /* ignore */
    }
    document.documentElement.dataset.textScale = textScale;
    document.documentElement.style.setProperty('--uv-text-scale', TEXT_SCALE_VALUES[textScale]);
  }, [textScale]);

  return (
    <DisplaySettingsContext.Provider value={{ textScale, setTextScale: setTextScaleState }}>
      {children}
    </DisplaySettingsContext.Provider>
  );
};

export const useDisplaySettings = () => {
  const context = useContext(DisplaySettingsContext);
  if (!context) {
    throw new Error('useDisplaySettings must be used within DisplaySettingsProvider');
  }
  return context;
};
