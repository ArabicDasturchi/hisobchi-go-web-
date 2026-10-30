// Next.js faqat to'g'ridan-to'g'ri yozilgan process.env.NEXT_PUBLIC_* ni brauzer bundle'iga joylaydi
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
export const SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

export const supabaseConfigured = SUPABASE_URL.startsWith('https://') && SUPABASE_ANON_KEY.length > 20;

/** "https://app.uz/" → "https://app.uz". Faqat http(s) origin qabul qilinadi, boshqasi — bo'sh */
export function normalizeSiteUrl(raw: string | undefined): string {
  const v = (raw ?? '').trim();
  if (!v) return '';
  try {
    const u = new URL(v);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
    return u.origin;
  } catch {
    return '';
  }
}

/**
 * Email havolalari (tasdiqlash, parol tiklash) qaytadigan bazaviy manzil.
 * NEXT_PUBLIC_SITE_URL berilgan bo'lsa — o'sha (production domeni), aks holda joriy origin
 * (lokal va Vercel preview deploylari). Manzil Supabase Redirect URLs ro'yxatida bo'lishi shart.
 */
export function authBaseUrl(site: string = SITE_URL, currentOrigin?: string): string {
  if (site) return site;
  if (currentOrigin) return currentOrigin;
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:3000';
}

/** /auth/callback?next=... — next faqat ichki yo'l bo'lishi kerak (chaqiruvchi safeNextPath bilan beradi) */
export function authCallbackUrl(next: string, base: string = authBaseUrl()): string {
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`;
}
