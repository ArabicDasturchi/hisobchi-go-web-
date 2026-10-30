'use client';
import { ArrowRight, LogOut, Store } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Logo } from '@/components/Logo';
import { useMembershipLoader } from '@/components/ShopDataProvider';
import { Alert, Button, Card, ErrorState, FullPageSpinner, Input } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { createShop, getMembership } from '@/lib/data/api';
import { errorMessage } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase/client';
import { firstError, shopNameSchema } from '@/lib/validation';

export default function OnboardingPage() {
  const router = useRouter();
  const toast = useToast();
  const { user, signOut } = useAuth();
  const [membership, retry] = useMembershipLoader();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Do'kon allaqachon bor — takroriy yaratish o'rniga dashboard
  useEffect(() => {
    if (membership.status === 'ok') router.replace('/dashboard');
  }, [membership.status, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy || !user) return;
    const err = firstError(shopNameSchema.safeParse(name));
    setError(err);
    if (err) return;
    setBusy(true);
    setFormError(null);
    try {
      const sb = getSupabase();
      // Server create_shop egasi bo'lgan do'konni qaytaradi — ikki marta bosish yangi do'kon yaratmaydi
      await createShop(sb, name);
      const m = await getMembership(sb, user.id);
      if (!m) throw new Error("Do'kon yaratildi, lekin a'zolik topilmadi");
      toast.success(`«${m.shop.name}» do'koni tayyor.`);
      router.replace('/dashboard');
    } catch (e2) {
      setFormError(errorMessage(e2));
      setBusy(false);
    }
  }

  if (membership.status === 'loading' || membership.status === 'ok') return <FullPageSpinner />;
  if (membership.status === 'error') {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <ErrorState message={membership.message} onRetry={retry} />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col px-4 py-6 sm:px-8">
      <div className="flex items-center justify-between">
        <Logo />
        <Button variant="ghost" size="sm" onClick={() => void signOut()} icon={<LogOut className="h-4 w-4" />}>
          Chiqish
        </Button>
      </div>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
        <Card className="p-6 sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="mt-5 text-xl font-semibold tracking-tight text-fg">Do&apos;koningizni yarating</h1>
          <p className="mt-1.5 text-sm text-muted">
            Savdo, mijoz va qarzlar shu do&apos;konga yoziladi. Siz uning egasi bo&apos;lasiz. Nomni keyin sozlamalarda o&apos;zgartirish mumkin.
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            {formError && <Alert tone="red">{formError}</Alert>}
            <Input label="Do'kon nomi" value={name} onChange={(e) => setName(e.target.value)} error={error} placeholder="Masalan: Baraka savdo" maxLength={80} required autoFocus />
            <Button type="submit" size="lg" className="w-full" loading={busy} icon={!busy ? <ArrowRight className="h-4 w-4" /> : undefined}>
              Do&apos;konni yaratish
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted">Hisob: {user?.email}</p>
        </Card>
      </div>
    </div>
  );
}
