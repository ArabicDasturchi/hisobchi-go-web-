/**
 * Savdo formasining sof mantig'i (UI'siz, testlanadi): qatorlarni tekshirish, jami va to'lov rejasi.
 * Pul faqat BigInt; qator formulasi core bilan bir xil (server post_sale ham shuni qayta hisoblaydi).
 */
import { lineTotal, parseMoneyInput, parseQtyInput } from './money';
import type { PostSaleLine } from './data/api';
import type { Unit } from './data/types';

export interface DraftLine {
  key: string;
  productName: string;
  qty: string;
  unit: Unit;
  price: string;
}

export interface LineCheck {
  ok: boolean;
  total: bigint | null;
  errors: { name?: string; qty?: string; price?: string };
}

export function checkLine(l: DraftLine): LineCheck {
  const errors: LineCheck['errors'] = {};
  const name = l.productName.trim();
  if (!name) errors.name = 'Mahsulot nomini kiriting';
  else if (name.length > 120) errors.name = 'Nom juda uzun';
  const qty = parseQtyInput(l.qty);
  if (!qty.ok) errors.qty = qty.message;
  const price = parseMoneyInput(l.price, { allowZero: true });
  if (!price.ok) errors.price = price.message;
  const total = qty.ok && price.ok ? lineTotal({ qtyMilli: qty.value, unitPrice: price.value }) : null;
  return { ok: Object.keys(errors).length === 0, total, errors };
}

/** Bo'sh (hech narsa kiritilmagan) qatorlar e'tiborga olinmaydi */
export function isBlank(l: DraftLine): boolean {
  return !l.productName.trim() && !l.qty.trim() && !l.price.trim();
}

export type PayMode = 'debt' | 'paid' | 'partial';

export interface SalePlan {
  lines: PostSaleLine[];
  total: bigint;
  /** Hozir to'lanadigan summa (record_payment), 0 — to'lov yozilmaydi */
  paidNow: bigint;
  /** Mijoz qarziga qo'shiladigan summa */
  debt: bigint;
}

export type PlanResult = { ok: true; plan: SalePlan } | { ok: false; message: string; lineErrors: Map<string, LineCheck['errors']>; paidError?: string };

export function buildSalePlan(input: { lines: DraftLine[]; customerId: string | null; mode: PayMode; partial: string }): PlanResult {
  const lineErrors = new Map<string, LineCheck['errors']>();
  const lines: PostSaleLine[] = [];
  let total = 0n;
  for (const l of input.lines) {
    if (isBlank(l)) continue;
    const c = checkLine(l);
    const qty = parseQtyInput(l.qty);
    const price = parseMoneyInput(l.price, { allowZero: true });
    if (!c.ok || c.total === null || !qty.ok || !price.ok) {
      lineErrors.set(l.key, c.errors);
      continue;
    }
    lines.push({ product_name: l.productName.trim(), qty_milli: qty.value, unit: l.unit, unit_price: price.value });
    total += c.total;
  }
  if (lineErrors.size > 0) return { ok: false, message: "Qatorlardagi xatolarni tuzating.", lineErrors };
  if (lines.length === 0) return { ok: false, message: "Kamida bitta mahsulot qo'shing.", lineErrors };
  if (lines.length > 200) return { ok: false, message: "Bitta savdoda ko'pi bilan 200 qator.", lineErrors };

  if (input.mode !== 'paid' && !input.customerId) {
    return { ok: false, message: "Qarzga savdo uchun mijozni tanlang (mijozsiz savdo faqat to'liq to'langan bo'ladi).", lineErrors };
  }
  let paidNow = 0n;
  if (input.mode === 'paid') paidNow = total;
  if (input.mode === 'partial') {
    const p = parseMoneyInput(input.partial, { max: total > 0n ? total : 1n });
    if (!p.ok) return { ok: false, message: p.message, lineErrors, paidError: p.message };
    if (p.value >= total) {
      const msg = "Qisman to'lov jami summadan kam bo'lishi kerak (to'liq bo'lsa — «To'landi»ni tanlang).";
      return { ok: false, message: msg, lineErrors, paidError: msg };
    }
    paidNow = p.value;
  }
  // Mijozsiz to'langan savdo: to'lov yozuvi kerak emas (qarz hisobi yo'q)
  if (!input.customerId) paidNow = 0n;
  const debt = input.customerId ? total - paidNow : 0n;
  return { ok: true, plan: { lines, total, paidNow, debt } };
}
