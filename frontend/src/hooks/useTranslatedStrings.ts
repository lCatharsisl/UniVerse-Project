import { useEffect, useMemo, useState } from 'react';
import { translateToEnglish } from '../utils/translate';

function parseTexts(serialized: string): string[] {
  try {
    const parsed = JSON.parse(serialized) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function useTranslatedStrings(texts: string[]): string[] {
  const [translations, setTranslations] = useState<Map<string, string>>(new Map());
  const serializedTexts = useMemo(() => JSON.stringify(texts), [texts]);

  useEffect(() => {
    const list = parseTexts(serializedTexts);
    const toTranslate = list.filter(
      (t) => t?.trim() && /[a-zA-ZğüşıöçĞÜŞİÖÇ]/.test(t)
    );
    if (toTranslate.length === 0) {
      setTranslations((prev) => (prev.size === 0 ? prev : new Map()));
      return;
    }

    let cancelled = false;
    void Promise.all(toTranslate.map(translateToEnglish))
      .then((translated) => {
        if (cancelled) return;
        const map = new Map(toTranslate.map((t, i) => [t, translated[i]]));
        setTranslations(map);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [serializedTexts]);

  return useMemo(() => {
    const list = parseTexts(serializedTexts);
    return list.map((t) => translations.get(t.trim()) ?? t);
  }, [serializedTexts, translations]);
}
