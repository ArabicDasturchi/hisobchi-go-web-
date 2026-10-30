'use client';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { AppShell } from '@/components/layout/AppShell';
import { ShopDataProvider, useMembershipLoader } from '@/components/ShopDataProvider';
import { ErrorState, FullPageSpinner } from '@/components/ui/primitives';

/** Himoyalangan qism: sessiya (proxy ham tekshiradi) + do'kon a'zoligi. Do'kon yo'q bo'lsa — onboarding */
export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [membership, retry] = useMembershipLoader();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (membership.status === 'none') router.replace('/onboarding');
  }, [membership.status, router]);

  if (loading || !user || membership.status === 'loading' || membership.status === 'none') {
    return <FullPageSpinner label="Do'kon ma'lumotlari yuklanmoqda…" />;
  }
  if (membership.status === 'error') {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <ErrorState message={membership.message} onRetry={retry} />
      </div>
    );
  }
  return (
    <ShopDataProvider membership={membership.membership}>
      <AppShell>{children}</AppShell>
    </ShopDataProvider>
  );
}
