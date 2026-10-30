import { BarChart3, LayoutDashboard, Package, Receipt, Settings, Users, Wallet, type LucideIcon } from 'lucide-react';
import { uz } from '@/i18n/uz';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/dashboard', label: uz.nav.dashboard, icon: LayoutDashboard },
  { href: '/sales', label: uz.nav.sales, icon: Receipt },
  { href: '/customers', label: uz.nav.customers, icon: Users },
  { href: '/products', label: uz.nav.products, icon: Package },
  { href: '/payments', label: uz.nav.payments, icon: Wallet },
  { href: '/reports', label: uz.nav.reports, icon: BarChart3 },
  { href: '/settings', label: uz.nav.settings, icon: Settings },
];

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
