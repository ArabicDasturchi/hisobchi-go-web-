'use client';
import { MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { AuthShell } from '@/components/auth/AuthShell';
import { Alert, Button, Input } from '@/components/ui/primitives';
import { authCallbackUrl } from '@/lib/env';
import { classifySignupError } from '@/lib/authErrors';
import { getSupabase } from '@/lib/supabase/client';
import { emailSchema, firstError } from '@/lib/validation';

const COOLDOWN = 60;

function CheckEmail() {
  const sentTo = useSearchParams().get('email') ?? '';
  // Email ko'rsatilmagan (masalan, eskirgan havoladan kelingan) — foydalanuvchi o'zi kiritadi
  const [typed, setTyped] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const email = sentTo || typed.trim();
  const [cooldown, setCooldown] = useState(sentTo ? COOLDOWN : 0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'green' | 'red'; text: string } | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function resend() {
    if (busy) return;
    const err = firstError(emailSchema.safeParse(email));
    setEmailError(err);
    if (err) return;
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await getSupabase().auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: authCallbackUrl('/onboarding') },
      });
      if (error) throw error;
      setMsg({ tone: 'green', text: 'Xat qayta yuborildi.' });
      setCooldown(COOLDOWN);
    } catch (e) {
      const info = classifySignupError(e);
      setMsg({ tone: 'red', text: info.code ? `${info.message} (kod: ${info.code})` : info.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
        <MailCheck className="h-7 w-7" />
      </div>
      <p className="text-sm leading-relaxed text-fg">
        {sentTo ? (
          <>
            <span className="font-semibold">{sentTo}</span> manziliga tasdiqlash havolasi yuborildi.
          </>
        ) : (
          "Ro'yxatdan o'tgan emailingizni kiriting — yangi tasdiqlash havolasini yuboramiz."
        )}{' '}
        Havolani <b>shu brauzerda</b> oching — hisobingiz faollashadi va do&apos;kon yaratish sahifasiga o&apos;tasiz.
      </p>
      <Alert tone="blue">Xat kelmasa, &laquo;Spam&raquo; papkasini tekshiring.</Alert>
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      {!sentTo && (
        <Input label="Email" type="email" autoComplete="email" value={typed} onChange={(e) => setTyped(e.target.value)} error={emailError} placeholder="siz@misol.uz" required />
      )}
      <Button variant={sentTo ? 'outline' : 'primary'} className="w-full" onClick={resend} loading={busy} disabled={cooldown > 0}>
        {cooldown > 0 ? `Qayta yuborish (${cooldown} s)` : sentTo ? 'Xatni qayta yuborish' : 'Tasdiqlash xatini yuborish'}
      </Button>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <AuthShell
      title="Emailingizni tasdiqlang"
      footer={
        <Link href="/login" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
          Kirish sahifasiga qaytish
        </Link>
      }
    >
      <Suspense>
        <CheckEmail />
      </Suspense>
    </AuthShell>
  );
}
