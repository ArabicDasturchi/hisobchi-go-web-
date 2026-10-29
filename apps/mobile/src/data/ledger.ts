/**
 * Mijozlar va savdolar ledgeri (qurilmadagi SQLite).
 *
 * Savdo saqlash tartibi (bitta eksklyuziv tranzaksiya):
 *   1. client_op_id oldin ishlatilganmi — ha bo'lsa mavjud savdo qaytariladi.
 *   2. @hisobchi/core validateDocument — bloklovchi xato bo'lsa rad etiladi.
 *   3. TypeScript BigInt hisobi (calculateDocument).
 *   4. SQLite'da mustaqil hisob (verifyTotalsSql).
 *   5. Natijalar mos kelmasa — CalculationMismatchError, hech narsa saqlanmaydi.
 *   6. sales, sale_lines (CHECK formulasi bilan), ledger_entries yoziladi.
 *   7. Yozilgan qatorlar SQL'da qayta yig'iladi va yana solishtiriladi.
 */

import {
  ALLOWED_UNITS,
  calculateDocument,
  validateDocument,
  type AllowedUnit,
} from '@hisobchi/core';
import type { SqlConn, SqlDb, SqlParam } from './db';

export interface SaleLineInput {
  productName: string;
  qtyMilli: bigint;
  unit: AllowedUnit;
  unitPrice: bigint;
  rawText: string | null;
}

export interface PostSaleInput {
  clientOpId: string;
  customerId: string | null;
  rawInput: string | null;
  lines: SaleLineInput[];
}

export interface PostSaleResult {
  saleId: string;
  total: bigint;
  /** true — shu client_op_id bilan savdo avval saqlangan edi */
  duplicate: boolean;
}

export interface TotalsCheck {
  match: boolean;
  tsLineTotals: bigint[];
  sqlLineTotals: bigint[];
  tsTotal: bigint;
  sqlTotal: bigint;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerWithBalance extends Customer {
  balance: bigint;
  saleCount: number;
}

export interface SaleSummary {
  id: string;
  customerId: string | null;
  customerName: string | null;
  total: bigint;
  lineCount: number;
  createdAt: string;
}

export interface SaleLine {
  lineIndex: number;
  productName: string;
  qtyMilli: bigint;
  unit: string;
  unitPrice: bigint;
  lineTotal: bigint;
  rawText: string | null;
}

export interface SaleDetail extends SaleSummary {
  clientOpId: string;
  tsTotal: bigint;
  sqlTotal: bigint;
  rawInput: string | null;
  lines: SaleLine[];
}

export class CalculationMismatchError extends Error {
  constructor(public readonly check: TotalsCheck) {
    super(
      `Hisob-kitoblar mos kelmadi: TypeScript=${check.tsTotal}, SQL=${check.sqlTotal}. Savdo saqlanmadi.`,
    );
    this.name = 'CalculationMismatchError';
  }
}

export class SaleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SaleValidationError';
  }
}

export interface LedgerDeps {
  newId: () => string;
  now: () => string;
}

/**
 * Har bir qator summasini SQLite integer arifmetikasida hisoblaydi.
 * TypeScript kodidan foydalanmaydi — mustaqil tekshiruv yo'li.
 */
export async function sqlLineTotals(
  conn: SqlConn,
  lines: readonly { qtyMilli: bigint; unitPrice: bigint }[],
): Promise<{ lineTotals: bigint[]; total: bigint }> {
  if (lines.length === 0) return { lineTotals: [], total: 0n };
  const values = lines.map(() => '(?, CAST(? AS INTEGER), CAST(? AS INTEGER))').join(', ');
  const params: SqlParam[] = lines.flatMap((l, i) => [i, l.qtyMilli.toString(), l.unitPrice.toString()]);
  const rows = await conn.all<{ i: number; lt: string }>(
    `WITH v(i, q, p) AS (VALUES ${values})
     SELECT i, CAST((q * p + 500) / 1000 AS TEXT) AS lt FROM v ORDER BY i`,
    params,
  );
  const sum = await conn.get<{ total: string }>(
    `WITH v(i, q, p) AS (VALUES ${values})
     SELECT CAST(SUM((q * p + 500) / 1000) AS TEXT) AS total FROM v`,
    params,
  );
  return { lineTotals: rows.map((r) => BigInt(r.lt)), total: BigInt(sum?.total ?? '0') };
}

/** TypeScript (core) va SQLite natijalarini solishtiradi */
export async function verifyTotals(
  conn: SqlConn,
  lines: readonly { qtyMilli: bigint; unitPrice: bigint }[],
  tsOverride?: (lines: readonly { qtyMilli: bigint; unitPrice: bigint }[]) => bigint[],
): Promise<TotalsCheck> {
  const tsLineTotals = tsOverride
    ? tsOverride(lines)
    : calculateDocument(lines).lines.map((l) => l.lineTotal);
  const tsTotal = tsLineTotals.reduce((a, b) => a + b, 0n);
  const sql = await sqlLineTotals(conn, lines);
  const match =
    sql.total === tsTotal &&
    sql.lineTotals.length === tsLineTotals.length &&
    sql.lineTotals.every((v, i) => v === tsLineTotals[i]);
  return { match, tsLineTotals, sqlLineTotals: sql.lineTotals, tsTotal, sqlTotal: sql.total };
}

function assertPostable(lines: readonly SaleLineInput[]): void {
  const validation = validateDocument(lines.map((l) => ({ ...l, rawText: l.rawText ?? undefined })));
  if (!validation.isValid) {
    const first =
      validation.documentIssues[0] ??
      validation.lines.flatMap((l) => l.issues).find((i) => i.severity === 'error');
    throw new SaleValidationError(first?.message ?? "Hujjat noto'g'ri");
  }
  for (const line of lines) {
    if (!(ALLOWED_UNITS as readonly string[]).includes(line.unit)) {
      throw new SaleValidationError(`Noma'lum o'lchov birligi: "${line.unit}"`);
    }
  }
}

export function createLedger(db: SqlDb, deps: LedgerDeps) {
  return {
    /** Saqlashdan oldin ikki hisobni solishtirish (hech narsa yozilmaydi) */
    verifyTotals(lines: readonly { qtyMilli: bigint; unitPrice: bigint }[]) {
      return verifyTotals(db, lines);
    },

    async postSale(
      input: PostSaleInput,
      opts?: { tsOverride?: (lines: readonly { qtyMilli: bigint; unitPrice: bigint }[]) => bigint[] },
    ): Promise<PostSaleResult> {
      return db.transaction(async (tx) => {
        const existing = await tx.get<{ id: string; total: string }>(
          'SELECT id, CAST(total AS TEXT) AS total FROM sales WHERE client_op_id = ?',
          [input.clientOpId],
        );
        if (existing) {
          return { saleId: existing.id, total: BigInt(existing.total), duplicate: true };
        }

        assertPostable(input.lines);

        if (input.customerId) {
          const c = await tx.get<{ id: string }>('SELECT id FROM customers WHERE id = ?', [input.customerId]);
          if (!c) throw new SaleValidationError('Tanlangan mijoz topilmadi');
        }

        const check = await verifyTotals(tx, input.lines, opts?.tsOverride);
        if (!check.match) throw new CalculationMismatchError(check);

        const saleId = deps.newId();
        const createdAt = deps.now();
        const total = check.tsTotal.toString();
        await tx.run(
          `INSERT INTO sales (id, client_op_id, customer_id, total, ts_total, sql_total, line_count, raw_input, created_at)
           VALUES (?, ?, ?, CAST(? AS INTEGER), CAST(? AS INTEGER), CAST(? AS INTEGER), ?, ?, ?)`,
          [
            saleId,
            input.clientOpId,
            input.customerId,
            total,
            check.tsTotal.toString(),
            check.sqlTotal.toString(),
            input.lines.length,
            input.rawInput,
            createdAt,
          ],
        );

        for (let i = 0; i < input.lines.length; i++) {
          const l = input.lines[i];
          await tx.run(
            `INSERT INTO sale_lines (id, sale_id, line_index, product_name, qty_milli, unit, unit_price, line_total, raw_text)
             VALUES (?, ?, ?, ?, CAST(? AS INTEGER), ?, CAST(? AS INTEGER), CAST(? AS INTEGER), ?)`,
            [
              deps.newId(),
              saleId,
              i,
              l.productName.trim(),
              l.qtyMilli.toString(),
              l.unit,
              l.unitPrice.toString(),
              check.tsLineTotals[i].toString(),
              l.rawText,
            ],
          );
        }

        // Yozilgan ma'lumotdan SQL'da qayta yig'ish — yakuniy tekshiruv
        const stored = await tx.get<{ stored: string; recomputed: string }>(
          `SELECT CAST(SUM(line_total) AS TEXT) AS stored,
                  CAST(SUM((qty_milli * unit_price + 500) / 1000) AS TEXT) AS recomputed
           FROM sale_lines WHERE sale_id = ?`,
          [saleId],
        );
        if (!stored || BigInt(stored.stored) !== check.tsTotal || BigInt(stored.recomputed) !== check.tsTotal) {
          throw new CalculationMismatchError({ ...check, sqlTotal: BigInt(stored?.recomputed ?? '0') });
        }

        await tx.run(
          `INSERT INTO ledger_entries (id, sale_id, customer_id, entry_type, amount, created_at)
           VALUES (?, ?, ?, 'sale', CAST(? AS INTEGER), ?)`,
          [deps.newId(), saleId, input.customerId, total, createdAt],
        );

        return { saleId, total: check.tsTotal, duplicate: false };
      });
    },

    async createCustomer(input: { name: string; phone?: string; note?: string }): Promise<string> {
      const name = input.name.trim();
      if (!name) throw new SaleValidationError('Mijoz ismi kiritilmagan');
      const id = deps.newId();
      const now = deps.now();
      await db.run(
        'INSERT INTO customers (id, name, phone, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, name, input.phone?.trim() || null, input.note?.trim() || null, now, now],
      );
      return id;
    },

    async updateCustomer(id: string, input: { name: string; phone?: string; note?: string }): Promise<void> {
      const name = input.name.trim();
      if (!name) throw new SaleValidationError('Mijoz ismi kiritilmagan');
      await db.run('UPDATE customers SET name = ?, phone = ?, note = ?, updated_at = ? WHERE id = ?', [
        name,
        input.phone?.trim() || null,
        input.note?.trim() || null,
        deps.now(),
        id,
      ]);
    },

    async getCustomer(id: string): Promise<CustomerWithBalance | null> {
      const rows = await listCustomersQuery(db, 'WHERE c.id = ?', [id]);
      return rows[0] ?? null;
    },

    listCustomers(search = ''): Promise<CustomerWithBalance[]> {
      const q = search.trim();
      return q
        ? listCustomersQuery(db, 'WHERE c.name LIKE ? COLLATE NOCASE OR c.phone LIKE ?', [`%${q}%`, `%${q}%`])
        : listCustomersQuery(db, '', []);
    },

    async listSales(opts: { customerId?: string; limit?: number } = {}): Promise<SaleSummary[]> {
      const where = opts.customerId ? 'WHERE s.customer_id = ?' : '';
      const params: SqlParam[] = opts.customerId ? [opts.customerId] : [];
      const rows = await db.all<SaleRow>(
        `${SALE_SELECT} ${where} ORDER BY s.created_at DESC, s.rowid DESC LIMIT ?`,
        [...params, opts.limit ?? 200],
      );
      return rows.map(toSummary);
    },

    async getSale(id: string): Promise<SaleDetail | null> {
      const row = await db.get<SaleRow & { client_op_id: string; ts_total: string; sql_total: string; raw_input: string | null }>(
        `${SALE_SELECT.replace(
          'SELECT ',
          'SELECT s.client_op_id, CAST(s.ts_total AS TEXT) AS ts_total, CAST(s.sql_total AS TEXT) AS sql_total, s.raw_input, ',
        )} WHERE s.id = ?`,
        [id],
      );
      if (!row) return null;
      const lines = await db.all<{
        line_index: number;
        product_name: string;
        qty_milli: string;
        unit: string;
        unit_price: string;
        line_total: string;
        raw_text: string | null;
      }>(
        `SELECT line_index, product_name, CAST(qty_milli AS TEXT) AS qty_milli, unit,
                CAST(unit_price AS TEXT) AS unit_price, CAST(line_total AS TEXT) AS line_total, raw_text
         FROM sale_lines WHERE sale_id = ? ORDER BY line_index`,
        [id],
      );
      return {
        ...toSummary(row),
        clientOpId: row.client_op_id,
        tsTotal: BigInt(row.ts_total),
        sqlTotal: BigInt(row.sql_total),
        rawInput: row.raw_input,
        lines: lines.map((l) => ({
          lineIndex: l.line_index,
          productName: l.product_name,
          qtyMilli: BigInt(l.qty_milli),
          unit: l.unit,
          unitPrice: BigInt(l.unit_price),
          lineTotal: BigInt(l.line_total),
          rawText: l.raw_text,
        })),
      };
    },

    /** Berilgan sanadan (ISO) keyingi savdolar yig'indisi */
    async totalSince(isoFrom: string): Promise<{ total: bigint; count: number }> {
      const row = await db.get<{ total: string | null; n: number }>(
        'SELECT CAST(SUM(amount) AS TEXT) AS total, COUNT(*) AS n FROM ledger_entries WHERE created_at >= ?',
        [isoFrom],
      );
      return { total: BigInt(row?.total ?? '0'), count: row?.n ?? 0 };
    },
  };
}

export type Ledger = ReturnType<typeof createLedger>;

interface SaleRow {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  total: string;
  line_count: number;
  created_at: string;
}

const SALE_SELECT = `SELECT s.id, s.customer_id, c.name AS customer_name, CAST(s.total AS TEXT) AS total,
  s.line_count, s.created_at
  FROM sales s LEFT JOIN customers c ON c.id = s.customer_id`;

function toSummary(r: SaleRow): SaleSummary {
  return {
    id: r.id,
    customerId: r.customer_id,
    customerName: r.customer_name,
    total: BigInt(r.total),
    lineCount: r.line_count,
    createdAt: r.created_at,
  };
}

async function listCustomersQuery(db: SqlConn, where: string, params: SqlParam[]): Promise<CustomerWithBalance[]> {
  const rows = await db.all<{
    id: string;
    name: string;
    phone: string | null;
    note: string | null;
    created_at: string;
    updated_at: string;
    balance: string | null;
    sale_count: number;
  }>(
    `SELECT c.id, c.name, c.phone, c.note, c.created_at, c.updated_at,
            CAST((SELECT SUM(amount) FROM ledger_entries e WHERE e.customer_id = c.id) AS TEXT) AS balance,
            (SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.id) AS sale_count
     FROM customers c ${where}
     ORDER BY c.name COLLATE NOCASE`,
    params,
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    note: r.note,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    balance: BigInt(r.balance ?? '0'),
    saleCount: r.sale_count,
  }));
}
