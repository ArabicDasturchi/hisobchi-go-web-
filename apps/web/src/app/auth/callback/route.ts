import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { callbackFailure, postAuthDestination, type CallbackFailure } from '@/lib/authCallback';
import { getServerSupabase } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/validation';

const OTP_TYPES: readonly EmailOtpType[] = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'];

/**
 * Email tasdiqlash / parol tiklash havolasi qaytadigan manzil.
 *   ?code=...                 — PKCE (code_verifier cookie'da, faqat havola so'ralgan brauzerda bor)
 *   ?token_hash=...&type=...  — token_hash shablonlari uchun (istalgan brauzerda ishlaydi)
 *   ?error=...&error_code=... — Supabase xatosi (eskirgan havola va h.k.)
 * Muvaffaqiyatda sessiya cookie'lari shu javobda o'rnatiladi va foydalanuvchi qayta kirmasdan
 * do'koni bor-yo'qligiga qarab /dashboard yoki /onboarding ga o'tadi.
 * Yo'naltirish faqat shu origin ichida va faqat ruxsat etilgan ichki yo'lga (open redirect yo'q).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNextPath(url.searchParams.get('next'));
  const fail = (reason: CallbackFailure) => NextResponse.redirect(new URL(`/login?error=${reason}`, url.origin));

  const providerError = url.searchParams.get('error_code') ?? url.searchParams.get('error');
  if (providerError) return fail(callbackFailure({ errorCode: providerError, next }));

  const supabase = await getServerSupabase();
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const rawType = url.searchParams.get('type');
  const type = OTP_TYPES.find((t) => t === rawType) ?? null;

  let userId: string | null = null;
  let isRecovery = type === 'recovery';
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail(callbackFailure({ exchangeMessage: error.message, next }));
    userId = data.user?.id ?? null;
    // auth-js parol tiklash oqimini verifier yonida belgilaydi
    if ((data as { redirectType?: string | null }).redirectType === 'recovery') isRecovery = true;
  } else if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return fail(callbackFailure({ exchangeMessage: error.message, next }));
    userId = data.user?.id ?? null;
  } else {
    return fail('link');
  }

  // Yangi sessiya bilan o'z a'zoligini o'qish (RLS: foydalanuvchi faqat o'z do'koni a'zoligini ko'radi)
  let hasShop: boolean | null = null;
  if (userId && !isRecovery) {
    const { data, error } = await supabase.from('shop_members').select('shop_id').eq('user_id', userId).limit(1);
    if (!error) hasShop = (data?.length ?? 0) > 0;
  }
  return NextResponse.redirect(new URL(postAuthDestination({ next, isRecovery, hasShop }), url.origin));
}
