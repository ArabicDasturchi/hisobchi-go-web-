import { z } from 'zod';

export const emailSchema = z.string().trim().min(1, 'Emailni kiriting').email("Email manzili noto'g'ri");

export const newPasswordSchema = z
  .string()
  .min(8, "Parol kamida 8 belgidan iborat bo'lsin")
  .max(72, 'Parol juda uzun')
  .regex(/[A-Za-z]/, "Parolda kamida bitta harf bo'lsin")
  .regex(/\d/, "Parolda kamida bitta raqam bo'lsin");

export const customerSchema = z.object({
  name: z.string().trim().min(1, 'Mijoz ismini kiriting').max(120, 'Ism juda uzun'),
  phone: z
    .string()
    .trim()
    .max(32, 'Telefon raqami juda uzun')
    .refine((v) => v === '' || /^\+?[\d\s()-]{5,}$/.test(v), "Telefon raqami noto'g'ri"),
  notes: z.string().trim().max(500, 'Izoh juda uzun'),
});

export const productNameSchema = z.string().trim().min(1, 'Mahsulot nomini kiriting').max(120, 'Nom juda uzun');

export const reasonSchema = z.string().trim().min(3, 'Sababni kiriting (kamida 3 belgi)').max(300, 'Sabab juda uzun');

export const profileNameSchema = z.string().trim().min(2, 'Ismni kiriting (kamida 2 belgi)').max(80, 'Ism juda uzun');

export const shopNameSchema = z.string().trim().min(2, "Do'kon nomini kiriting (kamida 2 belgi)").max(80, 'Nom juda uzun');

/** Birinchi xato xabari (formalar uchun) */
export function firstError(r: { success: boolean; error?: z.ZodError }): string | null {
  return r.success ? null : (r.error?.issues[0]?.message ?? "Qiymat noto'g'ri");
}

/**
 * Faqat ilova ichidagi nisbiy yo'lga ruxsat (open redirect'dan himoya).
 * Brauzer URL'dagi tab/qator belgilarini olib tashlaydi va "\\" ni "/" deb o'qiydi — shuning uchun
 * bo'sh joy, boshqaruv belgilari va teskari chiziq umuman qabul qilinmaydi; "//" (protokolsiz host) ham yo'q.
 */
export function safeNextPath(next: string | null | undefined, fallback = '/dashboard'): string {
  if (!next) return fallback;
  if (!/^\/[A-Za-z0-9\-._~!$&'()*+,;=:@%/?#]*$/.test(next)) return fallback;
  if (next.startsWith('//')) return fallback;
  if (/%2f|%5c/i.test(next.slice(0, 4))) return fallback;
  return next;
}
