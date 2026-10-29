import type { DraftRow } from "../types";
import { uid } from "./id";

const NUM = /(\d{1,3}(?:[ \u00a0]\d{3})+|\d+(?:[.,]\d+)?)\s*(ming|k)?(?![\p{L}\d])/giu;
const UNIT_WORDS = /(?<![\p{L}\d])(ta|dona|kg|litr|l|so['‘’`]?m|som|sum)(?![\p{L}\d])/giu;

function toNumber(raw: string, suffix?: string): number {
  const clean = raw.replace(/[ \u00a0]/g, "").replace(",", ".");
  return Math.round(Number(clean) * (suffix ? 1000 : 1));
}

function detectUnit(seg: string): string {
  const m = seg.match(/(?<![\p{L}\d])(kg|litr|l)(?![\p{L}\d])/iu);
  if (!m) return "dona";
  return m[1].toLowerCase() === "litr" ? "l" : m[1].toLowerCase();
}

/**
 * "3 ta non 4000, 2 ta sut 12000" -> qatorlar.
 * Qoida: birinchi son = miqdor, oxirgi son = BIRLIK narxi. Bitta son bo‘lsa miqdor 1, son = narx.
 * Foydalanuvchi tasdiqlashdan oldin hammasini tahrirlay oladi.
 */
export function parseItems(text: string): DraftRow[] {
  const segments = text.split(/[;\n]|,(?!\d)/).map((s) => s.trim()).filter(Boolean);
  const rows: DraftRow[] = [];
  for (const seg of segments) {
    const matches = [...seg.matchAll(NUM)];
    if (matches.length === 0) continue;
    const priceM = matches[matches.length - 1];
    const price = toNumber(priceM[1], priceM[2]);
    let qty = "1";
    if (matches.length >= 2) {
      const q = matches[0];
      qty = q[2] ? String(toNumber(q[1], q[2])) : q[1].replace(/[ \u00a0]/g, "");
    }
    const name = seg.replace(NUM, " ").replace(UNIT_WORDS, " ").replace(/\s+/g, " ").trim();
    const label = name ? name.charAt(0).toUpperCase() + name.slice(1) : "Mahsulot";
    rows.push({ id: uid(), name: label, qty, unit: detectUnit(seg), price: String(price) });
  }
  return rows;
}
