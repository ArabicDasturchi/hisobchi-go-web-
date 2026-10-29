# HISOBCHI GO — QARORLAR

**Maqsad:** Loyiha davomida qabul qilingan qarorlar, ularning sabablari va ochiq savollar.

---

## Qabul qilingan qarorlar

### Q1. Pul hisob-kitoblari uchun BigInt
- **Qaror:** Barcha pul hisob-kitoblarida TypeScript `BigInt` ishlatiladi.
- **Sabab:** O'zbekiston so'mida yirik ulgurji summalar `Number.MAX_SAFE_INTEGER` (2^53-1 ≈ 9 trln) chegarasiga yaqinlashishi mumkin. `BigInt` cheksiz aniqlikdagi butun sonlarni qo'llab-quvvatlaydi.
- **Sana:** 2026-10-29

### Q2. BigInt JSON serializatsiyasi
- **Qaror:** API chegarasida `BigInt` to'g'ridan-to'g'ri JSON ga serializatsiya qilinmaydi. String formatidan foydalaniladi.
- **Sabab:** `JSON.stringify` `BigInt` ni qo'llab-quvvatlamaydi; `TypeError` beradi.
- **Sana:** 2026-10-29

### Q3. Yaxlitlash formulasi
- **Qaror:** `(qtyMilli * unitPrice + 500n) / 1000n` — half-up rounding.
- **Sabab:** PROMPT.md va TZ-MVP.md da bir xil belgilangan.
- **Sana:** 2026-10-29

### Q4. Manfiy qiymatlar
- **Qaror:** Manfiy miqdor va narx rad etiladi. Reversal modeli alohida tasdiqlanmaguncha.
- **Sabab:** TZ-MVP.md: "Miqdor, narx yoki jami manfiy bo'lishiga yo'l qo'ymang, agar alohida reversal modeli buni aniq talab qilmasa."
- **Sana:** 2026-10-29

### Q5. Nuqtali son formati (masalan "13.000")
- **Qaror:** Noaniq format deb rad etiladi (AMBIGUOUS_FORMAT).
- **Sabab:** Nuqta ming ajratuvchi yoki o'nlik kasr bo'lishi mumkin. Xavfsiz tarzda foydalanuvchidan aniqlashtirish so'raladi.
- **Sana:** 2026-10-29

### Q6. Chegirma/soliq
- **Qaror:** MVP da qo'shilmaydi.
- **Sabab:** TZ-MVP.md: "MVP talablarida tasdiqlanmagan bo'lsa, ularni o'zboshimchalik bilan qo'shmang."
- **Sana:** 2026-10-29

### Q7. Test runner
- **Qaror:** Vitest ishlatiladi.
- **Sabab:** Tezkor, TypeScript va BigInt qo'llab-quvvatlaydi, ESM mos.
- **Sana:** 2026-10-29

---

## Ochiq savollar (hali qaror yo'q)

### OS1. Auth usuli
- **Savol:** Autentifikatsiya qanday bo'ladi? (telefon OTP, email, yoki demo mode?)
- **Holat:** Hujjatlarda aniq qaror yo'q.

### OS2. STT provayderi
- **Savol:** Ovozli kiritish uchun qaysi STT provayderi ishlatiladi?
- **Holat:** TZ-MVP.md: "STT provayderi hujjatlarda tasdiqlanmagan bo'lsa, tanlamang."
- **Hozirgi qaror:** MVP matn kiritish bilan ishlaydi.

### OS3. qty_milli universalligi
- **Savol:** `qty_milli` (1000=1) barcha birliklar uchun mosmi? (dona, kg, metr, litr)
- **Holat:** Hujjatlarda ochiq savol sifatida qayd etilgan.
- **Hozirgi yondashuv:** Barcha birliklar uchun `qty_milli` ishlatilmoqda.

### OS4. Maksimal chegaralar
- **Savol:** Miqdor/narxning ruxsat etilgan maksimal chegaralari qancha?
- **Hozirgi yondashuv:** `MAX_UNIT_PRICE = 100,000,000 so'm`, `MAX_QTY_MILLI = 1,000,000,000` (1 mln birlik). Taxminiy — tasdiqlash kerak.

### OS5. Mijoz telefon raqami
- **Savol:** Mijoz uchun telefon raqami majburiymi?
- **Holat:** Belgilanmagan.

### OS6. Audit log saqlash muddati
- **Savol:** Audit log qancha vaqt saqlanadi?
- **Holat:** Belgilanmagan.

### OS7. RLS va Edge Function mas'uliyat taqsimoti
- **Savol:** Qaysi operatsiyalar RLS, qaysilari Edge Function orqali himoyalanadi?
- **Holat:** Umumiy tamoyil bor, lekin aniq taqsimot belgilanmagan.

### OS8. Narx ogohlantirish chegarasi
- **Savol:** Narx katalogdagi narxdan ±25% farq qilganda ogohlantirish — bu qayta ko'rib chiqiladimi?
- **Holat:** TZ-MVP.md da dastlabki qoida sifatida qayd etilgan. Foydalanuvchi intervyulari bilan tekshirilishi kerak.

### OS9. AI ishonchlilik chegarasi
- **Savol:** AI confidence threshold qancha bo'lishi kerak?
- **Hozirgi yondashuv:** 0.7 (70%) — dastlabki qiymat, tasdiqlash kerak.
