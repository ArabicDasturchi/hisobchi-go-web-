const p2 = (n: number) => String(n).padStart(2, "0");
export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}
export const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
