# HISOBCHI GO — DAVOM ETTIRISH PROMPTI

**Maqsad:** Yangi AI sessiyasi loyihani boshidan boshlamasdan, qayerdan davom etishi kerakligi.

---

## Oxirgi holat

- **Oxirgi commit:** `36ea2e6` (yoki keyingi commitlar)
- **Tugallangan:** 0-bosqich (audit), 1-bosqich (core modul), 2-bosqich (hujjatlar)
- **Joriy:** 3-bosqich (Supabase migratsiyalar)

## Birinchi qadamlar

1. `git log --oneline -n 10` — oxirgi commitlarni tekshir
2. `git status` — saqlanmagan o'zgarishlar bormi?
3. `docs/PROGRESS.md` — joriy holatni o'qi
4. `npx vitest run` — testlar ishlayaptimi?
5. `npx tsc --noEmit` — typecheck muvaffaqiyatli bo'lsin

## Nimalarni QILMA

- `packages/core/` ichidagi kodni qayta yozma — u ishlayapti va testdan o'tgan
- Mavjud hujjatlarni o'chirma
- Git tarixini o'zgartirma
- `npm audit fix --force` ni ko'r-ko'rona bajarma

## Nimalarni QIL

1. `docs/PROGRESS.md` dagi joriy bosqichdan davom et
2. Har bir bosqich oxirida testlarni ishga tushir
3. Xavfsiz commitlar yarat
4. Progress jurnalini yangila

## Muhim hujjatlar

- `PROMPT.md` — master prompt
- `docs/TZ-MVP.md` — batafsil texnik topshiriq
- `docs/QARORLAR.md` — qabul qilingan qarorlar va ochiq savollar
- `docs/ARXITEKTURA.md` — tizim arxitekturasi
- `docs/MUAMMOLAR.md` — aniqlangan muammolar
- `docs/PROGRESS.md` — progress jurnali

## Asosiy qoidalar (eslatma)

- BigInt — barcha pul hisob-kitoblari
- qty_milli — miqdor (1000 = 1 birlik)
- Formula: `(qtyMilli * unitPrice + 500n) / 1000n`
- AI faqat parsing — hisoblash deterministik
- Ikki mustaqil hisoblash: TypeScript + PostgreSQL
- Mismatch = bloklash
- Ledger append-only
- RLS tenant izolyatsiya
- client_op_id idempotency
