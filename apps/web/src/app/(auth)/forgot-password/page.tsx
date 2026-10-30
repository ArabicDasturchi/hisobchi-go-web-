'use client';
import { KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { Alert, Button, Input } from '@/components/ui/primitives';
import { authCallbackUrl } from '@/lib/env';
import { toAppError } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase/client';
import { emailSchema, firstError } from '@/lib/validation';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const err = firstError(emailSchema.safeParse(email));
    setError(err);
    if (err) return;
    setBusy(true);
    setFormError(null);
    try {
      const { error: apiErr } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: authCallbackUrl('/reset-password'),
      });
      if (apiErr) throw apiErr;
      setSent(true);
    } catch (e2) {
      setFormError(toAppError(e2).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Parolni tiklash"
      subtitle="Emailingizga yangi parol o'rnatish havolasini yuboramiz."
      footer={
        <Link href="/login" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
          Kirish sahifasiga qaytish
        </Link>
      }
    >
      {sent ? (
        <Alert tone="green" title="Havola yuborildi">
          Agar <b>{email.trim()}</b> bilan hisob mavjud bo&apos;lsa, parolni tiklash havolasi yuborildi. Havolani shu brauzerda oching.
        </Alert>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {formError && <Alert tone="red">{formError}</Alert>}
          <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} placeholder="siz@misol.uz" required />
          <Button type="submit" size="lg" className="w-full" loading={busy} icon={<KeyRound className="h-4 w-4" />}>
            Havola yuborish
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
