/** Sana yordamchilari — brauzer (foydalanuvchi) vaqt zonasida */
const p = (n: number) => n.toString().padStart(2, '0');

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** Date → "YYYY-MM-DD" (lokal kun kaliti; input[type=date] formati) */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

/** "YYYY-MM-DD" (lokal) → kun boshlanishi */
export function parseDayKey(key: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** [from, to] kunlari (ikkalasi ham kiradi) → yarim-ochiq ISO oraliq [fromIso, toIso) */
export function dayRangeToIso(fromKey: string, toKey: string): { fromIso: string; toIso: string } | null {
  const from = parseDayKey(fromKey);
  const to = parseDayKey(toKey);
  if (!from || !to || from > to) return null;
  return { fromIso: from.toISOString(), toIso: addDays(to, 1).toISOString() };
}

/** Savdo/to'lov raqami — identifikatorning qisqa ko'rinishi (mobil ilova bilan bir xil) */
export function shortNumber(id: string): string {
  return `#${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}
