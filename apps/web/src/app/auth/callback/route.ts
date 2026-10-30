import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { callbackFailure, type CallbackFailure } from '@/lib/authCallback';
import { getServerSupabase } from '@/lib/supabase/server';
import { safeNextPath } from '@/lib/validation';

const OTP_TYPES: readonly EmailOtpType[] = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'];

/**
 * Email tasdiqlash / parol tiklash havolasi qaytadigan manzil.
 *   ?code=...                 — PKCE (code_verifier cookie'da, faqat havola so'ralgan brauzerda bor)
 *   ?token_hash=...&type=...  — maxsus email shablonlari uchun (boshqa brauzerda ham ishlaydi)
 *   ?error=...&error_code=... — Supabase xatosi (eskirgan havola va h.k.)
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

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return fail(callbackFailure({ exchangeMessage: error.message, next }));
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (error) return fail(callbackFailure({ exchangeMessage: error.message, next }));
  } else {
    return fail('link');
  }
  const dest = type === 'recovery' ? '/reset-password' : next;
  return NextResponse.redirect(new URL(dest, url.origin));
}
