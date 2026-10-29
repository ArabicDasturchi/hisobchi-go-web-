import type { Customer, DB, Sale } from "../types";

export const STORAGE_KEY = "hisobchi-go:v1";

/**
 * Repo interfeysi: hozir localStorage, keyinchalik bir xil interfeysni
 * umumiy backend (REST/Supabase va h.k.) bilan almashtirish mumkin.
 * DIQQAT: bu faqat shu brauzerdagi saqlash. Mobil ilova bilan sinxronlash YO‘Q.
 */
export interface Repo {
  load(): Promise<DB>;
  addCustomer(c: Customer): Promise<DB>;
  addSale(s: Sale): Promise<{ db: DB; duplicate: boolean }>;
  reset(): Promise<DB>;
}

const empty = (): DB => ({ version: 1, customers: [], sales: [] });

function read(): DB {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return empty();
  const d = JSON.parse(raw);
  if (!d || d.version !== 1 || !Array.isArray(d.customers) || !Array.isArray(d.sales)) {
    throw new Error("Saqlangan ma’lumot formati noto‘g‘ri.");
  }
  return d as DB;
}
const write = (db: DB) => localStorage.setItem(STORAGE_KEY, JSON.stringify(db));

export const localRepo: Repo = {
  async load() { return read(); },
  async addCustomer(c) { const db = read(); db.customers.push(c); write(db); return db; },
  async addSale(s) {
    const db = read(); // eng so‘nggi holatni o‘qiydi (boshqa tab o‘zgartirgan bo‘lishi mumkin)
    if (db.sales.some((x) => x.draftId === s.draftId)) return { db, duplicate: true };
    db.sales.push(s); write(db);
    return { db, duplicate: false };
  },
  async reset() { localStorage.removeItem(STORAGE_KEY); return empty(); },
};
