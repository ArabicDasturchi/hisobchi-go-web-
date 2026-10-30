/**
 * Hisob-kitob agregatlari (sof funksiyalar, testlanadi).
 * Qarz qoidasi 003 migratsiyasidagi customer_outstanding() bilan bir xil:
 *   qarz = mijozga 'posted' savdolar summasi − bekor qilinmagan to'lovlar summasi
 */
import { addDays, dayKey, startOfDay } from '../dates';
import type { Payment, SaleDoc } from './types';

export interface CustomerBalance {
  sales: bigint;
  paid: bigint;
  /** Musbat — mijoz qarzdor; manfiy — ortiqcha to'lagan (masalan, savdo bekor qilingandan keyin) */
  debt: bigint;
  saleCount: number;
  lastActivity: string | null;
}

const empty = (): CustomerBalance => ({ sales: 0n, paid: 0n, debt: 0n, saleCount: 0, lastActivity: null });

const later = (a: string | null, b: string) => (a === null || new Date(b).getTime() > new Date(a).getTime() ? b : a);

export function customerBalances(docs: readonly SaleDoc[], payments: readonly Payment[]): Map<string, CustomerBalance> {
  const map = new Map<string, CustomerBalance>();
  const get = (id: string) => {
    let b = map.get(id);
    if (!b) {
      b = empty();
      map.set(id, b);
    }
    return b;
  };
  for (const d of docs) {
    if (!d.customer_id) continue;
    const b = get(d.customer_id);
    b.lastActivity = later(b.lastActivity, d.created_at);
    if (d.status !== 'posted') continue;
    b.sales += d.subtotal;
    b.saleCount += 1;
  }
  for (const p of payments) {
    const b = get(p.customer_id);
    b.lastActivity = later(b.lastActivity, p.created_at);
    if (p.void) continue;
    b.paid += p.amount;
  }
  for (const b of map.values()) b.debt = b.sales - b.paid;
  return map;
}

export function balanceOf(map: Map<string, CustomerBalance>, customerId: string): CustomerBalance {
  return map.get(customerId) ?? empty();
}

export interface Totals {
  todaySales: bigint;
  todayCount: number;
  totalSales: bigint;
  saleCount: number;
  reversedCount: number;
  totalPaid: bigint;
  totalDebt: bigint;
  debtorCount: number;
  /** Ortiqcha to'lovlar yig'indisi (manfiy qarzlar moduli) — qarzga qo'shilmaydi */
  totalCredit: bigint;
}

export function computeTotals(docs: readonly SaleDoc[], payments: readonly Payment[], now: Date = new Date()): Totals {
  // Server vaqtlari "+00:00" formatida keladi — satr emas, vaqt bo'yicha solishtiriladi
  const todayStart = startOfDay(now).getTime();
  const tomorrow = addDays(now, 1).getTime();
  let todaySales = 0n;
  let todayCount = 0;
  let totalSales = 0n;
  let saleCount = 0;
  let reversedCount = 0;
  for (const d of docs) {
    if (d.status !== 'posted') {
      reversedCount++;
      continue;
    }
    totalSales += d.subtotal;
    saleCount++;
    const t = new Date(d.created_at).getTime();
    if (t >= todayStart && t < tomorrow) {
      todaySales += d.subtotal;
      todayCount++;
    }
  }
  let totalPaid = 0n;
  for (const p of payments) if (!p.void) totalPaid += p.amount;

  let totalDebt = 0n;
  let totalCredit = 0n;
  let debtorCount = 0;
  for (const b of customerBalances(docs, payments).values()) {
    if (b.debt > 0n) {
      totalDebt += b.debt;
      debtorCount++;
    } else if (b.debt < 0n) {
      totalCredit += -b.debt;
    }
  }
  return { todaySales, todayCount, totalSales, saleCount, reversedCount, totalPaid, totalDebt, debtorCount, totalCredit };
}

export interface DayPoint {
  key: string;
  label: string;
  sales: number;
  payments: number;
}

/**
 * [from, to] kunlari (lokal, ikkalasi ham kiradi) bo'yicha kunlik savdo va to'lovlar. Grafik uchun number'ga
 * o'giriladi — bu faqat ko'rsatish; summalar BigInt'da yig'ilib, oxirida o'giriladi.
 */
export function rangeSeries(docs: readonly SaleDoc[], payments: readonly Payment[], from: Date, to: Date): DayPoint[] {
  const buckets = new Map<string, { sales: bigint; payments: bigint; date: Date }>();
  for (let d = startOfDay(from); d.getTime() <= startOfDay(to).getTime(); d = addDays(d, 1)) {
    buckets.set(dayKey(d), { sales: 0n, payments: 0n, date: d });
  }
  for (const d of docs) {
    if (d.status !== 'posted') continue;
    const b = buckets.get(dayKey(new Date(d.created_at)));
    if (b) b.sales += d.subtotal;
  }
  for (const p of payments) {
    if (p.void) continue;
    const b = buckets.get(dayKey(new Date(p.created_at)));
    if (b) b.payments += p.amount;
  }
  return [...buckets.entries()].map(([key, b]) => ({
    key,
    label: `${String(b.date.getDate()).padStart(2, '0')}.${String(b.date.getMonth() + 1).padStart(2, '0')}`,
    sales: Number(b.sales),
    payments: Number(b.payments),
  }));
}

/** Oxirgi `days` kun (bugun ham kiradi) */
export function dailySeries(docs: readonly SaleDoc[], payments: readonly Payment[], days: number, now: Date = new Date()): DayPoint[] {
  return rangeSeries(docs, payments, addDays(now, -(days - 1)), now);
}

/** Yarim-ochiq [fromIso, toIso) oralig'idagi yozuvlar */
export function inRange<T extends { created_at: string }>(rows: readonly T[], fromIso: string, toIso: string): T[] {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  return rows.filter((r) => {
    const t = new Date(r.created_at).getTime();
    return t >= from && t < to;
  });
}

export function sumPosted(docs: readonly SaleDoc[]): bigint {
  return docs.reduce((s, d) => (d.status === 'posted' ? s + d.subtotal : s), 0n);
}

export function sumActivePayments(payments: readonly Payment[]): bigint {
  return payments.reduce((s, p) => (p.void ? s : s + p.amount), 0n);
}
