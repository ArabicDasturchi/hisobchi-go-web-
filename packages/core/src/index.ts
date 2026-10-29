/**
 * @module @hisobchi/core
 * Hisobchi Go — asosiy hisob-kitob, validatsiya va parsing moduli.
 *
 * Bu paket UI yoki serverdan mustaqil ishlaydi.
 * Barcha pul hisob-kitoblari BigInt orqali amalga oshiriladi.
 */

// Tiplar
export type {
  CalculationLineInput,
  CalculationLineResult,
  CalculationDocumentResult,
  ParsedNumber,
  ParseNumberError,
  ParseNumberResult,
  IssueSeverity,
  ValidationIssue,
  LineValidationResult,
  DocumentLineInput,
  DocumentValidationResult,
  AllowedUnit,
} from './types.js';

// Konstantalar
export {
  MAX_UNIT_PRICE,
  MAX_QTY_MILLI,
  ALLOWED_UNITS,
} from './types.js';

// Hisob-kitob
export { calculateLineTotal, calculateDocument } from './calculation.js';

// Son parseri
export { parseUzNumber } from './parse-uz-number.js';

// Validatsiya
export { validateLine, validateDocument } from './validation.js';

// Normalizatsiya
export { normalizeProductName } from './normalize.js';
