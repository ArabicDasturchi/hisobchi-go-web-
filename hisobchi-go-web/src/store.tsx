import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Customer, DB, Sale } from "./types";
import { localRepo, STORAGE_KEY } from "./lib/storage";
import { uid } from "./lib/id";

type Status = "loading" | "ready" | "error";
interface Store {
  db: DB; status: Status; error: string;
  reload: () => void; resetAll: () => Promise<void>;
  addCustomer: (name: string, phone: string) => Promise<Customer>;
  saveSale: (s: Sale) => Promise<{ duplicate: boolean }>;
}
const Ctx = createContext<Store | null>(null);
const msg = (e: unknown) => (e instanceof Error ? e.message : "Noma’lum xatolik");

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>({ version: 1, customers: [], sales: [] });
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setStatus("loading");
    try { setDb(await localRepo.load()); setStatus("ready"); }
    catch (e) { setError(msg(e)); setStatus("error"); }
  }, []);

  useEffect(() => {
    load();
    const h = (e: StorageEvent) => { if (e.key === STORAGE_KEY) load(true); };
    window.addEventListener("storage", h);
    return () => window.removeEventListener("storage", h);
  }, [load]);

  const value = useMemo<Store>(() => ({
    db, status, error,
    reload: () => { load(); },
    resetAll: async () => { setDb(await localRepo.reset()); setStatus("ready"); },
    addCustomer: async (name, phone) => {
      const c: Customer = { id: uid(), name: name.trim(), phone: phone.trim(), createdAt: new Date().toISOString() };
      setDb(await localRepo.addCustomer(c));
      return c;
    },
    saveSale: async (s) => {
      const r = await localRepo.addSale(s);
      setDb(r.db);
      return { duplicate: r.duplicate };
    },
  }), [db, status, error, load]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const v = useContext(Ctx);
  if (!v) throw new Error("StoreProvider topilmadi");
  return v;
}
