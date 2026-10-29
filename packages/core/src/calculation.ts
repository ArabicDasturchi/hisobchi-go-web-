/**
 * @module calculation
 * Hisobchi Go — deterministik hisob-kitob moduli.
 *
 * Barcha pul hisob-kitoblari BigInt orqali amalga oshiriladi.
 * float/double ishlatilmaydi.
 *
 * Yaxlitlash formulasi:
 *   line_total = (qty_milli * unit_price + 500n) / 1000n
 *
 * BigInt bo'linishi avtomatik truncation (toward zero) qiladi,
 * bu musbat sonlar uchun floor() ga teng.
 * Manfiy qiymatlar rad etiladi.
 *
 * Har bir qator mustaqil yaxlitlanadi, keyin summalar yig'iladi.
 */

import type {
  CalculationLineInput,
  CalculationLineResult,
  CalculationDocumentResult,
} from './types.js';

/**
 * Bitta qator summasini hisoblaydi.
 *
 * Formula: (qtyMilli * unitPrice + 500n) / 1000n
 *
 * @param qtyMilli  — miqdor, mingdan bir aniqlikda (1000 = 1 birlik). >= 0n
 * @param unitPrice — birlik narxi, butun so'm. >= 0n
 * @returns qator summasi, butun so'm (BigInt)
 * @throws {Error} manfiy qtyMilli yoki unitPrice berilganda
 */
export function calculateLineTotal(qtyMilli: bigint, unitPrice: bigint): bigint {
  if (qtyMilli < 0n) {
    throw new Error(`Manfiy miqdor ruxsat etilmagan: qtyMilli=${qtyMilli}`);
  }
  if (unitPrice < 0n) {
    throw new Error(`Manfiy narx ruxsat etilmagan: unitPrice=${unitPrice}`);
  }

  // Formula: floor((qty_milli * unit_price + 500) / 1000)
  // BigInt division avtomatik truncation qiladi (musbat sonlar uchun = floor)
  return (qtyMilli * unitPrice + 500n) / 1000n;
}

/**
 * Hujjatning barcha qatorlari bo'yicha hisoblash.
 * Har bir qator mustaqil yaxlitlanadi, keyin summalar yig'iladi.
 *
 * @param lines — hisoblash uchun qatorlar ro'yxati
 * @returns har bir qator natijasi va umumiy subtotal
 * @throws {Error} har qanday qatorda manfiy qiymat berilganda
 */
export function calculateDocument(
  lines: readonly CalculationLineInput[],
): CalculationDocumentResult {
  const results: CalculationLineResult[] = [];
  let subtotal = 0n;

  for (const line of lines) {
    const lineTotal = calculateLineTotal(line.qtyMilli, line.unitPrice);
    results.push({
      qtyMilli: line.qtyMilli,
      unitPrice: line.unitPrice,
      lineTotal,
    });
    subtotal += lineTotal;
  }

  return {
    lines: results,
    subtotal,
  };
}
