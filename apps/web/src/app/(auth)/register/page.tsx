'use client';
import { UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { Alert, Button, Input } from '@/components/ui/primitives';
import { authCallbackUrl } from '@/lib/env';
import { toAppError } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase/client';
import { emailSchema, firstError, newPasswordSchema } from '@/lib/validation';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const next = {
      email: firstError(emailSchema.safeParse(email)),
      password: firstError(newPasswordSchema.safeParse(password)),
      confirm: confirm === password ? null : 'Parollar mos kelmadi',
    };
    setErrors(next);
    if (next.email || next.password || next.confirm) return;
    setBusy(true);
    setFormError(null);
    try {
      const cleanEmail = email.trim();
      const { data, error } = await getSupabase().auth.signUp({
        email: cleanEmail,
        password,
        options: { emailRedirectTo: authCallbackUrl('/onboarding') },
      });
      if (error) throw error;
      // Supabase mavjud email uchun xato bermaydi, identities bo'sh qaytaradi (email enumeratsiyadan himoya)
      if (data.user && (data.user.identities?.length ?? 0) === 0) {
        setFormError("Bu email bilan hisob allaqachon mavjud. Kirish sahifasidan foydalaning yoki parolni tiklang.");
        setBusy(false);
        return;
      }
      if (data.session) {
        // Email tasdiqlash o'chirilgan loyihada darhol sessiya beriladi
        router.replace('/onboarding');
        router.refresh();
        return;
      }
      router.replace(`/check-email?email=${encodeURIComponent(cleanEmail)}`);
    } catch (err) {
      setFormError(toAppError(err).message);
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Ro'yxatdan o'tish"
      subtitle="Bepul hisob yarating — keyin do'koningizni qo'shasiz."
      footer={
        <>
          Hisobingiz bormi?{' '}
          <Link href="/login" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
            Kirish
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {formError && <Alert tone="red">{formError}</Alert>}
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          placeholder="siz@misol.uz"
          required
        />
        <PasswordInput label="Parol" autoComplete="new-password" value={password} onChange={setPassword} error={errors.password} hint="Kamida 8 belgi, harf va raqam" />
        <PasswordInput label="Parolni takrorlang" autoComplete="new-password" value={confirm} onChange={setConfirm} error={errors.confirm} />
        <Button type="submit" size="lg" className="w-full" loading={busy} icon={<UserPlus className="h-4 w-4" />}>
          Hisob yaratish
        </Button>
        <p className="text-center text-xs text-muted">Ro&apos;yxatdan o&apos;tgach, emailingizga tasdiqlash havolasi yuboriladi.</p>
      </form>
    </AuthShell>
  );
}
