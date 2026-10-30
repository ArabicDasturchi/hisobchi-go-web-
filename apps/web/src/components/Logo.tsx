import { useId } from 'react';
import { cn } from './ui/primitives';

export function LogoMark({ className }: { className?: string }) {
  // Har bir nusxa o'z gradient id'siga ega: yashirin (display:none) nusxaga bog'lanib qolmasligi uchun
  const gid = `hg-logo-${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 64 64" className={cn('h-8 w-8 shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#10b981" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${gid})`} />
      <path d="M18 42V22m0 10h14m0-10v20" stroke="#fff" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M40 36l5 5 9-12" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function Logo({ inverted, compact }: { inverted?: boolean; compact?: boolean }) {
  return (
    <span className="relative inline-flex items-center gap-2.5">
      <LogoMark />
      {!compact && (
        <span className={cn('text-base font-semibold tracking-tight', inverted ? 'text-white' : 'text-fg')}>
          Hisobchi<span className={inverted ? 'text-emerald-200' : 'text-emerald-600 dark:text-emerald-400'}> Go</span>
        </span>
      )}
    </span>
  );
}
