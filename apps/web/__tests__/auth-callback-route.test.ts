/**
 * /auth/callback marshruti: Supabase server klienti soxtalashtiriladi, haqiqiy GET handler chaqiriladi.
 * Tekshiriladi: sessiya almashinuvi, do'konga qarab yo'naltirish, xato holatlari, open redirect yo'qligi.
 */
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type ExchangeResult = { data: { user: { id: string } | null; redirectType?: string | null }; error: { message: string } | null };

const state: {
  exchange: ExchangeResult;
  verify: ExchangeResult;
  members: { data: { shop_id: string }[] | null; error: unknown };
  calls: string[];
} = { exchange: { data: { user: null }, error: null }, verify: { data: { user: null }, error: null }, members: { data: [], error: null }, calls: [] };

vi.mock('@/lib/supabase/server', () => ({
  getServerSupabase: async () => ({
    auth: {
      exchangeCodeForSession: async (code: string) => {
        state.calls.push(`exchange:${code}`);
        return state.exchange;
      },
      verifyOtp: async (args: { token_hash: string; type: string }) => {
        state.calls.push(`verify:${args.type}`);
        return state.verify;
      },
    },
    from: (table: string) => {
      state.calls.push(`from:${table}`);
      const q = { select: () => q, eq: () => q, limit: async () => state.members };
      return q;
    },
  }),
}));

const { GET } = await import('@/app/auth/callback/route');

const ORIGIN = 'https://hisobchi-go-mvp.vercel.app';
async function call(query: string): Promise<string> {
  const res = await GET(new NextRequest(`${ORIGIN}/auth/callback${query}`));
  expect(res.status).toBeGreaterThanOrEqual(300);
  expect(res.status).toBeLessThan(400);
  const loc = res.headers.get('location') ?? '';
  expect(loc.startsWith(`${ORIGIN}/`)).toBe(true); // hech qachon tashqi domenga emas
  return loc.slice(ORIGIN.length);
}

beforeEach(() => {
  state.exchange = { data: { user: { id: 'u1' } }, error: null };
  state.verify = { data: { user: { id: 'u1' } }, error: null };
  state.members = { data: [], error: null };
  state.calls = [];
});

describe('/auth/callback — avtomatik kirish', () => {
  it("shu brauzerda tasdiqlash: sessiya yaratiladi, do'kon yo'q → /onboarding", async () => {
    expect(await call('?code=abc&next=%2Fonboarding')).toBe('/onboarding');
    expect(state.calls).toEqual(['exchange:abc', 'from:shop_members']);
  });

  it("do'koni bor foydalanuvchi → /dashboard", async () => {
    state.members = { data: [{ shop_id: 's1' }], error: null };
    expect(await call('?code=abc&next=%2Fonboarding')).toBe('/dashboard');
  });

  it("a'zolik so'rovi xato bersa ham sessiya saqlanadi, onboarding o'zi tekshiradi", async () => {
    state.members = { data: null, error: { message: 'x' } };
    expect(await call('?code=abc&next=%2Fonboarding')).toBe('/onboarding');
  });

  it('token_hash havolasi (istalgan brauzer) — verifyOtp orqali sessiya', async () => {
    expect(await call('?token_hash=th&type=email&next=%2Fonboarding')).toBe('/onboarding');
    expect(state.calls[0]).toBe('verify:email');
  });

  it("parol tiklash → /reset-password, a'zolik so'ralmaydi", async () => {
    state.exchange = { data: { user: { id: 'u1' }, redirectType: 'recovery' }, error: null };
    expect(await call('?code=abc&next=%2Fonboarding')).toBe('/reset-password');
    expect(state.calls).toEqual(['exchange:abc']);
  });
});

describe('/auth/callback — xatolar', () => {
  it('boshqa brauzerda ochilgan PKCE havola → tushunarli xabar bilan kirish sahifasi', async () => {
    state.exchange = { data: { user: null }, error: { message: 'PKCE code verifier not found in storage' } };
    expect(await call('?code=abc&next=%2Fonboarding')).toBe('/login?error=confirm_other_browser');
  });

  it('eskirgan havola', async () => {
    expect(await call('?error=access_denied&error_code=otp_expired&next=%2Fonboarding')).toBe('/login?error=expired');
    expect(state.calls).toEqual([]);
  });

  it("noto'liq havola", async () => {
    expect(await call('')).toBe('/login?error=link');
    expect(await call('?type=email')).toBe('/login?error=link');
    expect(await call('?token_hash=x&type=hacker')).toBe('/login?error=link');
  });

  it("tashqi next — e'tiborga olinmaydi (open redirect yo'q)", async () => {
    state.members = { data: [{ shop_id: 's1' }], error: null };
    expect(await call('?code=abc&next=https%3A%2F%2Fevil.com')).toBe('/dashboard');
    expect(await call('?code=abc&next=%2F%2Fevil.com')).toBe('/dashboard');
  });
});

describe('/auth/callback — Google OAuth', () => {
  it("muvaffaqiyatli Google kirish: yangi foydalanuvchi → /onboarding, do'koni bor → /dashboard", async () => {
    expect(await call('?code=g1&next=%2Fdashboard&via=google')).toBe('/onboarding');
    state.members = { data: [{ shop_id: 's1' }], error: null };
    expect(await call('?code=g2&next=%2Fdashboard&via=google')).toBe('/dashboard');
  });

  it('Google oynasida bekor qilish → oauth_cancelled (email havolasi xatosi bilan aralashmaydi)', async () => {
    expect(await call('?error=access_denied&error_description=The+user+denied&next=%2Fdashboard&via=google')).toBe('/login?error=oauth_cancelled');
    expect(state.calls).toEqual([]);
  });

  it('Google provayder xatosi yoki code yo\'q → oauth_failed', async () => {
    expect(await call('?error=server_error&next=%2Fdashboard&via=google')).toBe('/login?error=oauth_failed');
    expect(await call('?next=%2Fdashboard&via=google')).toBe('/login?error=oauth_failed');
    state.exchange = { data: { user: null }, error: { message: 'invalid flow state' } };
    expect(await call('?code=bad&next=%2Fdashboard&via=google')).toBe('/login?error=oauth_failed');
  });

  it('email havolasi xatolari avvalgidek', async () => {
    expect(await call('?error=access_denied&error_code=otp_expired')).toBe('/login?error=expired');
  });
});

describe('oauthCallbackUrl', () => {
  it("next kodlanadi va via=google qo'shiladi", async () => {
    const { oauthCallbackUrl } = await import('@/lib/env');
    expect(oauthCallbackUrl('/dashboard', 'https://hisobchi-go-mvp.vercel.app')).toBe('https://hisobchi-go-mvp.vercel.app/auth/callback?next=%2Fdashboard&via=google');
  });
});
