/**
 * Ko'rsatish uchun formatlash. Pul qiymatlari faqat BigInt — float ishlatilmaydi.
 */

const NBSP = ' ';

/** 385000n → "385 000" */
export function groupDigits(value: bigint): string {
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return negative ? `-${grouped}` : grouped;
}

/** 385000n → "385 000 so'm" */
export function formatSom(value: bigint): string {
  return `${groupDigits(value)}${NBSP}so'm`;
}

/** qty_milli → "1,5" (o'zbekcha o'nlik vergul) */
export function formatQty(qtyMilli: bigint): string {
  const whole = qtyMilli / 1000n;
  const frac = qtyMilli % 1000n;
  if (frac === 0n) return whole.toString();
  return `${whole},${frac.toString().padStart(3, '0').replace(/0+$/, '')}`;
}

export const UNIT_LABELS: Record<string, string> = {
  dona: 'dona',
  kg: 'kg',
  g: 'g',
  litr: 'litr',
  metr: 'metr',
  pachka: 'pachka',
  qop: 'qop',
  karobka: 'karobka',
  tonna: 'tonna',
};

/** ISO → "29.10.2026, 14:05" (qurilma vaqt zonasida) */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => n.toString().padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Bugungi kunning boshlanishi (qurilma vaqt zonasida) ISO formatda */
export function startOfTodayIso(now = new Date()): string {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
}
