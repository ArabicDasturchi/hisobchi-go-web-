'use client';
import { Loader2 } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useShop } from '../ShopDataProvider';
import { cn } from '../ui/primitives';

function subscribeOnline(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

/** "2 daqiqa oldin" — har 30 soniyada yangilanadi */
export function useRelativeTime(date: Date | null): string {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (!date) return '—';
  const sec = Math.max(0, Math.round((now - date.getTime()) / 1000));
  if (sec < 45) return 'hozirgina';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} daqiqa oldin`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} soat oldin`;
  return `${Math.round(h / 24)} kun oldin`;
}

export type SyncState = 'synced' | 'syncing' | 'problem' | 'offline';

export const SYNC_LABELS: Record<SyncState, string> = {
  synced: 'Sinxronlangan',
  syncing: 'Sinxronlanmoqda…',
  problem: 'Ulanishda muammo',
  offline: "Internet yo'q",
};

/**
 * Haqiqiy holat: web ilova har bir amalni darhol serverga yozadi, lokal navbat yo'q.
 * Shuning uchun holat = internet + oxirgi yuklash natijasi (ShopDataProvider).
 */
export function syncStateOf(input: { online: boolean; loading: boolean; error: string | null }): SyncState {
  if (!input.online) return 'offline';
  if (input.loading) return 'syncing';
  if (input.error) return 'problem';
  return 'synced';
}

export function useSyncStatus() {
  const { loading, error, lastLoadedAt, reload } = useShop();
  const online = useOnline();
  const state = syncStateOf({ online, loading, error });
  return { state, label: SYNC_LABELS[state], online, error, lastLoadedAt, reload, loading };
}

export function SyncDot({ state, className }: { state: SyncState; className?: string }) {
  if (state === 'syncing') return <Loader2 className={cn('h-3.5 w-3.5 animate-spin text-amber-500', className)} aria-hidden />;
  return (
    <span
      className={cn('inline-block h-2 w-2 shrink-0 rounded-full', state === 'synced' ? 'bg-emerald-500' : 'bg-rose-500', className)}
      aria-hidden
    />
  );
}

/** Header'dagi ixcham holat; bosilsa — ma'lumotlar qayta yuklanadi */
export function SyncIndicator({ compact }: { compact?: boolean }) {
  const { state, label, lastLoadedAt, reload, loading } = useSyncStatus();
  const rel = useRelativeTime(lastLoadedAt);
  const title = state === 'synced' ? `${label} · ${rel}. Yangilash uchun bosing` : `${label}. Qayta urinish uchun bosing`;
  return (
    <button
      type="button"
      onClick={() => void reload()}
      disabled={loading}
      title={title}
      aria-label={title}
      className={cn(
        'inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs font-medium transition-colors disabled:cursor-default',
        state === 'synced' && 'text-muted hover:bg-subtle hover:text-fg',
        state === 'syncing' && 'text-muted',
        (state === 'problem' || state === 'offline') && 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300',
      )}
    >
      <SyncDot state={state} />
      {!compact && <span className="whitespace-nowrap">{label}</span>}
    </button>
  );
}
