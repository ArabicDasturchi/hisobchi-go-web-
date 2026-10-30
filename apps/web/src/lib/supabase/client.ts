'use client';
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../env';

let client: SupabaseClient | null = null;

/**
 * Brauzer klienti — faqat public kalit. Sessiya cookie'da saqlanadi (proxy va server route'lar ham o'qiydi).
 * Barcha so'rovlar RLS ostida foydalanuvchi nomidan bajariladi.
 */
export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return client;
}
