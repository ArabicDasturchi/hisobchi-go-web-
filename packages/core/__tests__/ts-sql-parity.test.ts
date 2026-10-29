/**
 * @file ts-sql-parity.test.ts
 * TypeScript va PostgreSQL hisoblash formulalarining mosligi testlari.
 *
 * Bu testlar ikkala yo'lning bir xil natija berishini tekshiradi.
 * PostgreSQL hisoblash funksiyasi xuddi shu formulani ishlatadi:
 *   (qty_milli * unit_price + 500) / 1000
 *
 * Bu yerda PostgreSQL'ni chaqirmaymiz (tashqi muhit kerak),
 * lekin formulani TypeScript'da simulatsiya qilib, ikki yo'lni
 * qarama-qarshi tekshiramiz.
 *
 * Haqiqiy integratsiya testi — Supabase muhiti mavjud bo'lganda
 * 002_test_calculations.sql orqali bajariladi.
 */

import { describe, it, expect } from 'vitest';
import { calculateLineTotal, calculateDocument } from '../src/calculation.js';

/**
 * PostgreSQL formulasini simulatsiya qiladi.
 * PostgreSQL integer division ham truncation qiladi (BigInt kabi).
 * Bu mustaqil implementatsiya — calculation.ts dan import qilinmaydi.
 */
function pgSimulateLineTotal(qtyMilli: bigint, unitPrice: bigint): bigint {
  // PostgreSQL: (qty_milli * unit_price + 500) / 1000
  // bigint division = truncation toward zero
  return (qtyMilli * unitPrice + 500n) / 1000n;
}

// TypeScript va "PG simulatsiya" bir xil natija berishi kerak
interface TestCase {
  name: string;
  qtyMilli: bigint;
  unitPrice: bigint;
  expectedTotal: bigint;
}

const PARITY_TEST_CASES: TestCase[] = [
  // 385,000 so'm namuna qatorlari
  { name: 'chirmoq 10×13000', qtyMilli: 10000n, unitPrice: 13000n, expectedTotal: 130000n },
  { name: 'yurak 5×15000', qtyMilli: 5000n, unitPrice: 15000n, expectedTotal: 75000n },
  { name: 'momiq 20×9000', qtyMilli: 20000n, unitPrice: 9000n, expectedTotal: 180000n },

  // Kasrli miqdorlar
  { name: '0.5×7000', qtyMilli: 500n, unitPrice: 7000n, expectedTotal: 3500n },
  { name: '1.5×7000', qtyMilli: 1500n, unitPrice: 7000n, expectedTotal: 10500n },
  { name: '0.001×10000', qtyMilli: 1n, unitPrice: 10000n, expectedTotal: 10n },

  // Yaxlitlash chegaralari
  { name: '0.001×499=0 (pastga)', qtyMilli: 1n, unitPrice: 499n, expectedTotal: 0n },
  { name: '0.001×500=1 (yuqoriga)', qtyMilli: 1n, unitPrice: 500n, expectedTotal: 1n },
  { name: '0.001×501=1', qtyMilli: 1n, unitPrice: 501n, expectedTotal: 1n },
  { name: '0.001×1499=1', qtyMilli: 1n, unitPrice: 1499n, expectedTotal: 1n },
  { name: '0.001×1500=2', qtyMilli: 1n, unitPrice: 1500n, expectedTotal: 2n },

  // Nol
  { name: 'nol miqdor', qtyMilli: 0n, unitPrice: 13000n, expectedTotal: 0n },
  { name: 'nol narx', qtyMilli: 10000n, unitPrice: 0n, expectedTotal: 0n },

  // Katta qiymatlar
  { name: '1M birlik × 1M so\'m', qtyMilli: 1_000_000_000n, unitPrice: 1_000_000n, expectedTotal: 1_000_000_000_000n },

  // Amaliy misollar
  { name: '5 ta non 3000 so\'mdan', qtyMilli: 5000n, unitPrice: 3000n, expectedTotal: 15000n },
  { name: '2 kg olma 18000 so\'mdan', qtyMilli: 2000n, unitPrice: 18000n, expectedTotal: 36000n },
  { name: '3 ta sut 12000 so\'mdan', qtyMilli: 3000n, unitPrice: 12000n, expectedTotal: 36000n },
];

describe('TypeScript/SQL hisoblash mosligi (parity)', () => {
  for (const tc of PARITY_TEST_CASES) {
    it(`${tc.name}: TS va PG bir xil natija = ${tc.expectedTotal}`, () => {
      const tsResult = calculateLineTotal(tc.qtyMilli, tc.unitPrice);
      const pgResult = pgSimulateLineTotal(tc.qtyMilli, tc.unitPrice);

      // Ikkisi ham kutilgan natijaga teng
      expect(tsResult).toBe(tc.expectedTotal);
      expect(pgResult).toBe(tc.expectedTotal);

      // Bir-biriga teng
      expect(tsResult).toBe(pgResult);
    });
  }

  it('385,000 so\'m namuna — hujjat jami', () => {
    const tsDoc = calculateDocument([
      { qtyMilli: 10000n, unitPrice: 13000n },
      { qtyMilli: 5000n, unitPrice: 15000n },
      { qtyMilli: 20000n, unitPrice: 9000n },
    ]);

    // PG simulatsiya
    const pgTotal =
      pgSimulateLineTotal(10000n, 13000n) +
      pgSimulateLineTotal(5000n, 15000n) +
      pgSimulateLineTotal(20000n, 9000n);

    expect(tsDoc.subtotal).toBe(385000n);
    expect(pgTotal).toBe(385000n);
    expect(tsDoc.subtotal).toBe(pgTotal);
  });

  it('amaliy misol: non + olma + sut', () => {
    const tsDoc = calculateDocument([
      { qtyMilli: 5000n, unitPrice: 3000n },   // non
      { qtyMilli: 2000n, unitPrice: 18000n },  // olma
      { qtyMilli: 3000n, unitPrice: 12000n },  // sut
    ]);

    const pgTotal =
      pgSimulateLineTotal(5000n, 3000n) +
      pgSimulateLineTotal(2000n, 18000n) +
      pgSimulateLineTotal(3000n, 12000n);

    // 15000 + 36000 + 36000 = 87000
    expect(tsDoc.subtotal).toBe(87000n);
    expect(pgTotal).toBe(87000n);
    expect(tsDoc.subtotal).toBe(pgTotal);
  });
});
