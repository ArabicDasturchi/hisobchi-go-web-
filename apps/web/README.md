# Hisobchi Go — web ilova

Next.js 16 (App Router) + React 19 + TypeScript strict + Tailwind CSS 4 + Supabase (Auth, PostgreSQL, RLS).
Mobil ilova bilan **bir xil Supabase loyihasi, jadvallar, RLS va RPC'lar** ishlatiladi; yangi backend yo'q.

## Ishga tushirish

```bash
# repo ildizida (npm workspaces): bog'liqliklar
npm install

cd apps/web
cp .env.example .env.local   # PowerShell: Copy-Item .env.example .env.local
npm run dev                  # http://localhost:3000
```

Production:

```bash
npm run build
npm run start
```

Tekshiruvlar (`apps/web` ichida): `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

> `dev`/`build` `--webpack` bilan ishlaydi: `@hisobchi/core` paketi `./x.js` uslubidagi importlardan foydalanadi,
> Turbopack ularni `.ts` ga moslamaydi (`next.config.ts` → `extensionAlias`).

## Environment o'zgaruvchilari

| O'zgaruvchi | Majburiy | Tavsif |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ha | Supabase loyiha URL'i |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ha | **Public** (publishable/anon) kalit. Service-role kaliti hech qachon bu yerga va hech qachon `NEXT_PUBLIC_*` nomi bilan yozilmaydi |
| `NEXT_PUBLIC_SITE_URL` | yo'q | Email havolalari qaytadigan origin. Bo'sh bo'lsa — sahifa ochilgan joriy origin |

`.env.local` git'ga tushmaydi (`apps/web/.gitignore` va ildizdagi `.gitignore`).
`NEXT_PUBLIC_*` qiymatlar **build vaqtida** bundle'ga joylanadi — o'zgartirgandan keyin qayta build (Vercel'da Redeploy) kerak.

## Supabase Auth — URL sozlamasi

Dashboard → **Authentication → URL Configuration → Redirect URLs** ga har bir web manzilni qo'shing:

- `http://localhost:3000/**` — lokal ishlash
- `https://<loyiha>.vercel.app/**` — Vercel production URL olingach
- `https://*-<vercel-team>.vercel.app/**` — Vercel preview deploylari kerak bo'lsa (ixtiyoriy)
- o'z domeningiz ulanganda — `https://<domen>/**`

Mobil uchun mavjud `hisobchigo://**` va `exp://**` yozuvlarini **o'chirmang**. Site URL mobil sxemada qolishi mumkin:
web har doim `emailRedirectTo` / `redirectTo` ni aniq yuboradi; manzil ro'yxatda bo'lmasa, Supabase Site URL'ga qaytaradi.

### "localhost недоступен" va boshqa callback holatlari

Oqim: ro'yxatdan o'tish → email → havola Supabase'da emailni **tasdiqlaydi** → `…/auth/callback?code=…` →
server `exchangeCodeForSession` (PKCE) → `/onboarding`.

- Havola `http://localhost:3000/...` ga qaytadi. Uni **telefonda** yoki dev server ishlamayotganda ochilsa, brauzer
  "localhost недоступен" deydi. Email baribir tasdiqlangan bo'ladi — shu sababli keyin oddiy kirish ishlaydi.
- PKCE `code_verifier` faqat ro'yxatdan o'tilgan brauzerda saqlanadi. Havola boshqa brauzerda ochilsa, sessiya
  yaratilmaydi; ilova buni aniq xabar bilan ko'rsatadi («Email tasdiqlangan bo'lishi mumkin… kiring»).
- Eskirgan havola → kirish sahifasida xabar va «Yangi tasdiqlash xatini so'rash» (`/check-email`).
- Production'da bu muammo yo'qoladi: havola ochiq domenga qaytadi.

Google OAuth loyihada o'chirilgan (`/auth/v1/settings` → `google: false`), shuning uchun tugma yo'q.

## Vercel'ga deploy

Repo tarkibi: npm workspaces (`apps/*`, `packages/*`), bitta `package-lock.json` ildizda.
`apps/web/vercel.json` buyruqlarni belgilaydi:

- **Install:** `cd ../.. && npm ci --workspace=apps/web --include-workspace-root` — ildiz lockfile bo'yicha faqat web
  bog'liqliklari o'rnatiladi (Expo/React Native emas), `@hisobchi/core` workspace sifatida ulanadi.
- **Build:** `npm run build` → `next build --webpack` (core'dagi `./x.js` importlari uchun webpack `extensionAlias`
  zarur — Turbopack bilan build `Can't resolve './validation.js'` xatosi bilan yiqiladi, tekshirilgan).

### Dashboard'da bajariladigan qadamlar

1. Repo GitHub'ga push qilingan bo'lsin (`apps/web` va `packages/core`, ildizdagi `package.json` + `package-lock.json`).
2. Vercel → **Add New → Project** → repo'ni import qiling.
3. **Root Directory:** `apps/web`. «Include files outside the root directory in the Build Step» yoqilgan qolsin (standart).
4. **Framework Preset:** Next.js (avtomatik). Install/Build buyruqlari `vercel.json` dan olinadi — qo'lda o'zgartirmang.
5. **Node.js Version:** 22.x (yoki 20.x; talab `>=20.9`).
6. **Environment Variables** (Production va Preview):
   - `NEXT_PUBLIC_SUPABASE_URL` = Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Publishable/anon kalit (Project Settings → API Keys)
   - `NEXT_PUBLIC_SITE_URL` — **birinchi deployda bo'sh qoldiring.**
7. **Deploy.** Production URL'ni oling (masalan `https://<loyiha>.vercel.app`).
8. Supabase → Redirect URLs ga `https://<loyiha>.vercel.app/**` qo'shing.
9. Vercel → Settings → Environment Variables → `NEXT_PUBLIC_SITE_URL=https://<loyiha>.vercel.app` (**faqat Production**
   muhitiga; Preview'da bo'sh qolsin — aks holda preview'dagi havolalar production'ga qaytib, PKCE ishlamaydi) → **Redeploy**.
10. Production URL'da to'liq oqimni sinang: ro'yxatdan o'tish → email havolasi (shu brauzerda) → do'kon → mijoz →
    savdo (qarz / to'langan / qisman) → to'lov → hisobot.

## Arxitektura

```
src/
  proxy.ts                 sessiyani yangilash + himoyalangan marshrutlar (Next 16 "proxy")
  app/(auth)/…             kirish, ro'yxatdan o'tish, email tasdiqlash, parolni tiklash
  app/auth/callback        PKCE code / token_hash almashinuvi (server route)
  app/onboarding           do'kon yaratish (create_shop)
  app/(app)/…              dashboard, savdolar, mijozlar, mahsulotlar, to'lovlar, hisobotlar, sozlamalar
  components/              UI to'plami, layout (sidebar / planshet rail / mobil pastki menyu + drawer)
  lib/data/api.ts          Supabase bilan yagona qatlam (jadval/RPC nomlari faqat shu yerda)
  lib/data/ledger.ts       qarz va statistika (sof funksiyalar, testlangan)
  lib/money.ts             BigInt pul/miqdor, core formulasi
  lib/errors.ts            xatolarni o'zbekcha xabarga aylantirish
  i18n/uz.ts               interfeys lug'ati (ko'p tillilik uchun)
```

### Moliyaviy qoidalar

- Pul — butun so'm, miqdor — `qty_milli`; hamma hisob `BigInt`. bigint ustunlar `::text` bilan o'qiladi.
- Qator summasi `@hisobchi/core` dagi `(qty_milli * unit_price + 500) / 1000` — PostgreSQL `calculate_line_total` bilan bir xil;
  `post_sale` summani qayta hisoblaydi, mos kelmasa hech narsa saqlanmaydi.
- Yozish faqat RPC orqali: `create_shop`, `post_sale`, `reverse_sale`, `record_payment`, `void_payment`.
  Hech qanday moliyaviy DELETE/UPDATE yo'q. Mijoz faqat savdo/to'lov tarixi bo'lmasa o'chiriladi.
- Har bir amal bir martalik `client_op_id` bilan yuboriladi: tarmoq xatosidan keyingi qayta urinish takroriy yozuv yaratmaydi.
  RPC muvaffaqiyatidan keyin yozuv serverdan qayta o'qilib tekshiriladi (summasi/holati).
- Qarz = mijozga `posted` savdolar − bekor qilinmagan to'lovlar (`customer_outstanding` bilan bir xil).
- "To'landi"/"Qisman" savdo: `post_sale` + `record_payment` (ikki RPC). To'lov qismi yiqilsa, savdo saqlangani
  aniq ko'rsatiladi va to'lovni o'sha kalit bilan qayta yuborish tugmasi beriladi. Mijozsiz savdo — naqd, qarz yozilmaydi.
- Ombor qoldig'i yuritilmaydi (sxemada yo'q).

## Testlar

`__tests__/`: pul formatlash/parsing va formulasi, qarz/statistika, savdo rejasi, RPC kontrakti
(`003_security_and_mvp_rpc.sql` dagi imzolar, birliklar va to'lov usullari bilan solishtiriladi).
