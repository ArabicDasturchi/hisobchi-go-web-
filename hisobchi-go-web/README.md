# Hisobchi Go — veb-versiya (MVP)

React + TypeScript + Vite. Ma’lumotlar `localStorage`da (kalit: `hisobchi-go:v1`), faqat shu brauzerda.
Mobil ilova bilan sinxronlash YO‘Q; backend yo‘q.

## Ishga tushirish
    npm install
    npm run dev        # http://localhost:5173
    npm test           # parser va pul hisobi testlari
    npm run build      # tsc + vite build -> dist/

## Vercel
Framework: Vite · Build: `npm run build` · Output: `dist` (vercel.json tayyor).
Environment variable kerak emas.

## Backendga ulash
`src/lib/storage.ts` dagi `Repo` interfeysini API bilan amalga oshiring va `src/store.tsx`da `localRepo` o‘rniga qo‘ying.
