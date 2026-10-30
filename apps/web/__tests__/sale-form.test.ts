import { describe, expect, it } from 'vitest';
import { buildSalePlan, type DraftLine } from '@/lib/saleForm';

const line = (productName: string, qty: string, price: string, key = productName): DraftLine => ({ key, productName, qty, unit: 'kg', price });

describe('savdo rejasi', () => {
  it("jami server bilan bir xil formula va qarzga yozish", () => {
    const r = buildSalePlan({ lines: [line('Un', '1,5', '3 333'), line('Shakar', '2', '12 000')], customerId: 'c1', mode: 'debt', partial: '' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.plan.total).toBe(5000n + 24000n);
    expect(r.plan.paidNow).toBe(0n);
    expect(r.plan.debt).toBe(29000n);
    // RPC'ga ketadigan qatorlar — qty_milli va so'm butun son
    expect(r.plan.lines[0]).toEqual({ product_name: 'Un', qty_milli: 1500n, unit: 'kg', unit_price: 3333n });
  });

  it("to'liq to'langan savdo mijoz bilan — to'lov yoziladi, qarz 0", () => {
    const r = buildSalePlan({ lines: [line('Un', '1', '10000')], customerId: 'c1', mode: 'paid', partial: '' });
    expect(r.ok && r.plan).toMatchObject({ total: 10000n, paidNow: 10000n, debt: 0n });
  });

  it("mijozsiz naqd savdo — to'lov yozuvi yo'q (qarz hisobi yo'q)", () => {
    const r = buildSalePlan({ lines: [line('Un', '1', '10000')], customerId: null, mode: 'paid', partial: '' });
    expect(r.ok && r.plan).toMatchObject({ total: 10000n, paidNow: 0n, debt: 0n });
  });

  it('mijozsiz qarzga savdo taqiqlangan', () => {
    const r = buildSalePlan({ lines: [line('Un', '1', '10000')], customerId: null, mode: 'debt', partial: '' });
    expect(r.ok).toBe(false);
  });

  it("qisman to'lov: 0 < summa < jami", () => {
    const ok = buildSalePlan({ lines: [line('Un', '1', '10000')], customerId: 'c1', mode: 'partial', partial: '4 000' });
    expect(ok.ok && ok.plan).toMatchObject({ paidNow: 4000n, debt: 6000n });
    expect(buildSalePlan({ lines: [line('Un', '1', '10000')], customerId: 'c1', mode: 'partial', partial: '10000' }).ok).toBe(false);
    expect(buildSalePlan({ lines: [line('Un', '1', '10000')], customerId: 'c1', mode: 'partial', partial: '0' }).ok).toBe(false);
  });

  it("bo'sh qatorlar e'tiborsiz, xato qatorlar aniq ko'rsatiladi", () => {
    const blank = line('', '', '', 'b');
    const bad = line('Un', 'abc', '100', 'x');
    const r = buildSalePlan({ lines: [blank, bad], customerId: 'c1', mode: 'debt', partial: '' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect([...r.lineErrors.keys()]).toEqual(['x']);
    expect(r.lineErrors.get('x')?.qty).toBeTruthy();
    expect(buildSalePlan({ lines: [blank], customerId: 'c1', mode: 'debt', partial: '' }).ok).toBe(false);
  });
});
