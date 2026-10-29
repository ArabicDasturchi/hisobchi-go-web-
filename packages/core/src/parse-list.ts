/**
 * @module parse-list
 * Hisobchi Go — mahsulot ro'yxatini deterministik tahlil qilish.
 *
 * Kiritish misollari:
 *   "3 ta non 4000 so'mdan"
 *   "2 litr sut 12000 so'mdan"
 *   "chirmoq 10 ta 13 ming, yurak 5 ta 15 ming"
 *
 * Qoidalar:
 *   - Har bir qator uchun asl matn fragmenti saqlanadi.
 *   - Birlik so'zi (ta, kg, litr ...) bilan kelgan son — miqdor.
 *   - "so'm", "so'mdan", "ming" bilan kelgan son — narx.
 *   - Noaniq holatlar taxmin qilinmaydi: muammo sifatida belgilanadi.
 *   - Hisob-kitob bu yerda qilinmaydi — faqat qiymatlar ajratiladi.
 */

import type { AllowedUnit, ValidationIssue } from './types.js';
import { parseUzNumber } from './parse-uz-number.js';

/** Tahlil qilingan bitta qator */
export interface ParsedListRow {
  /** Asl matn fragmenti */
  rawText: string;
  /** Mahsulot nomi (bo'sh bo'lishi mumkin) */
  productName: string;
  /** Miqdor, mingdan bir aniqlikda */
  qtyMilli?: bigint;
  /** O'lchov birligi */
  unit?: AllowedUnit;
  /** Birlik narxi, butun so'm */
  unitPrice?: bigint;
  /** Tahlil jarayonida aniqlangan muammolar */
  issues: ValidationIssue[];
}

/** Ro'yxat tahlili natijasi */
export interface ParsedList {
  rows: ParsedListRow[];
}

export type ParseQtyResult =
  | { ok: true; qtyMilli: bigint }
  | { ok: false; message: string };

/** O'lchov birligi so'zlari → standart birlik */
const UNIT_WORDS: Record<string, AllowedUnit> = {
  ta: 'dona',
  dona: 'dona',
  donasi: 'dona',
  kg: 'kg',
  kilo: 'kg',
  kilogramm: 'kg',
  kilogram: 'kg',
  g: 'g',
  gr: 'g',
  gramm: 'g',
  l: 'litr',
  litr: 'litr',
  m: 'metr',
  metr: 'metr',
  pachka: 'pachka',
  qop: 'qop',
  karobka: 'karobka',
  korobka: 'karobka',
  quti: 'karobka',
  tonna: 'tonna',
};

/** Narx belgisi so'zlari */
const PRICE_MARKERS = new Set([
  "so'm",
  "so'mdan",
  'som',
  'somdan',
  'sum',
  'sumdan',
  'dan',
]);

/** Ming ko'paytuvchisi (narx belgisi sifatida ham) */
const THOUSAND_WORDS = new Set(['ming', 'mingdan', 'mingta']);
const MILLION_WORDS = new Set(['mln', 'million', 'mlndan', 'milliondan']);

/** O'zbekcha son so'zlari (miqdor uchun) */
const NUMBER_WORDS: Record<string, string> = {
  yarim: '0.5',
  bir: '1',
  ikki: '2',
  uch: '3',
  "to'rt": '4',
  besh: '5',
  olti: '6',
  yetti: '7',
  sakkiz: '8',
  "to'qqiz": '9',
  "o'n": '10',
};

/** Nomdan chiqarib tashlanadigan yordamchi so'zlar */
const FILLER_WORDS = new Set(['narxi', 'narx', 'x', '×', '*']);

const APOSTROPHE_VARIANTS = /[‘’`ʻʼ]/g;
const NUMERIC_TOKEN = /^\d+(?:[.,]\d+)*$/;

interface NumberGroup {
  value: string;
  multiplier: 1n | 1000n | 1000000n;
  role?: 'qty' | 'price';
  unit?: AllowedUnit;
}

/**
 * Miqdorni qty_milli ga aylantiradi (float ishlatilmaydi).
 * "3" → 3000n, "1.5" / "1,5" → 1500n, "0.25" → 250n.
 * 3 xonali kasr ("1.500", "1,500") noaniq — rad etiladi.
 */
export function parseQtyMilli(raw: string, multiplier: bigint = 1n): ParseQtyResult {
  const s = raw.trim();
  const m = /^(\d+)(?:[.,](\d+))?$/.exec(s);
  if (!m) {
    return { ok: false, message: `Miqdor formati noto'g'ri: "${raw}"` };
  }
  const intPart = m[1];
  const frac = m[2] ?? '';
  if (frac.length >= 3) {
    return {
      ok: false,
      message: `Noaniq miqdor: "${raw}" — ming ajratuvchi yoki kasr bo'lishi mumkin`,
    };
  }
  const milli = BigInt(intPart) * 1000n + BigInt(frac.padEnd(3, '0') || '0');
  return { ok: true, qtyMilli: milli * multiplier };
}

/** Narxni butun so'mga aylantiradi */
function parsePrice(group: NumberGroup): { ok: true; price: bigint } | { ok: false; message: string } {
  const notInteger = { ok: false as const, message: `Narx butun so'm bo'lishi kerak: "${group.value}"` };

  if (group.multiplier === 1n) {
    // Format qoidalari (13,000 / 13.000 noaniq) parseUzNumber bilan bir xil
    const result = parseUzNumber(group.value);
    if (!result.ok) {
      return { ok: false, message: result.error.message };
    }
    if (!/^[\d,\s]+$/.test(group.value) || !Number.isSafeInteger(result.data.value)) {
      return notInteger;
    }
    return { ok: true, price: BigInt(group.value.replace(/[,\s]/g, '')) };
  }

  // "1.5 ming", "2 mln" — kasr qismi BigInt bilan, float ishlatilmaydi
  const m = /^(\d+)(?:[.,](\d+))?$/.exec(group.value);
  if (!m) {
    return { ok: false, message: `Narx formati noto'g'ri: "${group.value}"` };
  }
  const frac = m[2] ?? '';
  const scale = 10n ** BigInt(frac.length);
  const scaled = BigInt(m[1]) * scale + BigInt(frac || '0');
  if ((scaled * group.multiplier) % scale !== 0n) {
    return notInteger;
  }
  return { ok: true, price: (scaled * group.multiplier) / scale };
}

export type ParsePriceResult =
  | { ok: true; unitPrice: bigint }
  | { ok: false; message: string };

/**
 * Foydalanuvchi tahrirlagan narx maydonini butun so'mga aylantiradi.
 * "13000", "13 000", "13 ming", "1,5 ming", "2 mln", "4000 so'm" qabul qilinadi.
 */
export function parseUnitPriceText(text: string): ParsePriceResult {
  const words = text
    .replace(APOSTROPHE_VARIANTS, "'")
    .toLowerCase()
    .replace(/(\d)([^\d\s.,])/g, '$1 $2')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !PRICE_MARKERS.has(w));
  if (words.length === 0) {
    return { ok: false, message: 'Narx kiritilmagan' };
  }
  const group: NumberGroup = { value: '', multiplier: 1n };
  const last = words[words.length - 1];
  if (THOUSAND_WORDS.has(last)) {
    group.multiplier = 1000n;
    words.pop();
  } else if (MILLION_WORDS.has(last)) {
    group.multiplier = 1000000n;
    words.pop();
  }
  group.value = words.join(group.multiplier === 1n ? ' ' : '');
  if (!/^\d[\d\s.,]*$/.test(group.value)) {
    return { ok: false, message: `Narx formati noto'g'ri: "${text.trim()}"` };
  }
  const result = parsePrice(group);
  return result.ok ? { ok: true, unitPrice: result.price } : result;
}

/** Matnni qatorlarga ajratadi: yangi qator, ";" yoki ", " */
function splitSegments(text: string): string[] {
  return text
    .split(/\r?\n|;|,(?=\s)/)
    .map((s) => s.trim().replace(/[.,]+$/, '').trim())
    .filter((s) => s.length > 0);
}

/** Son va harf yopishib qolgan joylarni ajratadi: "4000so'mdan" → "4000 so'mdan" */
function tokenize(segment: string): string[] {
  return segment
    .replace(APOSTROPHE_VARIANTS, "'")
    .replace(/(\d)([^\d\s.,])/g, '$1 $2')
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

function parseSegment(segment: string): ParsedListRow {
  const tokens = tokenize(segment);
  const lower = tokens.map((t) => t.toLowerCase());
  const issues: ValidationIssue[] = [];
  const groups: NumberGroup[] = [];
  const nameTokens: string[] = [];

  let i = 0;
  while (i < tokens.length) {
    const word = lower[i];
    const numeric = NUMERIC_TOKEN.test(word) ? word : NUMBER_WORDS[word];
    const startsGroup =
      numeric !== undefined &&
      // Son so'zlari faqat ortidan birlik kelganda miqdor hisoblanadi
      (NUMERIC_TOKEN.test(word) || (i + 1 < tokens.length && lower[i + 1] in UNIT_WORDS));

    if (!startsGroup) {
      if (!FILLER_WORDS.has(word) && !PRICE_MARKERS.has(word)) {
        nameTokens.push(tokens[i]);
      }
      i++;
      continue;
    }

    const group: NumberGroup = { value: numeric!, multiplier: 1n };
    i++;
    // Bir nechta bo'shliq bilan yozilgan son: "13 000"
    while (i < tokens.length && /^\d{3}$/.test(lower[i]) && NUMERIC_TOKEN.test(group.value)) {
      group.value += lower[i];
      i++;
    }
    if (i < tokens.length && THOUSAND_WORDS.has(lower[i])) {
      group.multiplier = 1000n;
      if (lower[i] !== 'mingta') group.role = 'price';
      i++;
    } else if (i < tokens.length && MILLION_WORDS.has(lower[i])) {
      group.multiplier = 1000000n;
      group.role = 'price';
      i++;
    }
    if (i < tokens.length && lower[i] in UNIT_WORDS && group.role !== 'price') {
      group.role = 'qty';
      group.unit = UNIT_WORDS[lower[i]];
      i++;
    } else if (i < tokens.length && PRICE_MARKERS.has(lower[i])) {
      group.role = 'price';
      i++;
    }
    groups.push(group);
  }

  const qtyGroups = groups.filter((g) => g.role === 'qty');
  const priceGroups = groups.filter((g) => g.role === 'price');
  const free = groups.filter((g) => g.role === undefined);

  let qty: NumberGroup | undefined = qtyGroups[0];
  let price: NumberGroup | undefined = priceGroups[0];

  if (qtyGroups.length > 1 || priceGroups.length > 1) {
    issues.push({
      code: 'AMBIGUOUS_NUMBERS',
      message: "Qatorda bir nechta miqdor yoki narx bor — qaysi biri to'g'riligini tanlang",
      severity: 'error',
    });
    qty = undefined;
    price = undefined;
  } else if (!qty && !price && free.length === 2) {
    qty = free[0];
    price = free[1];
    issues.push({
      code: 'ASSUMED_ROLES',
      message: "Miqdor va narx tartib bo'yicha aniqlandi — tekshiring",
      severity: 'warning',
      field: 'qtyMilli',
    });
  } else if (qty && !price && free.length === 1) {
    price = free[0];
  } else if (!qty && price && free.length === 1) {
    qty = free[0];
  } else if (free.length > 0) {
    issues.push({
      code: 'UNCLEAR_NUMBER',
      message: `Sonning ma'nosi aniq emas: ${free.map((g) => g.value).join(', ')}`,
      severity: 'error',
    });
  }

  const row: ParsedListRow = {
    rawText: segment,
    productName: nameTokens.join(' ').trim(),
    issues,
  };

  if (qty) {
    const q = parseQtyMilli(qty.value, qty.multiplier);
    if (q.ok) {
      row.qtyMilli = q.qtyMilli;
    } else {
      issues.push({ code: 'QTY_PARSE_ERROR', message: q.message, severity: 'error', field: 'qtyMilli' });
    }
    if (qty.unit) {
      row.unit = qty.unit;
    } else {
      issues.push({
        code: 'MISSING_UNIT',
        message: "O'lchov birligi ko'rsatilmagan — tanlang",
        severity: 'warning',
        field: 'unit',
      });
    }
  }

  if (price) {
    const p = parsePrice(price);
    if (p.ok) {
      row.unitPrice = p.price;
    } else {
      issues.push({ code: 'PRICE_PARSE_ERROR', message: p.message, severity: 'error', field: 'unitPrice' });
    }
  }

  return row;
}

/**
 * Mahsulot ro'yxati matnini tuzilgan qatorlarga ajratadi.
 * Summalar hisoblanmaydi — bu calculation modulining vazifasi.
 */
export function parseProductList(text: string): ParsedList {
  return { rows: splitSegments(text).map(parseSegment) };
}
