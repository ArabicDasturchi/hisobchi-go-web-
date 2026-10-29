-- Hisobchi Go — MVP Schema Migration
-- Versiya: 001
-- Sana: 2026-10-29
--
-- Asosiy jadvallar: shops, shop_members, products, product_aliases,
-- customers, documents, document_lines, ledger_entries, audit_log
--
-- Qoidalar:
--   - Pul: bigint (butun so'm)
--   - Miqdor: bigint (qty_milli, 1000 = 1 birlik)
--   - Ledger: append-only (UPDATE/DELETE taqiqlangan)
--   - client_op_id: unique (idempotency)
--   - RLS: foydalanuvchi faqat o'z do'koni ma'lumotlari

-- ============================================================
-- 1. SHOPS — Do'konlar
-- ============================================================

CREATE TABLE IF NOT EXISTS shops (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL CHECK (char_length(name) > 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. SHOP_MEMBERS — Do'kon a'zoligi
-- ============================================================

CREATE TABLE IF NOT EXISTS shop_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL, -- Supabase Auth user id
  role       text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'admin', 'member')),
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (shop_id, user_id)
);

CREATE INDEX idx_shop_members_user ON shop_members(user_id);
CREATE INDEX idx_shop_members_shop ON shop_members(shop_id);

-- ============================================================
-- 3. PRODUCTS — Mahsulot katalogi
-- ============================================================

CREATE TABLE IF NOT EXISTS products (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name       text NOT NULL CHECK (char_length(name) > 0),
  unit       text NOT NULL DEFAULT 'dona',
  -- Oxirgi ma'lum narx (so'm, butun son). Ixtiyoriy.
  last_price bigint CHECK (last_price IS NULL OR last_price >= 0),
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (shop_id, name)
);

CREATE INDEX idx_products_shop ON products(shop_id);

-- ============================================================
-- 4. PRODUCT_ALIASES — Mahsulot nomlari variantlari
-- ============================================================

CREATE TABLE IF NOT EXISTS product_aliases (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  shop_id    uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  alias      text NOT NULL CHECK (char_length(alias) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (shop_id, alias)
);

-- ============================================================
-- 5. CUSTOMERS — Mijozlar
-- ============================================================

CREATE TABLE IF NOT EXISTS customers (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name       text NOT NULL CHECK (char_length(name) > 0),
  phone      text,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_shop ON customers(shop_id);
CREATE INDEX idx_customers_name ON customers(shop_id, name);

-- ============================================================
-- 6. DOCUMENTS — Savdo hujjatlari
-- ============================================================

CREATE TABLE IF NOT EXISTS documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id   uuid REFERENCES customers(id),
  -- Hujjat holati: draft → confirmed → posted
  status        text NOT NULL DEFAULT 'draft'
                CHECK (status IN ('draft', 'confirmed', 'posted', 'reversed')),
  -- Hisoblangan jami (so'm, butun son). Server tomonida to'ldiriladi.
  subtotal      bigint NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  -- TypeScript tomonidan hisoblangan jami
  ts_total      bigint,
  -- PostgreSQL tomonidan hisoblangan jami
  pg_total      bigint,
  -- Hisob-kitob mosligi
  calc_match    boolean,
  -- Idempotency kaliti
  client_op_id  text,
  -- Kim yaratgan
  created_by    uuid NOT NULL, -- Supabase Auth user id
  posted_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  -- Bitta do'konda bitta client_op_id faqat bir marta
  UNIQUE (shop_id, client_op_id)
);

CREATE INDEX idx_documents_shop ON documents(shop_id);
CREATE INDEX idx_documents_customer ON documents(customer_id);
CREATE INDEX idx_documents_status ON documents(shop_id, status);

-- ============================================================
-- 7. DOCUMENT_LINES — Savdo qatorlari
-- ============================================================

CREATE TABLE IF NOT EXISTS document_lines (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id  uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  shop_id      uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  line_index   integer NOT NULL CHECK (line_index >= 0),
  product_name text NOT NULL CHECK (char_length(product_name) > 0),
  product_id   uuid REFERENCES products(id),
  -- Miqdor: qty_milli (1000 = 1 birlik)
  qty_milli    bigint NOT NULL CHECK (qty_milli > 0),
  unit         text NOT NULL DEFAULT 'dona',
  -- Birlik narxi (so'm, butun son)
  unit_price   bigint NOT NULL CHECK (unit_price >= 0),
  -- Qator summasi (so'm). Formula: floor((qty_milli * unit_price + 500) / 1000)
  line_total   bigint NOT NULL CHECK (line_total >= 0),
  -- Asl matn fragmenti
  raw_text     text,
  -- AI ishonchliligi
  confidence   real,
  -- Ogohlantirishlar (JSON massiv)
  warnings     jsonb DEFAULT '[]',
  created_at   timestamptz NOT NULL DEFAULT now(),

  UNIQUE (document_id, line_index)
);

CREATE INDEX idx_document_lines_doc ON document_lines(document_id);

-- ============================================================
-- 8. LEDGER_ENTRIES — Append-only moliyaviy yozuvlar
-- ============================================================

CREATE TABLE IF NOT EXISTS ledger_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id      uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  document_id  uuid NOT NULL REFERENCES documents(id),
  entry_type   text NOT NULL CHECK (entry_type IN ('sale', 'reversal', 'adjustment')),
  -- Summa (musbat = kirim, manfiy = chiqim/qaytarish)
  amount       bigint NOT NULL,
  customer_id  uuid REFERENCES customers(id),
  description  text,
  created_by   uuid NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ledger_shop ON ledger_entries(shop_id);
CREATE INDEX idx_ledger_document ON ledger_entries(document_id);
CREATE INDEX idx_ledger_customer ON ledger_entries(customer_id);

-- Ledger append-only: UPDATE va DELETE taqiqlangan
-- (Trigger orqali himoyalanadi)

CREATE OR REPLACE FUNCTION prevent_ledger_modification()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Ledger yozuvlarini o''zgartirish yoki o''chirish taqiqlangan. Tuzatish uchun reversal yozuv yarating.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ledger_no_update
  BEFORE UPDATE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_modification();

CREATE TRIGGER trg_ledger_no_delete
  BEFORE DELETE ON ledger_entries
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_modification();

-- ============================================================
-- 9. AUDIT_LOG — Audit yozuvlari
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     uuid REFERENCES shops(id),
  user_id     uuid,
  action      text NOT NULL,
  entity_type text,
  entity_id   uuid,
  details     jsonb DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_shop ON audit_log(shop_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);

-- ============================================================
-- 10. PostgreSQL HISOBLASH FUNKSIYASI
-- Mustaqil ikkinchi yo'l — TypeScript'dan mustaqil
-- ============================================================

-- Bitta qator summasi
-- Formula: floor((qty_milli * unit_price + 500) / 1000)
-- BigInt division PostgreSQL'da avtomatik floor (truncation toward zero)
CREATE OR REPLACE FUNCTION calculate_line_total(
  p_qty_milli bigint,
  p_unit_price bigint
) RETURNS bigint AS $$
BEGIN
  IF p_qty_milli < 0 THEN
    RAISE EXCEPTION 'Manfiy miqdor ruxsat etilmagan: qty_milli=%', p_qty_milli;
  END IF;
  IF p_unit_price < 0 THEN
    RAISE EXCEPTION 'Manfiy narx ruxsat etilmagan: unit_price=%', p_unit_price;
  END IF;

  -- PostgreSQL integer division avtomatik truncation qiladi
  RETURN (p_qty_milli * p_unit_price + 500) / 1000;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- Hujjat qatorlari asosida jami hisoblash
-- Har bir qatorni mustaqil yaxlitlab, summalarni yig'adi
CREATE OR REPLACE FUNCTION calculate_document_total(p_document_id uuid)
RETURNS TABLE (
  line_id uuid,
  calculated_line_total bigint,
  document_subtotal bigint
) AS $$
DECLARE
  v_subtotal bigint := 0;
  v_line record;
BEGIN
  FOR v_line IN
    SELECT dl.id, dl.qty_milli, dl.unit_price
    FROM document_lines dl
    WHERE dl.document_id = p_document_id
    ORDER BY dl.line_index
  LOOP
    calculated_line_total := calculate_line_total(v_line.qty_milli, v_line.unit_price);
    v_subtotal := v_subtotal + calculated_line_total;
    line_id := v_line.id;
    document_subtotal := v_subtotal; -- har bir qatorda yangilanadi
    RETURN NEXT;
  END LOOP;

  -- Agar qator bo'lmasa
  IF NOT FOUND THEN
    line_id := NULL;
    calculated_line_total := 0;
    document_subtotal := 0;
    RETURN NEXT;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Hujjat post qilish uchun yakuniy jami
CREATE OR REPLACE FUNCTION get_document_pg_total(p_document_id uuid)
RETURNS bigint AS $$
DECLARE
  v_total bigint := 0;
  v_line record;
BEGIN
  FOR v_line IN
    SELECT dl.qty_milli, dl.unit_price
    FROM document_lines dl
    WHERE dl.document_id = p_document_id
    ORDER BY dl.line_index
  LOOP
    v_total := v_total + calculate_line_total(v_line.qty_milli, v_line.unit_price);
  END LOOP;

  RETURN v_total;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- 11. RLS SIYOSATLARI
-- ============================================================

-- RLS yoqish
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Yordamchi funksiya: foydalanuvchi shu do'konga a'zo bo'lganini tekshirish
CREATE OR REPLACE FUNCTION is_shop_member(p_shop_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM shop_members
    WHERE shop_id = p_shop_id
      AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- SHOPS: foydalanuvchi faqat a'zo bo'lgan do'konlarni ko'radi
CREATE POLICY shops_select ON shops
  FOR SELECT USING (is_shop_member(id));

CREATE POLICY shops_insert ON shops
  FOR INSERT WITH CHECK (true); -- yangi do'kon yaratish ruxsat

CREATE POLICY shops_update ON shops
  FOR UPDATE USING (is_shop_member(id));

-- SHOP_MEMBERS: faqat o'z do'koni a'zolarini ko'rish
CREATE POLICY shop_members_select ON shop_members
  FOR SELECT USING (is_shop_member(shop_id));

CREATE POLICY shop_members_insert ON shop_members
  FOR INSERT WITH CHECK (is_shop_member(shop_id) OR user_id = auth.uid());

-- PRODUCTS: faqat o'z do'koni mahsulotlari
CREATE POLICY products_all ON products
  FOR ALL USING (is_shop_member(shop_id))
  WITH CHECK (is_shop_member(shop_id));

-- PRODUCT_ALIASES: faqat o'z do'koni
CREATE POLICY product_aliases_all ON product_aliases
  FOR ALL USING (is_shop_member(shop_id))
  WITH CHECK (is_shop_member(shop_id));

-- CUSTOMERS: faqat o'z do'koni mijozlari
CREATE POLICY customers_all ON customers
  FOR ALL USING (is_shop_member(shop_id))
  WITH CHECK (is_shop_member(shop_id));

-- DOCUMENTS: faqat o'z do'koni hujjatlari
CREATE POLICY documents_all ON documents
  FOR ALL USING (is_shop_member(shop_id))
  WITH CHECK (is_shop_member(shop_id));

-- DOCUMENT_LINES: faqat o'z do'koni
CREATE POLICY document_lines_all ON document_lines
  FOR ALL USING (is_shop_member(shop_id))
  WITH CHECK (is_shop_member(shop_id));

-- LEDGER_ENTRIES: faqat o'z do'koni, faqat SELECT va INSERT
CREATE POLICY ledger_entries_select ON ledger_entries
  FOR SELECT USING (is_shop_member(shop_id));

CREATE POLICY ledger_entries_insert ON ledger_entries
  FOR INSERT WITH CHECK (is_shop_member(shop_id));

-- AUDIT_LOG: faqat o'z do'koni
CREATE POLICY audit_log_select ON audit_log
  FOR SELECT USING (is_shop_member(shop_id));

CREATE POLICY audit_log_insert ON audit_log
  FOR INSERT WITH CHECK (is_shop_member(shop_id));

-- ============================================================
-- 12. UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_shops_updated_at
  BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
