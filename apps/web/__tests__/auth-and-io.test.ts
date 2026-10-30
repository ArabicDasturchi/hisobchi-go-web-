import { describe, expect, it } from 'vitest';
import { callbackFailure, isCallbackFailure } from '@/lib/authCallback';
import { toCsv } from '@/lib/csv';
import { fetchAll } from '@/lib/data/api';
import { authBaseUrl, authCallbackUrl, normalizeSiteUrl } from '@/lib/env';
import { safeNextPath } from '@/lib/validation';

describe('open redirect himoyasi (safeNextPath)', () => {
  it.each(['/dashboard', '/customers/abc-1', '/sales?x=1', '/onboarding', '/reset-password'])('ichki yo\'l qabul qilinadi: %s', (p) => {
    expect(safeNextPath(p)).toBe(p);
  });

  it.each([
    'https://evil.com',
    '//evil.com',
    '/\\evil.com',
    '/\t/evil.com', // brauzer tabni olib tashlab //evil.com qiladi
    '/\n/evil.com',
    ' /dashboard',
    'javascript:alert(1)',
    '/%2F%2Fevil.com',
    '',
    null,
  ])('tashqi yoki shubhali manzil rad etiladi: %j', (p) => {
    expect(safeNextPath(p)).toBe('/dashboard');
  });
});

describe('auth callback manzili (environment asosida)', () => {
  it('NEXT_PUBLIC_SITE_URL normallashtiriladi', () => {
    expect(normalizeSiteUrl('https://app.example.uz/')).toBe('https://app.example.uz');
    expect(normalizeSiteUrl(' https://app.example.uz/path ')).toBe('https://app.example.uz');
    expect(normalizeSiteUrl('javascript:alert(1)')).toBe('');
    expect(normalizeSiteUrl('not a url')).toBe('');
    expect(normalizeSiteUrl(undefined)).toBe('');
  });

  it('SITE_URL berilgan bo\'lsa — u, aks holda joriy origin', () => {
    expect(authBaseUrl('https://app.example.uz', 'http://localhost:3000')).toBe('https://app.example.uz');
    expect(authBaseUrl('', 'https://hisobchi-git-x.vercel.app')).toBe('https://hisobchi-git-x.vercel.app');
  });

  it("callback URL'da next kodlanadi", () => {
    expect(authCallbackUrl('/onboarding', 'https://app.example.uz')).toBe('https://app.example.uz/auth/callback?next=%2Fonboarding');
  });
});

describe('callback xatolarini tasniflash', () => {
  it('eskirgan havola', () => {
    expect(callbackFailure({ errorCode: 'otp_expired', next: '/onboarding' })).toBe('expired');
    expect(callbackFailure({ exchangeMessage: 'Email link is invalid or has expired', next: '/onboarding' })).toBe('expired');
  });

  it('boshqa brauzerda ochilgan PKCE havola', () => {
    const msg = 'invalid request: both auth code and code verifier should be non-empty';
    expect(callbackFailure({ exchangeMessage: msg, next: '/onboarding' })).toBe('confirm_other_browser');
    expect(callbackFailure({ exchangeMessage: msg, next: '/reset-password' })).toBe('recovery_other_browser');
  });

  it("noma'lum xato — umumiy xabar; login sahifasi faqat ma'lum kodlarni qabul qiladi", () => {
    expect(callbackFailure({ exchangeMessage: 'something', next: '/x' })).toBe('link');
    expect(isCallbackFailure('expired')).toBe(true);
    expect(isCallbackFailure('<script>')).toBe(false);
    expect(isCallbackFailure('toString')).toBe(false);
  });
});

describe("sahifalab o'qish (fetchAll)", () => {
  const source = Array.from({ length: 2345 }, (_, i) => i);

  it('server max_rows sahifa hajmidan kichik bo\'lsa ham hamma qator olinadi', async () => {
    const SERVER_MAX = 500; // masalan, Supabase'da max_rows kamaytirilgan
    const calls: [number, number][] = [];
    const rows = await fetchAll<number>(async (from, to) => {
      calls.push([from, to]);
      return { data: source.slice(from, Math.min(to + 1, from + SERVER_MAX)), error: null };
    });
    expect(rows).toEqual(source);
    expect(calls[0]).toEqual([0, 999]);
  });

  it('xato bo\'lsa — yarim natija qaytmaydi', async () => {
    let n = 0;
    await expect(
      fetchAll<number>(async () => (n++ === 0 ? { data: [1, 2], error: null } : { data: null, error: { message: 'Failed to fetch' } })),
    ).rejects.toThrow(/Internet/);
  });
});

describe('CSV eksport', () => {
  it('UTF-8 BOM, nuqta-vergul, qochirish va formula himoyasi', () => {
    const csv = toCsv(['Mijoz', "Summa (so'm)"], [
      ['Akmal; "aka"', 125000n],
      ['=HYPERLINK("x")', -5],
      ["O'tkazma", null],
    ]);
    expect(csv.startsWith('﻿')).toBe(true);
    const lines = csv.slice(1).split('\r\n');
    expect(lines[0]).toBe("Mijoz;Summa (so'm)");
    expect(lines[1]).toBe('"Akmal; ""aka""";125000');
    expect(lines[2]).toBe('"\'=HYPERLINK(""x"")";-5');
    expect(lines[3]).toBe("O'tkazma;");
  });
});
