'use client';
import { useState, type FormEvent } from 'react';
import { Money } from '../shared';
import { useShop } from '../ShopDataProvider';
import { Modal } from '../ui/Modal';
import { Alert, Button, Input, Segmented, Select, Textarea } from '../ui/primitives';
import { useToast } from '../ui/Toast';
import { uz } from '@/i18n/uz';
import { recordPayment } from '@/lib/data/api';
import { balanceOf } from '@/lib/data/ledger';
import { PAYMENT_METHODS, type PaymentMethod } from '@/lib/data/types';
import { toAppError } from '@/lib/errors';
import { formatMoneyInput, parseMoneyInput } from '@/lib/money';
import { getSupabase } from '@/lib/supabase/client';

/**
 * To'lov qabul qilish (record_payment). Server qarzdan oshmasligini qayta tekshiradi.
 * payment_id va client_op_id modal ochilganda bir marta yaratiladi — qayta urinish takroriy to'lov yaratmaydi.
 */
export function PaymentModal({ open, onClose, customerId }: { open: boolean; onClose: () => void; customerId?: string | null }) {
  if (!open) return null;
  return <PaymentForm onClose={onClose} initialCustomerId={customerId ?? null} />;
}

function PaymentForm({ onClose, initialCustomerId }: { onClose: () => void; initialCustomerId: string | null }) {
  const { shopId, reload, data, balances, customerById } = useShop();
  const toast = useToast();
  const [ids] = useState(() => ({ paymentId: crypto.randomUUID(), opId: crypto.randomUUID() }));
  const [customerId, setCustomerId] = useState(initialCustomerId ?? '');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('naqd');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const debtors = (data?.customers ?? []).filter((c) => balanceOf(balances, c.id).debt > 0n);
  const debt = customerId ? balanceOf(balances, customerId).debt : 0n;
  const customer = customerId ? customerById.get(customerId) : undefined;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const amountRes = parseMoneyInput(amount, { max: debt > 0n ? debt : 1n });
    const next = {
      customer: customerId ? null : 'Mijozni tanlang',
      amount: !customerId ? null : debt <= 0n ? "Bu mijozning qarzi yo'q" : amountRes.ok ? null : amountRes.message,
    };
    setErrors(next);
    if (next.customer || next.amount || !amountRes.ok) return;
    setBusy(true);
    setFormError(null);
    try {
      // Bir marta yuborilgan amal o'zgartirilgan qiymat bilan qayta yuborilmasligi uchun summa qulflanadi
      setSubmitted(true);
      await recordPayment(getSupabase(), {
        shopId,
        paymentId: ids.paymentId,
        clientOpId: ids.opId,
        customerId,
        amount: amountRes.value,
        method,
        note: note.trim() || null,
      });
      await reload();
      toast.success("To'lov qabul qilindi.");
      onClose();
    } catch (err) {
      const appErr = toAppError(err);
      // Server rad etgan (hech narsa saqlanmagan) — qiymatni tuzatishga ruxsat. Tarmoq xatosida qulf qoladi:
      // to'lov serverda saqlangan bo'lishi mumkin, qayta urinish o'sha kalit bilan bajariladi.
      if (appErr.kind === 'validation' || appErr.kind === 'forbidden') setSubmitted(false);
      setFormError(appErr.message);
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      busy={busy}
      title="To'lov qabul qilish"
      description={customer ? customer.name : undefined}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Bekor qilish
          </Button>
          <Button type="submit" form="payment-form" loading={busy}>
            To&apos;lovni saqlash
          </Button>
        </>
      }
    >
      <form id="payment-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        {formError && (
          <Alert tone="red">
            {formError}
            {submitted && <span className="mt-1 block text-xs">Qayta urinish shu to&apos;lovni takrorlamaydi (bir martalik kalit).</span>}
          </Alert>
        )}
        {!initialCustomerId && (
          <Select label="Mijoz" value={customerId} onChange={(e) => setCustomerId(e.target.value)} error={errors.customer} required disabled={submitted}>
            <option value="">— Qarzdor mijozni tanlang —</option>
            {debtors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        )}
        {customerId && (
          <div className="flex items-center justify-between rounded-xl bg-subtle px-3.5 py-3 text-sm">
            <span className="text-muted">Joriy qarz</span>
            <Money value={debt} className={debt > 0n ? 'font-semibold text-rose-600 dark:text-rose-400' : 'font-semibold text-fg'} />
          </div>
        )}
        <div>
          <Input
            label="Summa"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(formatMoneyInput(e.target.value))}
            error={errors.amount}
            suffix="so'm"
            placeholder="0"
            required
            disabled={submitted}
          />
          {debt > 0n && !submitted && (
            <button type="button" onClick={() => setAmount(formatMoneyInput(debt.toString()))} className="mt-1.5 text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400">
              To&apos;liq qarzni kiritish
            </button>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-fg">To&apos;lov usuli</span>
          <Segmented ariaLabel="To'lov usuli" value={method} onChange={setMethod} options={PAYMENT_METHODS.map((m) => ({ value: m, label: uz.methods[m] }))} />
        </div>
        <Textarea label="Izoh" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Ixtiyoriy" />
      </form>
    </Modal>
  );
}
