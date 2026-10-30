'use client';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { oauthCallbackUrl } from '@/lib/env';
import { classifySignupError } from '@/lib/authErrors';
import { getSupabase } from '@/lib/supabase/client';
import { cn } from '../ui/primitives';

/** Google'ning rasmiy rangli "G" belgisi (brending talabi bo'yicha o'zgartirilmaydi) */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/**
 * "Google orqali davom etish": Supabase signInWithOAuth (PKCE) → Google → Supabase → /auth/callback.
 * Callback sessiyani yaratadi va do'koni bor-yo'qligiga qarab /dashboard yoki /onboarding ga yo'naltiradi.
 * Yangi foydalanuvchi uchun bu ro'yxatdan o'tish ham hisoblanadi (Google emailni allaqachon tasdiqlagan).
 */
export function GoogleButton({ next = '/dashboard', onError, disabled }: { next?: string; onError: (message: string) => void; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);

  // Google sahifasidan brauzerning "Orqaga" tugmasi bilan qaytilsa (bfcache), tugma yuklanish holatida qolmasin
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        lock.current = false;
        setBusy(false);
      }
    };
    window.addEventListener('pageshow', onShow);
    return () => window.removeEventListener('pageshow', onShow);
  }, []);

  async function start() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const { error } = await getSupabase().auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: oauthCallbackUrl(next), queryParams: { prompt: 'select_account' } },
      });
      if (error) throw error;
      // Muvaffaqiyatda brauzer Google sahifasiga o'tadi — holat shu yerda qoladi
    } catch (err) {
      const info = classifySignupError(err);
      onError(info.kind === 'network' ? info.message : "Google orqali kirishni boshlab bo'lmadi. Qayta urinib ko'ring.");
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cn(
        'inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-line bg-surface px-5 text-sm font-semibold text-fg shadow-sm transition-colors',
        'hover:bg-subtle disabled:pointer-events-none disabled:opacity-60',
      )}
    >
      {busy ? <Loader2 className="h-5 w-5 animate-spin text-muted" aria-hidden /> : <GoogleMark className="h-5 w-5" />}
      {busy ? "Google'ga yo'naltirilmoqda…" : 'Google orqali davom etish'}
    </button>
  );
}

/** "yoki" ajratgichi — Google tugmasi va email formasi orasida */
export function AuthDivider() {
  return (
    <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-muted" role="separator">
      <span className="h-px flex-1 bg-line" />
      yoki
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
