/**
 * @module validation
 * Hisobchi Go — hujjat va qator validatsiyasi.
 *
 * Bloklovchi xatolar (severity: 'error'):
 *   - Mahsulot nomi yo'q
 *   - Miqdor yo'q, nol yoki manfiy
 *   - Narx yo'q yoki manfiy
 *   - Chegaradan oshgan qiymatlar
 *
 * Ogohlantirishlar (severity: 'warning') — sariq rang:
 *   - AI ishonchliligi past
 *   - Birlik noma'lum
 *   - Asl matn fragmenti yo'q
 *
 * Bloklovchi xato bor hujjat tasdiqlanishi mumkin emas.
 */

import type {
  DocumentLineInput,
  DocumentValidationResult,
  LineValidationResult,
  ValidationIssue,
} from './types.js';
import { MAX_UNIT_PRICE, MAX_QTY_MILLI, ALLOWED_UNITS } from './types.js';

/**
 * AI ishonchlilik chegarasi. Bundan past = ogohlantirish.
 * Hujjatlarda aniq belgilanmagan — QARORLAR.md ga qayd etiladi.
 */
const CONFIDENCE_THRESHOLD = 0.7;

/**
 * Bitta savdo qatorini tekshiradi.
 *
 * @param line — tekshiriladigan qator
 * @param lineIndex — qator indeksi (0 dan)
 * @returns validatsiya natijasi
 */
export function validateLine(
  line: DocumentLineInput,
  lineIndex: number,
): LineValidationResult {
  const issues: ValidationIssue[] = [];

  // --- Bloklovchi xatolar (error) ---

  // Mahsulot nomi
  if (!line.productName || line.productName.trim() === '') {
    issues.push({
      code: 'MISSING_PRODUCT_NAME',
      message: "Mahsulot nomi ko'rsatilmagan",
      severity: 'error',
      field: 'productName',
    });
  }

  // Miqdor
  if (line.qtyMilli === undefined || line.qtyMilli === null) {
    issues.push({
      code: 'MISSING_QTY',
      message: "Miqdor ko'rsatilmagan",
      severity: 'error',
      field: 'qtyMilli',
    });
  } else if (line.qtyMilli < 0n) {
    issues.push({
      code: 'NEGATIVE_QTY',
      message: 'Manfiy miqdor ruxsat etilmagan',
      severity: 'error',
      field: 'qtyMilli',
    });
  } else if (line.qtyMilli === 0n) {
    issues.push({
      code: 'ZERO_QTY',
      message: 'Miqdor nolga teng',
      severity: 'error',
      field: 'qtyMilli',
    });
  } else if (line.qtyMilli > MAX_QTY_MILLI) {
    issues.push({
      code: 'QTY_EXCEEDS_MAX',
      message: `Miqdor ruxsat etilgan chegaradan oshgan (max: ${MAX_QTY_MILLI})`,
      severity: 'error',
      field: 'qtyMilli',
    });
  }

  // Narx
  if (line.unitPrice === undefined || line.unitPrice === null) {
    issues.push({
      code: 'MISSING_PRICE',
      message: "Birlik narxi ko'rsatilmagan",
      severity: 'error',
      field: 'unitPrice',
    });
  } else if (line.unitPrice < 0n) {
    issues.push({
      code: 'NEGATIVE_PRICE',
      message: 'Manfiy narx ruxsat etilmagan',
      severity: 'error',
      field: 'unitPrice',
    });
  } else if (line.unitPrice > MAX_UNIT_PRICE) {
    issues.push({
      code: 'PRICE_EXCEEDS_MAX',
      message: `Birlik narxi ruxsat etilgan chegaradan oshgan (max: ${MAX_UNIT_PRICE} so'm)`,
      severity: 'error',
      field: 'unitPrice',
    });
  }

  // --- Ogohlantirishlar (warning) — sariq rang ---

  // AI ishonchliligi past
  if (
    line.confidence !== undefined &&
    line.confidence !== null &&
    line.confidence < CONFIDENCE_THRESHOLD
  ) {
    issues.push({
      code: 'LOW_CONFIDENCE',
      message: `AI ishonchliligi past (${(line.confidence * 100).toFixed(0)}%)`,
      severity: 'warning',
      field: 'confidence',
    });
  }

  // Birlik noma'lum
  if (line.unit !== undefined && line.unit !== null && line.unit.trim() !== '') {
    const normalizedUnit = line.unit.trim().toLowerCase();
    if (!ALLOWED_UNITS.includes(normalizedUnit as typeof ALLOWED_UNITS[number])) {
      issues.push({
        code: 'UNKNOWN_UNIT',
        message: `Noma'lum o'lchov birligi: "${line.unit}"`,
        severity: 'warning',
        field: 'unit',
      });
    }
  }

  // Asl matn fragmenti yo'q
  if (!line.rawText || line.rawText.trim() === '') {
    issues.push({
      code: 'MISSING_RAW_TEXT',
      message: 'Asl matn fragmenti saqlanmagan',
      severity: 'warning',
      field: 'rawText',
    });
  }

  const hasBlockingError = issues.some((i) => i.severity === 'error');
  const hasWarning = issues.some((i) => i.severity === 'warning');

  return {
    lineIndex,
    issues,
    hasBlockingError,
    hasWarning,
  };
}

/**
 * Butun savdo hujjatini tekshiradi.
 *
 * @param lines — tekshiriladigan qatorlar ro'yxati
 * @returns hujjat validatsiya natijasi
 */
export function validateDocument(
  lines: readonly DocumentLineInput[],
): DocumentValidationResult {
  const documentIssues: ValidationIssue[] = [];

  // Bo'sh hujjat
  if (lines.length === 0) {
    documentIssues.push({
      code: 'EMPTY_DOCUMENT',
      message: "Hujjatda birorta ham qator yo'q",
      severity: 'error',
    });
  }

  // Har bir qatorni tekshirish
  const lineResults: LineValidationResult[] = lines.map((line, index) =>
    validateLine(line, index),
  );

  const anyBlockingError =
    documentIssues.some((i) => i.severity === 'error') ||
    lineResults.some((lr) => lr.hasBlockingError);

  const anyWarning =
    documentIssues.some((i) => i.severity === 'warning') ||
    lineResults.some((lr) => lr.hasWarning);

  return {
    isValid: !anyBlockingError,
    hasWarnings: anyWarning,
    lines: lineResults,
    documentIssues,
  };
}
