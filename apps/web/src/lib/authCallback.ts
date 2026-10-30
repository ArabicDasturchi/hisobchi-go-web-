/**
 * Auth callback xatolarini tasniflash (sof funksiya, testlanadi).
 *
 * Eng ko'p uchraydigan holat: havola boshqa brauzer/qurilmada ochilgan. PKCE'da code_verifier faqat
 * ro'yxatdan o'tilgan brauzerda saqlanadi, shuning uchun sessiya yaratilmaydi. Lekin Supabase emailni
 * havolaga bosilgandayoq tasdiqlaydi — foydalanuvchi oddiy kirish orqali davom eta oladi.
 */
export type CallbackFailure = 'expired' | 'confirm_other_browser' | 'recovery_other_browser' | 'link';

export const CALLBACK_MESSAGES: Record<CallbackFailure, string> = {
  expired: "Havola eskirgan yoki allaqachon ishlatilgan. Kiring yoki yangi tasdiqlash xatini so'rang.",
  confirm_other_browser:
    "Email tasdiqlangan bo'lishi mumkin, lekin havola boshqa brauzerda ochildi. Email va parolingiz bilan kiring.",
  recovery_other_browser: "Parol tiklash havolasi boshqa brauzerda ochildi. Shu brauzerda qaytadan «Parolni unutdingizmi?» orqali so'rang.",
  link: "Havola noto'g'ri yoki to'liq emas. Qaytadan kiring yoki yangi havola so'rang.",
};

export function callbackFailure(input: { errorCode?: string; exchangeMessage?: string; next: string }): CallbackFailure {
  const code = (input.errorCode ?? '').toLowerCase();
  const msg = (input.exchangeMessage ?? '').toLowerCase();
  if (/otp_expired|expired|access_denied/.test(code) || /expired|already been used|invalid or has expired/.test(msg)) return 'expired';
  if (/code verifier|code_verifier|flow state|pkce|both auth code and code verifier/.test(msg)) {
    return input.next === '/reset-password' ? 'recovery_other_browser' : 'confirm_other_browser';
  }
  return 'link';
}

export function isCallbackFailure(v: string | null): v is CallbackFailure {
  return v !== null && Object.hasOwn(CALLBACK_MESSAGES, v);
}
