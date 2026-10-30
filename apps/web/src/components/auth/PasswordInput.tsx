'use client';
import { Eye, EyeOff } from 'lucide-react';
import { useId, useState } from 'react';
import { cn } from '../ui/primitives';

export function PasswordInput({
  label,
  value,
  onChange,
  error,
  hint,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  hint?: string;
  autoComplete: 'current-password' | 'new-password';
}) {
  const id = useId();
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
        <span className="ml-0.5 text-rose-500">*</span>
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          required
          className={cn(
            'h-11 w-full rounded-xl border bg-surface px-3.5 pr-11 text-sm text-fg transition-colors focus:outline-none focus:ring-4',
            error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15' : 'border-line focus:border-emerald-500 focus:ring-emerald-500/15',
          )}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-1.5 my-auto flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-fg"
          aria-label={show ? 'Parolni yashirish' : "Parolni ko'rsatish"}
          aria-pressed={show}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error ? (
        <p id={`${id}-err`} role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
