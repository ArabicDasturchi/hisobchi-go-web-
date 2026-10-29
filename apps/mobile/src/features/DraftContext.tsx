/**
 * Joriy qoralama (kiritilgan matn → tekshirilayotgan qatorlar).
 * clientOpId har bir yangi tahlilda bir marta yaratiladi — takroriy saqlashdan himoya.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { randomUUID } from 'expo-crypto';
import { parseProductList } from '@hisobchi/core';
import { editRow, emptyRow, rowsFromParsed, type DraftRow } from './draft';

export interface Draft {
  rawInput: string;
  rows: DraftRow[];
  clientOpId: string;
}

interface DraftApi {
  draft: Draft | null;
  /** Matnni tahlil qiladi; qatorlar soni qaytariladi */
  startFromText(text: string): number;
  updateRow(key: string, patch: Parameters<typeof editRow>[1]): void;
  acknowledgeRow(key: string): void;
  removeRow(key: string): void;
  addRow(): void;
  clear(): void;
}

const DraftContext = createContext<DraftApi | null>(null);

export function DraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft | null>(null);

  const mapRows = useCallback((fn: (rows: DraftRow[]) => DraftRow[]) => {
    setDraft((d) => (d ? { ...d, rows: fn(d.rows) } : d));
  }, []);

  const api = useMemo<DraftApi>(
    () => ({
      draft,
      startFromText(text) {
        const rows = rowsFromParsed(parseProductList(text), randomUUID);
        setDraft({ rawInput: text, rows, clientOpId: randomUUID() });
        return rows.length;
      },
      updateRow: (key, patch) => mapRows((rows) => rows.map((r) => (r.key === key ? editRow(r, patch) : r))),
      acknowledgeRow: (key) => mapRows((rows) => rows.map((r) => (r.key === key ? { ...r, acknowledged: true } : r))),
      removeRow: (key) => mapRows((rows) => rows.filter((r) => r.key !== key)),
      addRow: () => mapRows((rows) => [...rows, emptyRow(randomUUID())]),
      clear: () => setDraft(null),
    }),
    [draft, mapRows],
  );

  return <DraftContext.Provider value={api}>{children}</DraftContext.Provider>;
}

export function useDraft(): DraftApi {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error('DraftProvider topilmadi');
  return ctx;
}
