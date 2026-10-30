'use client';
import { ChevronRight, Plus, Receipt } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { DataGate, Money, ResponsiveTable, StatusBadge } from '@/components/shared';
import { useShop, type ShopData } from '@/components/ShopDataProvider';
import { Avatar, Button, Card, EmptyState, Input, LinkButton, PageHeader, SearchInput, Segmented, Select, TableSkeleton } from '@/components/ui/primitives';
import { uz } from '@/i18n/uz';
import { sumPosted } from '@/lib/data/ledger';
import { dayRangeToIso, formatDateTime, shortNumber } from '@/lib/dates';

type StatusFilter = 'all' | 'posted' | 'reversed';
const PAGE = 50;

function Sales({ data }: { data: ShopData }) {
  const router = useRouter();
  const { customerById } = useShop();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [customer, setCustomer] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [limit, setLimit] = useState(PAGE);

  const rangeInvalid = Boolean(from && to && from > to);

  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('uz').replace(/^#/, '');
    const fromT = from ? new Date(dayRangeToIso(from, from)!.fromIso).getTime() : null;
    const toT = to ? new Date(dayRangeToIso(to, to)!.toIso).getTime() : null;
    return data.sales.filter((s) => {
      if (status !== 'all' && s.status !== status) return false;
      if (customer === '__none' ? s.customer_id !== null : customer && s.customer_id !== customer) return false;
      const t = new Date(s.created_at).getTime();
      if (fromT !== null && t < fromT) return false;
      if (toT !== null && t >= toT) return false;
      if (!q) return true;
      const name = s.customer_id ? (customerById.get(s.customer_id)?.name ?? '') : uz.common.noCustomer;
      return shortNumber(s.id).toLowerCase().includes(q) || name.toLocaleLowerCase('uz').includes(q);
    });
  }, [data.sales, query, status, customer, from, to, customerById]);

  const shown = rows.slice(0, limit);
  const filtered = Boolean(query || status !== 'all' || customer || from || to);

  return (
    <>
      <PageHeader
        title="Savdolar"
        description={`${data.sales.length} ta savdo`}
        actions={
          <LinkButton href="/sales/new" icon={<Plus className="h-4 w-4" />}>
            {uz.nav.newSale}
          </LinkButton>
        }
      />
      <Card>
        <div className="space-y-3 border-b border-line p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <SearchInput value={query} onChange={setQuery} placeholder="Raqam (#…) yoki mijoz bo'yicha" className="lg:max-w-sm lg:flex-1" />
            <Segmented
              ariaLabel="Holat"
              className="lg:ml-auto"
              value={status}
              onChange={setStatus}
              options={[
                { value: 'all', label: 'Hammasi' },
                { value: 'posted', label: 'Saqlangan' },
                { value: 'reversed', label: 'Bekor qilingan' },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Select aria-label="Mijoz" value={customer} onChange={(e) => setCustomer(e.target.value)} wrapClassName="col-span-2">
              <option value="">Barcha mijozlar</option>
              <option value="__none">{uz.common.noCustomer}</option>
              {data.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Input type="date" aria-label="Boshlanish sanasi" value={from} onChange={(e) => setFrom(e.target.value)} max={to || undefined} />
            <Input type="date" aria-label="Tugash sanasi" value={to} onChange={(e) => setTo(e.target.value)} min={from || undefined} error={rangeInvalid ? "Oraliq noto'g'ri" : null} />
          </div>
          {filtered && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted">
                Topildi: <b className="text-fg">{rows.length}</b> ta · saqlanganlar summasi <Money value={sumPosted(rows)} className="font-semibold text-fg" />
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery('');
                  setStatus('all');
                  setCustomer('');
                  setFrom('');
                  setTo('');
                }}
              >
                Filterni tozalash
              </Button>
            </div>
          )}
        </div>

        {data.sales.length === 0 ? (
          <EmptyState icon={<Receipt className="h-6 w-6" />} title="Hali savdo yo'q" description="Birinchi savdoni kiriting." action={<LinkButton href="/sales/new" size="sm" icon={<Plus className="h-4 w-4" />}>Savdo kiritish</LinkButton>} />
        ) : rows.length === 0 ? (
          <EmptyState title="Hech narsa topilmadi" description="Filterlarni o'zgartirib ko'ring." />
        ) : (
          <>
            <ResponsiveTable
              head={
                <tr>
                  <th className="px-5 py-3 font-medium">Raqam</th>
                  <th className="px-5 py-3 font-medium">Mijoz</th>
                  <th className="px-5 py-3 font-medium">Sana</th>
                  <th className="px-5 py-3 font-medium">Holat</th>
                  <th className="px-5 py-3 text-right font-medium">Summa</th>
                  <th className="w-10 px-5 py-3" />
                </tr>
              }
              mobile={shown.map((s) => {
                const c = s.customer_id ? customerById.get(s.customer_id) : null;
                return (
                  <Link key={s.id} href={`/sales/${s.id}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2">
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
                );
              })}
            >
              {shown.map((s) => {
                const c = s.customer_id ? customerById.get(s.customer_id) : null;
                return (
                  <tr key={s.id} onClick={() => router.push(`/sales/${s.id}`)} className="cursor-pointer transition-colors hover:bg-surface-2">
                    <td className="px-5 py-3">
                      <Link href={`/sales/${s.id}`} onClick={(e) => e.stopPropagation()} className="font-mono text-xs font-semibold text-fg hover:underline">
                        {shortNumber(s.id)}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-fg">{c?.name ?? <span className="text-muted">{uz.common.noCustomer}</span>}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDateTime(s.created_at)}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Money value={s.subtotal} className={s.status === 'reversed' ? 'text-muted line-through' : 'font-semibold text-fg'} />
                    </td>
                    <td className="px-5 py-3 text-muted">
                      <ChevronRight className="h-4 w-4" />
                    </td>
                  </tr>
                );
              })}
            </ResponsiveTable>
            {rows.length > shown.length && (
              <div className="border-t border-line p-4 text-center">
                <Button variant="outline" size="sm" onClick={() => setLimit((l) => l + PAGE)}>
                  Yana ko&apos;rsatish ({rows.length - shown.length} ta qoldi)
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
}

export default function SalesPage() {
  return <DataGate skeleton={<Card><TableSkeleton /></Card>}>{(data) => <Sales data={data} />}</DataGate>;
}
