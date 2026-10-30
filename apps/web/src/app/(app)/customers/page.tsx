'use client';
import { ChevronRight, Phone, Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { CustomerFormModal } from '@/components/forms/CustomerFormModal';
import { DataGate, Money, ResponsiveTable } from '@/components/shared';
import { useShop, type ShopData } from '@/components/ShopDataProvider';
import { Avatar, Button, Card, EmptyState, PageHeader, SearchInput, Segmented, Select, TableSkeleton } from '@/components/ui/primitives';
import { balanceOf } from '@/lib/data/ledger';
import { formatDate } from '@/lib/dates';

type Filter = 'all' | 'debt' | 'clear';
type Sort = 'name' | 'debt' | 'recent';

const norm = (s: string) => s.toLocaleLowerCase('uz').replace(/[ʻʼ‘’`']/g, "'").trim();

function Customers({ data }: { data: ShopData }) {
  const router = useRouter();
  const params = useSearchParams();
  const { balances } = useShop();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>(params.get('filter') === 'debt' ? 'debt' : 'all');
  const [sort, setSort] = useState<Sort>(params.get('filter') === 'debt' ? 'debt' : 'name');
  const [adding, setAdding] = useState(false);

  const rows = useMemo(() => {
    const q = norm(query);
    const list = data.customers
      .map((c) => ({ c, b: balanceOf(balances, c.id) }))
      .filter(({ c, b }) => {
        if (filter === 'debt' && b.debt <= 0n) return false;
        if (filter === 'clear' && b.debt > 0n) return false;
        if (!q) return true;
        return norm(c.name).includes(q) || (c.phone ?? '').replace(/\D/g, '').includes(q.replace(/\D/g, '') || '\u0000');
      });
    list.sort((x, y) => {
      if (sort === 'debt') return x.b.debt === y.b.debt ? x.c.name.localeCompare(y.c.name) : x.b.debt < y.b.debt ? 1 : -1;
      if (sort === 'recent') return (y.b.lastActivity ?? y.c.created_at).localeCompare(x.b.lastActivity ?? x.c.created_at);
      return x.c.name.localeCompare(y.c.name, 'uz');
    });
    return list;
  }, [data.customers, balances, query, filter, sort]);

  return (
    <>
      <PageHeader
        title="Mijozlar"
        description={`${data.customers.length} ta mijoz`}
        actions={
          <Button onClick={() => setAdding(true)} icon={<Plus className="h-4 w-4" />}>
            Mijoz qo&apos;shish
          </Button>
        }
      />
      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:p-5 lg:flex-row lg:items-center">
          <SearchInput value={query} onChange={setQuery} placeholder="Ism yoki telefon bo'yicha qidirish" className="lg:max-w-sm lg:flex-1" />
          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <Segmented
              ariaLabel="Filter"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'Hammasi' },
                { value: 'debt', label: 'Qarzdorlar' },
                { value: 'clear', label: 'Qarzsiz' },
              ]}
            />
            <Select aria-label="Saralash" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-9 w-auto py-0 text-xs sm:text-sm">
              <option value="name">Nomi bo&apos;yicha</option>
              <option value="debt">Qarz bo&apos;yicha</option>
              <option value="recent">Oxirgi faollik</option>
            </Select>
          </div>
        </div>

        {data.customers.length === 0 ? (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="Hali mijoz yo'q"
            description="Qarzga savdo qilish va to'lovlarni kuzatish uchun mijoz qo'shing."
            action={
              <Button size="sm" onClick={() => setAdding(true)} icon={<Plus className="h-4 w-4" />}>
                Birinchi mijozni qo&apos;shish
              </Button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState title="Hech narsa topilmadi" description="Qidiruv yoki filterni o'zgartirib ko'ring." />
        ) : (
          <ResponsiveTable
            head={
              <tr>
                <th className="px-5 py-3 font-medium">Mijoz</th>
                <th className="px-5 py-3 font-medium">Telefon</th>
                <th className="px-5 py-3 text-right font-medium">Savdolar</th>
                <th className="px-5 py-3 text-right font-medium">To&apos;langan</th>
                <th className="px-5 py-3 text-right font-medium">Qarz</th>
                <th className="w-10 px-5 py-3" />
              </tr>
            }
            mobile={rows.map(({ c, b }) => (
              <Link key={c.id} href={`/customers/${c.id}`} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2">
                <Avatar name={c.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">{c.name}</p>
                  <p className="truncate text-xs text-muted">{c.phone ?? `${b.saleCount} ta savdo`}</p>
                </div>
                <div className="text-right">
                  <Money value={b.debt > 0n ? b.debt : 0n} className={b.debt > 0n ? 'text-sm font-semibold text-rose-600 dark:text-rose-400' : 'text-sm text-muted'} />
                  <p className="text-[11px] text-muted">{b.debt > 0n ? 'qarz' : b.debt < 0n ? 'ortiqcha to‘lov' : 'qarzsiz'}</p>
                </div>
              </Link>
            ))}
          >
            {rows.map(({ c, b }) => (
              <tr key={c.id} onClick={() => router.push(`/customers/${c.id}`)} className="cursor-pointer transition-colors hover:bg-surface-2">
                <td className="px-5 py-3">
                  <Link href={`/customers/${c.id}`} className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    <Avatar name={c.name} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-fg">{c.name}</p>
                      <p className="text-xs text-muted">Qo&apos;shilgan: {formatDate(c.created_at)}</p>
                    </div>
                  </Link>
                </td>
                <td className="px-5 py-3 text-muted">
                  {c.phone ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      {c.phone}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <Money value={b.sales} className="text-fg" />
                  <p className="text-xs text-muted">{b.saleCount} ta</p>
                </td>
                <td className="px-5 py-3 text-right">
                  <Money value={b.paid} className="text-fg" />
                </td>
                <td className="px-5 py-3 text-right">
                  <Money value={b.debt} className={b.debt > 0n ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-muted'} />
                </td>
                <td className="px-5 py-3 text-muted">
                  <ChevronRight className="h-4 w-4" />
                </td>
              </tr>
            ))}
          </ResponsiveTable>
        )}
      </Card>
      <CustomerFormModal open={adding} onClose={() => setAdding(false)} onSaved={(c) => router.push(`/customers/${c.id}`)} />
    </>
  );
}

export default function CustomersPage() {
  return (
    <DataGate skeleton={<Card><TableSkeleton /></Card>}>
      {(data) => (
        <Suspense>
          <Customers data={data} />
        </Suspense>
      )}
    </DataGate>
  );
}
