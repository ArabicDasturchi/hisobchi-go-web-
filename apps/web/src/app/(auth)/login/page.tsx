'use client';
import { LogIn } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useRef, useState, type FormEvent } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthDivider, GoogleButton } from '@/components/auth/GoogleButton';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { Alert, Button, Input } from '@/components/ui/primitives';
import { CALLBACK_MESSAGES, isCallbackFailure } from '@/lib/authCallback';
import { authCallbackUrl } from '@/lib/env';
import { classifySignupError } from '@/lib/authErrors';
import { toAppError } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase/client';
import { emailSchema, firstError, safeNextPath } from '@/lib/validation';


function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const callbackError = params.get('error');
  const callbackFailure = isCallbackFailure(callbackError) ? callbackError : null;
  const [formError, setFormError] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const resendLock = useRef(false);
  const [resent, setResent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const emailErr = firstError(emailSchema.safeParse(email));
    const pwErr = password ? null : 'Parolni kiriting';
    setErrors({ email: emailErr, password: pwErr });
    if (emailErr || pwErr) return;
    setBusy(true);
    setFormError(null);
    setUnconfirmed(false);
    try {
      const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      router.replace(next);
      router.refresh();
    } catch (err) {
      const raw = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : '';
      setUnconfirmed(/email not confirmed/i.test(raw));
      setFormError(toAppError(err).message);
      setBusy(false);
    }
  }

  async function resend() {
    if (resendLock.current) return;
    resendLock.current = true;
    setResending(true);
    try {
      const { error } = await getSupabase().auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo: authCallbackUrl('/onboarding') },
      });
      if (error) throw error;
      setResent(true);
    } catch (err) {
      const info = classifySignupError(err);
      setFormError(info.code ? `${info.message} (kod: ${info.code})` : info.message);
    } finally {
      resendLock.current = false;
      setResending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {callbackFailure && !formError && (
        <Alert tone={callbackFailure === 'confirm_other_browser' || callbackFailure === 'oauth_cancelled' ? 'amber' : 'red'}>
          {CALLBACK_MESSAGES[callbackFailure]}
          {callbackFailure === 'expired' && (
            <Link href="/check-email" className="mt-1 block font-semibold underline underline-offset-2">
              Yangi tasdiqlash xatini so&apos;rash
            </Link>
          )}
        </Alert>
      )}
      {formError && (
        <Alert tone="red">
          {formError}
          {unconfirmed && !resent && (
            <button type="button" onClick={resend} disabled={resending} className="mt-1 block font-semibold underline underline-offset-2 disabled:opacity-60">
              {resending ? 'Yuborilmoqda…' : 'Tasdiqlash xatini qayta yuborish'}
            </button>
          )}
          {resent && <span className="mt-1 block font-medium">Xat qayta yuborildi — pochtangizni tekshiring.</span>}
        </Alert>
      )}
      <GoogleButton next={next} onError={setFormError} disabled={busy} />
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
      <PasswordInput label="Parol" autoComplete="current-password" value={password} onChange={setPassword} error={errors.password} />
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400">
          Parolni unutdingizmi?
        </Link>
      </div>
      <Button type="submit" size="lg" className="w-full" loading={busy} icon={<LogIn className="h-4 w-4" />}>
        Kirish
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Hisobga kirish"
      subtitle="Do'koningiz hisob-kitobini davom ettiring."
      footer={
        <>
          Hisobingiz yo&apos;qmi?{' '}
          <Link href="/register" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
            Ro&apos;yxatdan o&apos;tish
          </Link>
        </>
      }
    >
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
