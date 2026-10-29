/**
 * @module parse-uz-number
 * O'zbek tilidagi son iboralarini aniqlash va raqamga aylantirish.
 *
 * Qo'llab-quvvatlanadigan formatlar:
 *   - Oddiy raqam: "13000", "9000"
 *   - Bo'shliq bilan ajratilgan: "13 000", "15 000"
 *   - Vergul bilan ajratilgan: "13,000"
 *   - "ming" so'zi: "13 ming" → 13000, "9 ming" → 9000
 *   - "yarim" so'zi: "yarim" → 0.5 (qty_milli uchun foydali)
 *
 * Noaniq formatlar:
 *   - Nuqta bilan ajratilgan ("13.000") — AMBIGUOUS: o'nlik kasr yoki
 *     ming ajratuvchi? Xavfsiz tarzda rad etiladi.
 *
 * Manfiy sonlar rad etiladi.
 * Bo'sh kiritish rad etiladi.
 * parseUzNumber natijasi number tipida — BigInt ga aylantirish chaqiruvchi kodda.
 *
 * Maksimal qiymat: Number.MAX_SAFE_INTEGER (2^53 - 1 = 9,007,199,254,740,991)
 * Bu pul uchun yetarli — BigInt ga o'tkazilgandan keyin katta qiymatlar xavfsiz.
 */

import type { ParseNumberResult } from './types.js';

/**
 * O'zbekcha "ming" qisqartmalari (kichik registrda).
 * "mingta" = "ming" + "ta" (dona qo'shimchasi) — alohida birlik sifatida emas,
 * son qismi sifatida "ming" ga teng.
 */
const MING_WORDS = ['ming', 'mingta'] as const;

/**
 * O'zbekcha maxsus son so'zlari.
 */
const SPECIAL_WORDS: Record<string, number> = {
  yarim: 0.5,
  nol: 0,
};

/**
 * O'zbek tilidagi son iborasini raqamga aylantiradi.
 *
 * @param raw — kiritilgan matn (bo'shliqlar kesib olinadi)
 * @returns ParseNumberResult — muvaffaqiyat yoki xato
 */
export function parseUzNumber(raw: string): ParseNumberResult {
  // Asl matnni saqlash
  const originalRaw = raw;

  // Bo'shliqlarni kesish
  const trimmed = raw.trim();

  // Bo'sh kiritish tekshiruvi
  if (trimmed === '') {
    return {
      ok: false,
      error: {
        code: 'EMPTY_INPUT',
        message: "Kiritish bo'sh",
        raw: originalRaw,
      },
    };
  }

  // Kichik registrga o'tkazish
  const lower = trimmed.toLowerCase();

  // Maxsus so'zlar tekshiruvi
  if (lower in SPECIAL_WORDS) {
    return {
      ok: true,
      data: { value: SPECIAL_WORDS[lower], raw: originalRaw },
    };
  }

  // Manfiy son tekshiruvi
  if (lower.startsWith('-')) {
    return {
      ok: false,
      error: {
        code: 'NEGATIVE_VALUE',
        message: 'Manfiy son ruxsat etilmagan',
        raw: originalRaw,
      },
    };
  }

  // "ming" so'zi bilan tugaydimi?
  let multiplier = 1;
  let numberPart = lower;

  for (const mingWord of MING_WORDS) {
    if (lower.endsWith(mingWord)) {
      multiplier = 1000;
      numberPart = lower.slice(0, -mingWord.length).trim();
      break;
    }
  }

  // Nuqta bilan ajratilgan formatni tekshirish (noaniq — "13.000")
  // Qoida: agar nuqtadan keyin aynan 3 ta raqam bo'lsa — bu ming ajratuvchi
  // bo'lishi mumkin YOKI o'nlik kasr. Xavfsiz tarzda rad etamiz.
  if (/^\d+\.\d{3}$/.test(numberPart)) {
    return {
      ok: false,
      error: {
        code: 'AMBIGUOUS_FORMAT',
        message:
          "Noaniq format: nuqta ming ajratuvchi yoki o'nlik kasr bo'lishi mumkin. Iltimos, bo'shliq bilan ajrating (masalan: \"13 000\") yoki vergul ishlating (masalan: \"13,000\").",
        raw: originalRaw,
      },
    };
  }

  // Vergul va bo'shliqlarni olib tashlash (ming ajratuvchi sifatida)
  // "13,000" → "13000", "15 000" → "15000"
  const cleaned = numberPart.replace(/[,\s]/g, '');

  // Raqam va ixtiyoriy o'nlik kasr (nuqta bilan)
  // Masalan: "13000", "0.5", "2.5"
  if (!/^\d+(\.\d+)?$/.test(cleaned)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_FORMAT',
        message: `Noto'g'ri son formati: "${trimmed}"`,
        raw: originalRaw,
      },
    };
  }

  const parsed = Number(cleaned);

  // NaN va Infinity tekshiruvi
  if (!Number.isFinite(parsed)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_FORMAT',
        message: `Noto'g'ri son: "${trimmed}"`,
        raw: originalRaw,
      },
    };
  }

  const finalValue = parsed * multiplier;

  // Manfiy natija tekshiruvi (ehtiyot chorasiga)
  if (finalValue < 0) {
    return {
      ok: false,
      error: {
        code: 'NEGATIVE_VALUE',
        message: 'Manfiy natija ruxsat etilmagan',
        raw: originalRaw,
      },
    };
  }

  // Xavfsiz integer chegarasi tekshiruvi
  if (finalValue > Number.MAX_SAFE_INTEGER) {
    return {
      ok: false,
      error: {
        code: 'EXCEEDS_MAX',
        message: `Son juda katta: ${finalValue}`,
        raw: originalRaw,
      },
    };
  }

  return {
    ok: true,
    data: { value: finalValue, raw: originalRaw },
  };
}
