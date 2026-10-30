'use client';
import { ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { Alert, Button } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { toAppError } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase/client';
import { firstError, newPasswordSchema } from '@/lib/validation';

/** Parolni tiklash havolasidan keyin (callback sessiya yaratgan) yoki sozlamalardan ochiladi */
export default function ResetPasswordPage() {
  const router = useRouter();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const next = { password: firstError(newPasswordSchema.safeParse(password)), confirm: confirm === password ? null : 'Parollar mos kelmadi' };
    setErrors(next);
    if (next.password || next.confirm) return;
    setBusy(true);
    setFormError(null);
    try {
      const { error } = await getSupabase().auth.updateUser({ password });
      if (error) throw error;
      toast.success('Yangi parol saqlandi.');
      router.replace('/dashboard');
    } catch (err) {
      setFormError(toAppError(err).message);
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Yangi parol" subtitle="Hisobingiz uchun yangi parol o'rnating.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {formError && <Alert tone="red">{formError}</Alert>}
        <PasswordInput label="Yangi parol" autoComplete="new-password" value={password} onChange={setPassword} error={errors.password} hint="Kamida 8 belgi, harf va raqam" />
        <PasswordInput label="Parolni takrorlang" autoComplete="new-password" value={confirm} onChange={setConfirm} error={errors.confirm} />
        <Button type="submit" size="lg" className="w-full" loading={busy} icon={<ShieldCheck className="h-4 w-4" />}>
          Parolni saqlash
        </Button>
      </form>
    </AuthShell>
  );
}
