'use client';
import { ArrowLeft, Ban, HandCoins, Pencil, Phone, Plus, Receipt, StickyNote, Trash2, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { CustomerFormModal } from '@/components/forms/CustomerFormModal';
import { PaymentModal } from '@/components/forms/PaymentModal';
import { ReasonModal } from '@/components/forms/ReasonModal';
import { DataGate, MethodBadge, Money, StatCard, StatusBadge } from '@/components/shared';
import { useShop, type ShopData } from '@/components/ShopDataProvider';
import { Modal } from '@/components/ui/Modal';
import { Alert, Avatar, Badge, Button, Card, CardHeader, EmptyState, LinkButton, Segmented } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { deleteCustomer, voidPayment } from '@/lib/data/api';
import { balanceOf } from '@/lib/data/ledger';
import type { Payment, SaleDoc } from '@/lib/data/types';
import { formatDateTime, shortNumber } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase/client';

type Entry = { kind: 'sale'; at: string; sale: SaleDoc } | { kind: 'payment'; at: string; payment: Payment };
type Tab = 'all' | 'sales' | 'payments';

function CustomerDetail({ data, id }: { data: ShopData; id: string }) {
  const router = useRouter();
  const toast = useToast();
  const { balances, shopId, reload } = useShop();
  const customer = data.customers.find((c) => c.id === id);
  const [editing, setEditing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [voiding, setVoiding] = useState<Payment | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('all');

  const sales = useMemo(() => data.sales.filter((s) => s.customer_id === id), [data.sales, id]);
  const payments = useMemo(() => data.payments.filter((p) => p.customer_id === id), [data.payments, id]);
  const entries = useMemo<Entry[]>(() => {
    const list: Entry[] = [
      ...(tab !== 'payments' ? sales.map((s) => ({ kind: 'sale' as const, at: s.created_at, sale: s })) : []),
      ...(tab !== 'sales' ? payments.map((p) => ({ kind: 'payment' as const, at: p.created_at, payment: p })) : []),
    ];
    return list.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [sales, payments, tab]);

  if (!customer) {
    return (
      <Card>
        <EmptyState title="Mijoz topilmadi" description="U o'chirilgan yoki boshqa do'konga tegishli." action={<LinkButton href="/customers" variant="outline" size="sm">Mijozlar ro&apos;yxati</LinkButton>} />
      </Card>
    );
  }

  const b = balanceOf(balances, id);
  const hasHistory = sales.length > 0 || payments.length > 0;

  async function doDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteCustomer(getSupabase(), shopId, id);
      await reload();
      toast.success("Mijoz o'chirildi.");
      router.replace('/customers');
    } catch (e) {
      setDeleteError(errorMessage(e));
      setDeleting(false);
    }
  }

  return (
    <>
      <Link href="/customers" className="no-print mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Mijozlar
      </Link>

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <Avatar name={customer.name} className="h-12 w-12 text-sm" />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-tight text-fg">{customer.name}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                {customer.phone && (
                  <a href={`tel:${customer.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1.5 hover:text-fg">
                    <Phone className="h-3.5 w-3.5" /> {customer.phone}
                  </a>
                )}
                <span>Qo&apos;shilgan: {formatDateTime(customer.created_at)}</span>
              </div>
              {customer.notes && (
                <p className="mt-2 inline-flex items-start gap-1.5 text-sm text-muted">
                  <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {customer.notes}
                </p>
              )}
            </div>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <Button onClick={() => setPaying(true)} disabled={b.debt <= 0n} icon={<Wallet className="h-4 w-4" />} title={b.debt <= 0n ? "Qarz yo'q" : undefined}>
              To&apos;lov qabul qilish
            </Button>
            <LinkButton href={`/sales/new?customer=${id}`} variant="outline" icon={<Plus className="h-4 w-4" />}>
              Savdo
            </LinkButton>
            <Button variant="outline" size="icon" onClick={() => setEditing(true)} aria-label="Tahrirlash" title="Tahrirlash">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setConfirmDelete(true)} aria-label="O'chirish" title={hasHistory ? "Tarixi bor mijozni o'chirib bo'lmaydi" : "O'chirish"} disabled={hasHistory}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-3 min-[400px]:grid-cols-3">
        <StatCard label="Jami savdo" value={<Money value={b.sales} />} hint={`${b.saleCount} ta savdo (bekorlarsiz)`} icon={Receipt} accent="blue" />
        <StatCard label="To'langan" value={<Money value={b.paid} />} hint={`${payments.filter((p) => !p.void).length} ta to'lov`} icon={Wallet} accent="emerald" />
        <StatCard
          label={b.debt < 0n ? "Ortiqcha to'lov" : 'Qolgan qarz'}
          value={<Money value={b.debt < 0n ? -b.debt : b.debt} className={b.debt > 0n ? 'text-rose-600 dark:text-rose-400' : undefined} />}
          hint={b.debt > 0n ? 'Savdolar − to‘lovlar' : b.debt < 0n ? 'Bekor qilingan savdodan keyin' : "Qarz yo'q"}
          icon={HandCoins}
          accent={b.debt > 0n ? 'rose' : 'slate'}
        />
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Savdo va to'lov tarixi"
          description="Bekor qilingan yozuvlar o'chirilmaydi — sababi bilan ko'rsatiladi"
          action={
            <Segmented
              ariaLabel="Tarix turi"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'all', label: 'Hammasi' },
                { value: 'sales', label: 'Savdolar' },
                { value: 'payments', label: "To'lovlar" },
              ]}
            />
          }
        />
        {entries.length === 0 ? (
          <EmptyState title="Tarix bo'sh" description="Bu mijozga hali savdo yoki to'lov yozilmagan." />
        ) : (
          <ul className="divide-y divide-line">
            {entries.map((e) =>
              e.kind === 'sale' ? (
                <li key={`s-${e.sale.id}`}>
                  <Link href={`/sales/${e.sale.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2 sm:px-5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                      <Receipt className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-fg">Savdo {shortNumber(e.sale.id)}</p>
                      <p className="text-xs text-muted">{formatDateTime(e.at)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Money value={e.sale.subtotal} className={e.sale.status === 'reversed' ? 'text-sm text-muted line-through' : 'text-sm font-semibold text-fg'} signed={e.sale.status === 'posted'} />
                      {e.sale.status === 'reversed' && <StatusBadge status="reversed" />}
                    </div>
                  </Link>
                </li>
              ) : (
                <li key={`p-${e.payment.id}`} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                    <Wallet className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-fg">
                      To&apos;lov <MethodBadge method={e.payment.method} />
                      {e.payment.void && <Badge tone="red">Bekor qilingan</Badge>}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {formatDateTime(e.at)}
                      {e.payment.note ? ` · ${e.payment.note}` : ''}
                      {e.payment.void ? ` · Sabab: ${e.payment.void.reason}` : ''}
                    </p>
                  </div>
                  <Money value={e.payment.amount} className={e.payment.void ? 'text-sm text-muted line-through' : 'text-sm font-semibold text-emerald-600 dark:text-emerald-400'} />
                  {!e.payment.void && (
                    <Button variant="ghost" size="icon" className="no-print h-8 w-8" onClick={() => setVoiding(e.payment)} aria-label="To'lovni bekor qilish" title="To'lovni bekor qilish">
                      <Ban className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ),
            )}
          </ul>
        )}
      </Card>

      <CustomerFormModal open={editing} onClose={() => setEditing(false)} customer={customer} />
      <PaymentModal open={paying} onClose={() => setPaying(false)} customerId={id} />
      <ReasonModal
        open={voiding !== null}
        onClose={() => setVoiding(null)}
        title="To'lovni bekor qilish"
        confirmLabel="Bekor qilish"
        summary={
          voiding && (
            <>
              <Money value={voiding.amount} className="font-semibold" /> to&apos;lov ({formatDateTime(voiding.created_at)}) bekor qilinadi va mijoz qarziga qaytadi.
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
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        busy={deleting}
        size="sm"
        title="Mijozni o'chirish"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              Yopish
            </Button>
            <Button variant="danger" onClick={doDelete} loading={deleting}>
              O&apos;chirish
            </Button>
          </>
        }
      >
        <p className="text-sm text-fg">
          <b>{customer.name}</b> o&apos;chiriladi. Savdo va to&apos;lov tarixi bo&apos;lmagani uchun bu xavfsiz.
        </p>
        {deleteError && (
          <Alert tone="red" className="mt-3">
            {deleteError}
          </Alert>
        )}
      </Modal>
    </>
  );
}

export default function CustomerPage() {
  const { id } = useParams<{ id: string }>();
  return <DataGate>{(data) => <CustomerDetail data={data} id={id} />}</DataGate>;
}
