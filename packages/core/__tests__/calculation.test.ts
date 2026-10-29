/**
 * @file calculation.test.ts
 * Hisob-kitob modulini testlash.
 *
 * Barcha kutilgan natijalar qo'lda hisoblangan.
 * Tekshirilayotgan funksiya natijasi expected sifatida ishlatilmaydi.
 */

import { describe, it, expect } from 'vitest';
import { calculateLineTotal, calculateDocument } from '../src/calculation.js';

// ---------------------------------------------------------------------------
// calculateLineTotal — bitta qator summasi
// ---------------------------------------------------------------------------

describe('calculateLineTotal', () => {
  // --- Asosiy namuna: 385,000 so'm ---

  it("chirmoq: 10 × 13000 = 130,000 so'm", () => {
    // qty_milli=10000 (10 dona), unit_price=13000 so'm
    // (10000 * 13000 + 500) / 1000 = 130000500 / 1000 = 130000n
    expect(calculateLineTotal(10000n, 13000n)).toBe(130000n);
  });

  it("yurak: 5 × 15000 = 75,000 so'm", () => {
    // (5000 * 15000 + 500) / 1000 = 75000500 / 1000 = 75000n
    expect(calculateLineTotal(5000n, 15000n)).toBe(75000n);
  });

  it("momiq: 20 × 9000 = 180,000 so'm", () => {
    // (20000 * 9000 + 500) / 1000 = 180000500 / 1000 = 180000n
    expect(calculateLineTotal(20000n, 9000n)).toBe(180000n);
  });

  // --- Butun miqdor, oddiy narx ---

  it('1 dona × 1000 so\'m = 1000 so\'m', () => {
    // (1000 * 1000 + 500) / 1000 = 1000500 / 1000 = 1000n
    expect(calculateLineTotal(1000n, 1000n)).toBe(1000n);
  });

  it('1 dona × 1 so\'m = 1 so\'m', () => {
    // (1000 * 1 + 500) / 1000 = 1500 / 1000 = 1n
    expect(calculateLineTotal(1000n, 1n)).toBe(1n);
  });

  // --- Kasrli miqdor ---

  it('0.5 birlik × 7000 so\'m = 3500 so\'m', () => {
    // qty_milli=500 (0.5 birlik)
    // (500 * 7000 + 500) / 1000 = 3500500 / 1000 = 3500n
    expect(calculateLineTotal(500n, 7000n)).toBe(3500n);
  });

  it('1.5 birlik × 7000 so\'m = 10500 so\'m', () => {
    // qty_milli=1500
    // (1500 * 7000 + 500) / 1000 = 10500500 / 1000 = 10500n
    expect(calculateLineTotal(1500n, 7000n)).toBe(10500n);
  });

  it('0.001 birlik × 10000 so\'m = 10 so\'m', () => {
    // qty_milli=1 (eng kichik o'lchov)
    // (1 * 10000 + 500) / 1000 = 10500 / 1000 = 10n
    expect(calculateLineTotal(1n, 10000n)).toBe(10n);
  });

  // --- Yaxlitlash chegaralari ---

  it('yaxlitlash: 0.001 × 499 so\'m = 0 so\'m (pastga yaxlitlanadi)', () => {
    // (1 * 499 + 500) / 1000 = 999 / 1000 = 0n (BigInt truncation)
    expect(calculateLineTotal(1n, 499n)).toBe(0n);
  });

  it('yaxlitlash: 0.001 × 500 so\'m = 1 so\'m (yuqoriga yaxlitlanadi)', () => {
    // (1 * 500 + 500) / 1000 = 1000 / 1000 = 1n
    expect(calculateLineTotal(1n, 500n)).toBe(1n);
  });

  it('yaxlitlash: 0.001 × 501 so\'m = 1 so\'m', () => {
    // (1 * 501 + 500) / 1000 = 1001 / 1000 = 1n
    expect(calculateLineTotal(1n, 501n)).toBe(1n);
  });

  it('yaxlitlash: 0.001 × 1499 so\'m = 1 so\'m', () => {
    // (1 * 1499 + 500) / 1000 = 1999 / 1000 = 1n
    expect(calculateLineTotal(1n, 1499n)).toBe(1n);
  });

  it('yaxlitlash: 0.001 × 1500 so\'m = 2 so\'m', () => {
    // (1 * 1500 + 500) / 1000 = 2000 / 1000 = 2n
    expect(calculateLineTotal(1n, 1500n)).toBe(2n);
  });

  // --- Nol qiymatlar ---

  it('nol miqdor = 0 so\'m', () => {
    // (0 * 13000 + 500) / 1000 = 500 / 1000 = 0n
    expect(calculateLineTotal(0n, 13000n)).toBe(0n);
  });

  it('nol narx = 0 so\'m', () => {
    // (10000 * 0 + 500) / 1000 = 500 / 1000 = 0n
    expect(calculateLineTotal(10000n, 0n)).toBe(0n);
  });

  it('nol miqdor va nol narx = 0 so\'m', () => {
    // (0 * 0 + 500) / 1000 = 500 / 1000 = 0n
    expect(calculateLineTotal(0n, 0n)).toBe(0n);
  });

  // --- Katta qiymatlar (BigInt xavfsizligi) ---

  it('katta miqdor va katta narx — BigInt bilan xavfsiz', () => {
    // 1,000,000 birlik × 1,000,000 so'm = 1,000,000,000,000 so'm (1 trln)
    // qty_milli = 1_000_000_000 (1 mln birlik)
    // (1_000_000_000 * 1_000_000 + 500) / 1000 = 1_000_000_000_000n
    expect(calculateLineTotal(1_000_000_000n, 1_000_000n)).toBe(1_000_000_000_000n);
  });

  it('Number.MAX_SAFE_INTEGER ni oshadigan hisob — BigInt bilan xavfsiz', () => {
    // Bu test Number bilan overflow bo'lar edi, BigInt bilan emas
    const qtyMilli = 9_007_199_254n; // ~9 mln birlik
    const unitPrice = 1_000_000n;    // 1 mln so'm
    // (9007199254 * 1000000 + 500) / 1000 = 9_007_199_254_000n
    expect(calculateLineTotal(qtyMilli, unitPrice)).toBe(9_007_199_254_000n);
  });

  // --- Manfiy qiymatlar (xato) ---

  it('manfiy miqdor — xato', () => {
    expect(() => calculateLineTotal(-1000n, 5000n)).toThrow('Manfiy miqdor');
  });

  it('manfiy narx — xato', () => {
    expect(() => calculateLineTotal(1000n, -5000n)).toThrow('Manfiy narx');
  });

  it('ikkisi ham manfiy — miqdor xatosi birinchi', () => {
    expect(() => calculateLineTotal(-1000n, -5000n)).toThrow('Manfiy miqdor');
  });
});

// ---------------------------------------------------------------------------
// calculateDocument — butun hujjat
// ---------------------------------------------------------------------------

describe('calculateDocument', () => {
  it("385,000 so'm namuna — uch qator", () => {
    const result = calculateDocument([
      { qtyMilli: 10000n, unitPrice: 13000n }, // chirmoq
      { qtyMilli: 5000n, unitPrice: 15000n },  // yurak
      { qtyMilli: 20000n, unitPrice: 9000n },  // momiq
    ]);

    expect(result.lines).toHaveLength(3);
    expect(result.lines[0].lineTotal).toBe(130000n);
    expect(result.lines[1].lineTotal).toBe(75000n);
    expect(result.lines[2].lineTotal).toBe(180000n);
    expect(result.subtotal).toBe(385000n);
  });

  it("bo'sh hujjat — subtotal 0", () => {
    const result = calculateDocument([]);
    expect(result.lines).toHaveLength(0);
    expect(result.subtotal).toBe(0n);
  });

  it('bir qatorli hujjat', () => {
    const result = calculateDocument([
      { qtyMilli: 2000n, unitPrice: 50000n },
    ]);
    // (2000 * 50000 + 500) / 1000 = 100000500 / 1000 = 100000n
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].lineTotal).toBe(100000n);
    expect(result.subtotal).toBe(100000n);
  });

  it('ko\'p qatorli hujjat — har bir qator mustaqil yaxlitlanadi', () => {
    // 2 qator: har biri 0.001 × 750 so'm
    // Qator 1: (1 * 750 + 500) / 1000 = 1250 / 1000 = 1n
    // Qator 2: (1 * 750 + 500) / 1000 = 1250 / 1000 = 1n
    // Jami: 1 + 1 = 2n
    // Agar yaxlitlashsiz yig'ilsa: (1*750 + 1*750 + 500) / 1000 = 2000/1000 = 2n
    // Bu holatda natija bir xil, lekin prinsip — har bir qator mustaqil yaxlitlanadi
    const result = calculateDocument([
      { qtyMilli: 1n, unitPrice: 750n },
      { qtyMilli: 1n, unitPrice: 750n },
    ]);
    expect(result.lines[0].lineTotal).toBe(1n);
    expect(result.lines[1].lineTotal).toBe(1n);
    expect(result.subtotal).toBe(2n);
  });

  it('qator natijalari to\'g\'ri kiritish ma\'lumotlarini saqlaydi', () => {
    const result = calculateDocument([
      { qtyMilli: 3000n, unitPrice: 25000n },
    ]);
    expect(result.lines[0].qtyMilli).toBe(3000n);
    expect(result.lines[0].unitPrice).toBe(25000n);
  });

  it('manfiy qiymatli qator hujjatda ham xato beradi', () => {
    expect(() =>
      calculateDocument([
        { qtyMilli: 1000n, unitPrice: 13000n },
        { qtyMilli: -1000n, unitPrice: 5000n }, // xato
      ]),
    ).toThrow('Manfiy miqdor');
  });
});
