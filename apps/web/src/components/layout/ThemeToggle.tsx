'use client';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../ThemeProvider';

export function ThemeToggle() {
  const { resolved, setChoice } = useTheme();
  const dark = resolved === 'dark';
  return (
    <button
      type="button"
      onClick={() => setChoice(dark ? 'light' : 'dark')}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted transition-colors hover:bg-subtle hover:text-fg"
      aria-label={dark ? "Yorug' rejimga o'tish" : "Qorong'i rejimga o'tish"}
      title={dark ? "Yorug' rejim" : "Qorong'i rejim"}
    >
      {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  );
}
