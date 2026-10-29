/**
 * @module normalize
 * Hisobchi Go — mahsulot nomini normallashtirish.
 *
 * Normalizatsiya qoidalari:
 *   1. Boshi va oxiridagi bo'shliqlarni kesish
 *   2. Kichik registrga o'tkazish
 *   3. O'zbek apostrofi variantlarini standartlashtirish
 *   4. Ketma-ket bo'shliqlarni bitta bo'shliqqa kamaytirish
 *
 * Apostrof variantlari:
 *   - ' (RIGHT SINGLE QUOTATION MARK, U+2019)
 *   - ' (LEFT SINGLE QUOTATION MARK, U+2018)
 *   - ` (GRAVE ACCENT, U+0060)
 *   - ʻ (MODIFIER LETTER TURNED COMMA, U+02BB)
 *   - ʼ (MODIFIER LETTER APOSTROPHE, U+02BC)
 *   Barchasi → ' (APOSTROPHE, U+0027) ga almashtiriladi.
 */

/**
 * O'zbek yozuvida ishlatiladigan apostrof belgilar.
 * Barchasi standart ASCII apostrof (') ga almashtiriladi.
 */
const APOSTROPHE_VARIANTS = /[\u2018\u2019\u0060\u02BB\u02BC]/g;

/**
 * Ketma-ket bo'shliqlar (2 yoki undan ko'p).
 */
const MULTIPLE_SPACES = /\s{2,}/g;

/**
 * Mahsulot nomini normallashtiradi.
 *
 * @param name — normallashtiriladigan mahsulot nomi
 * @returns normallashtirilgan nom (kichik harf, standart apostrof, bitta bo'shliq)
 *
 * @example
 * normalizeProductName("  CHIRMOQ  ")     → "chirmoq"
 * normalizeProductName("to'rt")           → "to'rt"   (o'zgarmaydi)
 * normalizeProductName("to\u2019rt")      → "to'rt"   (' → ')
 * normalizeProductName("to`rt")           → "to'rt"   (` → ')
 * normalizeProductName("  oq   un  ")     → "oq un"
 */
export function normalizeProductName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(APOSTROPHE_VARIANTS, "'")
    .replace(MULTIPLE_SPACES, ' ');
}
