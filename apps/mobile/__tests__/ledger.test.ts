/**
 * Ledger testlari — haqiqiy SQLite (node:sqlite) ustida.
 * Kutilgan summalar qo'lda hisoblangan.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { migrate } from '../src/data/schema';
import {
  CalculationMismatchError,
  SaleValidationError,
  createLedger,
  type Ledger,
  type SaleLineInput,
} from '../src/data/ledger';
import { openMemoryDb } from './node-sqlite';

const SAMPLE_385K: SaleLineInput[] = [
  { productName: 'chirmoq', qtyMilli: 10000n, unit: 'dona', unitPrice: 13000n, rawText: 'chirmoq 10 ta 13 ming' },
  { productName: 'yurak', qtyMilli: 5000n, unit: 'dona', unitPrice: 15000n, rawText: 'yurak 5 ta 15 ming' },
  { productName: 'momiq', qtyMilli: 20000n, unit: 'dona', unitPrice: 9000n, rawText: 'momiq 20 ta 9 ming' },
];

let db: ReturnType<typeof openMemoryDb>;
let ledger: Ledger;
let clock = 0;

beforeEach(async () => {
  db = openMemoryDb();
  await migrate(db);
  clock = 0;
  ledger = createLedger(db, {
    newId: () => randomUUID(),
    now: () => new Date(Date.UTC(2026, 9, 29, 10, 0, clock++)).toISOString(),
  });
});

const count = (table: string) =>
  (db.raw.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;

describe('migrate', () => {
  it('qayta ishga tushirish xavfsiz', async () => {
    await migrate(db);
    expect((db.raw.prepare('PRAGMA user_version').get() as { user_version: number }).user_version).toBe(1);
  });
});

describe('verifyTotals — TS va SQL mustaqil hisob', () => {
  it("385 000 so'm namunasi ikkala yo'lda bir xil", async () => {
    const check = await ledger.verifyTotals(SAMPLE_385K);
    expect(check.match).toBe(true);
    expect(check.tsTotal).toBe(385000n);
    expect(check.sqlTotal).toBe(385000n);
    expect(check.sqlLineTotals).toEqual([130000n, 75000n, 180000n]);
  });

  it('kasr miqdor va yaxlitlash chegarasi: 0.333 × 1500 = 499.5 → 500', async () => {
    const check = await ledger.verifyTotals([{ qtyMilli: 333n, unitPrice: 1500n }]);
    expect(check.sqlLineTotals).toEqual([500n]);
    expect(check.match).toBe(true);
  });

  it('katta qiymat chegarasi: 1 mln birlik × 100 mln so\'m', async () => {
    const check = await ledger.verifyTotals([{ qtyMilli: 1_000_000_000n, unitPrice: 100_000_000n }]);
    expect(check.sqlTotal).toBe(100_000_000_000_000n);
    expect(check.match).toBe(true);
  });
});

describe('postSale', () => {
  it('savdoni, qatorlarni va ledger yozuvini saqlaydi', async () => {
    const customerId = await ledger.createCustomer({ name: 'Akmal aka', phone: '+998901234567' });
    const res = await ledger.postSale({ clientOpId: 'op-1', customerId, rawInput: 'x', lines: SAMPLE_385K });
    expect(res).toMatchObject({ total: 385000n, duplicate: false });

    const sale = await ledger.getSale(res.saleId);
    expect(sale?.total).toBe(385000n);
    expect(sale?.tsTotal).toBe(385000n);
    expect(sale?.sqlTotal).toBe(385000n);
    expect(sale?.customerName).toBe('Akmal aka');
    expect(sale?.lines.map((l) => l.lineTotal)).toEqual([130000n, 75000n, 180000n]);
    expect(sale?.lines[0].rawText).toBe('chirmoq 10 ta 13 ming');

    const customer = await ledger.getCustomer(customerId);
    expect(customer?.balance).toBe(385000n);
    expect(customer?.saleCount).toBe(1);
    expect(count('ledger_entries')).toBe(1);
  });

  it("umumiy xaridor (mijozsiz) savdo", async () => {
    const res = await ledger.postSale({ clientOpId: 'op-w', customerId: null, rawInput: null, lines: SAMPLE_385K });
    const sales = await ledger.listSales();
    expect(sales).toHaveLength(1);
    expect(sales[0]).toMatchObject({ id: res.saleId, customerId: null, customerName: null, total: 385000n });
  });

  it('takroriy client_op_id — ikkinchi marta yozilmaydi', async () => {
    const a = await ledger.postSale({ clientOpId: 'op-dup', customerId: null, rawInput: null, lines: SAMPLE_385K });
    const b = await ledger.postSale({ clientOpId: 'op-dup', customerId: null, rawInput: null, lines: SAMPLE_385K });
    expect(b).toEqual({ saleId: a.saleId, total: 385000n, duplicate: true });
    expect(count('sales')).toBe(1);
    expect(count('ledger_entries')).toBe(1);
  });

  it('ataylab buzilgan TS hisobi — mos kelmaslik bloklanadi, hech narsa yozilmaydi', async () => {
    await expect(
      ledger.postSale(
        { clientOpId: 'op-bad', customerId: null, rawInput: null, lines: SAMPLE_385K },
        { tsOverride: () => [130000n, 75000n, 180001n] },
      ),
    ).rejects.toBeInstanceOf(CalculationMismatchError);
    expect(count('sales')).toBe(0);
    expect(count('sale_lines')).toBe(0);
    expect(count('ledger_entries')).toBe(0);
  });

  it("bloklovchi xatoli qator (narx yo'q) rad etiladi", async () => {
    const lines = [{ ...SAMPLE_385K[0], unitPrice: undefined as unknown as bigint }];
    await expect(
      ledger.postSale({ clientOpId: 'op-x', customerId: null, rawInput: null, lines }),
    ).rejects.toBeInstanceOf(SaleValidationError);
    expect(count('sales')).toBe(0);
  });

  it("bo'sh hujjat rad etiladi", async () => {
    await expect(
      ledger.postSale({ clientOpId: 'op-e', customerId: null, rawInput: null, lines: [] }),
    ).rejects.toBeInstanceOf(SaleValidationError);
  });

  it("noma'lum birlik rad etiladi", async () => {
    const lines = [{ ...SAMPLE_385K[0], unit: 'bochka' as never }];
    await expect(
      ledger.postSale({ clientOpId: 'op-u', customerId: null, rawInput: null, lines }),
    ).rejects.toBeInstanceOf(SaleValidationError);
  });

  it("mavjud bo'lmagan mijoz rad etiladi va tranzaksiya qaytariladi", async () => {
    await expect(
      ledger.postSale({ clientOpId: 'op-c', customerId: 'yoq', rawInput: null, lines: SAMPLE_385K }),
    ).rejects.toBeInstanceOf(SaleValidationError);
    expect(count('sales')).toBe(0);
  });
});

describe('append-only cheklovlar', () => {
  it('sales, sale_lines, ledger_entries UPDATE/DELETE taqiqlangan', async () => {
    await ledger.postSale({ clientOpId: 'op-a', customerId: null, rawInput: null, lines: SAMPLE_385K });
    for (const sql of [
      'UPDATE sales SET raw_input = 1',
      'DELETE FROM sales',
      'UPDATE sale_lines SET raw_text = 1',
      'DELETE FROM sale_lines',
      'UPDATE ledger_entries SET amount = 0',
      'DELETE FROM ledger_entries',
    ]) {
      expect(() => db.raw.exec(sql), sql).toThrow(/append-only/);
    }
    expect(count('ledger_entries')).toBe(1);
  });

  it("CHECK: SQL formulasiga mos kelmaydigan line_total yozib bo'lmaydi", async () => {
    await ledger.postSale({ clientOpId: 'op-b', customerId: null, rawInput: null, lines: SAMPLE_385K });
    const saleId = (db.raw.prepare('SELECT id FROM sales').get() as { id: string }).id;
    expect(() =>
      db.raw
        .prepare(
          `INSERT INTO sale_lines (id, sale_id, line_index, product_name, qty_milli, unit, unit_price, line_total)
           VALUES ('l', ?, 9, 'non', 3000, 'dona', 4000, 12001)`,
        )
        .run(saleId),
    ).toThrow(/CHECK/);
  });
});

describe('mijozlar', () => {
  it('yaratish, tahrirlash, qidirish va balans', async () => {
    const a = await ledger.createCustomer({ name: '  Dilnoza opa ' });
    const b = await ledger.createCustomer({ name: 'Bobur', phone: '901112233' });
    await ledger.updateCustomer(a, { name: 'Dilnoza Karimova', note: 'Chorsu' });

    await ledger.postSale({ clientOpId: '1', customerId: a, rawInput: null, lines: SAMPLE_385K });
    await ledger.postSale({
      clientOpId: '2',
      customerId: a,
      rawInput: null,
      lines: [{ productName: 'non', qtyMilli: 3000n, unit: 'dona', unitPrice: 4000n, rawText: null }],
    });

    const found = await ledger.listCustomers('dilnoza');
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ name: 'Dilnoza Karimova', note: 'Chorsu', balance: 397000n, saleCount: 2 });
    expect((await ledger.listCustomers('9011'))[0].id).toBe(b);
    expect((await ledger.getCustomer(b))?.balance).toBe(0n);

    const history = await ledger.listSales({ customerId: a });
    expect(history.map((s) => s.total)).toEqual([12000n, 385000n]);
  });

  it("bo'sh ism rad etiladi", async () => {
    await expect(ledger.createCustomer({ name: '   ' })).rejects.toBeInstanceOf(SaleValidationError);
  });

  it('totalSince — sanadan keyingi savdolar', async () => {
    await ledger.postSale({ clientOpId: '1', customerId: null, rawInput: null, lines: SAMPLE_385K });
    expect(await ledger.totalSince('2026-10-29T00:00:00.000Z')).toEqual({ total: 385000n, count: 1 });
    expect(await ledger.totalSince('2026-10-30T00:00:00.000Z')).toEqual({ total: 0n, count: 0 });
  });
});
