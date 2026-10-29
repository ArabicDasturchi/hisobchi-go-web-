/**
 * Tekshirish ekranidagi qoralama qatorlar modeli.
 *
 * Qator holati:
 *   'error'   — bloklovchi xato (qizil matn, sariq fon), tuzatilmaguncha tasdiqlab bo'lmaydi
 *   'warning' — noaniqlik (sariq fon), foydalanuvchi tekshirib "To'g'ri" deb belgilashi kerak
 *   'ok'      — tayyor
 *
 * Qator summalari faqat @hisobchi/core calculateLineTotal orqali hisoblanadi.
 */

import {
  ALLOWED_UNITS,
  calculateLineTotal,
  parseQtyMilli,
  parseUnitPriceText,
  validateLine,
  type AllowedUnit,
  type ParsedList,
  type ValidationIssue,
} from '@hisobchi/core';
import type { SaleLineInput } from '../data/ledger';
import { formatQty } from '../lib/format';

export interface DraftRow {
  key: string;
  source: 'parsed' | 'manual';
  rawText: string;
  productName: string;
  qtyText: string;
  unit: AllowedUnit | null;
  priceText: string;
  /** Tahlil vaqtidagi muammolar — miqdor/narx/birlik tahrirlanganda tozalanadi */
  parserIssues: ValidationIssue[];
  /** Foydalanuvchi ogohlantirishlarni ko'rib, to'g'ri deb belgilagan */
  acknowledged: boolean;
}

export type RowStatus = 'error' | 'warning' | 'ok';

export interface RowEval {
  qtyMilli?: bigint;
  unitPrice?: bigint;
  lineTotal?: bigint;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  status: RowStatus;
}

export function rowsFromParsed(list: ParsedList, newKey: () => string): DraftRow[] {
  return list.rows.map((r) => ({
    key: newKey(),
    source: 'parsed',
    rawText: r.rawText,
    productName: r.productName,
    qtyText: r.qtyMilli !== undefined ? formatQty(r.qtyMilli) : '',
    unit: r.unit ?? null,
    priceText: r.unitPrice !== undefined ? r.unitPrice.toString() : '',
    parserIssues: r.issues,
    acknowledged: false,
  }));
}

export function emptyRow(key: string): DraftRow {
  return {
    key,
    source: 'manual',
    rawText: '',
    productName: '',
    qtyText: '',
    unit: 'dona',
    priceText: '',
    parserIssues: [],
    acknowledged: false,
  };
}

/** Qatorni tahrirlash. Miqdor, narx yoki birlik o'zgarsa, tahlil muammolari bekor bo'ladi. */
export function editRow(row: DraftRow, patch: Partial<Pick<DraftRow, 'productName' | 'qtyText' | 'unit' | 'priceText'>>): DraftRow {
  const valuesChanged =
    (patch.qtyText !== undefined && patch.qtyText !== row.qtyText) ||
    (patch.priceText !== undefined && patch.priceText !== row.priceText) ||
    (patch.unit !== undefined && patch.unit !== row.unit);
  return {
    ...row,
    ...patch,
    parserIssues: valuesChanged ? [] : row.parserIssues,
    acknowledged: valuesChanged ? false : row.acknowledged,
  };
}

export function evaluateRow(row: DraftRow): RowEval {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  let qtyMilli: bigint | undefined;
  let unitPrice: bigint | undefined;

  if (row.qtyText.trim()) {
    const q = parseQtyMilli(row.qtyText);
    if (q.ok) qtyMilli = q.qtyMilli;
    else errors.push({ code: 'QTY_PARSE_ERROR', message: q.message, severity: 'error', field: 'qtyMilli' });
  }
  if (row.priceText.trim()) {
    const p = parseUnitPriceText(row.priceText);
    if (p.ok) unitPrice = p.unitPrice;
    else errors.push({ code: 'PRICE_PARSE_ERROR', message: p.message, severity: 'error', field: 'unitPrice' });
  }

  const hasParseError = (field: string) => errors.some((e) => e.field === field);
  const validation = validateLine(
    { productName: row.productName, qtyMilli, unit: row.unit ?? undefined, unitPrice, rawText: row.rawText },
    0,
  );
  for (const issue of validation.issues) {
    if (issue.code === 'MISSING_RAW_TEXT' && row.source === 'manual') continue;
    if (issue.field && hasParseError(issue.field)) continue;
    (issue.severity === 'error' ? errors : warnings).push(issue);
  }

  if (!row.unit || !(ALLOWED_UNITS as readonly string[]).includes(row.unit)) {
    errors.push({ code: 'MISSING_UNIT', message: "O'lchov birligini tanlang", severity: 'error', field: 'unit' });
  }

  for (const issue of row.parserIssues) {
    if (issue.code === 'MISSING_UNIT') continue; // yuqorida tekshirildi
    (issue.severity === 'error' ? errors : warnings).push(issue);
  }

  const lineTotal =
    errors.length === 0 && qtyMilli !== undefined && unitPrice !== undefined
      ? calculateLineTotal(qtyMilli, unitPrice)
      : undefined;

  const status: RowStatus = errors.length > 0 ? 'error' : warnings.length > 0 && !row.acknowledged ? 'warning' : 'ok';
  return { qtyMilli, unitPrice, lineTotal, errors, warnings, status };
}

export interface DraftSummary {
  evals: RowEval[];
  errorRows: number;
  warningRows: number;
  canConfirm: boolean;
  /** Oldindan ko'rish uchun (yakuniy summa tasdiqlash ekranida ikki yo'l bilan tekshiriladi) */
  previewTotal: bigint;
}

export function summarizeDraft(rows: readonly DraftRow[]): DraftSummary {
  const evals = rows.map(evaluateRow);
  const errorRows = evals.filter((e) => e.status === 'error').length;
  const warningRows = evals.filter((e) => e.status === 'warning').length;
  const previewTotal = evals.reduce((sum, e) => sum + (e.lineTotal ?? 0n), 0n);
  return {
    evals,
    errorRows,
    warningRows,
    canConfirm: rows.length > 0 && errorRows === 0 && warningRows === 0,
    previewTotal,
  };
}

/** Tasdiqlangan qoralamani saqlash uchun qatorlarga aylantiradi */
export function toSaleLines(rows: readonly DraftRow[]): SaleLineInput[] {
  const summary = summarizeDraft(rows);
  if (!summary.canConfirm) {
    throw new Error("Hal qilinmagan qatorlar bor — saqlab bo'lmaydi");
  }
  return rows.map((row, i) => {
    const e = summary.evals[i];
    return {
      productName: row.productName.trim(),
      qtyMilli: e.qtyMilli!,
      unit: row.unit!,
      unitPrice: e.unitPrice!,
      rawText: row.source === 'parsed' ? row.rawText : null,
    };
  });
}
