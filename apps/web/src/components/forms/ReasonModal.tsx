'use client';
import { AlertTriangle } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Modal } from '../ui/Modal';
import { Alert, Button, Textarea } from '../ui/primitives';
import { errorMessage } from '@/lib/errors';
import { firstError, reasonSchema } from '@/lib/validation';

/**
 * Qaytarib bo'lmaydigan amal uchun tasdiqlash oynasi (savdo yoki to'lovni bekor qilish).
 * Sabab majburiy (server: kamida 3 belgi) va audit izida saqlanadi.
 */
export function ReasonModal({
  open,
  onClose,
  title,
  summary,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  summary: ReactNode;
  confirmLabel: string;
  onConfirm: (reason: string) => Promise<void>;
}) {
  if (!open) return null;
  return <ReasonForm onClose={onClose} title={title} summary={summary} confirmLabel={confirmLabel} onConfirm={onConfirm} />;
}

function ReasonForm({ onClose, title, summary, confirmLabel, onConfirm }: Omit<Parameters<typeof ReasonModal>[0], 'open'>) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const err = firstError(reasonSchema.safeParse(reason));
    setError(err);
    if (err) return;
    setBusy(true);
    setFormError(null);
    try {
      await onConfirm(reason.trim());
    } catch (e2) {
      setFormError(errorMessage(e2));
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      busy={busy}
      size="sm"
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Yopish
          </Button>
          <Button type="submit" form="reason-form" variant="danger" loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <form id="reason-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{summary}</div>
        </div>
        {formError && <Alert tone="red">{formError}</Alert>}
        <Textarea label="Sabab" value={reason} onChange={(e) => setReason(e.target.value)} error={error} required maxLength={300} placeholder="Masalan: noto'g'ri kiritilgan, mijoz qaytardi" />
        <p className="text-xs text-muted">Amal qaytarib bo&apos;lmaydi. Asl yozuv o&apos;chirilmaydi — tarixda sabab bilan saqlanadi.</p>
      </form>
    </Modal>
  );
}
