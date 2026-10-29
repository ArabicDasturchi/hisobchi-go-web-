# HISOBCHI GO — PROGRESS JURNALI

**Oxirgi yangilash:** 2026-10-29

---

## Umumiy holat

| Metrika | Qiymat |
|---------|--------|
| Oxirgi xavfsiz commit | `36ea2e6` |
| Joriy bosqich | 3-bosqich: Supabase migratsiyalar |
| Core testlar | 99/99 ✅ |
| TypeScript typecheck | ✅ |

---

## Tugallangan bosqichlar

### 0-bosqich: Audit va xavfsiz boshlash ✅
- [x] Loyiha papkasini tekshirish
- [x] Maxfiy fayllar tekshiruvi (xavfsiz)
- [x] git init + birinchi commit (`36ea2e6`)
- [x] Testlarni ishga tushirish (99/99 o'tdi)
- [x] TypeScript typecheck (xatosiz)

### 1-bosqich: Core modul ✅
- [x] `packages/core/src/types.ts` — 12 tip, 3 konstanta
- [x] `packages/core/src/calculation.ts` — calculateLineTotal, calculateDocument
- [x] `packages/core/src/parse-uz-number.ts` — parseUzNumber
- [x] `packages/core/src/validation.ts` — validateLine, validateDocument
- [x] `packages/core/src/normalize.ts` — normalizeProductName
- [x] `packages/core/src/index.ts` — barcha eksportlar
- [x] `packages/core/__tests__/calculation.test.ts` — 27 test
- [x] `packages/core/__tests__/parse-uz-number.test.ts` — 32 test
- [x] `packages/core/__tests__/normalize.test.ts` — 17 test
- [x] `packages/core/__tests__/validation.test.ts` — 23 test
- [x] `packages/core/package.json`, `tsconfig.json`, `vitest.config.ts`

### 2-bosqich: Hujjatlar 🔄
- [x] `docs/QARORLAR.md` — 7 qaror + 9 ochiq savol
- [x] `docs/ARXITEKTURA.md`
- [x] `docs/MUAMMOLAR.md`
- [x] `docs/SUHBATLAR.md`
- [x] `docs/RAQIBLAR.md`
- [x] `docs/PROGRESS.md` (shu fayl)
- [x] `docs/CONTINUE_PROMPT.md`
- [x] `.env.example`

---

## Joriy bosqich: 3-bosqich — Supabase migratsiyalar

### Vazifalar
- [ ] DB schema migratsiyasi (jadvallar)
- [ ] RLS siyosatlari
- [ ] PostgreSQL hisoblash funksiyasi
- [ ] SQL testlari
- [ ] TypeScript/SQL taqqoslash testlari

---

## Keyingi vazifalar

| # | Vazifa | Bosqich | Holat |
|---|--------|---------|-------|
| 1 | Supabase migratsiya: jadvallar | 3 | ⏳ |
| 2 | RLS siyosatlari | 3 | ⏳ |
| 3 | PG hisoblash funksiyasi | 3 | ⏳ |
| 4 | SQL testlari | 4 | ⏳ |
| 5 | TS/SQL taqqoslash testlari | 4 | ⏳ |
| 6 | Edge Functions (parse, post) | 5 | ⏳ |
| 7 | Expo app yaratish | 6 | ⏳ |
| 8 | Kiritish ekrani | 6 | ⏳ |
| 9 | Tekshirish/tasdiqlash ekrani | 6 | ⏳ |
| 10 | Build va deploy tayyorgarlik | 8 | ⏳ |

---

## Tashqi bog'liqliklar (credential/xizmat)

| Xizmat | Holat | Ta'sir |
|--------|-------|--------|
| Supabase loyiha | Lokal CLI yoki masofaviy kerak | Migratsiyalarni qo'llash |
| AI API kaliti | Yo'q | Edge Function AI parsing mock bo'ladi |
| Vercel | Sozlanmagan | Deploy tekshirilmagan |

---

## npm audit holati

6 zaiflik (3 moderate, 1 high, 2 critical) — barchasi dev dependencies. Hozircha production ta'sir ko'rilmaydi. Batafsil tahlil kerak.
