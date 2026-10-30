'use client';
import { Archive, ArchiveRestore, Package, Pencil, Plus } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { DataGate, Money, ResponsiveTable } from '@/components/shared';
import { useShop, type ShopData } from '@/components/ShopDataProvider';
import { Modal } from '@/components/ui/Modal';
import { Alert, Badge, Button, Card, EmptyState, Input, PageHeader, SearchInput, Segmented, Select, TableSkeleton } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { uz } from '@/i18n/uz';
import { createProduct, updateProduct } from '@/lib/data/api';
import { UNITS, type Product, type Unit } from '@/lib/data/types';
import { formatDate } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { formatMoneyInput, parseMoneyInput } from '@/lib/money';
import { getSupabase } from '@/lib/supabase/client';
import { firstError, productNameSchema } from '@/lib/validation';

type Filter = 'active' | 'archived' | 'all';

function ProductForm({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const { shopId, reload } = useShop();
  const toast = useToast();
  const [name, setName] = useState(product?.name ?? '');
  const [unit, setUnit] = useState<Unit>(product?.unit ?? 'dona');
  const [price, setPrice] = useState(product?.last_price !== null && product?.last_price !== undefined ? formatMoneyInput(product.last_price.toString()) : '');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const nameErr = firstError(productNameSchema.safeParse(name));
    const priceRes = price.trim() ? parseMoneyInput(price, { allowZero: true }) : null;
    const next = { name: nameErr, price: priceRes && !priceRes.ok ? priceRes.message : null };
    setErrors(next);
    if (next.name || next.price) return;
    setBusy(true);
    setFormError(null);
    const input = { name: name.trim(), unit, last_price: priceRes?.ok ? priceRes.value : null, is_active: product?.is_active ?? true };
    try {
      const sb = getSupabase();
      if (product) await updateProduct(sb, shopId, product.id, input);
      else await createProduct(sb, shopId, input);
      await reload();
      toast.success(product ? 'Mahsulot yangilandi.' : `«${input.name}» qo'shildi.`);
      onClose();
    } catch (err) {
      setFormError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      busy={busy}
      title={product ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Bekor qilish
          </Button>
          <Button type="submit" form="product-form" loading={busy}>
            Saqlash
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        {formError && <Alert tone="red">{formError}</Alert>}
        <Input label="Nomi" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} required maxLength={120} placeholder="Masalan: Shakar" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="O'lchov birligi" value={unit} onChange={(e) => setUnit(e.target.value as Unit)} required>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {uz.units[u]}
              </option>
            ))}
          </Select>
          <Input
            label="Narx (1 birlik uchun)"
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(formatMoneyInput(e.target.value))}
            error={errors.price}
            suffix="so'm"
            placeholder="Ixtiyoriy"
            hint="Savdoda avtomatik qo'yiladi, o'zgartirish mumkin"
          />
        </div>
      </form>
    </Modal>
  );
}

function Products({ data }: { data: ShopData }) {
  const { shopId, reload } = useShop();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('active');
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('uz');
    return data.products.filter((p) => {
      if (filter === 'active' && !p.is_active) return false;
      if (filter === 'archived' && p.is_active) return false;
      return !q || p.name.toLocaleLowerCase('uz').includes(q);
    });
  }, [data.products, query, filter]);

  async function toggleActive(p: Product) {
    if (toggling) return;
    setToggling(p.id);
    try {
      await updateProduct(getSupabase(), shopId, p.id, { name: p.name, unit: p.unit, last_price: p.last_price, is_active: !p.is_active });
      await reload();
      toast.success(p.is_active ? 'Mahsulot arxivlandi.' : 'Mahsulot faollashtirildi.');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setToggling(null);
    }
  }

  const actions = (p: Product) => (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(p)} aria-label={`${p.name} — tahrirlash`} title="Tahrirlash">
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => void toggleActive(p)}
        loading={toggling === p.id}
        aria-label={p.is_active ? 'Arxivlash' : 'Faollashtirish'}
        title={p.is_active ? 'Arxivlash (savdo tanlovida ko‘rinmaydi)' : 'Faollashtirish'}
      >
        {toggling === p.id ? null : p.is_active ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
      </Button>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Mahsulotlar"
        description="Savdoda tez tanlash uchun katalog. Ombor qoldig'i yuritilmaydi."
        actions={
          <Button onClick={() => setEditing('new')} icon={<Plus className="h-4 w-4" />}>
            Mahsulot qo&apos;shish
          </Button>
        }
      />
      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:p-5">
          <SearchInput value={query} onChange={setQuery} placeholder="Mahsulot nomi bo'yicha qidirish" className="sm:max-w-sm sm:flex-1" />
          <Segmented
            ariaLabel="Holat"
            className="sm:ml-auto"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'active', label: 'Faol' },
              { value: 'archived', label: 'Arxiv' },
              { value: 'all', label: 'Hammasi' },
            ]}
          />
        </div>
        {data.products.length === 0 ? (
          <EmptyState
            icon={<Package className="h-6 w-6" />}
            title="Katalog bo'sh"
            description="Tez-tez sotiladigan mahsulotlarni narxi bilan qo'shing — savdo kiritish tezlashadi."
            action={
              <Button size="sm" onClick={() => setEditing('new')} icon={<Plus className="h-4 w-4" />}>
                Mahsulot qo&apos;shish
              </Button>
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState title="Hech narsa topilmadi" description="Qidiruv yoki filterni o'zgartirib ko'ring." />
        ) : (
          <ResponsiveTable
            head={
              <tr>
                <th className="px-5 py-3 font-medium">Nomi</th>
                <th className="px-5 py-3 font-medium">Birlik</th>
                <th className="px-5 py-3 text-right font-medium">Narx</th>
                <th className="px-5 py-3 font-medium">Holat</th>
                <th className="px-5 py-3 font-medium">Yangilangan</th>
                <th className="px-5 py-3" />
              </tr>
            }
            mobile={rows.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-medium text-fg">
                    {p.name} {!p.is_active && <Badge>Arxiv</Badge>}
                  </p>
                  <p className="text-xs text-muted">
                    {p.last_price !== null ? <Money value={p.last_price} /> : "Narx yo'q"} / {uz.units[p.unit] ?? p.unit}
                  </p>
                </div>
                {actions(p)}
              </div>
            ))}
          >
            {rows.map((p) => (
              <tr key={p.id} className="transition-colors hover:bg-surface-2">
                <td className="px-5 py-3 font-medium text-fg">{p.name}</td>
                <td className="px-5 py-3 text-muted">{uz.units[p.unit] ?? p.unit}</td>
                <td className="px-5 py-3 text-right">{p.last_price !== null ? <Money value={p.last_price} className="text-fg" /> : <span className="text-muted">—</span>}</td>
                <td className="px-5 py-3">{p.is_active ? <Badge tone="green">Faol</Badge> : <Badge>Arxiv</Badge>}</td>
                <td className="px-5 py-3 text-muted">{formatDate(p.updated_at)}</td>
                <td className="px-5 py-3">{actions(p)}</td>
              </tr>
            ))}
          </ResponsiveTable>
        )}
      </Card>
      {editing && <ProductForm key={editing === 'new' ? 'new' : editing.id} product={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

export default function ProductsPage() {
  return (
    <DataGate skeleton={<Card><TableSkeleton /></Card>}>{(data) => <Products data={data} />}</DataGate>
  );
}
