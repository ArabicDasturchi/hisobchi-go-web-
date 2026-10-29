/**
 * @module types
 * Hisobchi Go core — barcha tiplar va interfeyslar.
 *
 * Pul qiymatlari: butun so'm, BigInt.
 * Miqdor: qty_milli (1000 = 1 birlik), BigInt.
 * float/double pul yoki miqdor formulalarida ishlatilmaydi.
 *
 * JSON serializatsiyada BigInt to'g'ridan-to'g'ri yuborilmaydi;
 * API chegarasida string formatidan foydalaniladi.
 */

// ---------------------------------------------------------------------------
// Hisob-kitob tiplari
// ---------------------------------------------------------------------------

/** Savdo hujjatining bitta qatori — hisoblash uchun kerakli maydonlar */
export interface CalculationLineInput {
  /** Miqdor, mingdan bir aniqlikda (1000 = 1 birlik). Musbat yoki nol. */
  qtyMilli: bigint;
  /** Birlik narxi, butun so'm. Musbat yoki nol. */
  unitPrice: bigint;
}

/** Bitta qator uchun hisoblash natijasi */
export interface CalculationLineResult {
  /** Kiritilgan miqdor */
  qtyMilli: bigint;
  /** Kiritilgan birlik narxi */
  unitPrice: bigint;
  /** Hisoblangan qator summasi, butun so'm */
  lineTotal: bigint;
}

/** Butun hujjat uchun hisoblash natijasi */
export interface CalculationDocumentResult {
  /** Har bir qator uchun natijalar */
  lines: CalculationLineResult[];
  /** Qator summalarining yig'indisi */
  subtotal: bigint;
}

// ---------------------------------------------------------------------------
// Parsing tiplari
// ---------------------------------------------------------------------------

/** parseUzNumber natijasi */
export interface ParsedNumber {
  /** Aniqlangan son qiymati */
  value: number;
  /** Kiritilgan asl matn */
  raw: string;
}

/** parseUzNumber xatosi yoki ogohlantirishlar */
export interface ParseNumberError {
  /** Xato turi */
  code: 'EMPTY_INPUT' | 'INVALID_FORMAT' | 'NEGATIVE_VALUE' | 'EXCEEDS_MAX' | 'AMBIGUOUS_FORMAT';
  /** Inson uchun tushunarli xabar */
  message: string;
  /** Kiritilgan asl matn */
  raw: string;
}

/** parseUzNumber natijasi — muvaffaqiyat yoki xato */
export type ParseNumberResult =
  | { ok: true; data: ParsedNumber }
  | { ok: false; error: ParseNumberError };

// ---------------------------------------------------------------------------
// Validatsiya tiplari
// ---------------------------------------------------------------------------

/** Ogohlantirish yoki xato darajasi */
export type IssueSeverity = 'error' | 'warning';

/** Bitta validatsiya muammosi */
export interface ValidationIssue {
  /** Muammo identifikatori */
  code: string;
  /** Inson uchun tushunarli xabar (o'zbekcha) */
  message: string;
  /** 'error' = bloklovchi, 'warning' = ogohlantirish (sariq rang) */
  severity: IssueSeverity;
  /** Muammo tegishli bo'lgan maydon nomi */
  field?: string;
}

/** Bitta qator uchun validatsiya natijasi */
export interface LineValidationResult {
  /** Qator indeksi (0 dan boshlab) */
  lineIndex: number;
  /** Topilgan muammolar ro'yxati */
  issues: ValidationIssue[];
  /** Bloklovchi xato bormi? */
  hasBlockingError: boolean;
  /** Ogohlantirish bormi? (sariq qator) */
  hasWarning: boolean;
}

/** Hujjat validatsiyasi uchun kiritish */
export interface DocumentLineInput {
  /** Mahsulot nomi (bo'sh bo'lishi mumkin — xato) */
  productName?: string;
  /** Miqdor, mingdan bir aniqlikda */
  qtyMilli?: bigint;
  /** O'lchov birligi */
  unit?: string;
  /** Birlik narxi, butun so'm */
  unitPrice?: bigint;
  /** AI ishonchliligi (0-1 oralig'ida) */
  confidence?: number;
  /** Asl matn fragmenti */
  rawText?: string;
}

/** Butun hujjat uchun validatsiya natijasi */
export interface DocumentValidationResult {
  /** Umumiy validatsiya muvaffaqiyatli (bloklovchi xato yo'q) */
  isValid: boolean;
  /** Hujjatda ogohlantirish bormi */
  hasWarnings: boolean;
  /** Har bir qator uchun validatsiya natijalari */
  lines: LineValidationResult[];
  /** Hujjat darajasidagi muammolar */
  documentIssues: ValidationIssue[];
}

// ---------------------------------------------------------------------------
// Chegaralar (konstantalar)
// ---------------------------------------------------------------------------

/**
 * Maksimal ruxsat etilgan birlik narxi: 100,000,000 so'm (100 mln so'm).
 * Bu ulgurji savdo uchun oqilona yuqori chegara.
 * Hujjatlarda aniq belgilanmagan — QARORLAR.md ga qayd etiladi.
 */
export const MAX_UNIT_PRICE = 100_000_000n;

/**
 * Maksimal ruxsat etilgan miqdor qty_milli da: 1,000,000,000 (1 mln birlik).
 * Hujjatlarda aniq belgilanmagan — QARORLAR.md ga qayd etiladi.
 */
export const MAX_QTY_MILLI = 1_000_000_000n;

/**
 * Ruxsat etilgan o'lchov birliklari.
 * Hujjatlarda to'liq ro'yxat belgilanmagan — MVP uchun asosiy birliklar.
 */
export const ALLOWED_UNITS = [
  'dona',
  'kg',
  'g',
  'litr',
  'metr',
  'pachka',
  'qop',
  'karobka',
  'tonna',
] as const;

export type AllowedUnit = typeof ALLOWED_UNITS[number];
