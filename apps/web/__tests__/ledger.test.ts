import { describe, expect, it } from 'vitest';
import { customerBalances, computeTotals, dailySeries, inRange, sumActivePayments, sumPosted } from '@/lib/data/ledger';
import type { Payment, SaleDoc } from '@/lib/data/types';

const at = (d: Date) => d.toISOString().replace('Z', '+00:00'); // server formati
const now = new Date(2026, 9, 30, 15, 0, 0);
const today = new Date(2026, 9, 30, 10, 0, 0);
const yesterday = new Date(2026, 9, 29, 18, 0, 0);

const sale = (id: string, customer: string | null, subtotal: bigint, status: SaleDoc['status'] = 'posted', when = today): SaleDoc => ({
  id,
  customer_id: customer,
  status,
  subtotal,
  created_at: at(when),
  posted_at: at(when),
  created_by: 'u1',
});

const payment = (id: string, customer: string, amount: bigint, voided = false, when = today): Payment => ({
  id,
  customer_id: customer,
  amount,
  method: 'naqd',
  note: null,
  created_by: 'u1',
  created_at: at(when),
  void: voided ? { id: `v-${id}`, payment_id: id, reason: 'xato', created_by: 'u1', created_at: at(when) } : null,
});

describe("qarz qoidasi (customer_outstanding bilan bir xil)", () => {
  it("qarz = posted savdolar − bekor qilinmagan to'lovlar", () => {
    const docs = [sale('s1', 'A', 100_000n), sale('s2', 'A', 50_000n), sale('s3', 'A', 30_000n, 'reversed'), sale('s4', null, 999n)];
    const pays = [payment('p1', 'A', 40_000n), payment('p2', 'A', 10_000n, true)];
    const b = customerBalances(docs, pays).get('A')!;
    expect(b.sales).toBe(150_000n);
    expect(b.paid).toBe(40_000n);
    expect(b.debt).toBe(110_000n);
    expect(b.saleCount).toBe(2);
  });

  it("to'langan savdo bekor qilinsa — manfiy qarz (ortiqcha to'lov), jami qarzga qo'shilmaydi", () => {
    const docs = [sale('s1', 'A', 100_000n, 'reversed'), sale('s2', 'B', 20_000n)];
    const pays = [payment('p1', 'A', 100_000n)];
    const t = computeTotals(docs, pays, now);
    expect(customerBalances(docs, pays).get('A')!.debt).toBe(-100_000n);
    expect(t.totalDebt).toBe(20_000n);
    expect(t.totalCredit).toBe(100_000n);
    expect(t.debtorCount).toBe(1);
  });
});

describe('dashboard yig\'indilari', () => {
  it('bugungi va umumiy savdo, to\'lovlar', () => {
    const docs = [sale('s1', 'A', 100n), sale('s2', null, 50n, 'posted', yesterday), sale('s3', 'A', 70n, 'reversed')];
    const pays = [payment('p1', 'A', 30n), payment('p2', 'A', 5n, true)];
    const t = computeTotals(docs, pays, now);
    expect(t.todaySales).toBe(100n);
    expect(t.todayCount).toBe(1);
    expect(t.totalSales).toBe(150n);
    expect(t.saleCount).toBe(2);
    expect(t.reversedCount).toBe(1);
    expect(t.totalPaid).toBe(30n);
    expect(t.totalDebt).toBe(70n);
  });

  it("bo'sh do'kon — haqiqiy nollar", () => {
    const t = computeTotals([], [], now);
    expect(t).toMatchObject({ todaySales: 0n, totalSales: 0n, totalPaid: 0n, totalDebt: 0n, debtorCount: 0 });
  });

  it('kunlik qatorlar lokal kun bo\'yicha, bekorlarsiz', () => {
    const docs = [sale('s1', 'A', 100n), sale('s2', 'A', 50n, 'posted', yesterday), sale('s3', 'A', 999n, 'reversed')];
    const pays = [payment('p1', 'A', 30n), payment('p2', 'A', 7n, true)];
    const series = dailySeries(docs, pays, 7, now);
    expect(series).toHaveLength(7);
    expect(series.at(-1)).toMatchObject({ sales: 100, payments: 30 });
    expect(series.at(-2)).toMatchObject({ sales: 50, payments: 0 });
    expect(series.slice(0, 5).every((p) => p.sales === 0 && p.payments === 0)).toBe(true);
  });

  it("oraliq filtri va summalar", () => {
    const docs = [sale('s1', 'A', 100n), sale('s2', 'A', 50n, 'posted', yesterday), sale('s3', 'A', 9n, 'reversed')];
    const fromIso = new Date(2026, 9, 30).toISOString();
    const toIso = new Date(2026, 9, 31).toISOString();
    const r = inRange(docs, fromIso, toIso);
    expect(r.map((d) => d.id)).toEqual(['s1', 's3']);
    expect(sumPosted(r)).toBe(100n);
    expect(sumActivePayments([payment('p', 'A', 5n), payment('q', 'A', 6n, true)])).toBe(5n);
  });
});
