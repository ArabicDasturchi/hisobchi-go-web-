'use client';
import { LogOut, Menu, Plus, Store, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { uz } from '@/i18n/uz';
import { useAuth } from '../AuthProvider';
import { Logo, LogoMark } from '../Logo';
import { useShop } from '../ShopDataProvider';
import { cn } from '../ui/primitives';
import { isActive, NAV_ITEMS } from './nav';
import { SyncIndicator } from './SyncIndicator';
import { ThemeToggle } from './ThemeToggle';

function ShopBadge({ compact }: { compact?: boolean }) {
  const { membership } = useShop();
  if (compact) {
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-subtle text-muted" title={membership.shop.name}>
        <Store className="h-[18px] w-[18px]" />
      </span>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
        <Store className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-fg">{membership.shop.name}</p>
        <p className="text-xs text-muted">{uz.roles[membership.role]}</p>
      </div>
    </div>
  );
}

function NavLinks({ compact, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1" aria-label="Asosiy menyu">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={compact ? item.label : undefined}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group flex items-center gap-3 rounded-xl text-sm font-medium transition-colors',
              compact ? 'h-11 w-11 justify-center' : 'px-3 py-2.5',
              active
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                : 'text-muted hover:bg-subtle hover:text-fg',
            )}
          >
            <item.icon className={cn('h-[18px] w-[18px] shrink-0', active ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted group-hover:text-fg')} />
            {!compact && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function UserMenu() {
  const { user, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-[200px] truncate text-sm text-muted xl:inline" title={user?.email ?? ''}>
        {user?.email}
      </span>
      <button
        type="button"
        onClick={async () => {
          setBusy(true);
          await signOut();
        }}
        disabled={busy}
        className="inline-flex h-9 items-center gap-2 rounded-xl px-2.5 text-sm font-medium text-muted transition-colors hover:bg-subtle hover:text-fg disabled:opacity-50"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden lg:inline">{uz.nav.signOut}</span>
      </button>
    </div>
  );
}

/** Mobil: chap tomondan chiquvchi to'liq menyu */
function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, signOut } = useAuth();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menyu">
      <div className="absolute inset-0 animate-fade-in bg-slate-950/50" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 flex w-[84%] max-w-xs animate-slide-in flex-col border-r border-line bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <Logo />
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-muted hover:bg-subtle hover:text-fg" aria-label="Menyuni yopish">
            <X className="h-5 w-5" />
          </button>
        </div>
        <ShopBadge />
        <div className="mt-4 flex-1 overflow-y-auto">
          <NavLinks onNavigate={onClose} />
        </div>
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          <SyncIndicator />
          <p className="truncate text-xs text-muted">{user?.email}</p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
          >
            <LogOut className="h-[18px] w-[18px]" />
            {uz.nav.signOut}
          </button>
        </div>
      </div>
    </div>
  );
}

const BOTTOM = ['/dashboard', '/sales', '/customers'] as const;

function BottomNav({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => (BOTTOM as readonly string[]).includes(i.href));
  const link = (item: (typeof items)[number]) => {
    const active = isActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={cn('flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium', active ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted')}
      >
        <item.icon className="h-5 w-5" />
        {item.label}
      </Link>
    );
  };
  return (
    <nav
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      aria-label="Pastki menyu"
    >
      <div className="mx-auto flex max-w-lg items-stretch">
        {items.slice(0, 2).map(link)}
        <div className="flex flex-1 items-center justify-center">
          <Link
            href="/sales/new"
            className="-mt-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 transition-transform active:scale-95 dark:bg-emerald-500 dark:text-emerald-950"
            aria-label={uz.nav.newSale}
          >
            <Plus className="h-6 w-6" />
          </Link>
        </div>
        {items.slice(2).map(link)}
        <button type="button" onClick={onMenu} className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted">
          <Menu className="h-5 w-5" />
          {uz.nav.menu}
        </button>
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  const closeDrawer = useCallback(() => setDrawer(false), []);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  // Sahifa almashganda drawer yopiladi
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setDrawer(false);
  }

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="no-print sr-only z-[70] rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Asosiy mazmunga o&apos;tish
      </a>
      {/* Desktop: to'liq sidebar (≥1024) */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
        <Link href="/dashboard" className="px-2">
          <Logo />
        </Link>
        <div className="mt-6">
          <ShopBadge />
        </div>
        <div className="mt-5 flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <Link
          href="/sales/new"
          className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition-colors hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
        >
          <Plus className="h-4 w-4" />
          {uz.nav.newSale}
        </Link>
      </aside>

      {/* Planshet: ixcham ikonkali menyu (768–1023) */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-[76px] flex-col items-center border-r border-line bg-surface py-5 md:flex lg:hidden">
        <Link href="/dashboard" aria-label="Bosh sahifa">
          <LogoMark className="h-9 w-9" />
        </Link>
        <div className="mt-6">
          <ShopBadge compact />
        </div>
        <div className="mt-4 flex-1 overflow-y-auto">
          <NavLinks compact />
        </div>
        <Link
          href="/sales/new"
          title={uz.nav.newSale}
          aria-label={uz.nav.newSale}
          className="mt-3 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 dark:bg-emerald-500 dark:text-emerald-950"
        >
          <Plus className="h-5 w-5" />
        </Link>
      </aside>

      <div className="md:pl-[76px] lg:pl-64">
        <header className="no-print sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setDrawer(true)}
              className="-ml-1.5 rounded-lg p-2 text-muted hover:bg-subtle hover:text-fg md:hidden"
              aria-label="Menyuni ochish"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="md:hidden">
              <Logo compact />
            </div>
            <div className="hidden min-w-0 md:block lg:hidden">
              <ShopName />
            </div>
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <div className="hidden sm:block">
                <SyncIndicator />
              </div>
              <div className="sm:hidden">
                <SyncIndicator compact />
              </div>
              <ThemeToggle />
              <div className="hidden md:block">
                <UserMenu />
              </div>
            </div>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-7xl outline-none px-4 pb-28 pt-5 sm:px-6 sm:pt-6 md:pb-10 lg:px-8">{children}</main>
      </div>

      <BottomNav onMenu={() => setDrawer(true)} />
      <Drawer open={drawer} onClose={closeDrawer} />
    </div>
  );
}

function ShopName() {
  const { membership } = useShop();
  return <p className="truncate text-sm font-semibold text-fg">{membership.shop.name}</p>;
}
