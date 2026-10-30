'use client';
import { CloudOff, Loader2, RefreshCw } from 'lucide-react';
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
  return `${h} soat oldin`;
}

/**
 * Bulut holati: web ilova to'g'ridan-to'g'ri Supabase bilan ishlaydi (lokal navbat yo'q),
 * shuning uchun holat = internet + oxirgi muvaffaqiyatli yuklash vaqti + oxirgi xato.
 */
export function SyncIndicator({ compact }: { compact?: boolean }) {
  const { loading, error, lastLoadedAt, reload } = useShop();
  const online = useOnline();
  const rel = useRelativeTime(lastLoadedAt);

  const state = !online ? 'offline' : loading ? 'loading' : error ? 'error' : 'ok';
  const label =
    state === 'offline' ? "Internet yo'q" : state === 'loading' ? 'Yangilanmoqda…' : state === 'error' ? 'Ulanish xatosi' : `Bulut bilan mos · ${rel}`;

  return (
    <button
      type="button"
      onClick={() => void reload()}
      disabled={loading}
      title="Ma'lumotlarni serverdan qayta yuklash"
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        state === 'ok' && 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300',
        state === 'loading' && 'border-line bg-surface text-muted',
        (state === 'error' || state === 'offline') && 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-300',
      )}
    >
      {state === 'loading' ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : state === 'ok' ? (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      ) : state === 'offline' ? (
        <CloudOff className="h-3.5 w-3.5" />
      ) : (
        <RefreshCw className="h-3.5 w-3.5" />
      )}
      {!compact && <span className="whitespace-nowrap">{label}</span>}
      {compact && <span className="sr-only">{label}</span>}
    </button>
  );
}
