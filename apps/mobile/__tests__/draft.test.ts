import { describe, expect, it } from 'vitest';
import { parseProductList } from '@hisobchi/core';
import { editRow, emptyRow, rowsFromParsed, summarizeDraft, toSaleLines } from '../src/features/draft';
import { formatQty, formatSom } from '../src/lib/format';

let n = 0;
const key = () => `k${n++}`;

describe('draft — tahlildan tasdiqlashgacha', () => {
  it("toza namuna darhol tasdiqlashga tayyor, oldindan ko'rish 69 000", () => {
    const rows = rowsFromParsed(
      parseProductList("3 ta non 4000 so'mdan\n2 litr sut 12000 so'mdan\n5 kg shakar 15000 so'mdan"),
      key,
    );
    const s = summarizeDraft(rows);
    expect(s.canConfirm).toBe(true);
    expect(s.evals.map((e) => e.lineTotal)).toEqual([12000n, 24000n, 75000n]);
    expect(s.previewTotal).toBe(111000n);
    expect(toSaleLines(rows)[1]).toEqual({
      productName: 'sut',
      qtyMilli: 2000n,
      unit: 'litr',
      unitPrice: 12000n,
      rawText: "2 litr sut 12000 so'mdan",
    });
  });

  it("narxsiz qator bloklaydi, narx kiritilgach hal bo'ladi", () => {
    let rows = rowsFromParsed(parseProductList('non 3 ta'), key);
    expect(summarizeDraft(rows).evals[0].status).toBe('error');
    expect(summarizeDraft(rows).canConfirm).toBe(false);
    expect(() => toSaleLines(rows)).toThrow();
    rows = [editRow(rows[0], { priceText: '4 ming' })];
    const s = summarizeDraft(rows);
    expect(s.canConfirm).toBe(true);
    expect(s.evals[0].lineTotal).toBe(12000n);
  });

  it('ogohlantirishli (sariq) qator faqat tasdiqlangandan keyin tayyor', () => {
    const rows = rowsFromParsed(parseProductList('non 3 4000'), key);
    rows[0].unit = 'dona';
    expect(summarizeDraft(rows).evals[0].status).toBe('warning');
    expect(summarizeDraft(rows).canConfirm).toBe(false);
    const acked = [{ ...rows[0], acknowledged: true }];
    expect(summarizeDraft(acked).canConfirm).toBe(true);
  });

  it("birliksiz qator — birlik tanlanmaguncha xato", () => {
    const rows = rowsFromParsed(parseProductList("non 3 4000 so'm"), key);
    expect(summarizeDraft(rows).evals[0].errors.map((e) => e.code)).toContain('MISSING_UNIT');
    const fixed = [editRow(rows[0], { unit: 'dona' })];
    expect(summarizeDraft(fixed).canConfirm).toBe(true);
  });

  it("noto'g'ri miqdor matni xato beradi", () => {
    const row = editRow({ ...emptyRow('m'), productName: 'non', priceText: '4000' }, { qtyText: '1.500' });
    const e = summarizeDraft([row]).evals[0];
    expect(e.errors.map((x) => x.code)).toContain('QTY_PARSE_ERROR');
    expect(e.lineTotal).toBeUndefined();
  });

  it("qo'lda qo'shilgan qator asl matn ogohlantirishisiz tayyor bo'ladi", () => {
    const row = { ...emptyRow('m'), productName: 'tuz', qtyText: '2', priceText: '3500' };
    const s = summarizeDraft([row]);
    expect(s.canConfirm).toBe(true);
    expect(toSaleLines([row])[0].rawText).toBeNull();
  });

  it("bo'sh qoralama tasdiqlanmaydi", () => {
    expect(summarizeDraft([]).canConfirm).toBe(false);
  });
});

describe('format', () => {
  it("so'm formati", () => {
    expect(formatSom(385000n)).toBe("385 000 so'm");
    expect(formatSom(0n)).toBe("0 so'm");
    expect(formatSom(100000000000000n)).toBe("100 000 000 000 000 so'm");
  });
  it('miqdor formati', () => {
    expect(formatQty(3000n)).toBe('3');
    expect(formatQty(1500n)).toBe('1,5');
    expect(formatQty(250n)).toBe('0,25');
    expect(formatQty(1005n)).toBe('1,005');
  });
});
