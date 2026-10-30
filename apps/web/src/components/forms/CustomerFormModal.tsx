'use client';
import { useState, type FormEvent } from 'react';
import { useShop } from '../ShopDataProvider';
import { Modal } from '../ui/Modal';
import { Alert, Button, Input, Textarea } from '../ui/primitives';
import { useToast } from '../ui/Toast';
import { createCustomer, updateCustomer } from '@/lib/data/api';
import type { Customer } from '@/lib/data/types';
import { errorMessage } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase/client';
import { customerSchema } from '@/lib/validation';

/** Mijoz qo'shish/tahrirlash. Ochilganda kalit bilan qayta yaratiladi (holat tozalanadi) */
export function CustomerFormModal({ open, onClose, customer, onSaved }: { open: boolean; onClose: () => void; customer?: Customer | null; onSaved?: (c: Customer) => void }) {
  if (!open) return null;
  return <CustomerForm key={customer?.id ?? 'new'} onClose={onClose} customer={customer ?? null} onSaved={onSaved} />;
}

function CustomerForm({ onClose, customer, onSaved }: { onClose: () => void; customer: Customer | null; onSaved?: (c: Customer) => void }) {
  const { shopId, reload } = useShop();
  const toast = useToast();
  const [name, setName] = useState(customer?.name ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [notes, setNotes] = useState(customer?.notes ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const parsed = customerSchema.safeParse({ name, phone, notes });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] ??= i.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setBusy(true);
    setFormError(null);
    const input = { name: parsed.data.name, phone: parsed.data.phone || null, notes: parsed.data.notes || null };
    try {
      const sb = getSupabase();
      const saved = customer ? await updateCustomer(sb, shopId, customer.id, input) : await createCustomer(sb, shopId, input);
      await reload();
      toast.success(customer ? "Mijoz ma'lumotlari yangilandi." : `«${saved.name}» qo'shildi.`);
      onSaved?.(saved);
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
      title={customer ? 'Mijozni tahrirlash' : 'Yangi mijoz'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Bekor qilish
          </Button>
          <Button type="submit" form="customer-form" loading={busy}>
            Saqlash
          </Button>
        </>
      }
    >
      <form id="customer-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        {formError && <Alert tone="red">{formError}</Alert>}
        <Input label="Ism yoki nom" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={120} required placeholder="Masalan: Akmal aka (bozor)" />
        <Input label="Telefon" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} error={errors.phone} placeholder="+998 90 123 45 67" maxLength={32} />
        <Textarea label="Izoh" value={notes} onChange={(e) => setNotes(e.target.value)} error={errors.notes} maxLength={500} placeholder="Manzil, kelishuv va h.k." />
      </form>
    </Modal>
  );
}
