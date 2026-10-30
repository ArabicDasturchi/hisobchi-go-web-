'use client';
import { ArrowRight, CalendarDays, CircleDollarSign, HandCoins, Package, Plus, Receipt, Users, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { TrendChart } from '@/components/charts/TrendChart';
import { DataGate, Money, StatCard, StatusBadge } from '@/components/shared';
import { useShop, type ShopData } from '@/components/ShopDataProvider';
import { Avatar, Card, CardHeader, EmptyState, LinkButton, PageHeader, Segmented } from '@/components/ui/primitives';
import { computeTotals, dailySeries, inRange, sumActivePayments, sumPosted } from '@/lib/data/ledger';
import { addDays, dayKey, dayRangeToIso, formatDateTime, shortNumber } from '@/lib/dates';
import { uz } from '@/i18n/uz';

type Range = '7' | '30' | '90';

function Dashboard({ data }: { data: ShopData }) {
  const { balances, customerById, membership } = useShop();
  const [range, setRange] = useState<Range>('30');
  const totals = useMemo(() => computeTotals(data.sales, data.payments), [data]);
  const series = useMemo(() => dailySeries(data.sales, data.payments, Number(range)), [data, range]);
  // Tanlangan davr ko'rsatkichlari — grafik bilan bir xil oraliq, BigInt'da
  const period = useMemo(() => {
    const now = new Date();
    const r = dayRangeToIso(dayKey(addDays(now, -(Number(range) - 1))), dayKey(now));
    if (!r) return null;
    const sales = inRange(data.sales, r.fromIso, r.toIso).filter((s) => s.status === 'posted');
    const pays = inRange(data.payments, r.fromIso, r.toIso);
    return { sales: sumPosted(sales), count: sales.length, paid: sumActivePayments(pays) };
  }, [data, range]);
  const recent = data.sales.slice(0, 6);
  const debtors = useMemo(
    () =>
      [...balances.entries()]
        .filter(([, b]) => b.debt > 0n)
        .sort((a, b) => (b[1].debt > a[1].debt ? 1 : b[1].debt < a[1].debt ? -1 : 0))
        .slice(0, 6),
    [balances],
  );
  const activeProducts = data.products.filter((p) => p.is_active).length;
  const empty = data.sales.length === 0 && data.payments.length === 0;

  return (
    <>
      <PageHeader
        title="Bosh sahifa"
        description={`${membership.shop.name} — joriy holat (server ma'lumotlari)`}
        actions={
          <LinkButton href="/sales/new" icon={<Plus className="h-4 w-4" />}>
            {uz.nav.newSale}
          </LinkButton>
        }
      />

      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Bugungi savdo" value={<Money value={totals.todaySales} />} hint={`${totals.todayCount} ta savdo`} icon={CalendarDays} accent="emerald" />
        <StatCard label="Umumiy savdo" value={<Money value={totals.totalSales} />} hint={`${totals.saleCount} ta savdo${totals.reversedCount ? `, ${totals.reversedCount} ta bekor` : ''}`} icon={CircleDollarSign} accent="blue" />
        <StatCard label="Jami qarzdorlik" value={<Money value={totals.totalDebt} />} hint={`${totals.debtorCount} ta qarzdor mijoz`} icon={HandCoins} accent="rose" />
        <StatCard label="Qabul qilingan to'lovlar" value={<Money value={totals.totalPaid} />} hint="Bekor qilinganlarsiz" icon={Wallet} accent="emerald" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-4">
        <Link href="/customers" className="rounded-2xl focus-visible:outline-offset-4">
          <StatCard label="Mijozlar" value={data.customers.length} hint="Barcha mijozlar" icon={Users} accent="slate" />
        </Link>
        <Link href="/products" className="rounded-2xl focus-visible:outline-offset-4">
          <StatCard label="Mahsulotlar" value={activeProducts} hint={`${data.products.length - activeProducts} ta arxivda`} icon={Package} accent="slate" />
        </Link>
      </div>

      <Card className="mt-4">
        <CardHeader
          title="Savdo dinamikasi"
          description="Kunlik savdo (bekor qilinganlarsiz) va qabul qilingan to'lovlar"
          action={
            <Segmented
              ariaLabel="Davr"
              value={range}
              onChange={setRange}
              options={[
                { value: '7', label: '7 kun' },
                { value: '30', label: '30 kun' },
                { value: '90', label: '90 kun' },
              ]}
            />
          }
        />
        <div className="p-4 sm:p-5">
          {period && !empty && (
            <dl className="mb-4 grid grid-cols-1 gap-3 min-[400px]:grid-cols-3">
              <div className="rounded-xl bg-subtle px-3.5 py-2.5">
                <dt className="text-xs text-muted">Davrdagi savdo</dt>
                <dd className="mt-0.5 text-sm font-semibold text-fg">
                  <Money value={period.sales} />
                </dd>
              </div>
              <div className="rounded-xl bg-subtle px-3.5 py-2.5">
                <dt className="text-xs text-muted">Savdolar soni</dt>
                <dd className="tabular mt-0.5 text-sm font-semibold text-fg">{period.count} ta</dd>
              </div>
              <div className="rounded-xl bg-subtle px-3.5 py-2.5">
                <dt className="text-xs text-muted">Davrdagi to&apos;lovlar</dt>
                <dd className="mt-0.5 text-sm font-semibold text-fg">
                  <Money value={period.paid} />
                </dd>
              </div>
            </dl>
          )}
          {empty ? (
            <EmptyState title="Hali savdo yo'q" description="Birinchi savdoni kiriting — grafik shu yerda paydo bo'ladi." action={<LinkButton href="/sales/new" size="sm">Savdo kiritish</LinkButton>} />
          ) : (
            <TrendChart data={series} />
          )}
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="So'nggi savdolar"
            action={
              <Link href="/sales" className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                Hammasi <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {recent.length === 0 ? (
            <EmptyState icon={<Receipt className="h-6 w-6" />} title="Savdolar yo'q" description="Kiritilgan savdolar shu yerda ko'rinadi." />
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((s) => {
                const c = s.customer_id ? customerById.get(s.customer_id) : null;
                return (
                  <li key={s.id}>
                    <Link href={`/sales/${s.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2 sm:px-5">
                      <Avatar name={c?.name ?? '—'} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-fg">{c?.name ?? uz.common.noCustomer}</p>
                        <p className="text-xs text-muted">
                          {shortNumber(s.id)} · {formatDateTime(s.created_at)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Money value={s.subtotal} className={s.status === 'reversed' ? 'text-sm text-muted line-through' : 'text-sm font-semibold text-fg'} />
                        {s.status === 'reversed' && <StatusBadge status={s.status} />}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Qarzi katta mijozlar"
            action={
              <Link href="/customers?filter=debt" className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                Hammasi <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {debtors.length === 0 ? (
            <EmptyState icon={<HandCoins className="h-6 w-6" />} title="Qarzdorlar yo'q" description="Qarzga savdo qilinganda mijozlar shu yerda ko'rinadi." />
          ) : (
            <ul className="divide-y divide-line">
              {debtors.map(([id, b]) => {
                const c = customerById.get(id);
                const share = totals.totalDebt > 0n ? Number((b.debt * 1000n) / totals.totalDebt) / 10 : 0;
                return (
                  <li key={id}>
                    <Link href={`/customers/${id}`} className="block px-4 py-3 transition-colors hover:bg-surface-2 sm:px-5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium text-fg">{c?.name ?? "Noma'lum mijoz"}</span>
                        <Money value={b.debt} className="text-sm font-semibold text-rose-600 dark:text-rose-400" />
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-subtle" aria-hidden>
                        <div className="h-full rounded-full bg-rose-500/70" style={{ width: `${Math.max(2, share)}%` }} />
                      </div>
                      <p className="mt-1 text-[11px] text-muted">Umumiy qarzning {share.toLocaleString('uz-UZ')}%</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

export default function DashboardPage() {
  return <DataGate>{(data) => <Dashboard data={data} />}</DataGate>;
}
