'use client';
import { Ban, Plus, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PaymentModal } from '@/components/forms/PaymentModal';
import { ReasonModal } from '@/components/forms/ReasonModal';
import { DataGate, MethodBadge, Money, ResponsiveTable } from '@/components/shared';
import { useShop, type ShopData } from '@/components/ShopDataProvider';
import { Badge, Button, Card, EmptyState, PageHeader, SearchInput, Segmented, Select, TableSkeleton } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { uz } from '@/i18n/uz';
import { voidPayment } from '@/lib/data/api';
import { sumActivePayments } from '@/lib/data/ledger';
import { PAYMENT_METHODS, type Payment, type PaymentMethod } from '@/lib/data/types';
import { formatDateTime } from '@/lib/dates';
import { formatSom } from '@/lib/money';
import { getSupabase } from '@/lib/supabase/client';

type StatusFilter = 'active' | 'voided' | 'all';

function Payments({ data }: { data: ShopData }) {
  const { customerById, shopId, reload } = useShop();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('active');
  const [method, setMethod] = useState<'' | PaymentMethod>('');
  const [adding, setAdding] = useState(false);
  const [voiding, setVoiding] = useState<Payment | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('uz');
    return data.payments.filter((p) => {
      if (status === 'active' && p.void) return false;
      if (status === 'voided' && !p.void) return false;
      if (method && p.method !== method) return false;
      if (!q) return true;
      const name = customerById.get(p.customer_id)?.name ?? '';
      return name.toLocaleLowerCase('uz').includes(q) || (p.note ?? '').toLocaleLowerCase('uz').includes(q);
    });
  }, [data.payments, query, status, method, customerById]);

  const voidBtn = (p: Payment) =>
    p.void ? null : (
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setVoiding(p)} aria-label="To'lovni bekor qilish" title="To'lovni bekor qilish">
        <Ban className="h-4 w-4" />
      </Button>
    );

  return (
    <>
      <PageHeader
        title="To'lovlar"
        description={`Faol to'lovlar jami: ${formatSom(sumActivePayments(data.payments))}`}
        actions={
          <Button onClick={() => setAdding(true)} icon={<Plus className="h-4 w-4" />}>
            To&apos;lov qabul qilish
          </Button>
        }
      />
      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:p-5 lg:flex-row lg:items-center">
          <SearchInput value={query} onChange={setQuery} placeholder="Mijoz yoki izoh bo'yicha" className="lg:max-w-sm lg:flex-1" />
          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <Segmented
              ariaLabel="Holat"
              value={status}
              onChange={setStatus}
              options={[
                { value: 'active', label: 'Faol' },
                { value: 'voided', label: 'Bekor qilingan' },
                { value: 'all', label: 'Hammasi' },
              ]}
            />
            <Select aria-label="To'lov usuli" value={method} onChange={(e) => setMethod(e.target.value as '' | PaymentMethod)} className="h-9 w-auto py-0 text-xs sm:text-sm">
              <option value="">Barcha usullar</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {uz.methods[m]}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {data.payments.length === 0 ? (
          <EmptyState icon={<Wallet className="h-6 w-6" />} title="Hali to'lov yo'q" description="Qarzdor mijozdan to'lov qabul qilinganda shu yerda ko'rinadi." />
        ) : rows.length === 0 ? (
          <EmptyState title="Hech narsa topilmadi" description="Filterni o'zgartirib ko'ring." />
        ) : (
          <ResponsiveTable
            head={
              <tr>
                <th className="px-5 py-3 font-medium">Mijoz</th>
                <th className="px-5 py-3 font-medium">Sana</th>
                <th className="px-5 py-3 font-medium">Usul</th>
                <th className="px-5 py-3 font-medium">Izoh</th>
                <th className="px-5 py-3 text-right font-medium">Summa</th>
                <th className="w-12 px-5 py-3" />
              </tr>
            }
            mobile={rows.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/customers/${p.customer_id}`} className="block truncate text-sm font-medium text-fg hover:underline">
                    {customerById.get(p.customer_id)?.name ?? "Noma'lum mijoz"}
                  </Link>
                  <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    {formatDateTime(p.created_at)} <MethodBadge method={p.method} />
                    {p.void && <Badge tone="red">Bekor</Badge>}
                  </p>
                  {p.void && <p className="mt-0.5 truncate text-xs text-muted">Sabab: {p.void.reason}</p>}
                </div>
                <Money value={p.amount} className={p.void ? 'text-sm text-muted line-through' : 'text-sm font-semibold text-emerald-600 dark:text-emerald-400'} />
                {voidBtn(p)}
              </div>
            ))}
          >
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-surface-2">
                <td className="px-5 py-3">
                  <Link href={`/customers/${p.customer_id}`} className="font-medium text-fg hover:underline">
                    {customerById.get(p.customer_id)?.name ?? "Noma'lum mijoz"}
                  </Link>
                </td>
                <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDateTime(p.created_at)}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <MethodBadge method={p.method} />
                    {p.void && <Badge tone="red">Bekor qilingan</Badge>}
                  </div>
                </td>
                <td className="max-w-[260px] px-5 py-3 text-muted">
                  <p className="truncate">{p.void ? `Sabab: ${p.void.reason}` : (p.note ?? '—')}</p>
                </td>
                <td className="px-5 py-3 text-right">
                  <Money value={p.amount} className={p.void ? 'text-muted line-through' : 'font-semibold text-emerald-600 dark:text-emerald-400'} />
                </td>
                <td className="px-5 py-3">{voidBtn(p)}</td>
              </tr>
            ))}
          </ResponsiveTable>
        )}
      </Card>
      <PaymentModal open={adding} onClose={() => setAdding(false)} />
      <ReasonModal
        open={voiding !== null}
        onClose={() => setVoiding(null)}
        title="To'lovni bekor qilish"
        confirmLabel="Bekor qilish"
        summary={
          voiding && (
            <>
              {customerById.get(voiding.customer_id)?.name ?? 'Mijoz'}: <Money value={voiding.amount} className="font-semibold" /> to&apos;lov bekor qilinadi va qarzga qaytadi.
            </>
          )
        }
        onConfirm={async (reason) => {
          if (!voiding) return;
          await voidPayment(getSupabase(), shopId, voiding.id, reason);
          await reload();
          toast.success("To'lov bekor qilindi.");
          setVoiding(null);
        }}
      />
    </>
  );
}

export default function PaymentsPage() {
  return <DataGate skeleton={<Card><TableSkeleton /></Card>}>{(data) => <Payments data={data} />}</DataGate>;
}
