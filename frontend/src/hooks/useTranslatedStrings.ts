import { useState, useEffect } from 'react';
import { translateToEnglish } from '../utils/translate';

export function useTranslatedStrings(texts: string[]): string[] {
  const [result, setResult] = useState<string[]>(texts);

  useEffect(() => {
    setResult(texts);

    const toTranslate = texts.filter(
      (t) => t?.trim() && /[a-zA-ZğüşıöçĞÜŞİÖÇ]/.test(t)
    );
    if (toTranslate.length === 0) return;

    Promise.all(toTranslate.map(translateToEnglish))
      .then((translated) => {
        const map = new Map(toTranslate.map((t, i) => [t, translated[i]]));
        setResult(texts.map((t) => map.get(t.trim()) ?? t));
      })
      .catch(() => {});
  }, [JSON.stringify(texts)]);

  return result;
}
