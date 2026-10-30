/**
 * Supabase bilan ishlashning yagona qatlami. Sahifalar to'g'ridan-to'g'ri jadval/RPC nomlarini bilmaydi.
 *
 * - Barcha so'rovlar foydalanuvchi sessiyasi bilan, RLS ostida (service-role yo'q).
 * - Har bir so'rov shop_id bilan cheklanadi (RLS ga qo'shimcha, aniq filtr).
 * - Moliyaviy yozuvlar faqat 003 migratsiyasidagi RPC'lar orqali: post_sale, reverse_sale,
 *   record_payment, void_payment. DELETE/UPDATE ishlatilmaydi.
 * - bigint ustunlar "::text" bilan o'qiladi va BigInt'ga o'giriladi (aniqlik yo'qolmaydi).
 * - RPC muvaffaqiyatidan keyin natija serverdan qayta o'qib tekshiriladi.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { AppError, toAppError } from '../errors';
import { toBig } from '../money';
import type {
  Customer,
  Membership,
  Payment,
  PaymentMethod,
  PaymentVoid,
  Product,
  Reversal,
  Role,
  SaleDetail,
  SaleDoc,
  SaleLine,
  Unit,
} from './types';

type SB = SupabaseClient;
type Res<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

const PAGE = 1000;

/**
 * PostgREST bitta javobda server `max_rows` dan ko'p qator qaytarmaydi (Supabase standarti 1000, kamroq ham
 * sozlanishi mumkin). Shuning uchun "so'ralgandan kam keldi — tugadi" deb hisoblanmaydi: bo'sh sahifa kelguncha
 * qaytarilgan qator soni bo'yicha davom etiladi. Barqaror tartib uchun so'rovlar id bo'yicha ham saralangan.
 */
export async function fetchAll<T>(query: (from: number, to: number) => Res<T>, pageSize: number = PAGE): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; ) {
    const { data, error } = await query(from, from + pageSize - 1);
    if (error) throw toAppError(error);
    const rows = data ?? [];
    if (rows.length === 0) return out;
    out.push(...rows);
    from += rows.length;
  }
}

function check<T>(res: { data: T | null; error: unknown }): T | null {
  if (res.error) throw toAppError(res.error);
  return res.data;
}

const newId = () => crypto.randomUUID();

// ---------------------------------------------------------------------------
// Do'kon
// ---------------------------------------------------------------------------

interface MembershipRow {
  role: Role;
  user_id: string;
  created_at: string;
  shop: { id: string; name: string; created_at: string } | null;
}

export async function getMembership(sb: SB, userId: string): Promise<Membership | null> {
  const rows = check(
    await sb.from('shop_members').select('role, user_id, created_at, shop:shops(id, name, created_at)').eq('user_id', userId).order('created_at'),
  ) as unknown as MembershipRow[] | null;
  const list = (rows ?? []).filter((r) => r.shop);
  const pick = list.find((r) => r.role === 'owner') ?? list[0];
  if (!pick?.shop) return null;
  return { shop: pick.shop, role: pick.role, user_id: pick.user_id };
}

/** create_shop(p_name) → uuid. Server idempotent: egasi bo'lgan do'kon bo'lsa — o'shani qaytaradi */
export async function createShop(sb: SB, name: string): Promise<string> {
  const res = await sb.rpc('create_shop', { p_name: name.trim() });
  const id = check(res) as string | null;
  if (!id) throw new AppError('unknown', "Server do'kon identifikatorini qaytarmadi.");
  return id;
}

export async function renameShop(sb: SB, shopId: string, name: string): Promise<void> {
  const rows = check(await sb.from('shops').update({ name: name.trim() }).eq('id', shopId).select('id')) as { id: string }[] | null;
  // RLS faqat egaga ruxsat beradi; ruxsat bo'lmasa xato emas, 0 qator qaytadi
  if (!rows || rows.length === 0) throw new AppError('forbidden', "Do'kon nomini faqat egasi o'zgartira oladi.");
}

// ---------------------------------------------------------------------------
// Mijozlar
// ---------------------------------------------------------------------------

const CUSTOMER_COLS = 'id, name, phone, notes, created_at, updated_at';

export async function listCustomers(sb: SB, shopId: string): Promise<Customer[]> {
  return fetchAll<Customer>((from, to) => sb.from('customers').select(CUSTOMER_COLS).eq('shop_id', shopId).order('name').order('id').range(from, to));
}

export interface CustomerInput {
  name: string;
  phone: string | null;
  notes: string | null;
}

export async function createCustomer(sb: SB, shopId: string, input: CustomerInput): Promise<Customer> {
  const row = check(
    await sb.from('customers').insert({ id: newId(), shop_id: shopId, ...input }).select(CUSTOMER_COLS).single(),
  ) as Customer | null;
  if (!row) throw new AppError('unknown', 'Mijoz saqlanmadi.');
  return row;
}

export async function updateCustomer(sb: SB, shopId: string, id: string, input: CustomerInput): Promise<Customer> {
  const rows = check(await sb.from('customers').update(input).eq('id', id).eq('shop_id', shopId).select(CUSTOMER_COLS)) as Customer[] | null;
  const row = rows?.[0];
  if (!row) throw new AppError('not_found', 'Mijoz topilmadi yoki ruxsat yo\'q.');
  return row;
}

/** Faqat savdo va to'lov tarixi bo'lmagan mijozni o'chirish (moliyaviy tarix saqlanadi) */
export async function deleteCustomer(sb: SB, shopId: string, id: string): Promise<void> {
  const [docs, pays] = await Promise.all([
    sb.from('documents').select('id', { count: 'exact', head: true }).eq('shop_id', shopId).eq('customer_id', id),
    sb.from('payments').select('id', { count: 'exact', head: true }).eq('shop_id', shopId).eq('customer_id', id),
  ]);
  if (docs.error) throw toAppError(docs.error);
  if (pays.error) throw toAppError(pays.error);
  if ((docs.count ?? 0) > 0 || (pays.count ?? 0) > 0) {
    throw new AppError('conflict', "Mijozning savdo yoki to'lov tarixi bor — o'chirib bo'lmaydi. Tarix hisobotlarda saqlanadi.");
  }
  const rows = check(await sb.from('customers').delete().eq('id', id).eq('shop_id', shopId).select('id')) as { id: string }[] | null;
  if (!rows || rows.length === 0) throw new AppError('not_found', "Mijoz topilmadi yoki ruxsat yo'q.");
}

// ---------------------------------------------------------------------------
// Mahsulotlar
// ---------------------------------------------------------------------------

const PRODUCT_COLS = 'id, name, unit, last_price::text, is_active, created_at, updated_at';

interface ProductRow extends Omit<Product, 'last_price'> {
  last_price: string | null;
}

const toProduct = (r: ProductRow): Product => ({ ...r, last_price: r.last_price === null ? null : toBig(r.last_price) });

export async function listProducts(sb: SB, shopId: string): Promise<Product[]> {
  const rows = await fetchAll<ProductRow>((from, to) =>
    sb.from('products').select(PRODUCT_COLS).eq('shop_id', shopId).order('name').order('id').range(from, to) as unknown as Res<ProductRow>,
  );
  return rows.map(toProduct);
}

export interface ProductInput {
  name: string;
  unit: Unit;
  last_price: bigint | null;
  is_active: boolean;
}

const productPayload = (p: ProductInput) => ({
  name: p.name,
  unit: p.unit,
  // bigint JSON number'ga sig'masligi mumkin — string sifatida yuboriladi (mobil sync bilan bir xil)
  last_price: p.last_price === null ? null : p.last_price.toString(),
  is_active: p.is_active,
});

export async function createProduct(sb: SB, shopId: string, input: ProductInput): Promise<Product> {
  const row = check(
    await sb.from('products').insert({ id: newId(), shop_id: shopId, ...productPayload(input) }).select(PRODUCT_COLS).single(),
  ) as unknown as ProductRow | null;
  if (!row) throw new AppError('unknown', 'Mahsulot saqlanmadi.');
  return toProduct(row);
}

export async function updateProduct(sb: SB, shopId: string, id: string, input: ProductInput): Promise<Product> {
  const rows = check(
    await sb.from('products').update(productPayload(input)).eq('id', id).eq('shop_id', shopId).select(PRODUCT_COLS),
  ) as unknown as ProductRow[] | null;
  const row = rows?.[0];
  if (!row) throw new AppError('not_found', "Mahsulot topilmadi yoki ruxsat yo'q.");
  return toProduct(row);
}

// ---------------------------------------------------------------------------
// Savdolar
// ---------------------------------------------------------------------------

const DOC_COLS = 'id, customer_id, status, subtotal::text, created_at, posted_at, created_by';

interface DocRow extends Omit<SaleDoc, 'subtotal'> {
  subtotal: string;
}

const toDoc = (r: DocRow): SaleDoc => ({ ...r, subtotal: toBig(r.subtotal) });

export async function listSales(sb: SB, shopId: string): Promise<SaleDoc[]> {
  const rows = await fetchAll<DocRow>((from, to) =>
    sb
      .from('documents')
      .select(DOC_COLS)
      .eq('shop_id', shopId)
      .in('status', ['posted', 'reversed'])
      .order('created_at', { ascending: false })
      .order('id')
      .range(from, to) as unknown as Res<DocRow>,
  );
  return rows.map(toDoc);
}

interface LineRow extends Omit<SaleLine, 'qty_milli' | 'unit_price' | 'line_total'> {
  qty_milli: string;
  unit_price: string;
  line_total: string;
}

interface ReversalRow extends Omit<Reversal, 'amount'> {
  amount: string;
}

const REVERSAL_COLS = 'id, document_id, amount::text, reason, created_by, created_at';
const toReversal = (r: ReversalRow): Reversal => ({ ...r, amount: toBig(r.amount) });

export async function getSaleDetail(sb: SB, shopId: string, id: string): Promise<SaleDetail | null> {
  const [docRes, linesRes, revRes] = await Promise.all([
    sb.from('documents').select(DOC_COLS).eq('shop_id', shopId).eq('id', id).maybeSingle(),
    sb
      .from('document_lines')
      .select('id, line_index, product_name, product_id, qty_milli::text, unit, unit_price::text, line_total::text, raw_text')
      .eq('shop_id', shopId)
      .eq('document_id', id)
      .order('line_index'),
    sb.from('document_reversals').select(REVERSAL_COLS).eq('shop_id', shopId).eq('document_id', id).maybeSingle(),
  ]);
  const doc = check(docRes) as unknown as DocRow | null;
  if (!doc) return null;
  const lines = (check(linesRes) ?? []) as unknown as LineRow[];
  const rev = check(revRes) as unknown as ReversalRow | null;
  return {
    doc: toDoc(doc),
    lines: lines.map((l) => ({ ...l, qty_milli: toBig(l.qty_milli), unit_price: toBig(l.unit_price), line_total: toBig(l.line_total) })),
    reversal: rev ? toReversal(rev) : null,
  };
}

export async function listReversals(sb: SB, shopId: string): Promise<Reversal[]> {
  const rows = await fetchAll<ReversalRow>((from, to) =>
    sb.from('document_reversals').select(REVERSAL_COLS).eq('shop_id', shopId).order('created_at', { ascending: false }).order('id').range(from, to) as unknown as Res<ReversalRow>,
  );
  return rows.map(toReversal);
}

export interface PostSaleLine {
  product_name: string;
  qty_milli: bigint;
  unit: Unit;
  unit_price: bigint;
}

export interface PostSaleArgs {
  shopId: string;
  saleId: string;
  clientOpId: string;
  customerId: string | null;
  note: string | null;
  lines: PostSaleLine[];
  clientTotal: bigint;
}

/**
 * post_sale RPC. Server summani qayta hisoblaydi (calc_mismatch bo'lsa hech narsa saqlanmaydi),
 * client_op_id bo'yicha idempotent. Muvaffaqiyatdan keyin hujjat qayta o'qilib tekshiriladi.
 */
export async function postSale(sb: SB, a: PostSaleArgs): Promise<string> {
  const res = await sb.rpc('post_sale', {
    p_shop_id: a.shopId,
    p_sale_id: a.saleId,
    p_client_op_id: a.clientOpId,
    p_customer_id: a.customerId,
    p_raw_input: a.note,
    p_lines: a.lines.map((l) => ({
      product_name: l.product_name,
      qty_milli: l.qty_milli.toString(),
      unit: l.unit,
      unit_price: l.unit_price.toString(),
      raw_text: null,
    })),
    p_client_total: a.clientTotal.toString(),
  });
  const id = check(res) as string | null;
  if (!id) throw new AppError('unknown', 'Server savdo identifikatorini qaytarmadi — savdo saqlanmagan bo\'lishi mumkin.');
  const doc = check(await sb.from('documents').select(DOC_COLS).eq('shop_id', a.shopId).eq('id', id).maybeSingle()) as unknown as DocRow | null;
  if (!doc) throw new AppError('unknown', 'Savdo serverda topilmadi. Savdolar ro\'yxatini tekshiring.');
  if (doc.status !== 'posted' && doc.status !== 'reversed') throw new AppError('unknown', 'Savdo serverda tasdiqlanmagan holatda.');
  if (toBig(doc.subtotal) !== a.clientTotal) {
    // Shu client_op_id bilan avval boshqa tarkibdagi savdo saqlangan — foydalanuvchi bilishi kerak
    throw new AppError('conflict', "Server allaqachon boshqa summadagi savdoni qaytardi. Savdolar ro'yxatini tekshiring.");
  }
  return id;
}

export async function reverseSale(sb: SB, shopId: string, documentId: string, clientOpId: string, reason: string): Promise<void> {
  check(await sb.rpc('reverse_sale', { p_shop_id: shopId, p_document_id: documentId, p_client_op_id: clientOpId, p_reason: reason.trim() }));
  const doc = check(await sb.from('documents').select('status').eq('shop_id', shopId).eq('id', documentId).maybeSingle()) as { status: string } | null;
  if (doc?.status !== 'reversed') throw new AppError('unknown', 'Server bekor qilishni tasdiqlamadi.');
}

// ---------------------------------------------------------------------------
// To'lovlar
// ---------------------------------------------------------------------------

interface PaymentRow extends Omit<Payment, 'amount' | 'void'> {
  amount: string;
}

const PAYMENT_COLS = 'id, customer_id, amount::text, method, note, created_by, created_at';

export async function listPayments(sb: SB, shopId: string): Promise<Payment[]> {
  const [rows, voids] = await Promise.all([
    fetchAll<PaymentRow>((from, to) =>
      sb.from('payments').select(PAYMENT_COLS).eq('shop_id', shopId).order('created_at', { ascending: false }).order('id').range(from, to) as unknown as Res<PaymentRow>,
    ),
    fetchAll<PaymentVoid>((from, to) =>
      sb.from('payment_voids').select('id, payment_id, reason, created_by, created_at').eq('shop_id', shopId).order('created_at').order('id').range(from, to),
    ),
  ]);
  const byPayment = new Map(voids.map((v) => [v.payment_id, v]));
  return rows.map((r) => ({ ...r, amount: toBig(r.amount), void: byPayment.get(r.id) ?? null }));
}

export interface RecordPaymentArgs {
  shopId: string;
  paymentId: string;
  clientOpId: string;
  customerId: string;
  amount: bigint;
  method: PaymentMethod;
  note: string | null;
}

/** record_payment RPC: server qarzdan oshmasligini tekshiradi, client_op_id bo'yicha idempotent */
export async function recordPayment(sb: SB, a: RecordPaymentArgs): Promise<string> {
  const id = check(
    await sb.rpc('record_payment', {
      p_shop_id: a.shopId,
      p_payment_id: a.paymentId,
      p_client_op_id: a.clientOpId,
      p_customer_id: a.customerId,
      p_amount: a.amount.toString(),
      p_method: a.method,
      p_note: a.note,
    }),
  ) as string | null;
  if (!id) throw new AppError('unknown', "Server to'lov identifikatorini qaytarmadi.");
  const row = check(await sb.from('payments').select('id, amount::text').eq('shop_id', a.shopId).eq('id', id).maybeSingle()) as { id: string; amount: string } | null;
  if (!row) throw new AppError('unknown', "To'lov serverda topilmadi. To'lovlar tarixini tekshiring.");
  if (toBig(row.amount) !== a.amount) throw new AppError('conflict', "Server allaqachon boshqa summadagi to'lovni qaytardi. Tarixni tekshiring.");
  return id;
}

export async function voidPayment(sb: SB, shopId: string, paymentId: string, reason: string): Promise<void> {
  check(await sb.rpc('void_payment', { p_shop_id: shopId, p_payment_id: paymentId, p_reason: reason.trim() }));
  const row = check(await sb.from('payment_voids').select('id').eq('shop_id', shopId).eq('payment_id', paymentId).maybeSingle());
  if (!row) throw new AppError('unknown', "Server to'lov bekor qilinishini tasdiqlamadi.");
}

