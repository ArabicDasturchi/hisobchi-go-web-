/**
 * Testlar uchun node:sqlite adapteri — ilovadagi expo-sqlite bilan bir xil SQL dvigateli (SQLite).
 */
import { createRequire } from 'node:module';
import type { DatabaseSync as DatabaseSyncType } from 'node:sqlite';
import type { SqlConn, SqlDb, SqlParam } from '../src/data/db';

// Vite "node:sqlite" ni tanimaydi — Node'ning o'z require'i orqali yuklanadi
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as typeof import('node:sqlite');
type DatabaseSync = DatabaseSyncType;

export function openMemoryDb(): SqlDb & { raw: DatabaseSync } {
  const raw = new DatabaseSync(':memory:');
  const conn: SqlConn = {
    async exec(sql) {
      raw.exec(sql);
    },
    async run(sql, params: SqlParam[] = []) {
      raw.prepare(sql).run(...params);
    },
    async get<T>(sql: string, params: SqlParam[] = []) {
      return (raw.prepare(sql).get(...params) as T | undefined) ?? null;
    },
    async all<T>(sql: string, params: SqlParam[] = []) {
      return raw.prepare(sql).all(...params) as T[];
    },
  };
  return {
    ...conn,
    raw,
    async transaction(fn) {
      raw.exec('BEGIN IMMEDIATE');
      try {
        const result = await fn(conn);
        raw.exec('COMMIT');
        return result;
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      }
    },
  };
}
