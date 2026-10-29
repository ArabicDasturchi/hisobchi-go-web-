/**
 * @file normalize.test.ts
 * Mahsulot nomi normalizatsiya testlari.
 */

import { describe, it, expect } from 'vitest';
import { normalizeProductName } from '../src/normalize.js';

describe('normalizeProductName', () => {
  // --- Registr ---

  it('katta harflarni kichik qiladi', () => {
    expect(normalizeProductName('CHIRMOQ')).toBe('chirmoq');
  });

  it('aralash registr', () => {
    expect(normalizeProductName('ChIrMoQ')).toBe('chirmoq');
  });

  // --- Bo'shliqlar ---

  it('boshi va oxiridagi bo\'shliqlarni kesadi', () => {
    expect(normalizeProductName('  chirmoq  ')).toBe('chirmoq');
  });

  it('ketma-ket bo\'shliqlarni bitta qiladi', () => {
    expect(normalizeProductName('oq   un')).toBe('oq un');
  });

  it('tab va yangi qator bo\'shliqlarini ham kamaytiradi', () => {
    expect(normalizeProductName('oq\t\tun')).toBe('oq un');
  });

  // --- O'zbek apostroflari ---

  it("standart apostrof o'zgarmaydi: to'rt", () => {
    expect(normalizeProductName("to'rt")).toBe("to'rt");
  });

  it("RIGHT SINGLE QUOTATION MARK (\u2019) → apostrof", () => {
    expect(normalizeProductName('to\u2019rt')).toBe("to'rt");
  });

  it("LEFT SINGLE QUOTATION MARK (\u2018) → apostrof", () => {
    expect(normalizeProductName('to\u2018rt')).toBe("to'rt");
  });

  it('GRAVE ACCENT (`) → apostrof', () => {
    expect(normalizeProductName('to`rt')).toBe("to'rt");
  });

  it("MODIFIER LETTER TURNED COMMA (\u02BB) → apostrof", () => {
    expect(normalizeProductName('to\u02BBrt')).toBe("to'rt");
  });

  it("MODIFIER LETTER APOSTROPHE (\u02BC) → apostrof", () => {
    expect(normalizeProductName('to\u02BCrt')).toBe("to'rt");
  });

  // --- Kombinatsiyalar ---

  it("katta harf + apostrof + bo'shliq", () => {
    expect(normalizeProductName("  OQ  TO\u2019RT  ")).toBe("oq to'rt");
  });

  it("bo'sh string → bo'sh string", () => {
    expect(normalizeProductName('')).toBe('');
  });

  it("faqat bo'shliq → bo'sh string", () => {
    expect(normalizeProductName('   ')).toBe('');
  });

  // --- Amaliy misollar ---

  it("ko'ylak → ko'ylak", () => {
    expect(normalizeProductName("ko'ylak")).toBe("ko'ylak");
  });

  it("KO\u2019YLAK → ko'ylak", () => {
    expect(normalizeProductName('KO\u2019YLAK')).toBe("ko'ylak");
  });

  it("qo'ziqorin → qo'ziqorin", () => {
    expect(normalizeProductName("qo'ziqorin")).toBe("qo'ziqorin");
  });
});
