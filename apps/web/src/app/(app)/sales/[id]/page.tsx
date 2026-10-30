'use client';
import { ArrowLeft, Ban, Printer, User } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ReasonModal } from '@/components/forms/ReasonModal';
import { Money, StatusBadge } from '@/components/shared';
import { useShop } from '@/components/ShopDataProvider';
import { Alert, Button, Card, CardHeader, EmptyState, ErrorState, LinkButton, Skeleton } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { uz } from '@/i18n/uz';
import { getSaleDetail, reverseSale } from '@/lib/data/api';
import type { SaleDetail } from '@/lib/data/types';
import { formatDateTime, shortNumber } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { formatQty } from '@/lib/money';
import { getSupabase } from '@/lib/supabase/client';

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'missing' } | { status: 'ok'; detail: SaleDetail };

export default function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { shopId, customerById, reload, membership } = useShop();
  const toast = useToast();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [reversing, setReversing] = useState<{ opId: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const detail = await getSaleDetail(getSupabase(), shopId, id);
      setState(detail ? { status: 'ok', detail } : { status: 'missing' });
    } catch (e) {
      setState({ status: 'error', message: errorMessage(e) });
    }
  }, [shopId, id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- serverdan yuklash
    void load();
  }, [load]);

  const back = (
    <Link href="/sales" className="no-print mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg">
      <ArrowLeft className="h-4 w-4" /> Savdolar
    </Link>
  );

  if (state.status === 'loading') {
    return (
      <>
        {back}
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-5 h-72 rounded-2xl" />
      </>
    );
  }
  if (state.status === 'error') {
    return (
      <>
        {back}
        <Card>
          <ErrorState message={state.message} onRetry={() => void load()} />
        </Card>
      </>
    );
  }
  if (state.status === 'missing') {
    return (
      <>
        {back}
        <Card>
          <EmptyState title="Savdo topilmadi" description="U mavjud emas yoki boshqa do'konga tegishli." action={<LinkButton href="/sales" size="sm" variant="outline">Savdolar ro&apos;yxati</LinkButton>} />
        </Card>
      </>
    );
  }

  const { doc, lines, reversal } = state.detail;
  const customer = doc.customer_id ? customerById.get(doc.customer_id) : null;

  return (
    <>
      {back}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="print-only mb-2 text-sm">{membership.shop.name}</p>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight text-fg sm:text-2xl">Savdo {shortNumber(doc.id)}</h1>
            <StatusBadge status={doc.status} />
          </div>
          <p className="mt-1 text-sm text-muted">{formatDateTime(doc.created_at)}</p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.print()} icon={<Printer className="h-4 w-4" />}>
            Chop etish
          </Button>
          {doc.status === 'posted' && (
            <Button variant="danger" onClick={() => setReversing({ opId: crypto.randomUUID() })} icon={<Ban className="h-4 w-4" />}>
              Bekor qilish
            </Button>
          )}
        </div>
      </div>

      {reversal && (
        <Alert tone="red" title="Savdo bekor qilingan" className="mb-4">
          {formatDateTime(reversal.created_at)} · Sabab: {reversal.reason}. Summa (<Money value={reversal.amount} />) mijoz qarzidan chiqarilgan. Asl yozuv tarixda saqlanadi.
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <Card className="lg:col-span-2">
          <CardHeader title="Mahsulotlar" description={`${lines.length} ta qator`} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-line bg-surface-2 text-xs font-medium uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">#</th>
                  <th className="px-5 py-3 font-medium">Mahsulot</th>
                  <th className="px-5 py-3 text-right font-medium">Miqdor</th>
                  <th className="px-5 py-3 text-right font-medium">Narx</th>
                  <th className="px-5 py-3 text-right font-medium">Summa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {lines.map((l) => (
                  <tr key={l.id}>
                    <td className="px-5 py-3 text-muted">{l.line_index + 1}</td>
                    <td className="px-5 py-3 font-medium text-fg">{l.product_name}</td>
                    <td className="tabular whitespace-nowrap px-5 py-3 text-right text-fg">
                      {formatQty(l.qty_milli)} {uz.units[l.unit as keyof typeof uz.units] ?? l.unit}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Money value={l.unit_price} className="text-muted" />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Money value={l.line_total} className="font-semibold text-fg" />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-line">
                <tr>
                  <td colSpan={4} className="px-5 py-3.5 text-right font-medium text-muted">
                    Jami
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Money value={doc.subtotal} className={doc.status === 'reversed' ? 'text-base font-semibold text-muted line-through' : 'text-base font-semibold text-fg'} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader title="Ma'lumot" />
          <dl className="space-y-3 p-4 text-sm sm:p-5">
            <div>
              <dt className="text-xs text-muted">Mijoz</dt>
              <dd className="mt-0.5">
                {customer ? (
                  <Link href={`/customers/${customer.id}`} className="inline-flex items-center gap-1.5 font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                    <User className="h-3.5 w-3.5" /> {customer.name}
                  </Link>
                ) : (
                  <span className="text-fg">{uz.common.noCustomer} (naqd)</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Turi</dt>
              <dd className="mt-0.5 text-fg">{customer ? 'Mijoz hisobiga (qarz yoki to‘lov bilan)' : 'Naqd savdo'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Server tekshiruvi</dt>
              <dd className="mt-0.5 text-fg">Summa PostgreSQL&apos;da qayta hisoblangan va mos kelgan</dd>
            </div>
            {doc.posted_at && (
              <div>
                <dt className="text-xs text-muted">Saqlangan vaqt (server)</dt>
                <dd className="mt-0.5 text-fg">{formatDateTime(doc.posted_at)}</dd>
              </div>
            )}
          </dl>
        </Card>
      </div>

      <ReasonModal
        open={reversing !== null}
        onClose={() => setReversing(null)}
        title="Savdoni bekor qilish"
        confirmLabel="Savdoni bekor qilish"
        summary={
          <>
            <b>{shortNumber(doc.id)}</b> savdosi (<Money value={doc.subtotal} className="font-semibold" />) bekor qilinadi.
            {customer ? ` Summa «${customer.name}» qarzidan chiqariladi.` : ''} Bu amalni qaytarib bo&apos;lmaydi.
          </>
        }
        onConfirm={async (reason) => {
          if (!reversing) return;
          // client_op_id modal ochilganda bir marta yaratilgan — qayta bosish takroriy bekor qilish yaratmaydi
          await reverseSale(getSupabase(), shopId, doc.id, reversing.opId, reason);
          await Promise.all([load(), reload()]);
          toast.success('Savdo bekor qilindi.');
          setReversing(null);
        }}
      />
    </>
  );
}
