'use client';
import { CheckCircle2, CloudCog, KeyRound, Monitor, Moon, Palette, RefreshCw, Store, Sun, UserRound, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { SyncDot, useRelativeTime, useSyncStatus } from '@/components/layout/SyncIndicator';
import { useShop } from '@/components/ShopDataProvider';
import { useTheme, type ThemeChoice } from '@/components/ThemeProvider';
import { Alert, Avatar, Badge, Button, Card, cn, Input, PageHeader } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/Toast';
import { renameShop } from '@/lib/data/api';
import { formatDateTime } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { getSupabase } from '@/lib/supabase/client';
import { firstError, profileNameSchema, shopNameSchema } from '@/lib/validation';

function SettingsCard({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-subtle text-muted">{icon}</span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-fg">{title}</h2>
          <p className="mt-0.5 text-sm text-muted">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </Card>
  );
}

/** Bir maydonli forma: qiymat o'zgarmaguncha "Saqlash" o'chiq, saqlanayotganda yuklanish holati */
function InlineSaveForm({
  label,
  initial,
  placeholder,
  validate,
  onSave,
  disabled,
  hint,
  autoComplete,
}: {
  label: string;
  initial: string;
  placeholder: string;
  validate: (v: string) => string | null;
  onSave: (v: string) => Promise<void>;
  disabled?: boolean;
  hint?: string;
  autoComplete?: string;
}) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const err = validate(value);
    setError(err);
    if (err) return;
    setBusy(true);
    try {
      await onSave(value.trim());
      setSaved(value.trim());
      setValue(value.trim());
    } catch (e2) {
      setError(errorMessage(e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-start" noValidate>
      <Input
        label={label}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setError(null);
        }}
        error={error}
        hint={hint}
        disabled={disabled}
        maxLength={80}
        placeholder={placeholder}
        autoComplete={autoComplete}
        wrapClassName="flex-1"
      />
      {!disabled && (
        <Button type="submit" loading={busy} disabled={value.trim() === saved} className="sm:mt-7">
          Saqlash
        </Button>
      )}
    </form>
  );
}

function ProfileCard() {
  const { user } = useAuth();
  const toast = useToast();
  const name = typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '';
  const email = user?.email ?? '';
  const confirmed = Boolean(user?.email_confirmed_at);

  return (
    <SettingsCard icon={<UserRound className="h-[18px] w-[18px]" />} title="Profil" description="Ismingiz va hisobingiz ma'lumotlari">
      <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-3.5">
        <Avatar name={name || email} className="h-11 w-11 text-sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-fg">{name || 'Ism kiritilmagan'}</p>
          <p className="break-all text-sm text-muted">{email}</p>
          <div className="mt-1.5">
            {confirmed ? (
              <Badge tone="green">
                <CheckCircle2 className="h-3 w-3" /> Email tasdiqlangan
              </Badge>
            ) : (
              <Badge tone="amber">Email tasdiqlanmagan</Badge>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4">
        <InlineSaveForm
          key={name}
          label="Ism"
          initial={name}
          placeholder="Masalan: Anvar"
          hint="Ixtiyoriy. Bo'sh qoldirsangiz, email ko'rsatiladi"
          autoComplete="name"
          validate={(v) => firstError(profileNameSchema.safeParse(v))}
          onSave={async (v) => {
            // Faqat ko'rinadigan ism (user_metadata); kirish va ruxsatlarga ta'sir qilmaydi. Bo'sh — null
            const { error } = await getSupabase().auth.updateUser({ data: { full_name: v || null } });
            if (error) throw error;
            toast.success(v ? 'Ism saqlandi.' : "Ism o'chirildi.");
          }}
        />
      </div>
      <Link href="/reset-password" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400">
        <KeyRound className="h-3.5 w-3.5" /> Parolni o&apos;zgartirish
      </Link>
    </SettingsCard>
  );
}

function ShopCard() {
  const { membership, shopId, setMembership } = useShop();
  const toast = useToast();
  const isOwner = membership.role === 'owner';
  return (
    <SettingsCard icon={<Store className="h-[18px] w-[18px]" />} title="Do'kon" description="Do'kon nomi sahifalarda va hisobotlarda ko'rinadi">
      <InlineSaveForm
        key={membership.shop.name}
        label="Do'kon nomi"
        initial={membership.shop.name}
        placeholder="Masalan: Baraka savdo"
        disabled={!isOwner}
        hint={isOwner ? undefined : "Do'kon nomini faqat egasi o'zgartira oladi"}
        validate={(v) => firstError(shopNameSchema.safeParse(v))}
        onSave={async (v) => {
          await renameShop(getSupabase(), shopId, v);
          setMembership({ ...membership, shop: { ...membership.shop, name: v } });
          toast.success("Do'kon nomi saqlandi.");
        }}
      />
    </SettingsCard>
  );
}

const THEMES: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: "Yorug'", icon: Sun },
  { value: 'dark', label: "Qorong'i", icon: Moon },
  { value: 'system', label: 'Tizim', icon: Monitor },
];

function AppearanceCard() {
  const { choice, setChoice } = useTheme();
  return (
    <SettingsCard icon={<Palette className="h-[18px] w-[18px]" />} title="Ko'rinish" description="Tanlov shu qurilmada saqlanadi">
      <div role="radiogroup" aria-label="Mavzu" className="grid grid-cols-3 gap-2 sm:max-w-md">
        {THEMES.map((t) => (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={choice === t.value}
            onClick={() => setChoice(t.value)}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl border px-3 py-3.5 text-sm font-medium transition-colors',
              choice === t.value
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-500/60 dark:bg-emerald-500/10 dark:text-emerald-300'
                : 'border-line text-muted hover:bg-subtle hover:text-fg',
            )}
          >
            <t.icon className="h-5 w-5" />
            {t.label}
          </button>
        ))}
      </div>
    </SettingsCard>
  );
}

const SYNC_HINTS = {
  synced: "Barcha o'zgarishlar bulutda saqlangan.",
  syncing: "Ma'lumotlar yangilanmoqda…",
  problem: "Ma'lumotlarni yangilab bo'lmadi. Internetni tekshirib, qayta urinib ko'ring.",
  offline: "Internet yo'q. Ulanish tiklangach ma'lumotlar avtomatik yangilanadi.",
} as const;

function SyncCard() {
  const { state, label, online, lastLoadedAt, reload, loading } = useSyncStatus();
  const rel = useRelativeTime(lastLoadedAt);
  const bad = state === 'problem' || state === 'offline';
  return (
    <SettingsCard icon={<CloudCog className="h-[18px] w-[18px]" />} title="Bulut bilan sinxronlash" description="Ma'lumotlaringiz bulutda saqlanadi va telefon ilovasi bilan umumiy">
      <div
        className={cn(
          'flex items-start gap-3 rounded-xl p-3.5',
          bad ? 'bg-rose-50 dark:bg-rose-500/10' : state === 'syncing' ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-emerald-50 dark:bg-emerald-500/10',
        )}
        role="status"
      >
        <SyncDot state={state} className="mt-1.5" />
        <div className="min-w-0">
          <p className={cn('text-sm font-semibold', bad ? 'text-rose-700 dark:text-rose-300' : state === 'syncing' ? 'text-amber-800 dark:text-amber-300' : 'text-emerald-800 dark:text-emerald-300')}>
            {label}
          </p>
          <p className="mt-0.5 text-sm text-muted">{SYNC_HINTS[state]}</p>
        </div>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line px-3.5 py-3">
          <dt className="text-xs text-muted">Internet</dt>
          <dd className="mt-1 flex items-center gap-1.5 text-sm font-medium text-fg">
            {online ? <Wifi className="h-4 w-4 text-emerald-600" /> : <WifiOff className="h-4 w-4 text-rose-600" />}
            {online ? 'Ulangan' : "Yo'q"}
          </dd>
        </div>
        <div className="rounded-xl border border-line px-3.5 py-3">
          <dt className="text-xs text-muted">Oxirgi sinxronlash</dt>
          <dd className="mt-1 text-sm font-medium text-fg">{lastLoadedAt ? `${formatDateTime(lastLoadedAt.toISOString())} · ${rel}` : 'Hali bajarilmagan'}</dd>
        </div>
      </dl>
      <Button variant={bad ? 'primary' : 'outline'} size="sm" className="mt-4" onClick={() => void reload()} loading={loading} disabled={!online} icon={<RefreshCw className="h-3.5 w-3.5" />}>
        {bad ? 'Qayta urinish' : 'Hozir yangilash'}
      </Button>
    </SettingsCard>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Sozlamalar" description="Hisobingiz va do'koningizni boshqaring" />
      <div className="space-y-4">
        {user && !user.email_confirmed_at && <Alert tone="amber">Email tasdiqlanmagan — parolni tiklash xatlari yetib bormasligi mumkin.</Alert>}
        <ProfileCard />
        <ShopCard />
        <AppearanceCard />
        <SyncCard />
      </div>
    </div>
  );
}
