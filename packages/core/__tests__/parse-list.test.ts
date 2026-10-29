/**
 * @file parse-list.test.ts
 * parseProductList va parseQtyMilli testlari.
 * Kutilgan qiymatlar qo'lda yozilgan — tekshirilayotgan funksiyadan olinmagan.
 */

import { describe, it, expect } from 'vitest';
import { parseProductList, parseQtyMilli, parseUnitPriceText } from '../src/parse-list.js';

const codes = (issues: { code: string }[]) => issues.map((i) => i.code);

describe('parseProductList — asosiy formatlar', () => {
  it('uch qatorli namunani ajratadi', () => {
    const { rows } = parseProductList(
      "3 ta non 4000 so'mdan\n2 litr sut 12000 so'mdan\n5 kg shakar 15000 so'mdan",
    );
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ productName: 'non', qtyMilli: 3000n, unit: 'dona', unitPrice: 4000n });
    expect(rows[1]).toMatchObject({ productName: 'sut', qtyMilli: 2000n, unit: 'litr', unitPrice: 12000n });
    expect(rows[2]).toMatchObject({ productName: 'shakar', qtyMilli: 5000n, unit: 'kg', unitPrice: 15000n });
    for (const r of rows) expect(r.issues).toEqual([]);
  });

  it("vergul bilan ajratilgan 385 000 so'm namunasi", () => {
    const { rows } = parseProductList('chirmoq 10 ta 13 ming, yurak 5 ta 15 ming, momiq 20 ta 9 ming');
    expect(rows.map((r) => [r.productName, r.qtyMilli, r.unitPrice])).toEqual([
      ['chirmoq', 10000n, 13000n],
      ['yurak', 5000n, 15000n],
      ['momiq', 20000n, 9000n],
    ]);
  });

  it('asl matn fragmentini saqlaydi', () => {
    const { rows } = parseProductList("  3 ta non 4000 so'mdan ;  sut 2 litr 12000 so'm ");
    expect(rows[0].rawText).toBe("3 ta non 4000 so'mdan");
    expect(rows[1].rawText).toBe("sut 2 litr 12000 so'm");
  });

  it("yopishgan yozuvni ajratadi: 3ta, 4000so'mdan, 13ming", () => {
    const { rows } = parseProductList("non 3ta 4000so'mdan\nyog' 2l 13ming");
    expect(rows[0]).toMatchObject({ productName: 'non', qtyMilli: 3000n, unitPrice: 4000n });
    expect(rows[1]).toMatchObject({ productName: "yog'", qtyMilli: 2000n, unit: 'litr', unitPrice: 13000n });
  });

  it("apostrof variantlarini standartlashtiradi (so’mdan)", () => {
    const { rows } = parseProductList('2 kg guruch 18000 so’mdan');
    expect(rows[0]).toMatchObject({ productName: 'guruch', unitPrice: 18000n });
    expect(rows[0].issues).toEqual([]);
  });

  it("bo'shliqli ming ajratuvchi: 12 000 so'm", () => {
    const { rows } = parseProductList("sut 2 litr 12 000 so'm");
    expect(rows[0].unitPrice).toBe(12000n);
  });

  it("kasr miqdor: 1,5 kg va yarim kg", () => {
    const { rows } = parseProductList("go'sht 1,5 kg 90 ming\npishloq yarim kg 60000 so'm");
    expect(rows[0].qtyMilli).toBe(1500n);
    expect(rows[0].unitPrice).toBe(90000n);
    expect(rows[1].qtyMilli).toBe(500n);
  });

  it("kasrli ming narx: 1.5 ming = 1500 so'm", () => {
    const { rows } = parseProductList('saqich 10 ta 1.5 ming');
    expect(rows[0].unitPrice).toBe(1500n);
  });

  it('bo\'sh matn — qator yo\'q', () => {
    expect(parseProductList('   \n ; ').rows).toEqual([]);
  });
});

describe('parseProductList — noaniq va to\'liqsiz kiritish', () => {
  it('narx yo\'q — narx bo\'sh qoladi, taxmin qilinmaydi', () => {
    const { rows } = parseProductList('non 3 ta');
    expect(rows[0].qtyMilli).toBe(3000n);
    expect(rows[0].unitPrice).toBeUndefined();
  });

  it("birliksiz miqdor — MISSING_UNIT ogohlantirishi", () => {
    const { rows } = parseProductList("non 3 4000 so'mdan");
    expect(rows[0].qtyMilli).toBe(3000n);
    expect(rows[0].unit).toBeUndefined();
    expect(codes(rows[0].issues)).toContain('MISSING_UNIT');
  });

  it("belgisiz ikki son — ASSUMED_ROLES ogohlantirishi", () => {
    const { rows } = parseProductList('non 3 4000');
    expect(rows[0].qtyMilli).toBe(3000n);
    expect(rows[0].unitPrice).toBe(4000n);
    expect(codes(rows[0].issues)).toContain('ASSUMED_ROLES');
  });

  it("bitta belgisiz son — ma'nosi aniq emas, qiymat qo'yilmaydi", () => {
    const { rows } = parseProductList('non 5');
    expect(rows[0].qtyMilli).toBeUndefined();
    expect(rows[0].unitPrice).toBeUndefined();
    expect(codes(rows[0].issues)).toContain('UNCLEAR_NUMBER');
  });

  it('ikki narx — AMBIGUOUS_NUMBERS xatosi', () => {
    const { rows } = parseProductList("non 3 ta 4000 so'm 5000 so'm");
    expect(rows[0].unitPrice).toBeUndefined();
    expect(rows[0].issues.find((i) => i.code === 'AMBIGUOUS_NUMBERS')?.severity).toBe('error');
  });

  it("nuqtali narx 13.000 — noaniq, rad etiladi", () => {
    const { rows } = parseProductList("non 3 ta 13.000 so'm");
    expect(rows[0].unitPrice).toBeUndefined();
    expect(codes(rows[0].issues)).toContain('PRICE_PARSE_ERROR');
  });

  it("kasrli narx 4000.5 so'm — butun so'm emas, rad etiladi", () => {
    const { rows } = parseProductList("non 3 ta 4000.5 so'm");
    expect(rows[0].unitPrice).toBeUndefined();
    expect(codes(rows[0].issues)).toContain('PRICE_PARSE_ERROR');
  });

  it('nomsiz qator — nom bo\'sh', () => {
    const { rows } = parseProductList("3 ta 4000 so'm");
    expect(rows[0].productName).toBe('');
  });
});

describe('parseProductList — butun sonli katta narxlar', () => {
  it("2 mln so'm = 2000000n", () => {
    const { rows } = parseProductList('televizor 1 ta 2 mln');
    expect(rows[0].unitPrice).toBe(2000000n);
  });

  it("100 000 000 so'm aniq BigInt sifatida", () => {
    const { rows } = parseProductList("uskuna 1 ta 100000000 so'm");
    expect(rows[0].unitPrice).toBe(100000000n);
    expect(typeof rows[0].unitPrice).toBe('bigint');
  });

  it("1.1 ming float xatosisiz 1100n", () => {
    const { rows } = parseProductList('ruchka 4 ta 1.1 ming');
    expect(rows[0].unitPrice).toBe(1100n);
  });
});

describe('parseQtyMilli', () => {
  it.each([
    ['3', 3000n],
    ['1.5', 1500n],
    ['1,5', 1500n],
    ['0.25', 250n],
    ['0', 0n],
  ])('%s → %s', (input, expected) => {
    expect(parseQtyMilli(input)).toEqual({ ok: true, qtyMilli: expected });
  });

  it('ming ko\'paytuvchisi', () => {
    expect(parseQtyMilli('2', 1000n)).toEqual({ ok: true, qtyMilli: 2000000n });
  });

  it.each(['1.500', '1,500', 'abc', '', '-3', '1.2.3'])('rad etiladi: "%s"', (input) => {
    expect(parseQtyMilli(input).ok).toBe(false);
  });
});

describe('parseUnitPriceText', () => {
  it.each([
    ['13000', 13000n],
    ['13 000', 13000n],
    ['13,000', 13000n],
    ['13 ming', 13000n],
    ['13ming', 13000n],
    ['1,5 ming', 1500n],
    ['2 mln', 2000000n],
    ["4000 so'm", 4000n],
    ['0', 0n],
  ])('"%s" → %s', (input, expected) => {
    expect(parseUnitPriceText(input)).toEqual({ ok: true, unitPrice: expected });
  });

  it.each(['', '   ', 'abc', '13.000', '4000.5', '-5', '1.2345 ming'])('rad etiladi: "%s"', (input) => {
    expect(parseUnitPriceText(input).ok).toBe(false);
  });
});
