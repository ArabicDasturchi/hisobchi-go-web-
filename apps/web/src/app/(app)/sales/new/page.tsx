'use client';
import { ArrowLeft, CheckCircle2, Plus, RotateCw, Save, Trash2, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState, type FormEvent } from 'react';
import { CustomerFormModal } from '@/components/forms/CustomerFormModal';
import { DataGate, Money } from '@/components/shared';
import { useShop, type ShopData } from '@/components/ShopDataProvider';
import { Alert, Button, Card, CardHeader, cn, Input, LinkButton, PageHeader, Segmented, Select, Textarea } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { uz } from '@/i18n/uz';
import { postSale, recordPayment } from '@/lib/data/api';
import { balanceOf } from '@/lib/data/ledger';
import { PAYMENT_METHODS, UNITS, type PaymentMethod, type Unit } from '@/lib/data/types';
import { shortNumber } from '@/lib/dates';
import { toAppError } from '@/lib/errors';
import { formatMoneyInput } from '@/lib/money';
import { buildSalePlan, checkLine, isBlank, type DraftLine, type LineCheck, type PayMode, type SalePlan } from '@/lib/saleForm';
import { getSupabase } from '@/lib/supabase/client';

const newLine = (): DraftLine => ({ key: crypto.randomUUID(), productName: '', qty: '', unit: 'dona', price: '' });

/** Bir martalik kalitlar: forma yuborilgach o'zgarmaydi — qayta urinish serverda takroriy yozuv yaratmaydi */
const newKeys = () => ({ saleId: crypto.randomUUID(), saleOp: crypto.randomUUID(), paymentId: crypto.randomUUID(), paymentOp: crypto.randomUUID() });

type Phase =
  | { kind: 'editing' }
  | { kind: 'saving' }
  /** Savdo serverda saqlandi, lekin to'lov yozilmadi — faqat to'lovni qayta yuborish mumkin */
  | { kind: 'payment_failed'; saleId: string; plan: SalePlan; message: string };

function NewSale({ data }: { data: ShopData }) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const { shopId, reload, balances } = useShop();

  const initialCustomer = params.get('customer');
  const [customerId, setCustomerId] = useState(initialCustomer && data.customers.some((c) => c.id === initialCustomer) ? initialCustomer : '');
  const [lines, setLines] = useState<DraftLine[]>(() => [newLine()]);
  const [mode, setMode] = useState<PayMode>('debt');
  const [method, setMethod] = useState<PaymentMethod>('naqd');
  const [partial, setPartial] = useState('');
  const [note, setNote] = useState('');
  const [keys, setKeys] = useState(newKeys);
  /** Tarmoq xatosidan keyin forma qulflanadi: savdo serverda saqlangan bo'lishi mumkin */
  const [locked, setLocked] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: 'editing' });
  const [lineErrors, setLineErrors] = useState<Map<string, LineCheck['errors']>>(new Map());
  const [formError, setFormError] = useState<string | null>(null);
  const [paidError, setPaidError] = useState<string | null>(null);
  const [addingCustomer, setAddingCustomer] = useState(false);

  const activeProducts = useMemo(() => data.products.filter((p) => p.is_active), [data.products]);
  const productByName = useMemo(() => new Map(activeProducts.map((p) => [p.name.toLocaleLowerCase('uz'), p])), [activeProducts]);
  const customers = useMemo(() => [...data.customers].sort((a, b) => a.name.localeCompare(b.name, 'uz')), [data.customers]);

  const checks = lines.map((l) => (isBlank(l) ? null : checkLine(l)));
  const total = checks.reduce((s, c) => s + (c?.total ?? 0n), 0n);
  const preview = buildSalePlan({ lines, customerId: customerId || null, mode, partial });
  const currentDebt = customerId ? balanceOf(balances, customerId).debt : 0n;

  const busy = phase.kind === 'saving';
  const frozen = locked || busy || phase.kind === 'payment_failed';

  function update(key: string, patch: Partial<DraftLine>) {
    setLines((ls) =>
      ls.map((l) => {
        if (l.key !== key) return l;
        const next = { ...l, ...patch };
        // Katalogdagi mahsulot tanlansa — birlik va narx avtomatik (narx bo'sh bo'lsa)
        if (patch.productName !== undefined) {
          const p = productByName.get(patch.productName.trim().toLocaleLowerCase('uz'));
          if (p) {
            next.unit = p.unit;
            if (!l.price.trim() && p.last_price !== null) next.price = formatMoneyInput(p.last_price.toString());
          }
        }
        return next;
      }),
    );
    setLineErrors((m) => {
      if (!m.has(key)) return m;
      const n = new Map(m);
      n.delete(key);
      return n;
    });
  }

  async function savePayment(saleId: string, plan: SalePlan) {
    if (plan.paidNow <= 0n || !customerId) return;
    await recordPayment(getSupabase(), {
      shopId,
      paymentId: keys.paymentId,
      clientOpId: keys.paymentOp,
      customerId,
      amount: plan.paidNow,
      method,
      note: `Savdo ${shortNumber(saleId)} uchun`,
    });
  }

  async function finish(saleId: string, plan: SalePlan) {
    await reload();
    toast.success(plan.paidNow > 0n ? 'Savdo va to‘lov saqlandi.' : 'Savdo saqlandi.');
    router.replace(`/sales/${saleId}`);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (phase.kind !== 'editing') return;
    const res = buildSalePlan({ lines, customerId: customerId || null, mode, partial });
    if (!res.ok) {
      setLineErrors(res.lineErrors);
      setPaidError(res.paidError ?? null);
      setFormError(res.message);
      return;
    }
    const plan = res.plan;
    setLineErrors(new Map());
    setPaidError(null);
    setFormError(null);
    setPhase({ kind: 'saving' });

    let saleId: string;
    try {
      saleId = await postSale(getSupabase(), {
        shopId,
        saleId: keys.saleId,
        clientOpId: keys.saleOp,
        customerId: customerId || null,
        note: note.trim() || null,
        lines: plan.lines,
        clientTotal: plan.total,
      });
    } catch (err) {
      const appErr = toAppError(err);
      // Server rad etdi — hech narsa saqlanmagan, tuzatish mumkin. Tarmoq/noma'lum xato — saqlangan bo'lishi mumkin:
      // forma qulflanadi va qayta urinish o'sha kalit bilan yuboriladi (takroriy savdo yaratilmaydi).
      if (appErr.kind !== 'validation' && appErr.kind !== 'forbidden' && appErr.kind !== 'auth') setLocked(true);
      setFormError(appErr.message);
      setPhase({ kind: 'editing' });
      return;
    }

    try {
      await savePayment(saleId, plan);
    } catch (err) {
      setPhase({ kind: 'payment_failed', saleId, plan, message: toAppError(err).message });
      await reload();
      return;
    }
    await finish(saleId, plan);
  }

  async function retryPayment() {
    if (phase.kind !== 'payment_failed') return;
    const { saleId, plan } = phase;
    setPhase({ kind: 'saving' });
    try {
      await savePayment(saleId, plan);
      await finish(saleId, plan);
    } catch (err) {
      setPhase({ kind: 'payment_failed', saleId, plan, message: toAppError(err).message });
    }
  }

  function resetForm() {
    setLines([newLine()]);
    setCustomerId('');
    setMode('debt');
    setPartial('');
    setNote('');
    setKeys(newKeys());
    setLocked(false);
    setFormError(null);
    setPhase({ kind: 'editing' });
  }

  return (
    <>
      <Link href="/sales" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Savdolar
      </Link>
      <PageHeader title="Yangi savdo" description="Summalar butun so'mda hisoblanadi va serverda qayta tekshiriladi." />

      {phase.kind === 'payment_failed' && (
        <Alert tone="amber" title="Savdo saqlandi, lekin to'lov yozilmadi" className="mb-4">
          <p>{phase.message}</p>
          <p className="mt-1">
            Savdo {shortNumber(phase.saleId)} serverda mavjud. <Money value={phase.plan.paidNow} className="font-semibold" /> to&apos;lovni qayta yuboring yoki keyinroq mijoz sahifasidan kiriting.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={retryPayment} icon={<RotateCw className="h-3.5 w-3.5" />}>
              To&apos;lovni qayta yuborish
            </Button>
            <LinkButton href={`/sales/${phase.saleId}`} size="sm" variant="outline">
              Savdoni ochish
            </LinkButton>
          </div>
        </Alert>
      )}

      <form onSubmit={onSubmit} noValidate className="grid gap-4 lg:grid-cols-3 lg:items-start">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Mijoz" description="Qarzga yoki qisman to'lovli savdo uchun majburiy" />
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:p-5">
              <Select label="Mijoz" value={customerId} onChange={(e) => setCustomerId(e.target.value)} disabled={frozen} wrapClassName="flex-1">
                <option value="">— {uz.common.noCustomer} (naqd savdo) —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.phone ? ` · ${c.phone}` : ''}
                  </option>
                ))}
              </Select>
              <Button variant="outline" onClick={() => setAddingCustomer(true)} disabled={frozen} icon={<UserPlus className="h-4 w-4" />}>
                Yangi mijoz
              </Button>
            </div>
            {customerId && (
              <p className="-mt-2 px-4 pb-4 text-xs text-muted sm:px-5">
                Joriy qarzi: <Money value={currentDebt} className={currentDebt > 0n ? 'font-semibold text-rose-600 dark:text-rose-400' : 'font-semibold'} />
              </p>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Mahsulotlar"
              description={activeProducts.length ? 'Katalogdan tanlang yoki yangi nom yozing' : "Katalog bo'sh — nomni qo'lda yozing"}
            />
            <datalist id="product-options">
              {activeProducts.map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
            <div className="divide-y divide-line">
              {lines.map((l, i) => {
                const c = checks[i];
                const errs = lineErrors.get(l.key) ?? {};
                return (
                  <div key={l.key} className="grid grid-cols-6 gap-3 p-4 sm:grid-cols-12 sm:p-5">
                    <Input
                      label={i === 0 ? 'Mahsulot' : undefined}
                      aria-label="Mahsulot nomi"
                      list="product-options"
                      value={l.productName}
                      onChange={(e) => update(l.key, { productName: e.target.value })}
                      error={errs.name}
                      placeholder="Masalan: Un"
                      maxLength={120}
                      disabled={frozen}
                      wrapClassName="col-span-6 sm:col-span-4"
                    />
                    <Input
                      label={i === 0 ? 'Miqdor' : undefined}
                      aria-label="Miqdor"
                      inputMode="decimal"
                      value={l.qty}
                      onChange={(e) => update(l.key, { qty: e.target.value })}
                      error={errs.qty}
                      placeholder="1"
                      disabled={frozen}
                      wrapClassName="col-span-3 sm:col-span-2"
                    />
                    <Select
                      label={i === 0 ? 'Birlik' : undefined}
                      aria-label="Birlik"
                      value={l.unit}
                      onChange={(e) => update(l.key, { unit: e.target.value as Unit })}
                      disabled={frozen}
                      wrapClassName="col-span-3 sm:col-span-2"
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {uz.units[u]}
                        </option>
                      ))}
                    </Select>
                    <Input
                      label={i === 0 ? 'Narx' : undefined}
                      aria-label="Birlik narxi"
                      inputMode="numeric"
                      value={l.price}
                      onChange={(e) => update(l.key, { price: formatMoneyInput(e.target.value) })}
                      error={errs.price}
                      placeholder="0"
                      disabled={frozen}
                      wrapClassName="col-span-4 sm:col-span-3"
                    />
                    <div className={cn('col-span-2 flex items-end justify-end sm:col-span-1', i === 0 && 'sm:pt-7')}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((x) => x.key !== l.key) : [newLine()]))}
                        disabled={frozen}
                        aria-label={`${i + 1}-qatorni o'chirish`}
                        title="Qatorni o'chirish"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="col-span-6 -mt-1 text-right text-xs text-muted sm:col-span-12">
                      Qator summasi: {c?.total !== null && c?.total !== undefined ? <Money value={c.total} className="font-semibold text-fg" /> : '—'}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-line p-4 sm:p-5">
              <Button variant="secondary" onClick={() => setLines((ls) => [...ls, newLine()])} disabled={frozen || lines.length >= 200} icon={<Plus className="h-4 w-4" />}>
                Qator qo&apos;shish
              </Button>
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <Textarea label="Izoh" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Ixtiyoriy: yetkazib berish, kelishuv va h.k." disabled={frozen} />
          </Card>
        </div>

        <div className="lg:sticky lg:top-24">
          <Card>
            <CardHeader title="To'lov" />
            <div className="space-y-4 p-4 sm:p-5">
              <Segmented
                ariaLabel="To'lov turi"
                className="w-full"
                value={mode}
                onChange={(m) => {
                  setMode(m);
                  setPaidError(null);
                }}
                options={[
                  { value: 'debt', label: 'Qarzga' },
                  { value: 'paid', label: "To'landi" },
                  { value: 'partial', label: 'Qisman' },
                ]}
              />
              {mode !== 'debt' && customerId && (
                <Select label="To'lov usuli" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} disabled={frozen}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {uz.methods[m]}
                    </option>
                  ))}
                </Select>
              )}
              {mode === 'partial' && (
                <Input label="Hozir to'langan summa" inputMode="numeric" value={partial} onChange={(e) => setPartial(formatMoneyInput(e.target.value))} error={paidError} suffix="so'm" placeholder="0" disabled={frozen} />
              )}
              {mode !== 'paid' && !customerId && <Alert tone="amber">Qarzga savdo uchun mijozni tanlang.</Alert>}

              <dl className="space-y-2 rounded-xl bg-subtle p-3.5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted">Jami</dt>
                  <dd>
                    <Money value={total} className="text-base font-semibold text-fg" />
                  </dd>
                </div>
                {preview.ok && customerId && (
                  <>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Hozir to&apos;lanadi</dt>
                      <dd>
                        <Money value={preview.plan.paidNow} className="text-emerald-600 dark:text-emerald-400" />
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Qarzga yoziladi</dt>
                      <dd>
                        <Money value={preview.plan.debt} className={preview.plan.debt > 0n ? 'text-rose-600 dark:text-rose-400' : ''} />
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3 border-t border-line pt-2">
                      <dt className="text-muted">Savdodan keyingi qarz</dt>
                      <dd>
                        <Money value={currentDebt + preview.plan.debt} className="font-semibold text-fg" />
                      </dd>
                    </div>
                  </>
                )}
              </dl>

              {formError && phase.kind === 'editing' && (
                <Alert tone="red">
                  {formError}
                  {locked && (
                    <span className="mt-1 block text-xs">
                      Savdo serverda saqlangan bo&apos;lishi mumkin. «Qayta urinish» o&apos;sha savdoni takrorlamaydi — server uni bir martalik kalit bo&apos;yicha taniydi.
                    </span>
                  )}
                </Alert>
              )}

              {phase.kind !== 'payment_failed' && (
                <Button type="submit" size="lg" className="w-full" loading={busy} icon={<Save className="h-4 w-4" />}>
                  {locked ? 'Qayta urinish' : 'Savdoni saqlash'}
                </Button>
              )}
              {(locked || phase.kind === 'payment_failed') && (
                <Button variant="ghost" className="w-full" onClick={resetForm} disabled={busy}>
                  Yangi savdo boshlash
                </Button>
              )}
              <p className="flex items-start gap-1.5 text-xs text-muted">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                Server summani mustaqil hisoblaydi; mos kelmasa savdo saqlanmaydi.
              </p>
            </div>
          </Card>
        </div>
      </form>

      <CustomerFormModal open={addingCustomer} onClose={() => setAddingCustomer(false)} onSaved={(c) => setCustomerId(c.id)} />
    </>
  );
}

export default function NewSalePage() {
  return (
    <DataGate>
      {(data) => (
        <Suspense>
          <NewSale data={data} />
        </Suspense>
      )}
    </DataGate>
  );
}
