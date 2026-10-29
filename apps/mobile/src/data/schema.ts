/**
 * Qurilmadagi SQLite sxemasi.
 *
 * - sales, sale_lines, ledger_entries — append-only: UPDATE/DELETE trigger bilan taqiqlangan.
 * - sale_lines.line_total CHECK orqali SQL formulasi bilan tekshiriladi:
 *   (qty_milli * unit_price + 500) / 1000 — TypeScript hisobidan mustaqil.
 * - sales.client_op_id UNIQUE — takroriy saqlashning oldini oladi.
 */

import type { SqlConn } from './db';

const MIGRATIONS: string[] = [
  `
  CREATE TABLE customers (
    id          TEXT PRIMARY KEY NOT NULL,
    name        TEXT NOT NULL CHECK (length(trim(name)) > 0),
    phone       TEXT,
    note        TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );
  CREATE INDEX idx_customers_name ON customers(name COLLATE NOCASE);

  CREATE TABLE sales (
    id            TEXT PRIMARY KEY NOT NULL,
    client_op_id  TEXT NOT NULL UNIQUE,
    customer_id   TEXT REFERENCES customers(id),
    total         INTEGER NOT NULL CHECK (total >= 0),
    ts_total      INTEGER NOT NULL,
    sql_total     INTEGER NOT NULL,
    line_count    INTEGER NOT NULL CHECK (line_count > 0),
    raw_input     TEXT,
    created_at    TEXT NOT NULL,
    CHECK (total = ts_total AND total = sql_total)
  );
  CREATE INDEX idx_sales_customer ON sales(customer_id);
  CREATE INDEX idx_sales_created ON sales(created_at);

  CREATE TABLE sale_lines (
    id            TEXT PRIMARY KEY NOT NULL,
    sale_id       TEXT NOT NULL REFERENCES sales(id),
    line_index    INTEGER NOT NULL CHECK (line_index >= 0),
    product_name  TEXT NOT NULL CHECK (length(trim(product_name)) > 0),
    qty_milli     INTEGER NOT NULL CHECK (qty_milli > 0),
    unit          TEXT NOT NULL,
    unit_price    INTEGER NOT NULL CHECK (unit_price >= 0),
    line_total    INTEGER NOT NULL CHECK (line_total = (qty_milli * unit_price + 500) / 1000),
    raw_text      TEXT,
    UNIQUE (sale_id, line_index)
  );

  CREATE TABLE ledger_entries (
    id           TEXT PRIMARY KEY NOT NULL,
    sale_id      TEXT NOT NULL REFERENCES sales(id),
    customer_id  TEXT REFERENCES customers(id),
    entry_type   TEXT NOT NULL CHECK (entry_type IN ('sale')),
    amount       INTEGER NOT NULL,
    created_at   TEXT NOT NULL
  );
  CREATE INDEX idx_ledger_customer ON ledger_entries(customer_id);

  CREATE TRIGGER sales_no_update BEFORE UPDATE ON sales
    BEGIN SELECT RAISE(ABORT, 'append-only: sales'); END;
  CREATE TRIGGER sales_no_delete BEFORE DELETE ON sales
    BEGIN SELECT RAISE(ABORT, 'append-only: sales'); END;
  CREATE TRIGGER sale_lines_no_update BEFORE UPDATE ON sale_lines
    BEGIN SELECT RAISE(ABORT, 'append-only: sale_lines'); END;
  CREATE TRIGGER sale_lines_no_delete BEFORE DELETE ON sale_lines
    BEGIN SELECT RAISE(ABORT, 'append-only: sale_lines'); END;
  CREATE TRIGGER ledger_no_update BEFORE UPDATE ON ledger_entries
    BEGIN SELECT RAISE(ABORT, 'append-only: ledger_entries'); END;
  CREATE TRIGGER ledger_no_delete BEFORE DELETE ON ledger_entries
    BEGIN SELECT RAISE(ABORT, 'append-only: ledger_entries'); END;
  `,
];

/** PRAGMA user_version asosida migratsiyalarni qo'llaydi */
export async function migrate(db: SqlConn): Promise<void> {
  await db.exec('PRAGMA foreign_keys = ON;');
  const row = await db.get<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  for (let v = current; v < MIGRATIONS.length; v++) {
    await db.exec('BEGIN;');
    try {
      await db.exec(`${MIGRATIONS[v]} PRAGMA user_version = ${v + 1};`);
      await db.exec('COMMIT;');
    } catch (e) {
      await db.exec('ROLLBACK;');
      throw e;
    }
  }
}
