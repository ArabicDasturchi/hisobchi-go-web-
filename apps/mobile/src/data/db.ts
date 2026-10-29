/**
 * Minimal SQL ulanish interfeysi.
 * Ilovada expo-sqlite, testlarda node:sqlite shu interfeysga moslanadi —
 * shu tufayli ledger mantiqi haqiqiy SQLite dvigatelida sinovdan o'tadi.
 *
 * Pul va miqdor qiymatlari SQL'ga string ko'rinishida uzatiladi va
 * CAST(... AS TEXT) bilan o'qiladi: JS number orqali aniqlik yo'qolmaydi.
 */

export type SqlParam = string | number | null;

export interface SqlConn {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlParam[]): Promise<void>;
  get<T>(sql: string, params?: SqlParam[]): Promise<T | null>;
  all<T>(sql: string, params?: SqlParam[]): Promise<T[]>;
}

export interface SqlDb extends SqlConn {
  /** Eksklyuziv tranzaksiya: xato bo'lsa hammasi bekor qilinadi */
  transaction<T>(fn: (tx: SqlConn) => Promise<T>): Promise<T>;
}
