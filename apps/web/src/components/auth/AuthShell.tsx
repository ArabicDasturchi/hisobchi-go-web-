import { BarChart3, ShieldCheck, Users, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import { Logo } from '../Logo';

const FEATURES = [
  { icon: Wallet, title: 'Aniq hisob', text: "Har bir so'm butun son sifatida, serverda qayta tekshiriladi." },
  { icon: Users, title: 'Mijoz qarzlari', text: "Kim qancha qarz — to'lovlar va tarix bilan." },
  { icon: BarChart3, title: 'Hisobotlar', text: 'Sana oralig\'i bo\'yicha savdo, to\'lov va CSV eksport.' },
  { icon: ShieldCheck, title: 'Xavfsiz', text: "Ma'lumot faqat sizning do'koningizga tegishli (RLS)." },
];

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-blue-800 p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-blue-400/20 blur-3xl" />
        <Logo inverted />
        <div className="relative mt-auto max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">Savdo va qarz hisobini bir joyda yuriting.</h2>
          <p className="mt-3 text-emerald-50/80">Mobil ilova bilan bir xil hisob-kitob qoidalari va bitta bulut bazasi.</p>
          <ul className="mt-10 grid grid-cols-2 gap-5">
            {FEATURES.map((f) => (
              <li key={f.title} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm">
                <f.icon className="h-5 w-5 text-emerald-200" />
                <p className="mt-3 text-sm font-semibold">{f.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-emerald-50/75">{f.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <main className="flex flex-col px-4 py-8 sm:px-8">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
          <div className="mt-7">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
