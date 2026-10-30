import { describe, expect, it } from 'vitest';
import { documentTotal, formatQty, formatSom, lineTotal, parseMoneyInput, parseQtyInput, toBig } from '@/lib/money';

describe('pul formatlash va o\'qish', () => {
  it('server bigint satrini aniq BigInt ga o\'giradi', () => {
    expect(toBig('9007199254740993')).toBe(9007199254740993n); // Number'da yo'qolardi
    expect(toBig(null)).toBe(0n);
    expect(() => toBig('1.5')).toThrow();
    expect(() => toBig(2 ** 60)).toThrow();
  });

  it("so'mni guruhlab ko'rsatadi", () => {
    expect(formatSom(385000n)).toBe('385 000 so\'m');
    expect(formatSom(-1500n)).toBe('-1 500 so\'m');
    expect(formatSom(0n)).toBe('0 so\'m');
  });

  it('miqdorni o\'zbekcha vergul bilan ko\'rsatadi', () => {
    expect(formatQty(1500n)).toBe('1,5');
    expect(formatQty(3000n)).toBe('3');
    expect(formatQty(250n)).toBe('0,25');
  });

  it('summa maydonini tekshiradi', () => {
    expect(parseMoneyInput('13 000')).toEqual({ ok: true, value: 13000n });
    expect(parseMoneyInput('0').ok).toBe(false);
    expect(parseMoneyInput('0', { allowZero: true })).toEqual({ ok: true, value: 0n });
    expect(parseMoneyInput('12.5').ok).toBe(false);
    expect(parseMoneyInput('100000001').ok).toBe(false); // MAX_UNIT_PRICE (server: invalid_price)
    expect(parseMoneyInput('500', { max: 400n }).ok).toBe(false);
  });

  it('miqdor maydonini qty_milli ga aylantiradi', () => {
    expect(parseQtyInput('1,5')).toEqual({ ok: true, value: 1500n });
    expect(parseQtyInput('0.25')).toEqual({ ok: true, value: 250n });
    expect(parseQtyInput('3')).toEqual({ ok: true, value: 3000n });
    expect(parseQtyInput('0').ok).toBe(false);
    expect(parseQtyInput('-2').ok).toBe(false);
    expect(parseQtyInput('abc').ok).toBe(false);
    expect(parseQtyInput('1000001').ok).toBe(false); // > MAX_QTY_MILLI
  });
});

describe('qator va hujjat summasi (PostgreSQL calculate_line_total bilan bir xil)', () => {
  // 002_test_calculations.sql dagi qo'lda hisoblangan qiymatlar
  it.each([
    [10000n, 13000n, 130000n],
    [5000n, 15000n, 75000n],
    [1500n, 3333n, 5000n], // 4999.5 → 5000 (yarmi yuqoriga)
    [333n, 1000n, 333n],
    [1n, 499n, 0n], // 0.499 so'm → 0
  ])('qty_milli=%s × narx=%s', (q, p, expected) => {
    expect(lineTotal({ qtyMilli: q, unitPrice: p })).toBe(expected);
  });

  it('har bir qator alohida yaxlitlanadi, keyin yig\'iladi', () => {
    const lines = [
      { qtyMilli: 1500n, unitPrice: 3333n }, // 5000 (4999.5)
      { qtyMilli: 1500n, unitPrice: 3333n }, // 5000
    ];
    expect(documentTotal(lines)).toBe(10000n); // umumiy yaxlitlash 9999 bo'lardi
  });

  it('katta summalarda float xatosi yo\'q', () => {
    expect(lineTotal({ qtyMilli: 1_000_000_000n, unitPrice: 100_000_000n })).toBe(100_000_000_000_000n);
    expect(documentTotal([{ qtyMilli: 100n, unitPrice: 3n }])).toBe(0n); // 0.3 so'm → 0
  });
});
