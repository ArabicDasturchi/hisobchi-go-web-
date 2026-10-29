import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { randomUUID } from 'expo-crypto';
import { useSQLiteContext } from 'expo-sqlite';
import { fromExpoSqlite } from './expo-db';
import { createLedger, type Ledger } from './ledger';

const LedgerContext = createContext<Ledger | null>(null);

export function LedgerProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const ledger = useMemo(
    () => createLedger(fromExpoSqlite(db), { newId: randomUUID, now: () => new Date().toISOString() }),
    [db],
  );
  return <LedgerContext.Provider value={ledger}>{children}</LedgerContext.Provider>;
}

export function useLedger(): Ledger {
  const ledger = useContext(LedgerContext);
  if (!ledger) throw new Error('LedgerProvider topilmadi');
  return ledger;
}
