/**
 * Pul va miqdor — faqat BigInt (butun so'm, qty_milli: 1000 = 1 birlik). Float ishlatilmaydi.
 * Qator formulasi @hisobchi/core'dan olinadi — mobil ilova va PostgreSQL bilan bir xil.
 */
import { calculateLineTotal, MAX_QTY_MILLI, MAX_UNIT_PRICE, parseQtyMilli } from '@hisobchi/core';

const NBSP = ' ';

/** Server javobidagi bigint (string sifatida so'ralgan) → BigInt. null/bo'sh → 0n */
export function toBig(value: string | number | bigint | null | undefined): bigint {
  if (value === null || value === undefined || value === '') return 0n;
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error(`Xavfsiz bo'lmagan butun son: ${value}`);
    return BigInt(value);
  }
  if (!/^-?\d+$/.test(value.trim())) throw new Error(`Butun son emas: ${value}`);
  return BigInt(value.trim());
}

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

/** Grafik o'qlari uchun qisqa ko'rinish: 1 250 000 → "1,3 mln" (faqat ko'rsatish, hisob emas) */
export function formatCompactSom(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace('.', ',')} mlrd`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace('.', ',')} mln`;
  if (abs >= 1_000) return `${Math.round(value / 1_000)} ming`;
  return String(value);
}

/** qty_milli → "1,5" (o'zbekcha o'nlik vergul) */
export function formatQty(qtyMilli: bigint): string {
  const whole = qtyMilli / 1000n;
  const frac = qtyMilli % 1000n;
  if (frac === 0n) return whole.toString();
  return `${whole},${frac.toString().padStart(3, '0').replace(/0+$/, '')}`;
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; message: string };

/** Narx/summa maydoni: "13000", "13 000" → 13000n. Faqat butun so'm */
export function parseMoneyInput(raw: string, opts: { allowZero?: boolean; max?: bigint } = {}): ParseResult<bigint> {
  const s = raw.replace(/[\s ]/g, '');
  if (s === '') return { ok: false, message: 'Summani kiriting' };
  if (!/^\d+$/.test(s)) return { ok: false, message: "Faqat butun son (so'm) kiriting" };
  if (s.length > 15) return { ok: false, message: 'Summa juda katta' };
  const v = BigInt(s);
  if (v === 0n && !opts.allowZero) return { ok: false, message: "Summa 0 dan katta bo'lishi kerak" };
  const max = opts.max ?? MAX_UNIT_PRICE;
  if (v > max) return { ok: false, message: `Eng ko'pi ${formatSom(max)}` };
  return { ok: true, value: v };
}

/** Miqdor maydoni: "3", "1,5", "0.25" → qty_milli. Server chegarasi bilan bir xil */
export function parseQtyInput(raw: string): ParseResult<bigint> {
  const s = raw.trim();
  if (s === '') return { ok: false, message: 'Miqdorni kiriting' };
  const r = parseQtyMilli(s);
  if (!r.ok) return { ok: false, message: "Miqdor noto'g'ri (masalan: 3 yoki 1,5)" };
  if (r.qtyMilli <= 0n) return { ok: false, message: "Miqdor 0 dan katta bo'lishi kerak" };
  if (r.qtyMilli > MAX_QTY_MILLI) return { ok: false, message: 'Miqdor juda katta' };
  return { ok: true, value: r.qtyMilli };
}

export interface MoneyLine {
  qtyMilli: bigint;
  unitPrice: bigint;
}

/** Qator summasi — core formulasi: (qty_milli * unit_price + 500) / 1000 */
export function lineTotal(line: MoneyLine): bigint {
  return calculateLineTotal(line.qtyMilli, line.unitPrice);
}

/** Har bir qator alohida yaxlitlanadi, keyin yig'iladi (server bilan bir xil) */
export function documentTotal(lines: readonly MoneyLine[]): bigint {
  return lines.reduce((sum, l) => sum + lineTotal(l), 0n);
}

/** Kiritish maydonida ko'rinadigan formatlash: "1250000" → "1 250 000" */
export function formatMoneyInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export { MAX_UNIT_PRICE, MAX_QTY_MILLI };
