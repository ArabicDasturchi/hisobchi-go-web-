'use client';
import { Activity, KeyRound, Languages, LogOut, Monitor, Moon, Palette, Store, Sun, UserRound } from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useOnline, useRelativeTime } from '@/components/layout/SyncIndicator';
import { useShop } from '@/components/ShopDataProvider';
import { useTheme, type ThemeChoice } from '@/components/ThemeProvider';
import { Alert, Badge, Button, Card, cn, Input, LinkButton, PageHeader } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { uz } from '@/i18n/uz';
import { listMembers, pingServer, renameShop } from '@/lib/data/api';
import type { ShopMember } from '@/lib/data/types';
import { formatDateTime } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase/client';
import { firstError, profileNameSchema, shopNameSchema } from '@/lib/validation';

function Section({ icon, title, description, children }: { icon: ReactNode; title: string; description?: string; children: ReactNode }) {
  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-col gap-5 md:flex-row md:gap-8">
        <div className="md:w-56 md:shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-subtle text-muted">{icon}</span>
            <h2 className="text-sm font-semibold text-fg">{title}</h2>
          </div>
          {description && <p className="mt-2 text-xs leading-relaxed text-muted">{description}</p>}
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-medium text-fg sm:text-right">{children}</dd>
    </div>
  );
}

/** Ism Supabase Auth user_metadata.full_name da saqlanadi (alohida jadval kerak emas) */
function ProfileNameForm() {
  const { user } = useAuth();
  const toast = useToast();
  const saved = typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '';
  const [name, setName] = useState(saved);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const err = firstError(profileNameSchema.safeParse(name));
    setError(err);
    if (err) return;
    setBusy(true);
    try {
      const { error: apiErr } = await getSupabase().auth.updateUser({ data: { full_name: name.trim() } });
      if (apiErr) throw apiErr;
      toast.success('Ism saqlandi.');
    } catch (e2) {
      setError(errorMessage(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-start" noValidate>
      <Input label="Ism" value={name} onChange={(e) => setName(e.target.value)} error={error} maxLength={80} placeholder="Masalan: Anvar" autoComplete="name" wrapClassName="flex-1" />
      <Button type="submit" loading={busy} disabled={name.trim() === saved} className="sm:mt-7">
        Saqlash
      </Button>
    </form>
  );
}

function ShopSection() {
  const { membership, shopId, setMembership } = useShop();
  const { user } = useAuth();
  const toast = useToast();
  const isOwner = membership.role === 'owner';
  const [name, setName] = useState(membership.shop.name);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [members, setMembers] = useState<ShopMember[] | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listMembers(getSupabase(), shopId)
      .then((m) => active && setMembers(m))
      .catch((e: unknown) => active && setMembersError(errorMessage(e)));
    return () => {
      active = false;
    };
  }, [shopId]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const err = firstError(shopNameSchema.safeParse(name));
    setError(err);
    if (err) return;
    setBusy(true);
    try {
      await renameShop(getSupabase(), shopId, name);
      setMembership({ ...membership, shop: { ...membership.shop, name: name.trim() } });
      toast.success("Do'kon nomi yangilandi.");
    } catch (e2) {
      setError(errorMessage(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section icon={<Store className="h-4 w-4" />} title="Do'kon" description="Do'kon nomini faqat egasi o'zgartira oladi. Bitta hisob — bitta do'kon (MVP).">
      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-start" noValidate>
        <Input label="Do'kon nomi" value={name} onChange={(e) => setName(e.target.value)} error={error} disabled={!isOwner} maxLength={80} wrapClassName="flex-1" />
        {isOwner && (
          <Button type="submit" loading={busy} disabled={name.trim() === membership.shop.name} className="sm:mt-7">
            Saqlash
          </Button>
        )}
      </form>
      <dl className="mt-3 divide-y divide-line">
        <Row label="Sizning rolingiz">
          <Badge tone="green">{uz.roles[membership.role]}</Badge>
        </Row>
        <Row label="Yaratilgan">{formatDateTime(membership.shop.created_at)}</Row>
        <Row label="A'zolar">
          {membersError ? (
            <span className="text-rose-600">{membersError}</span>
          ) : members === null ? (
            '…'
          ) : (
            <span className="flex flex-col items-start gap-1 sm:items-end">
              {members.map((m) => (
                <span key={m.user_id} className="inline-flex items-center gap-2">
                  <span className="font-mono text-xs text-muted">{m.user_id === user?.id ? 'Siz' : `${m.user_id.slice(0, 8)}…`}</span>
                  <Badge>{uz.roles[m.role]}</Badge>
                </span>
              ))}
            </span>
          )}
        </Row>
      </dl>
    </Section>
  );
}

function SyncSection() {
  const { shopId, lastLoadedAt, error, loading, reload } = useShop();
  const online = useOnline();
  const rel = useRelativeTime(lastLoadedAt);
  const [ping, setPing] = useState<{ ms: number } | { error: string } | null>(null);
  const [pinging, setPinging] = useState(false);

  async function check() {
    setPinging(true);
    try {
      const ms = await pingServer(getSupabase(), shopId);
      setPing({ ms });
    } catch (e) {
      setPing({ error: errorMessage(e) });
    } finally {
      setPinging(false);
    }
  }

  return (
    <Section
      icon={<Activity className="h-4 w-4" />}
      title="Sinxronlash holati"
      description="Web ilova har bir amalni darhol Supabase serveriga yozadi va natijani qayta o'qiydi. Mobil ilovadan yuborilgan yozuvlar ham shu yerda ko'rinadi."
    >
      <dl className="divide-y divide-line">
        <Row label="Internet">{online ? <Badge tone="green">Ulangan</Badge> : <Badge tone="red">Yo&apos;q</Badge>}</Row>
        <Row label="Oxirgi yuklash">{lastLoadedAt ? `${formatDateTime(lastLoadedAt.toISOString())} (${rel})` : '—'}</Row>
        <Row label="Oxirgi xato">{error ? <span className="text-rose-600 dark:text-rose-400">{error}</span> : "Yo'q"}</Row>
        <Row label="Server javobi">
          {ping === null ? '—' : 'ms' in ping ? <Badge tone="green">{ping.ms} ms</Badge> : <span className="text-rose-600 dark:text-rose-400">{ping.error}</span>}
        </Row>
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={check} loading={pinging}>
          Serverni tekshirish
        </Button>
        <Button variant="outline" size="sm" onClick={() => void reload()} loading={loading}>
          Ma&apos;lumotlarni qayta yuklash
        </Button>
      </div>
    </Section>
  );
}

const THEMES: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: "Yorug'", icon: Sun },
  { value: 'dark', label: "Qorong'i", icon: Moon },
  { value: 'system', label: 'Tizim', icon: Monitor },
];

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { choice, setChoice } = useTheme();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <>
      <PageHeader title="Sozlamalar" description="Profil, do'kon, ko'rinish va bulut holati" />
      <div className="space-y-4">
        <Section icon={<UserRound className="h-4 w-4" />} title="Profil" description="Supabase Auth hisobingiz.">
          <ProfileNameForm />
          <dl className="mt-3 divide-y divide-line">
            <Row label="Email">{user?.email}</Row>
            <Row label="Email holati">{user?.email_confirmed_at ? <Badge tone="green">Tasdiqlangan</Badge> : <Badge tone="amber">Tasdiqlanmagan</Badge>}</Row>
            <Row label="Ro'yxatdan o'tgan">{user?.created_at ? formatDateTime(user.created_at) : '—'}</Row>
            <Row label="Oxirgi kirish">{user?.last_sign_in_at ? formatDateTime(user.last_sign_in_at) : '—'}</Row>
          </dl>
          <div className="mt-3">
            <LinkButton href="/reset-password" variant="outline" size="sm" icon={<KeyRound className="h-3.5 w-3.5" />}>
              Parolni o&apos;zgartirish
            </LinkButton>
          </div>
        </Section>

        <ShopSection />

        <Section icon={<Palette className="h-4 w-4" />} title="Ko'rinish" description="Tanlov shu brauzerda saqlanadi.">
          <div className="grid grid-cols-3 gap-2 sm:max-w-md">
            {THEMES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setChoice(t.value)}
                aria-pressed={choice === t.value}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-colors',
                  choice === t.value ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-line text-muted hover:bg-subtle hover:text-fg',
                )}
              >
                <t.icon className="h-5 w-5" />
                {t.label}
              </button>
            ))}
          </div>
        </Section>

        <Section icon={<Languages className="h-4 w-4" />} title="Til" description="Interfeys matnlari lug'at orqali beriladi — boshqa tillar keyin qo'shiladi.">
          <dl>
            <Row label="Interfeys tili">O&apos;zbekcha (lotin)</Row>
          </dl>
        </Section>

        <SyncSection />

        <Card className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-fg">Hisobdan chiqish</h2>
              <p className="mt-0.5 text-xs text-muted">Shu brauzerdagi sessiya yopiladi. Ma&apos;lumotlar serverda saqlanib qoladi.</p>
            </div>
            <Button
              variant="danger"
              loading={signingOut}
              onClick={async () => {
                setSigningOut(true);
                await signOut();
              }}
              icon={<LogOut className="h-4 w-4" />}
            >
              Chiqish
            </Button>
          </div>
        </Card>
        {!user?.email_confirmed_at && <Alert tone="amber">Email tasdiqlanmagan — parolni tiklash xatlari yetib bormasligi mumkin.</Alert>}
      </div>
    </>
  );
}
