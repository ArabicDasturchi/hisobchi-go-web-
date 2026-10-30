'use client';
import { UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthDivider, GoogleButton } from '@/components/auth/GoogleButton';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { Alert, Button, Input } from '@/components/ui/primitives';
import { authCallbackUrl } from '@/lib/env';
import { classifySignupError, type SignupErrorInfo } from '@/lib/authErrors';
import { getSupabase } from '@/lib/supabase/client';
import { emailSchema, firstError, newPasswordSchema } from '@/lib/validation';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formError, setFormError] = useState<{ message: string; code?: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  // Sinxron qulf: holat (busy) qayta chizilguncha ikkinchi bosish/Enter ham bitta so'rov bo'lib qoladi
  const inFlight = useRef(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (inFlight.current) return;
    const next = {
      email: firstError(emailSchema.safeParse(email)),
      password: firstError(newPasswordSchema.safeParse(password)),
      confirm: confirm === password ? null : 'Parollar mos kelmadi',
    };
    setErrors(next);
    if (next.email || next.password || next.confirm) return;
    inFlight.current = true;
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
        setFormError({ message: "Bu email bilan hisob allaqachon mavjud. Kirish sahifasidan foydalaning yoki parolni tiklang." });
        inFlight.current = false;
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
      // Avtomatik qayta urinish yo'q (ayniqsa rate-limit'da): foydalanuvchi xabarni o'qib, o'zi qaror qiladi
      const info: SignupErrorInfo = classifySignupError(err);
      setFormError({ message: info.message, code: info.code });
      inFlight.current = false;
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
        {formError && (
          <Alert tone="red">
            {formError.message}
            {formError.code && <span className="mt-1 block text-xs opacity-70">Xato kodi: {formError.code}</span>}
          </Alert>
        )}
        <GoogleButton next="/onboarding" onError={(message) => setFormError({ message })} disabled={busy} />
        <AuthDivider />
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
