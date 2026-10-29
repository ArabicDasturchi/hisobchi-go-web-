# HISOBCHI GO — MUAMMOLAR

**Maqsad:** Aniqlangan muammolar, ularning holati va hal qilish tartibi.

---

## Aktiv muammolar

### M1. Git tarix yo'qligi
- **Holat:** ✅ HAL QILINDI (2026-10-29)
- **Tafsilot:** Loyihada `git init` qilingan edi, lekin commit yo'q edi.
- **Yechim:** `36ea2e6` — birinchi commit yaratildi.

### M2. Hujjatlar to'liq emas
- **Holat:** 🔄 JARAYONDA
- **Tafsilot:** TZ-MVP.md da talab qilingan `ARXITEKTURA.md`, `MUAMMOLAR.md`, `SUHBATLAR.md`, `RAQIBLAR.md` yo'q edi.
- **Yechim:** Hozirgi sessiyada yaratilmoqda.

### M3. npm audit zaifliklar
- **Holat:** ⏳ TEKSHIRILMAGAN
- **Tafsilot:** `npm install` — 6 zaiflik (3 moderate, 1 high, 2 critical). Barchasi dev dependencies (vitest ekotizimi). Production bundle'ga ta'sir qilmasligi ehtimol katta.
- **Keyingi qadam:** Zaifliklar tahlil qilinib, moslikni buzmaydigan tuzatish rejasi tuziladi.
- **Izoh:** Ko'r-ko'rona `npm audit fix --force` bajarilmaydi.

### M4. Supabase schema yo'q
- **Holat:** ⏳ KUTILMOQDA
- **Tafsilot:** `supabase/migrations/` bo'sh. DB schema, RLS va PostgreSQL hisoblash funksiyasi hali yaratilmagan.
- **Bog'liqlik:** 3-bosqich vazifasi.

### M5. Edge Functions yo'q
- **Holat:** ⏳ KUTILMOQDA
- **Tafsilot:** `supabase/functions/` bo'sh. AI parsing va posting funksiyalari hali yo'q.
- **Bog'liqlik:** 5-bosqich vazifasi. M4 dan keyin.

### M6. Mobile app yo'q
- **Holat:** ⏳ KUTILMOQDA
- **Tafsilot:** `apps/mobile/` bo'sh. Expo app hali yaratilmagan.
- **Bog'liqlik:** 6-bosqich vazifasi.

### M7. Auth usuli belgilanmagan
- **Holat:** ⏳ OCHIQ SAVOL
- **Tafsilot:** `docs/QARORLAR.md` OS1 — auth usuli (telefon OTP, email, demo mode) qaror qilinmagan.
- **Ta'sir:** Edge Functions va mobile app ga ta'sir qiladi.
- **Vaqtinchalik yechim:** Demo mode bilan boshlash mumkin.

### M8. STT provayderi tanlanmagan
- **Holat:** ⏳ OCHIQ SAVOL
- **Tafsilot:** `docs/QARORLAR.md` OS2 — ovozli kiritish provayderi qaror qilinmagan.
- **Ta'sir:** MVP da matn kiritish ishlaydi. STT ixtiyoriy.

---

## Hal qilingan muammolar

| # | Muammo | Hal qilingan sana |
|---|--------|--------------------|
| M1 | Git tarix yo'qligi | 2026-10-29 |
