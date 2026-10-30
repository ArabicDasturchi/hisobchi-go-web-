'use client';
import { Ban, CircleDollarSign, Download, HandCoins, Printer, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { TrendChart } from '@/components/charts/TrendChart';
import { DataGate, MethodBadge, Money, StatCard, StatusBadge } from '@/components/shared';
import { useShop, type ShopData } from '@/components/ShopDataProvider';
import { Alert, Button, Card, CardHeader, EmptyState, Input, PageHeader, Segmented } from '@/components/ui/primitives';
import { uz } from '@/i18n/uz';
import { downloadCsv, toCsv } from '@/lib/csv';
import { balanceOf, computeTotals, inRange, rangeSeries, sumActivePayments, sumPosted } from '@/lib/data/ledger';
import { addDays, dayKey, dayRangeToIso, formatDate, formatDateTime, parseDayKey, shortNumber } from '@/lib/dates';

type Preset = 'today' | '7' | '30' | 'month' | 'custom';
type Tab = 'sales' | 'payments' | 'customers' | 'debts';

const MAX_CHART_DAYS = 370;
const TAB_LABELS: Record<Tab, string> = { sales: 'Savdolar', payments: "To'lovlar", customers: "Mijozlar bo'yicha", debts: 'Qarzdorlik' };

function presetRange(p: Exclude<Preset, 'custom'>, now = new Date()): [string, string] {
  if (p === 'today') return [dayKey(now), dayKey(now)];
  if (p === 'month') return [dayKey(new Date(now.getFullYear(), now.getMonth(), 1)), dayKey(now)];
  return [dayKey(addDays(now, -(Number(p) - 1))), dayKey(now)];
}

function Reports({ data }: { data: ShopData }) {
  const { customerById, balances, membership } = useShop();
  const [preset, setPreset] = useState<Preset>('30');
  const [[from, to], setRange] = useState<[string, string]>(() => presetRange('30'));
  const [tab, setTab] = useState<Tab>('sales');

  const iso = dayRangeToIso(from, to);

  const view = useMemo(() => {
    const iso = dayRangeToIso(from, to);
    if (!iso) return null;
    const sales = inRange(data.sales, iso.fromIso, iso.toIso);
    const payments = inRange(data.payments, iso.fromIso, iso.toIso);
    const posted = sales.filter((s) => s.status === 'posted');
    const reversed = sales.filter((s) => s.status === 'reversed');
    const fromD = parseDayKey(from)!;
    const toD = parseDayKey(to)!;
    const days = Math.round((toD.getTime() - fromD.getTime()) / 86_400_000) + 1;
    const series = days <= MAX_CHART_DAYS ? rangeSeries(sales, payments, fromD, toD) : null;

    // Mijozlar bo'yicha: oraliqdagi savdo/to'lov + joriy qarz
    const byCustomer = new Map<string, { sales: bigint; count: number; paid: bigint }>();
    for (const s of posted) {
      if (!s.customer_id) continue;
      const r = byCustomer.get(s.customer_id) ?? { sales: 0n, count: 0, paid: 0n };
      r.sales += s.subtotal;
      r.count++;
      byCustomer.set(s.customer_id, r);
    }
    for (const p of payments) {
      if (p.void) continue;
      const r = byCustomer.get(p.customer_id) ?? { sales: 0n, count: 0, paid: 0n };
      r.paid += p.amount;
      byCustomer.set(p.customer_id, r);
    }
    const customerRows = [...byCustomer.entries()]
      .map(([id, r]) => ({ id, name: customerById.get(id)?.name ?? "Noma'lum", ...r, debt: balanceOf(balances, id).debt }))
      .sort((a, b) => (b.sales > a.sales ? 1 : b.sales < a.sales ? -1 : 0));
    const anonSales = sumPosted(posted.filter((s) => !s.customer_id));
    return { sales, payments, posted, reversed, series, customerRows, anonSales };
  }, [data, from, to, customerById, balances]);

  const totalsNow = useMemo(() => computeTotals(data.sales, data.payments), [data]);
  const debtRows = useMemo(
    () =>
      data.customers
        .map((c) => ({ c, b: balanceOf(balances, c.id) }))
        .filter((r) => r.b.debt > 0n)
        .sort((a, b) => (b.b.debt > a.b.debt ? 1 : b.b.debt < a.b.debt ? -1 : 0)),
    [data.customers, balances],
  );

  const name = (id: string | null) => (id ? (customerById.get(id)?.name ?? "Noma'lum") : uz.common.noCustomer);
  const fileSuffix = `${from}_${to}`;

  function exportCsv() {
    if (!view) return;
    if (tab === 'sales') {
      downloadCsv(
        `savdolar_${fileSuffix}.csv`,
        toCsv(
          ['Raqam', 'Sana', 'Mijoz', 'Holat', "Summa (so'm)"],
          view.sales.map((s) => [shortNumber(s.id), formatDateTime(s.created_at), name(s.customer_id), uz.status[s.status], s.subtotal]),
        ),
      );
    } else if (tab === 'payments') {
      downloadCsv(
        `tolovlar_${fileSuffix}.csv`,
        toCsv(
          ['Sana', 'Mijoz', 'Usul', 'Holat', 'Izoh / sabab', "Summa (so'm)"],
          view.payments.map((p) => [formatDateTime(p.created_at), name(p.customer_id), uz.methods[p.method], p.void ? 'Bekor qilingan' : 'Faol', p.void ? p.void.reason : (p.note ?? ''), p.amount]),
        ),
      );
    } else if (tab === 'customers') {
      downloadCsv(
        `mijozlar_${fileSuffix}.csv`,
        toCsv(
          ['Mijoz', 'Savdolar soni', "Savdo (so'm)", "To'lov (so'm)", "Joriy qarz (so'm)"],
          view.customerRows.map((r) => [r.name, r.count, r.sales, r.paid, r.debt]),
        ),
      );
    } else {
      downloadCsv(
        `qarzdorlik_${dayKey(new Date())}.csv`,
        toCsv(
          ['Mijoz', 'Telefon', "Jami savdo (so'm)", "To'langan (so'm)", "Qarz (so'm)"],
          debtRows.map(({ c, b }) => [c.name, c.phone ?? '', b.sales, b.paid, b.debt]),
        ),
      );
    }
  }

  const rowCount = !view ? 0 : tab === 'sales' ? view.sales.length : tab === 'payments' ? view.payments.length : tab === 'customers' ? view.customerRows.length : debtRows.length;

  return (
    <>
      <PageHeader
        title="Hisobotlar"
        description="Sana oralig'i bo'yicha savdo, to'lov va qarzdorlik"
        actions={
          <>
            <Button variant="outline" onClick={() => window.print()} icon={<Printer className="h-4 w-4" />}>
              Chop etish
            </Button>
            <Button onClick={exportCsv} disabled={!view || rowCount === 0} icon={<Download className="h-4 w-4" />}>
              CSV eksport
            </Button>
          </>
        }
      />

      <div className="print-only mb-4 text-sm">
        <b>{membership.shop.name}</b> — hisobot: {formatDate(parseDayKey(from)?.toISOString() ?? new Date().toISOString())} – {formatDate(parseDayKey(to)?.toISOString() ?? new Date().toISOString())}
      </div>

      <Card className="no-print mb-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-fg">Davr</span>
            <Segmented
              ariaLabel="Davr"
              value={preset}
              onChange={(p) => {
                setPreset(p);
                if (p !== 'custom') setRange(presetRange(p));
              }}
              options={[
                { value: 'today', label: 'Bugun' },
                { value: '7', label: '7 kun' },
                { value: '30', label: '30 kun' },
                { value: 'month', label: 'Shu oy' },
                { value: 'custom', label: 'Boshqa' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 lg:ml-auto lg:w-80">
            <Input
              type="date"
              label="Dan"
              value={from}
              max={to}
              onChange={(e) => {
                setPreset('custom');
                setRange([e.target.value, to]);
              }}
            />
            <Input
              type="date"
              label="Gacha"
              value={to}
              min={from}
              onChange={(e) => {
                setPreset('custom');
                setRange([from, e.target.value]);
              }}
            />
          </div>
        </div>
        {!iso && (
          <Alert tone="red" className="mt-3">
            Sana oralig&apos;i noto&apos;g&apos;ri: boshlanish sanasi tugash sanasidan oldin bo&apos;lishi kerak.
          </Alert>
        )}
      </Card>

      {view && (
        <>
          <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Savdo (davrda)" value={<Money value={sumPosted(view.posted)} />} hint={`${view.posted.length} ta savdo${view.anonSales > 0n ? ', mijozsiz qismi bilan' : ''}`} icon={CircleDollarSign} accent="blue" />
            <StatCard label="Bekor qilingan" value={<Money value={view.reversed.reduce((s, d) => s + d.subtotal, 0n)} />} hint={`${view.reversed.length} ta savdo`} icon={Ban} accent="slate" />
            <StatCard label="To'lovlar (davrda)" value={<Money value={sumActivePayments(view.payments)} />} hint={`${view.payments.filter((p) => !p.void).length} ta faol to'lov`} icon={Wallet} accent="emerald" />
            <StatCard label="Joriy qarzdorlik" value={<Money value={totalsNow.totalDebt} />} hint={`${totalsNow.debtorCount} ta qarzdor (bugungi holat)`} icon={HandCoins} accent="rose" />
          </div>

          <Card className="mt-4">
            <CardHeader title="Kunlik dinamika" description={`${formatDate(parseDayKey(from)!.toISOString())} – ${formatDate(parseDayKey(to)!.toISOString())}`} />
            <div className="p-4 sm:p-5">
              {view.series ? (
                view.sales.length === 0 && view.payments.length === 0 ? (
                  <EmptyState title="Bu davrda yozuv yo'q" description="Boshqa sana oralig'ini tanlang." />
                ) : (
                  <TrendChart data={view.series} />
                )
              ) : (
                <Alert tone="blue">Grafik {MAX_CHART_DAYS} kundan uzun oraliq uchun ko&apos;rsatilmaydi — jadvallardan foydalaning.</Alert>
              )}
            </div>
          </Card>

          <Card className="mt-4">
            <CardHeader
              title={`Batafsil: ${TAB_LABELS[tab]}`}
              description={`${rowCount} ta qator`}
              action={
                <Segmented
                  ariaLabel="Hisobot turi"
                  value={tab}
                  onChange={setTab}
                  options={[
                    { value: 'sales', label: 'Savdolar' },
                    { value: 'payments', label: "To'lovlar" },
                    { value: 'customers', label: 'Mijozlar' },
                    { value: 'debts', label: 'Qarzdorlik' },
                  ]}
                />
              }
            />
            <div className="overflow-x-auto">
              {rowCount === 0 ? (
                <EmptyState title="Ma'lumot yo'q" description={tab === 'debts' ? "Hozir qarzdor mijoz yo'q." : "Tanlangan davrda yozuv yo'q."} />
              ) : (
                <table className="w-full min-w-[560px] text-left text-sm">
                  {tab === 'sales' && (
                    <>
                      <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-muted">
                        <tr>
                          <th className="px-5 py-3 font-medium">Raqam</th>
                          <th className="px-5 py-3 font-medium">Sana</th>
                          <th className="px-5 py-3 font-medium">Mijoz</th>
                          <th className="px-5 py-3 font-medium">Holat</th>
                          <th className="px-5 py-3 text-right font-medium">Summa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {view.sales.map((s) => (
                          <tr key={s.id}>
                            <td className="px-5 py-2.5">
                              <Link href={`/sales/${s.id}`} className="font-mono text-xs font-semibold text-fg hover:underline">
                                {shortNumber(s.id)}
                              </Link>
                            </td>
                            <td className="whitespace-nowrap px-5 py-2.5 text-muted">{formatDateTime(s.created_at)}</td>
                            <td className="px-5 py-2.5 text-fg">{name(s.customer_id)}</td>
                            <td className="px-5 py-2.5">
                              <StatusBadge status={s.status} />
                            </td>
                            <td className="px-5 py-2.5 text-right">
                              <Money value={s.subtotal} className={s.status === 'reversed' ? 'text-muted line-through' : 'font-medium text-fg'} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t border-line font-semibold">
                        <tr>
                          <td colSpan={4} className="px-5 py-3 text-right text-muted">
                            Jami (bekorlarsiz)
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Money value={sumPosted(view.sales)} className="text-fg" />
                          </td>
                        </tr>
                      </tfoot>
                    </>
                  )}
                  {tab === 'payments' && (
                    <>
                      <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-muted">
                        <tr>
                          <th className="px-5 py-3 font-medium">Sana</th>
                          <th className="px-5 py-3 font-medium">Mijoz</th>
                          <th className="px-5 py-3 font-medium">Usul</th>
                          <th className="px-5 py-3 font-medium">Izoh</th>
                          <th className="px-5 py-3 text-right font-medium">Summa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {view.payments.map((p) => (
                          <tr key={p.id}>
                            <td className="whitespace-nowrap px-5 py-2.5 text-muted">{formatDateTime(p.created_at)}</td>
                            <td className="px-5 py-2.5 text-fg">{name(p.customer_id)}</td>
                            <td className="px-5 py-2.5">
                              <MethodBadge method={p.method} />
                            </td>
                            <td className="max-w-[240px] truncate px-5 py-2.5 text-muted">{p.void ? `Bekor: ${p.void.reason}` : (p.note ?? '—')}</td>
                            <td className="px-5 py-2.5 text-right">
                              <Money value={p.amount} className={p.void ? 'text-muted line-through' : 'font-medium text-fg'} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t border-line font-semibold">
                        <tr>
                          <td colSpan={4} className="px-5 py-3 text-right text-muted">
                            Jami (bekorlarsiz)
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Money value={sumActivePayments(view.payments)} className="text-fg" />
                          </td>
                        </tr>
                      </tfoot>
                    </>
                  )}
                  {tab === 'customers' && (
                    <>
                      <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-muted">
                        <tr>
                          <th className="px-5 py-3 font-medium">Mijoz</th>
                          <th className="px-5 py-3 text-right font-medium">Savdolar</th>
                          <th className="px-5 py-3 text-right font-medium">Savdo summasi</th>
                          <th className="px-5 py-3 text-right font-medium">To&apos;lovlar</th>
                          <th className="px-5 py-3 text-right font-medium">Joriy qarz</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {view.customerRows.map((r) => (
                          <tr key={r.id}>
                            <td className="px-5 py-2.5">
                              <Link href={`/customers/${r.id}`} className="font-medium text-fg hover:underline">
                                {r.name}
                              </Link>
                            </td>
                            <td className="tabular px-5 py-2.5 text-right text-muted">{r.count}</td>
                            <td className="px-5 py-2.5 text-right">
                              <Money value={r.sales} className="text-fg" />
                            </td>
                            <td className="px-5 py-2.5 text-right">
                              <Money value={r.paid} className="text-fg" />
                            </td>
                            <td className="px-5 py-2.5 text-right">
                              <Money value={r.debt} className={r.debt > 0n ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-muted'} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </>
                  )}
                  {tab === 'debts' && (
                    <>
                      <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-wide text-muted">
                        <tr>
                          <th className="px-5 py-3 font-medium">Mijoz</th>
                          <th className="px-5 py-3 font-medium">Telefon</th>
                          <th className="px-5 py-3 text-right font-medium">Jami savdo</th>
                          <th className="px-5 py-3 text-right font-medium">To&apos;langan</th>
                          <th className="px-5 py-3 text-right font-medium">Qarz</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {debtRows.map(({ c, b }) => (
                          <tr key={c.id}>
                            <td className="px-5 py-2.5">
                              <Link href={`/customers/${c.id}`} className="font-medium text-fg hover:underline">
                                {c.name}
                              </Link>
                            </td>
                            <td className="px-5 py-2.5 text-muted">{c.phone ?? '—'}</td>
                            <td className="px-5 py-2.5 text-right">
                              <Money value={b.sales} className="text-fg" />
                            </td>
                            <td className="px-5 py-2.5 text-right">
                              <Money value={b.paid} className="text-fg" />
                            </td>
                            <td className="px-5 py-2.5 text-right">
                              <Money value={b.debt} className="font-semibold text-rose-600 dark:text-rose-400" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t border-line font-semibold">
                        <tr>
                          <td colSpan={4} className="px-5 py-3 text-right text-muted">
                            Jami qarzdorlik
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Money value={totalsNow.totalDebt} className="text-fg" />
                          </td>
                        </tr>
                      </tfoot>
                    </>
                  )}
                </table>
              )}
            </div>
            {tab === 'debts' && <p className="border-t border-line px-5 py-3 text-xs text-muted">Qarzdorlik — sana oralig&apos;idan qat&apos;i nazar, bugungi holat.</p>}
          </Card>
        </>
      )}
    </>
  );
}

export default function ReportsPage() {
  return <DataGate>{(data) => <Reports data={data} />}</DataGate>;
}
