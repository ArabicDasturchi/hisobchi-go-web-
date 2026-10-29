// Barcha pul qiymatlari BUTUN so‘mlarda, miqdor esa 1/1000 birliklarda (milli) saqlanadi.
// Shu sababli floating-point xatolari yuzaga kelmaydi.

const NBSP = "\u00a0";

export function formatSom(n: number): string {
  const sign = n < 0 ? "-" : "";
  const g = Math.abs(Math.trunc(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${sign}${g}${NBSP}so‘m`;
}

/** "125 000", "4000" -> butun son. Noto‘g‘ri bo‘lsa 0. */
export function parseSom(s: string): number {
  const d = s.replace(/[^\d]/g, "");
  return d ? Number(d) : 0;
}

/** "2", "1,5", "0.25" -> milli (2000, 1500, 250). Noto‘g‘ri bo‘lsa null. */
export function parseQty(s: string): number | null {
  const m = s.trim().match(/^(\d+)(?:[.,](\d{1,3}))?$/);
  if (!m) return null;
  const frac = (m[2] ?? "").padEnd(3, "0");
  return Number(m[1]) * 1000 + Number(frac);
}

export function formatQty(milli: number): string {
  if (milli % 1000 === 0) return String(milli / 1000);
  return (milli / 1000).toString().replace(".", ",");
}

/** qtyMilli * unitPrice / 1000, eng yaqin butun so‘mgacha yaxlitlanadi (butun sonli arifmetika). */
export function lineTotal(qtyMilli: number, unitPrice: number): number {
  return Math.round((qtyMilli * unitPrice) / 1000);
}
