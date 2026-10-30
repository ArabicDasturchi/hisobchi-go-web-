type Cell = string | number | bigint | null | undefined;

/** CSV: BOM + nuqta-vergul ajratuvchi (Excel o'zbek/rus lokalida to'g'ri ochadi) */
export function toCsv(header: readonly string[], rows: readonly (readonly Cell[])[]): string {
  const esc = (v: Cell) => {
    const s = v === null || v === undefined ? '' : String(v);
    // Formula in'yeksiyasidan himoya: =, +, @ yoki raqam bo'lmagan "-" bilan boshlanadigan matn
    const safe = /^[=+@\t\r]/.test(s) || (s.startsWith('-') && !/^-?\d+$/.test(s)) ? `'${s}` : s;
    return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return '﻿' + [header, ...rows].map((r) => r.map(esc).join(';')).join('\r\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
