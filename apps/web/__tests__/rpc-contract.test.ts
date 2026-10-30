/**
 * RPC kontrakti: web ilova yuboradigan argument nomlari 003 migratsiyasidagi SQL imzolari bilan bir xil.
 * Taxminiy parametr yo'q — SQL fayldan o'qib solishtiriladi.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { createShop, postSale, recordPayment, reverseSale, voidPayment } from '@/lib/data/api';
import { PAYMENT_METHODS, UNITS } from '@/lib/data/types';

const SQL = readFileSync(path.resolve(__dirname, '../../../supabase/migrations/003_security_and_mvp_rpc.sql'), 'utf8');

/** CREATE OR REPLACE FUNCTION name( ... ) → { all: [...], required: [...] } */
function signature(fn: string): { all: string[]; required: string[] } {
  const m = new RegExp(`CREATE OR REPLACE FUNCTION ${fn}\\(([^)]*)\\)`, 'i').exec(SQL);
  if (!m?.[1]) throw new Error(`${fn} topilmadi`);
  const params = m[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((p) => ({ name: p.split(/\s+/)[0]!, hasDefault: /\bDEFAULT\b/i.test(p) }));
  return { all: params.map((p) => p.name), required: params.filter((p) => !p.hasDefault).map((p) => p.name) };
}

/** Soxta klient: RPC chaqiruvlarini yozib oladi, tekshiruv so'rovlariga mos javob qaytaradi */
function fakeClient(rowFor: (table: string) => unknown) {
  const calls: { fn: string; args: Record<string, unknown> }[] = [];
  const builder = (table: string) => {
    const b: Record<string, unknown> = {};
    for (const k of ['select', 'eq', 'in', 'order', 'range']) b[k] = () => b;
    b.maybeSingle = async () => ({ data: rowFor(table), error: null });
    return b;
  };
  const sb = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return { data: (args.p_sale_id ?? args.p_payment_id ?? 'id-1') as string, error: null };
    },
    from: (table: string) => builder(table),
  } as unknown as SupabaseClient;
  return { sb, calls };
}

function expectMatches(fn: string, args: Record<string, unknown>) {
  const sig = signature(fn);
  const sent = Object.keys(args);
  for (const k of sent) expect(sig.all, `${fn}: ${k} SQL imzosida yo'q`).toContain(k);
  for (const k of sig.required) expect(sent, `${fn}: majburiy ${k} yuborilmagan`).toContain(k);
}

describe('RPC imzolari (003_security_and_mvp_rpc.sql)', () => {
  it('create_shop', async () => {
    const { sb, calls } = fakeClient(() => null);
    await createShop(sb, ' Baraka ');
    expect(calls[0]!.fn).toBe('create_shop');
    expectMatches('create_shop', calls[0]!.args);
    expect(calls[0]!.args.p_name).toBe('Baraka');
  });

  it("post_sale — pul va miqdor string, server qayta o'qib tekshiradi", async () => {
    const { sb, calls } = fakeClient(() => ({ id: 's1', status: 'posted', subtotal: '29000', customer_id: null, created_at: '', posted_at: '', created_by: 'u' }));
    await postSale(sb, {
      shopId: 'shop',
      saleId: 's1',
      clientOpId: 'op1',
      customerId: null,
      note: null,
      lines: [{ product_name: 'Un', qty_milli: 1500n, unit: 'kg', unit_price: 3333n }, { product_name: 'Shakar', qty_milli: 2000n, unit: 'kg', unit_price: 12000n }],
      clientTotal: 29000n,
    });
    expectMatches('post_sale', calls[0]!.args);
    expect(calls[0]!.args.p_client_total).toBe('29000');
    const lines = calls[0]!.args.p_lines as Record<string, unknown>[];
    expect(lines[0]).toEqual({ product_name: 'Un', qty_milli: '1500', unit: 'kg', unit_price: '3333', raw_text: null });
  });

  it('post_sale — server boshqa summani qaytarsa muvaffaqiyat deb hisoblanmaydi', async () => {
    const { sb } = fakeClient(() => ({ id: 's1', status: 'posted', subtotal: '1', customer_id: null, created_at: '', posted_at: '', created_by: 'u' }));
    await expect(
      postSale(sb, { shopId: 'shop', saleId: 's1', clientOpId: 'op', customerId: null, note: null, lines: [{ product_name: 'Un', qty_milli: 1000n, unit: 'kg', unit_price: 5n }], clientTotal: 5n }),
    ).rejects.toThrow();
  });

  it('reverse_sale', async () => {
    const { sb, calls } = fakeClient(() => ({ status: 'reversed' }));
    await reverseSale(sb, 'shop', 'doc', 'op', '  xato kiritilgan ');
    expectMatches('reverse_sale', calls[0]!.args);
    expect(calls[0]!.args.p_reason).toBe('xato kiritilgan');
  });

  it('reverse_sale — server holatni tasdiqlamasa xato', async () => {
    const { sb } = fakeClient(() => ({ status: 'posted' }));
    await expect(reverseSale(sb, 'shop', 'doc', 'op', 'sabab')).rejects.toThrow();
  });

  it('record_payment', async () => {
    const { sb, calls } = fakeClient(() => ({ id: 'p1', amount: '5000' }));
    await recordPayment(sb, { shopId: 'shop', paymentId: 'p1', clientOpId: 'op', customerId: 'c', amount: 5000n, method: 'karta', note: null });
    expectMatches('record_payment', calls[0]!.args);
    expect(calls[0]!.args.p_amount).toBe('5000');
  });

  it('void_payment', async () => {
    const { sb, calls } = fakeClient(() => ({ id: 'v1' }));
    await voidPayment(sb, 'shop', 'p1', 'qaytarildi');
    expectMatches('void_payment', calls[0]!.args);
  });
});

describe('sxema cheklovlari bilan moslik', () => {
  it("birliklar post_sale dagi ro'yxat bilan bir xil", () => {
    const m = /NOT IN \(([^)]*'dona'[^)]*)\)/.exec(SQL);
    const sqlUnits = m![1]!.split(',').map((s) => s.trim().replace(/'/g, ''));
    expect([...UNITS].sort()).toEqual(sqlUnits.sort());
  });

  it("to'lov usullari payments.method CHECK bilan bir xil", () => {
    const m = /method\s+text NOT NULL CHECK \(method IN \(([^)]*)\)\)/.exec(SQL);
    const sqlMethods = m![1]!.split(',').map((s) => s.trim().replace(/'/g, ''));
    expect([...PAYMENT_METHODS].sort()).toEqual(sqlMethods.sort());
  });
});
