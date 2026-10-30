import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from './lib/env';

/** Kirishsiz ochiladigan sahifalar */
const PUBLIC_PATHS = ['/login', '/register', '/forgot-password', '/check-email', '/auth/'];
/** Kirgan foydalanuvchi uchun kerak bo'lmagan sahifalar (dashboard'ga yo'naltiriladi) */
const GUEST_ONLY = ['/login', '/register', '/forgot-password', '/check-email'];

function isPublic(path: string) {
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(p.endsWith('/') ? p : `${p}/`));
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (!supabaseConfigured) {
    return path === '/setup' ? NextResponse.next() : NextResponse.redirect(new URL('/setup', request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  // getUser() tokenni Supabase Auth serverida tekshiradi (cookie'ga ko'r-ko'rona ishonilmaydi)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const redirect = (to: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = '';
    if (to === '/login' && path !== '/') url.searchParams.set('next', path);
    const res = NextResponse.redirect(url);
    for (const c of response.cookies.getAll()) res.cookies.set(c);
    return res;
  };

  if (!user && !isPublic(path) && path !== '/setup') return redirect('/login');
  if (user && GUEST_ONLY.includes(path)) return redirect('/dashboard');
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
