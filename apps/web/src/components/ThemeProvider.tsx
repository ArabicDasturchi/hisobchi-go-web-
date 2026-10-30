'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeChoice = 'light' | 'dark' | 'system';
const KEY = 'hg-theme';

/** <head> ichida, render'dan oldin ishlaydi — sahifa yuklanishida "miltillash" bo'lmasligi uchun */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${KEY}');var d=t==='dark'||((t===null||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

interface ThemeCtx {
  choice: ThemeChoice;
  resolved: 'light' | 'dark';
  setChoice: (c: ThemeChoice) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

function readChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<ThemeChoice>('system');
  const [systemDark, setSystemDark] = useState(false);
  // Saqlangan tanlov o'qilmaguncha <html> klassiga tegilmaydi: aks holda boshlang'ich "light" holati
  // themeInitScript qo'ygan "dark" ni bir lahzaga olib tashlab, har yuklanishda miltillash beradi
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Saqlangan tanlov faqat brauzerda o'qiladi (SSR bilan mos kelishi uchun effektda)
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(mq.matches);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage faqat mount'dan keyin mavjud
    setChoiceState(readChoice());
    onChange();
    setReady(true);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const resolved: 'light' | 'dark' = choice === 'system' ? (systemDark ? 'dark' : 'light') : choice;

  useEffect(() => {
    if (!ready) return;
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }, [resolved, ready]);

  const setChoice = useCallback((c: ThemeChoice) => {
    setChoiceState(c);
    try {
      localStorage.setItem(KEY, c);
    } catch {
      // Maxfiy rejimda saqlanmasligi mumkin — tanlov joriy sessiyada ishlaydi
    }
  }, []);

  return <Ctx.Provider value={{ choice, resolved, setChoice }}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme ThemeProvider ichida ishlatilishi kerak');
  return ctx;
}
