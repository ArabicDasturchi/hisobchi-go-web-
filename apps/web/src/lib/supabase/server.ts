import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../env';

/** Route handler / server komponent uchun klient (foydalanuvchi cookie sessiyasi bilan, RLS ostida) */
export async function getServerSupabase() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Server komponentdan chaqirilganda cookie yozib bo'lmaydi — proxy sessiyani yangilaydi
        }
      },
    },
  });
}
