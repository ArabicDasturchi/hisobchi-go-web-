import { supabaseConfigured } from '@/lib/env';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Sozlash kerak' };

export default function SetupPage() {
  if (supabaseConfigured) redirect('/dashboard');
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-semibold text-fg">Supabase sozlanmagan</h1>
      <p className="mt-3 text-sm text-muted">
        <code className="rounded bg-subtle px-1.5 py-0.5">apps/web/.env.local</code> faylida <code className="rounded bg-subtle px-1.5 py-0.5">NEXT_PUBLIC_SUPABASE_URL</code> va{' '}
        <code className="rounded bg-subtle px-1.5 py-0.5">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> qiymatlarini kiriting (namuna: <code>.env.example</code>), so&apos;ng serverni qayta ishga tushiring.
      </p>
    </main>
  );
}
