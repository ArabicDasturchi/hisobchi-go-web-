'use client';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { uz } from '@/i18n/uz';
import { formatSom } from '@/lib/money';
import type { PaymentMethod, SaleStatus } from '@/lib/data/types';
import { useShop, type ShopData } from './ShopDataProvider';
import { Alert, Badge, Card, cn, ErrorState, Skeleton } from './ui/primitives';

export function Money({ value, className, signed }: { value: bigint; className?: string; signed?: boolean }) {
  const text = signed && value > 0n ? `+${formatSom(value)}` : formatSom(value);
  return <span className={cn('tabular whitespace-nowrap', className)}>{text}</span>;
}

type Accent = 'emerald' | 'blue' | 'rose' | 'slate';
const ACCENTS: Record<Accent, string> = {
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
  slate: 'bg-subtle text-muted',
};

export function StatCard({ label, value, hint, icon: Icon, accent = 'emerald' }: { label: string; value: ReactNode; hint?: ReactNode; icon: LucideIcon; accent?: Accent }) {
  return (
    <Card className="p-4 transition-shadow hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', ACCENTS[accent])}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
      <p className="mt-2 truncate text-xl font-semibold tracking-tight text-fg sm:text-2xl">{value}</p>
      {hint && <p className="mt-1 truncate text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export function StatusBadge({ status }: { status: SaleStatus }) {
  return status === 'posted' ? <Badge tone="green">{uz.status.posted}</Badge> : <Badge tone="red">{uz.status.reversed}</Badge>;
}

export function MethodBadge({ method }: { method: PaymentMethod }) {
  return <Badge tone={method === 'naqd' ? 'green' : method === 'karta' ? 'blue' : 'neutral'}>{uz.methods[method]}</Badge>;
}

/**
 * Do'kon ma'lumotlari tayyor bo'lgandagina sahifani chizadi: birinchi yuklashda skeleton,
 * xatoda qayta urinish; yangilash xatosida eski ma'lumot + ogohlantirish.
 */
export function DataGate({ children, skeleton }: { children: (data: ShopData) => ReactNode; skeleton?: ReactNode }) {
  const { data, loading, error, reload } = useShop();
  if (!data) {
    if (error && !loading) {
      return (
        <Card>
          <ErrorState message={error} onRetry={() => void reload()} />
        </Card>
      );
    }
    return <>{skeleton ?? <PageSkeleton />}</>;
  }
  return (
    <>
      {error && (
        <Alert tone="amber" className="no-print mb-4">
          Oxirgi yangilash muvaffaqiyatsiz: {error} Ko&apos;rsatilayotgan ma&apos;lumot eskirgan bo&apos;lishi mumkin.
        </Alert>
      )}
      {children(data)}
    </>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Yuklanmoqda">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}

/** Mobil ekranda jadval o'rniga kartochka ro'yxati, katta ekranda jadval */
export function ResponsiveTable({ head, children, mobile }: { head: ReactNode; children: ReactNode; mobile: ReactNode }) {
  return (
    <>
      <div className="divide-y divide-line lg:hidden">{mobile}</div>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-surface-2 text-xs font-medium uppercase tracking-wide text-muted">{head}</thead>
          <tbody className="divide-y divide-line">{children}</tbody>
        </table>
      </div>
    </>
  );
}
