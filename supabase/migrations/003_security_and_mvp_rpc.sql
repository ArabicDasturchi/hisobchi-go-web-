-- ============================================================
-- HISOBCHI GO — 003: xavfsizlik tuzatishlari va MVP RPC'lari
-- ============================================================
-- 001 dagi aniqlangan xavflar (docs/SERVER_XAVFSIZLIK.md):
--   S1 KRITIK  shop_members_insert — istalgan foydalanuvchi istalgan do'konga a'zo bo'la olardi
--   S2 YUQORI  documents/document_lines/ledger_entries — klient to'g'ridan-to'g'ri "posted" yoza olardi
--   S3 O'RTA   shops_insert WITH CHECK (true)
--   S4 O'RTA   is_shop_member SECURITY DEFINER, search_path belgilanmagan
-- Yechim: moliyaviy jadvallarga klient faqat O'QIYDI; yozish faqat SECURITY DEFINER RPC orqali,
-- har bir RPC auth.uid() a'zoligini tekshiradi, summani PostgreSQL'da qayta hisoblaydi,
-- client_op_id bilan idempotent va bitta tranzaksiyada ishlaydi.
-- Pul: bigint (butun so'm). Float ishlatilmaydi.
-- Qayta ishga tushirish xavfsiz: jadvallar IF NOT EXISTS, siyosat/triggerlar DROP IF EXISTS + CREATE,
-- funksiyalar CREATE OR REPLACE. Ma'lumot o'chirilmaydi.
-- ============================================================

-- ---------- S4: a'zolik funksiyasi ----------
CREATE OR REPLACE FUNCTION is_shop_member(p_shop_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM shop_members WHERE shop_id = p_shop_id AND user_id = auth.uid());
$$;

-- RPC'lar ichida: a'zo bo'lmasa xato
CREATE OR REPLACE FUNCTION require_shop_member(p_shop_id uuid)
RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;
  IF p_shop_id IS NULL OR NOT is_shop_member(p_shop_id) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- ---------- S1, S3: do'kon va a'zolikni faqat RPC orqali yaratish ----------
DROP POLICY IF EXISTS shops_insert ON shops;
DROP POLICY IF EXISTS shop_members_insert ON shop_members;
DROP POLICY IF EXISTS shops_update ON shops;
CREATE POLICY shops_update ON shops
  FOR UPDATE USING (EXISTS (SELECT 1 FROM shop_members m WHERE m.shop_id = shops.id AND m.user_id = auth.uid() AND m.role = 'owner'))
  WITH CHECK (EXISTS (SELECT 1 FROM shop_members m WHERE m.shop_id = shops.id AND m.user_id = auth.uid() AND m.role = 'owner'));

-- Foydalanuvchi o'z do'konini yaratadi va avtomatik egasi bo'ladi (bitta tranzaksiya)
CREATE OR REPLACE FUNCTION create_shop(p_name text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_shop uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;
  IF p_name IS NULL OR char_length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'invalid_shop_name' USING ERRCODE = '22023';
  END IF;
  -- MVP: bir foydalanuvchi — bitta do'kon (takroriy chaqiruv mavjudini qaytaradi)
  SELECT m.shop_id INTO v_shop FROM shop_members m WHERE m.user_id = auth.uid() AND m.role = 'owner' LIMIT 1;
  IF v_shop IS NOT NULL THEN
    RETURN v_shop;
  END IF;
  INSERT INTO shops (name) VALUES (trim(p_name)) RETURNING id INTO v_shop;
  INSERT INTO shop_members (shop_id, user_id, role) VALUES (v_shop, auth.uid(), 'owner');
  RETURN v_shop;
END;
$$;

-- ---------- S2: moliyaviy jadvallarga klient faqat o'qiydi ----------
DROP POLICY IF EXISTS documents_all ON documents;
DROP POLICY IF EXISTS document_lines_all ON document_lines;
DROP POLICY IF EXISTS ledger_entries_insert ON ledger_entries;
DROP POLICY IF EXISTS audit_log_insert ON audit_log;

DROP POLICY IF EXISTS documents_select ON documents;
CREATE POLICY documents_select ON documents FOR SELECT USING (is_shop_member(shop_id));
DROP POLICY IF EXISTS document_lines_select ON document_lines;
CREATE POLICY document_lines_select ON document_lines FOR SELECT USING (is_shop_member(shop_id));

-- Mijoz va mahsulot — moliyaviy emas: a'zolar o'z do'koni ichida CRUD (001 dagi FOR ALL siyosatlari).
-- id klientdan keladi (mobil UUID) — barqaror identifikator; shop_id ni RLS WITH CHECK himoyalaydi.

-- ---------- Bekor qilish, to'lov va to'lov bekor qilish jadvallari ----------
CREATE TABLE IF NOT EXISTS document_reversals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  document_id   uuid NOT NULL UNIQUE REFERENCES documents(id),
  client_op_id  text NOT NULL,
  amount        bigint NOT NULL CHECK (amount >= 0),
  reason        text NOT NULL CHECK (char_length(trim(reason)) >= 3),
  created_by    uuid NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, client_op_id)
);

CREATE TABLE IF NOT EXISTS payments (
  id            uuid PRIMARY KEY,
  shop_id       uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  client_op_id  text NOT NULL,
  customer_id   uuid NOT NULL REFERENCES customers(id),
  amount        bigint NOT NULL CHECK (amount > 0),
  method        text NOT NULL CHECK (method IN ('naqd', 'karta', 'otkazma')),
  note          text,
  created_by    uuid NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, client_op_id)
);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(shop_id, customer_id);

CREATE TABLE IF NOT EXISTS payment_voids (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  payment_id  uuid NOT NULL UNIQUE REFERENCES payments(id),
  reason      text NOT NULL CHECK (char_length(trim(reason)) >= 3),
  created_by  uuid NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE document_reversals ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_voids ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS document_reversals_select ON document_reversals;
CREATE POLICY document_reversals_select ON document_reversals FOR SELECT USING (is_shop_member(shop_id));
DROP POLICY IF EXISTS payments_select ON payments;
CREATE POLICY payments_select ON payments FOR SELECT USING (is_shop_member(shop_id));
DROP POLICY IF EXISTS payment_voids_select ON payment_voids;
CREATE POLICY payment_voids_select ON payment_voids FOR SELECT USING (is_shop_member(shop_id));

-- Append-only: audit izi o'zgartirilmaydi va o'chirilmaydi
CREATE OR REPLACE FUNCTION prevent_append_only_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'append-only: % jadvalini o''zgartirish yoki o''chirish taqiqlangan', TG_TABLE_NAME;
END;
$$;
DROP TRIGGER IF EXISTS trg_reversals_append_only ON document_reversals;
CREATE TRIGGER trg_reversals_append_only BEFORE UPDATE OR DELETE ON document_reversals
  FOR EACH ROW EXECUTE FUNCTION prevent_append_only_change();
DROP TRIGGER IF EXISTS trg_payments_append_only ON payments;
CREATE TRIGGER trg_payments_append_only BEFORE UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION prevent_append_only_change();
DROP TRIGGER IF EXISTS trg_payment_voids_append_only ON payment_voids;
CREATE TRIGGER trg_payment_voids_append_only BEFORE UPDATE OR DELETE ON payment_voids
  FOR EACH ROW EXECUTE FUNCTION prevent_append_only_change();
DROP TRIGGER IF EXISTS trg_document_lines_append_only ON document_lines;
CREATE TRIGGER trg_document_lines_append_only BEFORE UPDATE OR DELETE ON document_lines
  FOR EACH ROW EXECUTE FUNCTION prevent_append_only_change();

-- Himoyaning ikkinchi qatlami: jadval huquqlari (RLS'ga qo'shimcha)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE INSERT, UPDATE, DELETE ON documents, document_lines, ledger_entries, audit_log,
  document_reversals, payments, payment_voids, shop_members FROM authenticated;
REVOKE INSERT, DELETE ON shops FROM authenticated;
GRANT SELECT ON documents, document_lines, ledger_entries, document_reversals, payments, payment_voids,
  shop_members, shops, customers, products TO authenticated;
GRANT INSERT, UPDATE, DELETE ON customers, products TO authenticated;
GRANT UPDATE ON shops TO authenticated;

-- ---------- Qarz: bitta qoida (mobil ilovadagi OUTSTANDING_SQL bilan bir xil) ----------
-- qarz = mijozga savdo (bekor qilinganlarsiz) − to'lovlar (bekor qilinganlarsiz)
CREATE OR REPLACE FUNCTION customer_outstanding(p_shop_id uuid, p_customer_id uuid)
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    COALESCE((SELECT SUM(d.subtotal) FROM documents d
              WHERE d.shop_id = p_shop_id AND d.customer_id = p_customer_id AND d.status = 'posted'), 0)
    - COALESCE((SELECT SUM(p.amount) FROM payments p
                WHERE p.shop_id = p_shop_id AND p.customer_id = p_customer_id
                  AND NOT EXISTS (SELECT 1 FROM payment_voids v WHERE v.payment_id = p.id)), 0);
$$;

-- ---------- RPC: savdoni saqlash ----------
-- p_lines: [{"product_name": "...", "qty_milli": "3000", "unit": "dona", "unit_price": "4000", "raw_text": "..."}]
-- Raqamlar string ko'rinishida (BigInt JSON'ga sig'maydi); server o'zi hisoblaydi va klient jami bilan solishtiradi.
CREATE OR REPLACE FUNCTION post_sale(
  p_shop_id uuid,
  p_sale_id uuid,
  p_client_op_id text,
  p_customer_id uuid,
  p_raw_input text,
  p_lines jsonb,
  p_client_total bigint,
  p_created_at timestamptz DEFAULT now()
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing uuid;
  v_line jsonb;
  v_idx int := 0;
  v_qty bigint;
  v_price bigint;
  v_total bigint := 0;
BEGIN
  PERFORM require_shop_member(p_shop_id);

  -- Idempotentlik: shu do'kon + client_op_id allaqachon bor bo'lsa — o'sha hujjat
  SELECT id INTO v_existing FROM documents WHERE shop_id = p_shop_id AND client_op_id = p_client_op_id;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;
  -- Boshqa do'konning ID'sini "egallab olish" taqiqlangan
  IF EXISTS (SELECT 1 FROM documents WHERE id = p_sale_id) THEN
    RAISE EXCEPTION 'id_conflict' USING ERRCODE = '23505';
  END IF;

  IF p_customer_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM customers WHERE id = p_customer_id AND shop_id = p_shop_id
  ) THEN
    RAISE EXCEPTION 'customer_not_in_shop' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'empty_document' USING ERRCODE = '22023';
  END IF;

  INSERT INTO documents (id, shop_id, customer_id, status, subtotal, ts_total, pg_total, calc_match,
                         client_op_id, created_by, posted_at, created_at)
  VALUES (p_sale_id, p_shop_id, p_customer_id, 'draft', 0, p_client_total, NULL, NULL,
          p_client_op_id, auth.uid(), NULL, p_created_at);

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    v_qty := (v_line->>'qty_milli')::bigint;
    v_price := (v_line->>'unit_price')::bigint;
    IF v_qty IS NULL OR v_qty <= 0 OR v_qty > 1000000000 THEN
      RAISE EXCEPTION 'invalid_qty' USING ERRCODE = '22023';
    END IF;
    IF v_price IS NULL OR v_price < 0 OR v_price > 100000000 THEN
      RAISE EXCEPTION 'invalid_price' USING ERRCODE = '22023';
    END IF;
    IF char_length(trim(coalesce(v_line->>'product_name', ''))) = 0 THEN
      RAISE EXCEPTION 'invalid_product_name' USING ERRCODE = '22023';
    END IF;
    IF coalesce(v_line->>'unit', '') NOT IN ('dona','kg','g','litr','metr','pachka','qop','karobka','tonna') THEN
      RAISE EXCEPTION 'invalid_unit' USING ERRCODE = '22023';
    END IF;
    INSERT INTO document_lines (document_id, shop_id, line_index, product_name, qty_milli, unit, unit_price, line_total, raw_text)
    VALUES (p_sale_id, p_shop_id, v_idx, trim(v_line->>'product_name'), v_qty, v_line->>'unit', v_price,
            calculate_line_total(v_qty, v_price), v_line->>'raw_text');
    v_total := v_total + calculate_line_total(v_qty, v_price);
    v_idx := v_idx + 1;
  END LOOP;

  -- Mustaqil server hisobi; mos kelmasa hech narsa saqlanmaydi (tranzaksiya bekor bo'ladi)
  IF v_total <> p_client_total THEN
    RAISE EXCEPTION 'calc_mismatch: server=%, client=%', v_total, p_client_total USING ERRCODE = '22000';
  END IF;

  UPDATE documents SET status = 'posted', subtotal = v_total, pg_total = v_total, calc_match = true, posted_at = now()
  WHERE id = p_sale_id;
  INSERT INTO ledger_entries (shop_id, document_id, entry_type, amount, customer_id, description, created_by)
  VALUES (p_shop_id, p_sale_id, 'sale', v_total, p_customer_id, 'savdo', auth.uid());
  RETURN p_sale_id;
END;
$$;

-- ---------- RPC: savdoni bekor qilish ----------
CREATE OR REPLACE FUNCTION reverse_sale(p_shop_id uuid, p_document_id uuid, p_client_op_id text, p_reason text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_doc documents%ROWTYPE;
  v_rev uuid;
BEGIN
  PERFORM require_shop_member(p_shop_id);
  SELECT id INTO v_rev FROM document_reversals WHERE shop_id = p_shop_id AND client_op_id = p_client_op_id;
  IF v_rev IS NOT NULL THEN
    RETURN v_rev;
  END IF;
  SELECT * INTO v_doc FROM documents WHERE id = p_document_id AND shop_id = p_shop_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'document_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF v_doc.status <> 'posted' THEN
    RAISE EXCEPTION 'already_reversed' USING ERRCODE = '23505';
  END IF;
  IF p_reason IS NULL OR char_length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'reason_required' USING ERRCODE = '22023';
  END IF;
  INSERT INTO document_reversals (shop_id, document_id, client_op_id, amount, reason, created_by)
  VALUES (p_shop_id, p_document_id, p_client_op_id, v_doc.subtotal, trim(p_reason), auth.uid())
  RETURNING id INTO v_rev;
  INSERT INTO ledger_entries (shop_id, document_id, entry_type, amount, customer_id, description, created_by)
  VALUES (p_shop_id, p_document_id, 'reversal', -v_doc.subtotal, v_doc.customer_id, trim(p_reason), auth.uid());
  UPDATE documents SET status = 'reversed' WHERE id = p_document_id;
  RETURN v_rev;
END;
$$;

-- ---------- RPC: to'lov qabul qilish ----------
CREATE OR REPLACE FUNCTION record_payment(
  p_shop_id uuid,
  p_payment_id uuid,
  p_client_op_id text,
  p_customer_id uuid,
  p_amount bigint,
  p_method text,
  p_note text,
  p_created_at timestamptz DEFAULT now()
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing uuid;
  v_outstanding bigint;
BEGIN
  PERFORM require_shop_member(p_shop_id);
  SELECT id INTO v_existing FROM payments WHERE shop_id = p_shop_id AND client_op_id = p_client_op_id;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount' USING ERRCODE = '22023';
  END IF;
  -- Mijoz qatorini qulflash: parallel to'lovlar qarzdan oshmasligi uchun
  PERFORM 1 FROM customers WHERE id = p_customer_id AND shop_id = p_shop_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'customer_not_in_shop' USING ERRCODE = '42501';
  END IF;
  v_outstanding := customer_outstanding(p_shop_id, p_customer_id);
  IF p_amount > v_outstanding THEN
    RAISE EXCEPTION 'payment_exceeds_debt: debt=%', v_outstanding USING ERRCODE = '22000';
  END IF;
  INSERT INTO payments (id, shop_id, client_op_id, customer_id, amount, method, note, created_by, created_at)
  VALUES (p_payment_id, p_shop_id, p_client_op_id, p_customer_id, p_amount, p_method, nullif(trim(p_note), ''), auth.uid(), p_created_at);
  RETURN p_payment_id;
END;
$$;

-- ---------- RPC: to'lovni bekor qilish (bir marta) ----------
CREATE OR REPLACE FUNCTION void_payment(p_shop_id uuid, p_payment_id uuid, p_reason text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
BEGIN
  PERFORM require_shop_member(p_shop_id);
  IF NOT EXISTS (SELECT 1 FROM payments WHERE id = p_payment_id AND shop_id = p_shop_id) THEN
    RAISE EXCEPTION 'payment_not_found' USING ERRCODE = 'P0002';
  END IF;
  SELECT id INTO v_id FROM payment_voids WHERE payment_id = p_payment_id;
  IF v_id IS NOT NULL THEN
    RETURN v_id; -- idempotent: allaqachon bekor qilingan
  END IF;
  IF p_reason IS NULL OR char_length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'reason_required' USING ERRCODE = '22023';
  END IF;
  INSERT INTO payment_voids (shop_id, payment_id, reason, created_by)
  VALUES (p_shop_id, p_payment_id, trim(p_reason), auth.uid()) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- RPC huquqlari: faqat tizimga kirgan foydalanuvchilar.
-- Supabase public sxemadagi funksiyalarga anon'ga ham EXECUTE beradi — FROM PUBLIC yetarli emas,
-- anon'dan alohida olib tashlanadi (lokal testda aniqlangan: anon create_shop'ni chaqira olgan).
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE ALL ON FUNCTION create_shop(text), post_sale(uuid, uuid, text, uuid, text, jsonb, bigint, timestamptz),
  reverse_sale(uuid, uuid, text, text), record_payment(uuid, uuid, text, uuid, bigint, text, text, timestamptz),
  void_payment(uuid, uuid, text), customer_outstanding(uuid, uuid), require_shop_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_shop(text), post_sale(uuid, uuid, text, uuid, text, jsonb, bigint, timestamptz),
  reverse_sale(uuid, uuid, text, text), record_payment(uuid, uuid, text, uuid, bigint, text, text, timestamptz),
  void_payment(uuid, uuid, text) TO authenticated;
