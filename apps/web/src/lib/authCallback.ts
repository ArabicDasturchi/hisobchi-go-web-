/**
 * Auth callback xatolarini tasniflash (sof funksiya, testlanadi).
 *
 * Eng ko'p uchraydigan holat: havola boshqa brauzer/qurilmada ochilgan. PKCE'da code_verifier faqat
 * ro'yxatdan o'tilgan brauzerda saqlanadi, shuning uchun sessiya yaratilmaydi. Lekin Supabase emailni
 * havolaga bosilgandayoq tasdiqlaydi — foydalanuvchi oddiy kirish orqali davom eta oladi.
 */
export type CallbackFailure = 'expired' | 'confirm_other_browser' | 'recovery_other_browser' | 'link' | 'oauth_cancelled' | 'oauth_failed';

export const CALLBACK_MESSAGES: Record<CallbackFailure, string> = {
  expired: "Havola eskirgan yoki allaqachon ishlatilgan. Kiring yoki yangi tasdiqlash xatini so'rang.",
  confirm_other_browser:
    "Email tasdiqlandi. Havola ro'yxatdan o'tilgan brauzerdan boshqa joyda ochilgani uchun avtomatik kirib bo'lmadi — email va parolingiz bilan kiring.",
  recovery_other_browser: "Parol tiklash havolasi boshqa brauzerda ochildi. Shu brauzerda qaytadan «Parolni unutdingizmi?» orqali so'rang.",
  link: "Havola noto'g'ri yoki to'liq emas. Qaytadan kiring yoki yangi havola so'rang.",
  oauth_cancelled: "Google orqali kirish bekor qilindi. Qayta urinib ko'ring yoki email bilan kiring.",
  oauth_failed: "Google orqali kirib bo'lmadi. Qayta urinib ko'ring yoki email va parol bilan kiring.",
};

export function callbackFailure(input: { errorCode?: string; exchangeMessage?: string; next: string; via?: string | null }): CallbackFailure {
  const code = (input.errorCode ?? '').toLowerCase();
  const msg = (input.exchangeMessage ?? '').toLowerCase();
  // Google OAuth: foydalanuvchi rozilik oynasida "Bekor qilish"ni bosgan (access_denied) yoki boshqa xato
  if (input.via === 'google') return code === 'access_denied' ? 'oauth_cancelled' : 'oauth_failed';
  if (/otp_expired|expired|access_denied/.test(code) || /expired|already been used|invalid or has expired/.test(msg)) return 'expired';
  if (/code verifier|code_verifier|flow state|pkce|both auth code and code verifier/.test(msg)) {
    return input.next === '/reset-password' ? 'recovery_other_browser' : 'confirm_other_browser';
  }
  return 'link';
}

export function isCallbackFailure(v: string | null): v is CallbackFailure {
  return v !== null && Object.hasOwn(CALLBACK_MESSAGES, v);
}

/**
 * Sessiya yaratilgandan keyin qayerga yo'naltirish:
 *   parol tiklash → /reset-password; do'koni yo'q → /onboarding; do'koni bor → so'ralgan sahifa
 *   (onboarding so'ralgan bo'lsa — /dashboard, chunki do'kon allaqachon bor).
 * `next` oldindan safeNextPath bilan tozalangan bo'lishi kerak.
 */
export function postAuthDestination(input: { next: string; isRecovery: boolean; hasShop: boolean | null }): string {
  if (input.isRecovery || input.next === '/reset-password') return '/reset-password';
  // A'zolikni aniqlab bo'lmadi — /onboarding sahifasining o'zi do'kon bor-yo'qligini tekshiradi
  if (input.hasShop === null) return input.next;
  if (!input.hasShop) return '/onboarding';
  return input.next === '/onboarding' ? '/dashboard' : input.next;
}
