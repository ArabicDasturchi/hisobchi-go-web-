/**
 * Supabase Auth xatolarini (ro'yxatdan o'tish va tasdiqlash xatini qayta yuborish) aniq tasniflash.
 *
 * Asos — supabase-js qaytaradigan `code` va `status` (matn emas). Har bir holat uchun o'zbekcha xabar,
 * hamda tashxis uchun xato kodi (foydalanuvchiga kichik matn sifatida ko'rsatiladi; maxfiy ma'lumot emas).
 * Rate-limit javoblarida hech qachon avtomatik qayta urinilmaydi — `retryable` faqat tarmoq uzilishi uchun.
 */
export type SignupErrorKind =
  | 'already_registered'
  | 'invalid_email'
  | 'weak_password'
  | 'email_quota'
  | 'email_cooldown'
  | 'too_many_requests'
  | 'email_not_authorized'
  | 'email_send_failed'
  | 'signup_disabled'
  | 'network'
  | 'server';

export interface SignupErrorInfo {
  kind: SignupErrorKind;
  message: string;
  /** Supabase xato kodi yoki HTTP holati — tashxis uchun */
  code: string | null;
  /** Tarmoq uzilishi — foydalanuvchi o'zi qayta bosishi mumkin (avtomatik emas) */
  retryable: boolean;
}

interface AuthErrorLike {
  name?: string;
  message?: string;
  code?: string;
  status?: number;
  reasons?: string[];
}

const WEAK_REASONS: Record<string, string> = {
  length: 'kamida 8 belgi',
  characters: 'harf va raqam',
  pwned: "ochiq bazalarda uchramagan (bu parol ma'lum oqib chiqqan ro'yxatlarda bor)",
};

export function classifySignupError(err: unknown): SignupErrorInfo {
  const e: AuthErrorLike = err && typeof err === 'object' ? (err as AuthErrorLike) : { message: String(err) };
  const code = (e.code ?? '').toLowerCase();
  const msg = (e.message ?? '').toLowerCase();
  const status = typeof e.status === 'number' ? e.status : undefined;
  const shownCode = e.code || (status ? `HTTP ${status}` : null);
  const info = (kind: SignupErrorKind, message: string, retryable = false): SignupErrorInfo => ({ kind, message, code: shownCode, retryable });

  // Tarmoq: so'rov serverga yetmadi (supabase-js: AuthRetryableFetchError, status 0)
  if (e.name === 'AuthRetryableFetchError' || status === 0 || /failed to fetch|networkerror|network request failed|load failed|fetch failed/.test(msg)) {
    return info('network', "Internet aloqasi yo'q yoki server javob bermadi. Ulanishni tekshirib, qayta bosing.", true);
  }

  if (code === 'email_exists' || code === 'user_already_exists' || /already registered|already been registered/.test(msg)) {
    return info('already_registered', "Bu email bilan hisob allaqachon mavjud. Kirish sahifasidan foydalaning yoki parolni tiklang.");
  }
  if (code === 'email_address_invalid' || /unable to validate email|invalid email|email address .* is invalid|invalid format/.test(msg)) {
    return info('invalid_email', "Email manzili noto'g'ri yoki qabul qilinmaydi. Boshqa manzil kiriting.");
  }
  if (code === 'weak_password' || e.name === 'AuthWeakPasswordError' || /password should|weak password/.test(msg)) {
    const reasons = (e.reasons ?? []).map((r) => WEAK_REASONS[r]).filter(Boolean);
    return info('weak_password', reasons.length ? `Parol juda oddiy: ${reasons.join(', ')} bo'lishi kerak.` : 'Parol juda oddiy. Kamida 8 belgi, harf va raqam ishlating.');
  }

  // Bitta manzil uchun qisqa kutish: "For security purposes, you can only request this after N seconds."
  const wait = /after (\d+) seconds?/.exec(msg);
  if (wait) {
    return info('email_cooldown', `Xavfsizlik uchun bu manzilga xat ${wait[1]} soniyadan keyin qayta yuboriladi. Biroz kuting.`);
  }
  if (code === 'over_email_send_rate_limit' || /email rate limit/.test(msg)) {
    return info(
      'email_quota',
      "Tasdiqlash xatlarini yuborish limiti vaqtincha tugagan. Ro'yxatdan o'tish keyinroq ishlaydi — taxminan bir soatdan so'ng qayta urinib ko'ring.",
    );
  }
  if (code === 'over_request_rate_limit' || status === 429 || /too many requests|rate limit/.test(msg)) {
    return info('too_many_requests', "Juda ko'p so'rov yuborildi. Bir necha daqiqa kutib, keyin qayta urinib ko'ring.");
  }
  if (code === 'email_address_not_authorized' || /not authorized/.test(msg)) {
    return info('email_not_authorized', "Bu manzilga tasdiqlash xati yuborib bo'lmadi: pochta xizmati hali barcha manzillar uchun sozlanmagan. Administratorga xabar bering.");
  }
  if (code === 'signup_disabled' || /signups? not allowed|signup.*disabled/.test(msg)) {
    return info('signup_disabled', "Ro'yxatdan o'tish vaqtincha o'chirilgan.");
  }
  if (/error sending (confirmation|recovery|magic link)? ?email|sending email/.test(msg)) {
    return info('email_send_failed', "Tasdiqlash xatini yuborishda xato yuz berdi. Keyinroq qayta urinib ko'ring yoki administratorga xabar bering.");
  }
  if (code === 'request_timeout') {
    return info('network', "Server javob bermadi. Qayta urinib ko'ring.", true);
  }
  return info('server', "Serverda kutilmagan xato yuz berdi. Keyinroq qayta urinib ko'ring.");
}
