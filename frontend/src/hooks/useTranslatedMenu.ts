import { useState, useEffect } from 'react';
import { translateToEnglish } from '../utils/translate';

interface DayMenu {
  date?: string;
  weekday?: string;
  soup?: string;
  main?: string;
  side?: string;
  salad?: string;
  yogurt?: string;
  dessert?: string;
  fruit?: string;
  extras?: string[];
}

type MenuValueKey = 'soup' | 'main' | 'side' | 'salad' | 'yogurt' | 'dessert' | 'fruit';

const MENU_KEYS: MenuValueKey[] = [
  'soup', 'main', 'side', 'salad', 'yogurt', 'dessert', 'fruit'
];

function collectMenuTexts(menu: DayMenu | undefined): string[] {
  if (!menu) return [];
  return MENU_KEYS
    .map((k) => menu[k])
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

function applyTranslations(
  menu: DayMenu | undefined,
  translations: Map<string, string>
): DayMenu | undefined {
  if (!menu) return undefined;
  const out = { ...menu };
  for (const k of MENU_KEYS) {
    const val = menu[k];
    if (typeof val === 'string' && val.trim()) {
      (out as Record<string, string | string[] | undefined>)[k] = translations.get(val.trim()) ?? val;
    }
  }
  return out;
}

export function useTranslatedMenu(
  lunch?: DayMenu,
  dinner?: DayMenu,
  breakfast?: DayMenu
): { lunch?: DayMenu; dinner?: DayMenu; breakfast?: DayMenu } {
  const [result, setResult] = useState({
    lunch,
    dinner,
    breakfast,
  });

  useEffect(() => {
    setResult({ lunch, dinner, breakfast });

    const all = [
      ...collectMenuTexts(lunch),
      ...collectMenuTexts(dinner),
      ...collectMenuTexts(breakfast),
    ];
    const unique = [...new Set(all)].filter((t) => /[a-zA-ZğüşıöçĞÜŞİÖÇ]/.test(t));

    if (unique.length === 0) return;

    const map = new Map<string, string>();
    let done = 0;

    unique.forEach((text) => {
      translateToEnglish(text).then((translated) => {
        map.set(text, translated);
        done++;
        if (done === unique.length) {
          setResult({
            lunch: applyTranslations(lunch, map),
            dinner: applyTranslations(dinner, map),
            breakfast: applyTranslations(breakfast, map),
          });
        }
      });
    });
  }, [lunch, dinner, breakfast]);

  return result;
}
