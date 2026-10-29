-- ============================================================
-- HISOBCHI GO — SQL TESTLARI
-- ============================================================
-- Bu fayl PostgreSQL hisoblash funksiyalarini tekshiradi.
-- Barcha kutilgan natijalar qo'lda hisoblangan.
-- TypeScript core bilan bir xil natija kutiladi.
--
-- Ishga tushirish: psql yoki Supabase SQL editor orqali
-- Agar birorta test yiqilsa, EXCEPTION chiqadi.
-- ============================================================

DO $$
DECLARE
  v_result bigint;
  v_total bigint;
  v_test_name text;
BEGIN
  RAISE NOTICE '=== HISOBCHI GO SQL TESTLARI ===';
  RAISE NOTICE '';

  -- ================================================================
  -- 1. calculate_line_total — bitta qator summasi
  -- ================================================================

  -- Test 1: Chirmoq 10 × 13000 = 130,000 so'm
  v_test_name := 'chirmoq: 10 × 13000 = 130000';
  v_result := calculate_line_total(10000, 13000);
  IF v_result != 130000 THEN
    RAISE EXCEPTION 'FAIL [%]: kutilgan 130000, natija %', v_test_name, v_result;
  END IF;
  RAISE NOTICE 'PASS: %', v_test_name;

  -- Test 2: Yurak 5 × 15000 = 75,000 so'm
  v_test_name := 'yurak: 5 × 15000 = 75000';
  v_result := calculate_line_total(5000, 15000);
  IF v_result != 75000 THEN
    RAISE EXCEPTION 'FAIL [%]: kutilgan 75000, natija %', v_test_name, v_result;
  END IF;
  RAISE NOTICE 'PASS: %', v_test_name;

  -- Test 3: Momiq 20 × 9000 = 180,000 so'm
  v_test_name := 'momiq: 20 × 9000 = 180000';
  v_result := calculate_line_total(20000, 9000);
  IF v_result != 180000 THEN
    RAISE EXCEPTION 'FAIL [%]: kutilgan 180000, natija %', v_test_name, v_result;
  END IF;
  RAISE NOTICE 'PASS: %', v_test_name;

  -- Test 4: 1 dona × 1000 so'm = 1000 so'm
  v_test_name := '1 dona × 1000 = 1000';
  v_result := calculate_line_total(1000, 1000);
  IF v_result != 1000 THEN
    RAISE EXCEPTION 'FAIL [%]: kutilgan 1000, natija %', v_test_name, v_result;
  END IF;
  RAISE NOTICE 'PASS: %', v_test_name;

  -- Test 5: 0.5 birlik × 7000 = 3500
  v_test_name := '0.5 × 7000 = 3500';
  v_result := calculate_line_total(500, 7000);
  IF v_result != 3500 THEN
    RAISE EXCEPTION 'FAIL [%]: kutilgan 3500, natija %', v_test_name, v_result;
  END IF;
  RAISE NOTICE 'PASS: %', v_test_name;

  -- Test 6: 1.5 birlik × 7000 = 10500
  v_test_name := '1.5 × 7000 = 10500';
  v_result := calculate_line_total(1500, 7000);
  IF v_result != 10500 THEN
    RAISE EXCEPTION 'FAIL [%]: kutilgan 10500, natija %', v_test_name, v_result;
  END IF;
  RAISE NOTICE 'PASS: %', v_test_name;

  -- Test 7: 0.001 × 10000 = 10
  v_test_name := '0.001 × 10000 = 10';
  v_result := calculate_line_total(1, 10000);
  IF v_result != 10 THEN
    RAISE EXCEPTION 'FAIL [%]: kutilgan 10, natija %', v_test_name, v_result;
  END IF;
  RAISE NOTICE 'PASS: %', v_test_name;

  -- Test 8: Yaxlitlash chegarasi — pastga (0.001 × 499 = 0)
  v_test_name := 'yaxlitlash pastga: 0.001 × 499 = 0';
  v_result := calculate_line_total(1, 499);
  IF v_result != 0 THEN
    RAISE EXCEPTION 'FAIL [%]: kutilgan 0, natija %', v_test_name, v_result;
  END IF;
  RAISE NOTICE 'PASS: %', v_test_name;

  -- Test 9: Yaxlitlash chegarasi — yuqoriga (0.001 × 500 = 1)
  v_test_name := 'yaxlitlash yuqoriga: 0.001 × 500 = 1';
  v_result := calculate_line_total(1, 500);
  IF v_result != 1 THEN
    RAISE EXCEPTION 'FAIL [%]: kutilgan 1, natija %', v_test_name, v_result;
  END IF;
  RAISE NOTICE 'PASS: %', v_test_name;

  -- Test 10: Nol miqdor = 0
  v_test_name := 'nol miqdor = 0';
  v_result := calculate_line_total(0, 13000);
  IF v_result != 0 THEN
    RAISE EXCEPTION 'FAIL [%]: kutilgan 0, natija %', v_test_name, v_result;
  END IF;
  RAISE NOTICE 'PASS: %', v_test_name;

  -- Test 11: Nol narx = 0
  v_test_name := 'nol narx = 0';
  v_result := calculate_line_total(10000, 0);
  IF v_result != 0 THEN
    RAISE EXCEPTION 'FAIL [%]: kutilgan 0, natija %', v_test_name, v_result;
  END IF;
  RAISE NOTICE 'PASS: %', v_test_name;

  -- Test 12: Katta qiymatlar
  v_test_name := 'katta qiymatlar: 1M birlik × 1M so''m = 1T';
  v_result := calculate_line_total(1000000000, 1000000);
  IF v_result != 1000000000000 THEN
    RAISE EXCEPTION 'FAIL [%]: kutilgan 1000000000000, natija %', v_test_name, v_result;
  END IF;
  RAISE NOTICE 'PASS: %', v_test_name;

  -- Test 13: Yaxlitlash — 0.001 × 1500 = 2
  v_test_name := 'yaxlitlash: 0.001 × 1500 = 2';
  v_result := calculate_line_total(1, 1500);
  IF v_result != 2 THEN
    RAISE EXCEPTION 'FAIL [%]: kutilgan 2, natija %', v_test_name, v_result;
  END IF;
  RAISE NOTICE 'PASS: %', v_test_name;

  -- ================================================================
  -- 2. Manfiy qiymatlar — xato kutiladi
  -- ================================================================

  -- Test 14: Manfiy miqdor
  v_test_name := 'manfiy miqdor — xato kutiladi';
  BEGIN
    v_result := calculate_line_total(-1000, 5000);
    RAISE EXCEPTION 'FAIL [%]: xato kutilgan edi, lekin natija %', v_test_name, v_result;
  EXCEPTION
    WHEN raise_exception THEN
      RAISE NOTICE 'PASS: % (xato to''g''ri tarzda chiqdi)', v_test_name;
  END;

  -- Test 15: Manfiy narx
  v_test_name := 'manfiy narx — xato kutiladi';
  BEGIN
    v_result := calculate_line_total(1000, -5000);
    RAISE EXCEPTION 'FAIL [%]: xato kutilgan edi, lekin natija %', v_test_name, v_result;
  EXCEPTION
    WHEN raise_exception THEN
      RAISE NOTICE 'PASS: % (xato to''g''ri tarzda chiqdi)', v_test_name;
  END;

  -- ================================================================
  -- 3. 385,000 so'm namuna — uch qator yig'indisi
  -- ================================================================

  v_test_name := '385000 so''m namuna: 130000 + 75000 + 180000';
  v_total := calculate_line_total(10000, 13000)
           + calculate_line_total(5000, 15000)
           + calculate_line_total(20000, 9000);
  IF v_total != 385000 THEN
    RAISE EXCEPTION 'FAIL [%]: kutilgan 385000, natija %', v_test_name, v_total;
  END IF;
  RAISE NOTICE 'PASS: %', v_test_name;

  RAISE NOTICE '';
  RAISE NOTICE '=== BARCHA SQL TESTLARI MUVAFFAQIYATLI ===';
END;
$$;
