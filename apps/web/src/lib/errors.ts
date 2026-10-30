/**
 * Markazlashtirilgan xato boshqaruvi: Supabase/PostgREST/Auth xatolari → o'zbekcha tushunarli xabar.
 * Xom xato foydalanuvchiga ko'rsatilmaydi va loglanmaydi — unda shaxsiy ma'lumot bo'lishi mumkin.
 */
export type AppErrorKind = 'network' | 'auth' | 'forbidden' | 'conflict' | 'validation' | 'not_found' | 'unknown';

export class AppError extends Error {
  constructor(
    public readonly kind: AppErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

interface ErrorShape {
  message?: string;
  code?: string;
  details?: string | null;
}

function debtSuffix(raw: string): string {
  const m = /debt=(-?\d+)/.exec(raw);
  if (!m?.[1]) return '';
  const digits = m[1].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return ` Joriy qarz: ${digits} so'm.`;
}

const RULES: readonly [RegExp, AppErrorKind, string][] = [
  // --- Auth ---
  [/invalid login credentials/, 'auth', "Email yoki parol noto'g'ri."],
  [/email not confirmed/, 'auth', 'Email hali tasdiqlanmagan. Pochtangizdagi havolani oching.'],
  [/user already registered|already been registered/, 'conflict', 'Bu email bilan hisob allaqachon mavjud. Kirish sahifasidan foydalaning.'],
  [/password should be at least|weak password|password is too weak|weak_password/, 'validation', 'Parol juda oddiy. Kamida 8 belgi, harf va raqam ishlating.'],
  [/same password|should be different from the old/, 'validation', 'Yangi parol eskisidan farq qilishi kerak.'],
  [/rate limit|too many requests|over_email_send_rate_limit|\b429\b/, 'network', "Juda ko'p urinish. Bir necha daqiqadan keyin qayta urinib ko'ring."],
  [/unable to validate email|invalid email|email address .* is invalid/, 'validation', "Email manzili noto'g'ri."],
  [/otp_expired|link is invalid or has expired|token has expired|flow state|code verifier/, 'auth', "Havola eskirgan, allaqachon ishlatilgan yoki boshqa brauzerda ochilgan. Yangi havola so'rang."],
  [/signups? not allowed|signup.*disabled/, 'forbidden', "Ro'yxatdan o'tish vaqtincha o'chirilgan."],
  // --- Tarmoq ---
  [/failed to fetch|network ?error|fetch failed|load failed|timeout|econn|offline/, 'network', "Internet aloqasi yo'q yoki server javob bermadi. Qayta urinib ko'ring."],
  // --- RPC biznes xatolari (003 migratsiyasidagi nomlar) ---
  [/not_authenticated|jwt|28000|refresh token|auth session missing/, 'auth', 'Sessiya tugagan. Qaytadan kiring.'],
  [/calc_mismatch/, 'validation', 'Server hisobi summa bilan mos kelmadi — savdo saqlanmadi.'],
  [/already_reversed/, 'conflict', 'Bu savdo allaqachon bekor qilingan.'],
  [/customer_not_in_shop/, 'forbidden', "Mijoz bu do'konga tegishli emas."],
  [/document_not_found/, 'not_found', 'Savdo topilmadi.'],
  [/payment_not_found/, 'not_found', "To'lov topilmadi."],
  [/reason_required/, 'validation', 'Sababni kiriting (kamida 3 belgi).'],
  [/invalid_shop_name/, 'validation', "Do'kon nomini kiriting."],
  [/empty_document/, 'validation', "Savdoda kamida bitta mahsulot bo'lishi kerak."],
  [/invalid_qty/, 'validation', "Miqdor noto'g'ri."],
  [/invalid_price/, 'validation', "Narx noto'g'ri yoki chegaradan katta."],
  [/invalid_unit/, 'validation', "O'lchov birligi noto'g'ri."],
  [/invalid_product_name/, 'validation', 'Mahsulot nomini kiriting.'],
  [/invalid_amount/, 'validation', "Summa noto'g'ri."],
  [/id_conflict/, 'conflict', "Yozuv identifikatori band. Sahifani yangilab qayta urinib ko'ring."],
  [/products_shop_id_name_key/, 'conflict', 'Bu nomdagi mahsulot allaqachon mavjud.'],
  [/foreign key|23503/, 'conflict', "Bu yozuvga bog'liq tarix bor — o'chirib bo'lmaydi."],
  [/23505|duplicate key/, 'conflict', 'Bunday yozuv allaqachon mavjud.'],
  [/forbidden|42501|permission denied|row-level security/, 'forbidden', "Bu amal uchun ruxsat yo'q."],
  [/pgrst116|0 rows/, 'not_found', "Ma'lumot topilmadi."],
  [/23514|check constraint|22023|22p02/, 'validation', "Server ma'lumotni rad etdi (noto'g'ri qiymat)."],
];

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  const shape: ErrorShape = err && typeof err === 'object' ? (err as ErrorShape) : { message: String(err) };
  const raw = `${shape.code ?? ''} ${shape.message ?? ''} ${shape.details ?? ''}`.trim();
  const m = raw.toLowerCase();
  if (/payment_exceeds_debt/.test(m)) {
    return new AppError('validation', `To'lov mijoz qarzidan katta bo'lishi mumkin emas.${debtSuffix(raw)}`);
  }
  for (const [re, kind, message] of RULES) {
    if (re.test(m)) return new AppError(kind, message);
  }
  return new AppError('unknown', "Kutilmagan xato yuz berdi. Qayta urinib ko'ring.");
}

/** Supabase { data, error } javobidan ma'lumotni oladi yoki AppError tashlaydi */
export function unwrap<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw toAppError(res.error);
  if (res.data === null) throw new AppError('not_found', "Ma'lumot topilmadi.");
  return res.data;
}

export function errorMessage(err: unknown): string {
  return toAppError(err).message;
}
