# HISOBCHI GO — ARXITEKTURA

**Versiya:** 1.0  
**Sana:** 2026-10-29  
**Holat:** MVP ishlab chiqish bosqichida

---

## 1. Umumiy arxitektura

```
┌──────────────────────────────────────────────────────────┐
│                    FOYDALANUVCHI                          │
│              (savdogar — mobil telefon)                   │
└────────────────────┬─────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────┐
│              EXPO MOBILE APP (apps/mobile/)               │
│  React Native + TypeScript + Expo Router                  │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ Kiritish │ │Tekshirish│ │Tasdiqlash│ │Mijozlar      │ │
│  │ ekrani   │ │va tuzatish│ │  ekrani  │ │tarixi        │ │
│  └─────────┘ └──────────┘ └──────────┘ └──────────────┘ │
│                     │                                     │
│  ┌──────────────────▼───────────────────────────────────┐│
│  │  @hisobchi/core (packages/core/)                      ││
│  │  • calculateLineTotal()  • parseUzNumber()            ││
│  │  • calculateDocument()   • validateDocument()         ││
│  │  • normalizeProductName()                             ││
│  │  Klient tarafdagi tezkor hisoblash (faqat UI uchun)   ││
│  └───────────────────────────────────────────────────────┘│
└────────────────────┬─────────────────────────────────────┘
                     │ HTTPS / Supabase Client
┌────────────────────▼─────────────────────────────────────┐
│         SUPABASE EDGE FUNCTIONS (supabase/functions/)      │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  parse-list — AI orqali matn → strukturali JSON       │ │
│  │  post-document — hisoblash + taqqoslash + saqlash     │ │
│  └──────────────────────────────────────────────────────┘ │
│                     │                                      │
│  ┌──────────────────▼──────────────────────────────────┐  │
│  │  @hisobchi/core (packages/core/)                     │  │
│  │  Server tarafdagi ishonchli hisoblash                │  │
│  │  (1-hisoblash yo'li: TypeScript BigInt)              │  │
│  └─────────────────────────────────────────────────────┘  │
└────────────────────┬──────────────────────────────────────┘
                     │ SQL / RPC
┌────────────────────▼──────────────────────────────────────┐
│           SUPABASE POSTGRESQL                              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  calculate_document_total() — PL/pgSQL               │  │
│  │  (2-hisoblash yo'li: mustaqil SQL)                   │  │
│  └─────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Jadvallar: shops, products, customers,              │  │
│  │  documents, document_lines, ledger_entries,          │  │
│  │  audit_log                                           │  │
│  └─────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  RLS — foydalanuvchi faqat o'z do'koni ma'lumotlari  │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

## 2. Asosiy tamoyillar

1. **Ikki mustaqil hisoblash yo'li:** TypeScript `BigInt` (packages/core) va PostgreSQL `bigint`. Natijalar farq qilsa, saqlash bloklanadi.
2. **AI faqat parsing qiladi:** Hisoblash, summalar va qarorlar deterministik kod orqali.
3. **Savdogar tasdiqlaydi:** Tasdiqsiz hech narsa saqlanmaydi.
4. **Append-only ledger:** Tuzatish faqat reversal yozuv orqali.
5. **RLS tenant izolyatsiyasi:** Foydalanuvchi faqat a'zo bo'lgan do'konni ko'radi.
6. **Idempotent saqlash:** `client_op_id` bilan dublikat himoya.

## 3. Hisob-kitob modeli

### Pul va miqdor

| Tushuncha | Format | Misol |
|-----------|--------|-------|
| Pul | BigInt (butun so'm) | `13000n` = 13,000 so'm |
| Miqdor | qty_milli (1000 = 1 birlik) | `10000n` = 10 dona |
| Birlik narxi | BigInt (so'm/birlik) | `13000n` |

### Yaxlitlash formulasi

```
line_total = (qty_milli * unit_price + 500n) / 1000n
```

- Har bir qator mustaqil yaxlitlanadi
- Hujjat jami = qator summalarining oddiy yig'indisi
- Manfiy qiymatlar rad etiladi
- TypeScript va PostgreSQL bir xil formula ishlatadi

## 4. Ma'lumotlar oqimi

```
Foydalanuvchi matni
    │
    ▼
Edge Function: parse-list
    │ AI → strukturali JSON
    │ Schema validatsiyasi
    ▼
Klient: tekshirish ekrani
    │ Foydalanuvchi tuzatadi
    │ Noaniq qatorlar sariq rang
    ▼
Klient: tasdiqlash
    │
    ▼
Edge Function: post-document
    │ 1) Server validatsiyasi
    │ 2) TypeScript hisoblash (packages/core)
    │ 3) PostgreSQL hisoblash (mustaqil SQL)
    │ 4) Natijalarni taqqoslash
    │ 5) Mos kelmasa → BLOKLASH
    │ 6) Mos kelsa → atomik saqlash (transaction)
    │ 7) client_op_id tekshiruvi
    ▼
PostgreSQL: document + document_lines + ledger_entries
```

## 5. Xavfsizlik qatlamlari

| Qatlam | Himoya |
|--------|--------|
| Frontend | Inputni validatsiya, BigInt hisoblash faqat UI ko'rinish uchun |
| Edge Function | AI kalitini server tomonda saqlash, schema validatsiya, rate limiting |
| PostgreSQL RLS | Foydalanuvchi faqat o'z do'koni ma'lumotlarini ko'radi |
| Ledger | Append-only, UPDATE/DELETE taqiqlangan |
| Idempotency | client_op_id unique constraint |
| Audit | Barcha muhim operatsiyalar logga yoziladi |

## 6. Texnologik stek

| Qatlam | Texnologiya |
|--------|-------------|
| Mobile/Web | Expo + React Native + TypeScript |
| Shared logic | @hisobchi/core (packages/core/) |
| Backend | Supabase Edge Functions (Deno) |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth (usul hali tanlanmagan — OS1) |
| Web deploy | Vercel |
| Test runner | Vitest |

## 7. Monorepo tuzilishi

```
hisobchi-go/
├── apps/mobile/           # Expo app
├── packages/core/         # Sof TypeScript hisob-kitob va validatsiya
├── supabase/
│   ├── migrations/        # SQL schema, RLS, funksiyalar
│   └── functions/         # Edge Functions
├── docs/                  # Hujjatlar
├── package.json           # Monorepo root (workspaces)
└── .env.example
```
