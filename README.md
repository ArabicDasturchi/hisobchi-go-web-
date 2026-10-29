# Hisobchi Go

Ulgurji savdo uchun aqlli hisob-kitob platformasi.

## Texnologiyalar
- Expo + React Native + TypeScript (`apps/mobile`, Expo Router)
- Qurilmadagi SQLite (expo-sqlite) — hozirgi saqlash qatlami
- Supabase + PostgreSQL (`supabase/migrations`) — hali ulanmagan
- Hisob-kitob yadrosi: `packages/core` (BigInt)

## Texnik topshiriq
docs/TZ-MVP.md

## Muhim
Hisob-kitoblar packages/core ichida bo'ladi.
AI faqat ma'lumotni tahlil qiladi.
Savdo foydalanuvchi tasdiqlagandan keyin saqlanadi.

## Ishga tushirish

```bash
npm install
npm test            # core + mobile testlari
npm run typecheck   # core + mobile
```

Android emulyator yoki telefonda (Expo Go, SDK 58):

```bash
cd apps/mobile
npx expo start --android
```

Telefonda: `npx expo start` → Expo Go ilovasida QR kodni skanerlang.

Ilova ichidagi ovozli kiritish (expo-speech-recognition) Expo Go'da yo'q — development build kerak:

```bash
cd apps/mobile
npx expo run:android   # Android SDK talab qilinadi
```

JS bundle tekshiruvi: `npm run export:android --workspace=apps/mobile`

## Ma'lumotlar yaxlitligi (mobil)
- Qator summalari faqat `@hisobchi/core` (BigInt) orqali.
- Saqlashdan oldin va saqlash tranzaksiyasi ichida SQLite integer arifmetikasida mustaqil qayta hisoblanadi; mos kelmasa saqlanmaydi.
- `sale_lines.line_total` CHECK cheklovi SQL formulasini majburlaydi.
- `sales`, `sale_lines`, `ledger_entries` — append-only (UPDATE/DELETE trigger bilan taqiqlangan).
- `client_op_id` UNIQUE — takroriy saqlash oldi olinadi.
