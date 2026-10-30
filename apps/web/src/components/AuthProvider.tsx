'use client';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getSupabase } from '@/lib/supabase/client';

interface AuthCtx {
  user: User | null;
  /** Sessiya hali tiklanmoqda */
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = getSupabase();
    let active = true;
    // Sessiyani tiklash: getUser() tokenni serverda tekshiradi (muddati o'tgan/bekor qilingan sessiya qabul qilinmaydi)
    sb.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      setLoading(false);
      if (event === 'SIGNED_OUT') {
        router.replace('/login');
        router.refresh();
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  const signOut = useCallback(async () => {
    // 'local': faqat shu brauzer sessiyasi. Standart 'global' mobil ilovadagi sessiyani ham bekor qilardi
    // (server bilan aloqa bo'lmasa ham supabase-js lokal sessiyani tozalaydi)
    await getSupabase().auth.signOut({ scope: 'local' });
    setUser(null);
    router.replace('/login');
    router.refresh();
  }, [router]);

  return <Ctx.Provider value={{ user, loading, signOut }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth AuthProvider ichida ishlatilishi kerak');
  return ctx;
}
