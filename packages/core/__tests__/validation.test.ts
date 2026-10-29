/**
 * @file validation.test.ts
 * Hujjat va qator validatsiya testlari.
 */

import { describe, it, expect } from 'vitest';
import { validateLine, validateDocument } from '../src/validation.js';
import type { DocumentLineInput } from '../src/types.js';
import { MAX_UNIT_PRICE, MAX_QTY_MILLI } from '../src/types.js';

// ---------------------------------------------------------------------------
// Yordamchi: to'liq yaroqli qator
// ---------------------------------------------------------------------------

function validLine(overrides: Partial<DocumentLineInput> = {}): DocumentLineInput {
  return {
    productName: 'chirmoq',
    qtyMilli: 10000n,
    unit: 'dona',
    unitPrice: 13000n,
    confidence: 0.95,
    rawText: 'chirmoq 10 ta 13 ming',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// validateLine — bitta qator
// ---------------------------------------------------------------------------

describe('validateLine', () => {
  // --- Yaroqli qator ---

  it("to'liq yaroqli qator — bloklovchi xato yo'q", () => {
    const result = validateLine(validLine(), 0);
    expect(result.hasBlockingError).toBe(false);
    expect(result.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  // --- Bloklovchi xatolar (error) ---

  it("mahsulot nomi yo'q — bloklovchi xato", () => {
    const result = validateLine(validLine({ productName: undefined }), 0);
    expect(result.hasBlockingError).toBe(true);
    expect(result.issues.some((i) => i.code === 'MISSING_PRODUCT_NAME')).toBe(true);
  });

  it("bo'sh mahsulot nomi — bloklovchi xato", () => {
    const result = validateLine(validLine({ productName: '   ' }), 0);
    expect(result.hasBlockingError).toBe(true);
    expect(result.issues.some((i) => i.code === 'MISSING_PRODUCT_NAME')).toBe(true);
  });

  it("miqdor yo'q — bloklovchi xato", () => {
    const result = validateLine(validLine({ qtyMilli: undefined }), 0);
    expect(result.hasBlockingError).toBe(true);
    expect(result.issues.some((i) => i.code === 'MISSING_QTY')).toBe(true);
  });

  it('manfiy miqdor — bloklovchi xato', () => {
    const result = validateLine(validLine({ qtyMilli: -1000n }), 0);
    expect(result.hasBlockingError).toBe(true);
    expect(result.issues.some((i) => i.code === 'NEGATIVE_QTY')).toBe(true);
  });

  it('nol miqdor — bloklovchi xato', () => {
    const result = validateLine(validLine({ qtyMilli: 0n }), 0);
    expect(result.hasBlockingError).toBe(true);
    expect(result.issues.some((i) => i.code === 'ZERO_QTY')).toBe(true);
  });

  it('miqdor chegaradan oshgan — bloklovchi xato', () => {
    const result = validateLine(validLine({ qtyMilli: MAX_QTY_MILLI + 1n }), 0);
    expect(result.hasBlockingError).toBe(true);
    expect(result.issues.some((i) => i.code === 'QTY_EXCEEDS_MAX')).toBe(true);
  });

  it("narx yo'q — bloklovchi xato", () => {
    const result = validateLine(validLine({ unitPrice: undefined }), 0);
    expect(result.hasBlockingError).toBe(true);
    expect(result.issues.some((i) => i.code === 'MISSING_PRICE')).toBe(true);
  });

  it('manfiy narx — bloklovchi xato', () => {
    const result = validateLine(validLine({ unitPrice: -5000n }), 0);
    expect(result.hasBlockingError).toBe(true);
    expect(result.issues.some((i) => i.code === 'NEGATIVE_PRICE')).toBe(true);
  });

  it('narx chegaradan oshgan — bloklovchi xato', () => {
    const result = validateLine(validLine({ unitPrice: MAX_UNIT_PRICE + 1n }), 0);
    expect(result.hasBlockingError).toBe(true);
    expect(result.issues.some((i) => i.code === 'PRICE_EXCEEDS_MAX')).toBe(true);
  });

  // --- Ogohlantirishlar (warning) — sariq rang ---

  it('past confidence — ogohlantirish', () => {
    const result = validateLine(validLine({ confidence: 0.5 }), 0);
    expect(result.hasBlockingError).toBe(false);
    expect(result.hasWarning).toBe(true);
    expect(result.issues.some((i) => i.code === 'LOW_CONFIDENCE')).toBe(true);
  });

  it("noma'lum birlik — ogohlantirish", () => {
    const result = validateLine(validLine({ unit: 'baraban' }), 0);
    expect(result.hasBlockingError).toBe(false);
    expect(result.hasWarning).toBe(true);
    expect(result.issues.some((i) => i.code === 'UNKNOWN_UNIT')).toBe(true);
  });

  it("asl matn fragmenti yo'q — ogohlantirish", () => {
    const result = validateLine(validLine({ rawText: undefined }), 0);
    expect(result.hasWarning).toBe(true);
    expect(result.issues.some((i) => i.code === 'MISSING_RAW_TEXT')).toBe(true);
  });

  // --- Ruxsat etilgan birliklar ---

  it("'dona' ruxsat etilgan birlik — ogohlantirish yo'q", () => {
    const result = validateLine(validLine({ unit: 'dona' }), 0);
    expect(result.issues.some((i) => i.code === 'UNKNOWN_UNIT')).toBe(false);
  });

  it("'kg' ruxsat etilgan birlik — ogohlantirish yo'q", () => {
    const result = validateLine(validLine({ unit: 'kg' }), 0);
    expect(result.issues.some((i) => i.code === 'UNKNOWN_UNIT')).toBe(false);
  });

  // --- Qator indeksi ---

  it('lineIndex to\'g\'ri saqlanadi', () => {
    const result = validateLine(validLine(), 5);
    expect(result.lineIndex).toBe(5);
  });

  // --- Bir nechta muammo ---

  it("bir qatorda bir nechta xato bo'lishi mumkin", () => {
    const result = validateLine(
      validLine({
        productName: undefined,
        qtyMilli: undefined,
        unitPrice: undefined,
      }),
      0,
    );
    expect(result.hasBlockingError).toBe(true);
    const errors = result.issues.filter((i) => i.severity === 'error');
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// validateDocument — butun hujjat
// ---------------------------------------------------------------------------

describe('validateDocument', () => {
  it("yaroqli hujjat — isValid: true", () => {
    const result = validateDocument([
      validLine(),
      validLine({ productName: 'yurak', qtyMilli: 5000n, unitPrice: 15000n }),
    ]);
    expect(result.isValid).toBe(true);
    expect(result.hasWarnings).toBe(false);
    expect(result.documentIssues).toHaveLength(0);
  });

  it("bo'sh hujjat — bloklovchi xato", () => {
    const result = validateDocument([]);
    expect(result.isValid).toBe(false);
    expect(result.documentIssues.some((i) => i.code === 'EMPTY_DOCUMENT')).toBe(true);
  });

  it('bitta noaniq qator — ogohlantirish bor, lekin isValid (bloklovchi emas)', () => {
    const result = validateDocument([
      validLine(),
      validLine({ confidence: 0.3 }),
    ]);
    expect(result.isValid).toBe(true);
    expect(result.hasWarnings).toBe(true);
  });

  it("bitta xatoli qator — hujjat isValid emas", () => {
    const result = validateDocument([
      validLine(),
      validLine({ productName: undefined }), // xato
    ]);
    expect(result.isValid).toBe(false);
  });

  it("har bir qator uchun alohida natija qaytadi", () => {
    const result = validateDocument([
      validLine(),
      validLine({ productName: undefined }),
      validLine({ confidence: 0.2 }),
    ]);
    expect(result.lines).toHaveLength(3);
    expect(result.lines[0].hasBlockingError).toBe(false);
    expect(result.lines[1].hasBlockingError).toBe(true);
    expect(result.lines[2].hasWarning).toBe(true);
  });

  it("faqat ogohlantirish — isValid: true, hasWarnings: true", () => {
    const result = validateDocument([
      validLine({ unit: 'noma_lum_birlik' }),
    ]);
    expect(result.isValid).toBe(true);
    expect(result.hasWarnings).toBe(true);
  });
});
