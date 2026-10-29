/**
 * @file parse-uz-number.test.ts
 * O'zbek son parseri testlari.
 *
 * Barcha kutilgan natijalar mustaqil belgilangan.
 */

import { describe, it, expect } from 'vitest';
import { parseUzNumber } from '../src/parse-uz-number.js';

// ---------------------------------------------------------------------------
// Muvaffaqiyatli parsing
// ---------------------------------------------------------------------------

describe('parseUzNumber — muvaffaqiyatli holatlar', () => {
  // --- "ming" so'zi ---

  it('"13 ming" → 13000', () => {
    const result = parseUzNumber('13 ming');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.value).toBe(13000);
    }
  });

  it('"15 ming" → 15000', () => {
    const result = parseUzNumber('15 ming');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.value).toBe(15000);
    }
  });

  it('"9 ming" → 9000', () => {
    const result = parseUzNumber('9 ming');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.value).toBe(9000);
    }
  });

  it('"1 ming" → 1000', () => {
    const result = parseUzNumber('1 ming');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.value).toBe(1000);
    }
  });

  it('"100 ming" → 100000', () => {
    const result = parseUzNumber('100 ming');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.value).toBe(100000);
    }
  });

  it('"13 mingta" → 13000 ("mingta" = "ming")', () => {
    const result = parseUzNumber('13 mingta');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.value).toBe(13000);
    }
  });

  // --- Bo'shliq bilan ajratilgan ---

  it('"15 000" → 15000', () => {
    const result = parseUzNumber('15 000');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.value).toBe(15000);
    }
  });

  it('"1 000 000" → 1000000', () => {
    const result = parseUzNumber('1 000 000');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.value).toBe(1000000);
    }
  });

  // --- Vergul bilan ajratilgan ---

  it('"13,000" → 13000', () => {
    const result = parseUzNumber('13,000');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.value).toBe(13000);
    }
  });

  it('"1,000,000" → 1000000', () => {
    const result = parseUzNumber('1,000,000');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.value).toBe(1000000);
    }
  });

  // --- Oddiy raqamlar ---

  it('"9000" → 9000', () => {
    const result = parseUzNumber('9000');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.value).toBe(9000);
    }
  });

  it('"0" → 0', () => {
    const result = parseUzNumber('0');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.value).toBe(0);
    }
  });

  it('"1" → 1', () => {
    const result = parseUzNumber('1');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.value).toBe(1);
    }
  });

  // --- O'nlik kasrli sonlar ---

  it('"0.5" → 0.5', () => {
    const result = parseUzNumber('0.5');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.value).toBe(0.5);
    }
  });

  it('"2.5" → 2.5', () => {
    const result = parseUzNumber('2.5');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.value).toBe(2.5);
    }
  });

  // --- Maxsus so'zlar ---

  it('"yarim" → 0.5', () => {
    const result = parseUzNumber('yarim');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.value).toBe(0.5);
    }
  });

  it('"nol" → 0', () => {
    const result = parseUzNumber('nol');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.value).toBe(0);
    }
  });

  it('"YARIM" (katta harf) → 0.5', () => {
    const result = parseUzNumber('YARIM');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.value).toBe(0.5);
    }
  });

  // --- Bo'shliq bilan ---

  it('ortiqcha bo\'shliqlar: "  13  ming  " → 13000', () => {
    const result = parseUzNumber('  13  ming  ');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.value).toBe(13000);
    }
  });

  it('ortiqcha bo\'shliqlar: "  9000  " → 9000', () => {
    const result = parseUzNumber('  9000  ');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.value).toBe(9000);
    }
  });

  // --- Asl matn saqlanadi ---

  it('asl matn (raw) saqlanadi', () => {
    const result = parseUzNumber('  13 ming  ');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.raw).toBe('  13 ming  ');
    }
  });

  // --- "15 000" bo'shliq bilan — ming formatidagi so'z emas ---

  it('"15 000" — raqam + bo\'shliq + raqam → 15000 (ming ajratuvchi)', () => {
    // Bu "ming" so'zi emas — faqat bo'shliq bilan ajratilgan raqam
    const result = parseUzNumber('15 000');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.value).toBe(15000);
    }
  });
});

// ---------------------------------------------------------------------------
// Xato holatlar
// ---------------------------------------------------------------------------

describe('parseUzNumber — xato holatlar', () => {
  it("bo'sh string", () => {
    const result = parseUzNumber('');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('EMPTY_INPUT');
    }
  });

  it('faqat bo\'shliq', () => {
    const result = parseUzNumber('   ');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('EMPTY_INPUT');
    }
  });

  it('manfiy son', () => {
    const result = parseUzNumber('-5000');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('NEGATIVE_VALUE');
    }
  });

  it('harflar (qo\'llab-quvvatlanmaydigan format)', () => {
    const result = parseUzNumber('besh');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_FORMAT');
    }
  });

  it('aralash harflar va raqamlar (noaniq)', () => {
    const result = parseUzNumber('abc123');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_FORMAT');
    }
  });

  it('"13.000" — nuqtali noaniq format', () => {
    const result = parseUzNumber('13.000');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('AMBIGUOUS_FORMAT');
    }
  });

  it('"1.000" — nuqtali noaniq format', () => {
    const result = parseUzNumber('1.000');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('AMBIGUOUS_FORMAT');
    }
  });

  it('xato matn — asl raw saqlanadi', () => {
    const result = parseUzNumber('  xato  ');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.raw).toBe('  xato  ');
    }
  });
});

// ---------------------------------------------------------------------------
// Katta raqamlar yaqinidagi chegaraviy holatlar
// ---------------------------------------------------------------------------

describe('parseUzNumber — chegaraviy holatlar', () => {
  it('MAX_SAFE_INTEGER chegarasida', () => {
    // 9007199254740991 — Number.MAX_SAFE_INTEGER
    const result = parseUzNumber('9007199254740991');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.value).toBe(9007199254740991);
    }
  });

  it('"0.5 ming" → 500', () => {
    const result = parseUzNumber('0.5 ming');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.value).toBe(500);
    }
  });
});
