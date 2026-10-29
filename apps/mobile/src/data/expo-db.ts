/**
 * expo-sqlite → SqlDb adapteri.
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import type { SqlConn, SqlDb, SqlParam } from './db';

function wrap(db: SQLiteDatabase): SqlConn {
  return {
    exec: (sql) => db.execAsync(sql),
    run: async (sql, params: SqlParam[] = []) => {
      await db.runAsync(sql, params);
    },
    get: <T,>(sql: string, params: SqlParam[] = []) => db.getFirstAsync<T>(sql, params),
    all: <T,>(sql: string, params: SqlParam[] = []) => db.getAllAsync<T>(sql, params),
  };
}

export function fromExpoSqlite(db: SQLiteDatabase): SqlDb {
  return {
    ...wrap(db),
    async transaction<T>(fn: (tx: SqlConn) => Promise<T>): Promise<T> {
      let result: T | undefined;
      await db.withExclusiveTransactionAsync(async (txn) => {
        result = await fn(wrap(txn));
      });
      return result as T;
    },
  };
}
