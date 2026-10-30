/** Supabase sxemasiga (001 + 003 migratsiyalari) mos tiplar. Pul — BigInt. */
import { ALLOWED_UNITS, type AllowedUnit } from '@hisobchi/core';

export type Role = 'owner' | 'admin' | 'member';
export type Unit = AllowedUnit;
export const UNITS: readonly Unit[] = ALLOWED_UNITS;

/** record_payment p_method — payments.method CHECK bilan bir xil */
export type PaymentMethod = 'naqd' | 'karta' | 'otkazma';
export const PAYMENT_METHODS: readonly PaymentMethod[] = ['naqd', 'karta', 'otkazma'];

export interface Shop {
  id: string;
  name: string;
  created_at: string;
}

export interface Membership {
  shop: Shop;
  role: Role;
  user_id: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  unit: Unit;
  last_price: bigint | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type SaleStatus = 'posted' | 'reversed';

export interface SaleDoc {
  id: string;
  customer_id: string | null;
  status: SaleStatus;
  subtotal: bigint;
  created_at: string;
  posted_at: string | null;
  created_by: string;
}

export interface SaleLine {
  id: string;
  line_index: number;
  product_name: string;
  product_id: string | null;
  qty_milli: bigint;
  unit: string;
  unit_price: bigint;
  line_total: bigint;
  raw_text: string | null;
}

export interface Reversal {
  id: string;
  document_id: string;
  amount: bigint;
  reason: string;
  created_by: string;
  created_at: string;
}

export interface PaymentVoid {
  id: string;
  payment_id: string;
  reason: string;
  created_by: string;
  created_at: string;
}

export interface Payment {
  id: string;
  customer_id: string;
  amount: bigint;
  method: PaymentMethod;
  note: string | null;
  created_by: string;
  created_at: string;
  void: PaymentVoid | null;
}

export interface SaleDetail {
  doc: SaleDoc;
  lines: SaleLine[];
  reversal: Reversal | null;
}
