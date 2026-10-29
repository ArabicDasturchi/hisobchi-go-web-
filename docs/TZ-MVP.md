# HISOBCHI GO --- MASTER TEXNIK TOPSHIRIQ (TZ-MVP)

**Versiya:** 1.0\
**Maqsad:** Claude Code yordamida MVP'ni xavfsiz, testlanadigan va
ishlab chiqarishga tayyor arxitektura asosida yaratish.

------------------------------------------------------------------------

## 1. Mahsulot maqsadi

**Hisobchi Go** --- ulgurji savdogarlarning qo'lda yozilgan yoki ovoz
orqali aytilgan tovar spiskasini tartibli savdo yozuviga aylantiradigan
hisob-kitob yordamchisi.

Asosiy tamoyil: **AI ma'lumotni tushunadi, lekin hisoblamaydi; dastur
hisoblaydi; savdogar tasdiqlaydi; shundan keyingina ma'lumot
saqlanadi.**

### Asosiy foydalanuvchi oqimi

1.  Savdogar tovarlar ro'yxatini matn sifatida kiritadi. Ovozli kiritish
    ham rejalashtiriladi.
2.  AI matndan mahsulot nomi, miqdor, birlik va birlik narxini ajratib,
    strukturali natija qaytaradi.
3.  Noaniq qatorlar **sariq rangda** ko'rsatiladi va foydalanuvchidan
    aniqlashtirish so'raladi.
4.  Savdogar mahsulot, miqdor, birlik va narxlarni ko'rib chiqib,
    tasdiqlaydi.
5.  Hisob ikki mustaqil yo'l bilan tekshiriladi: TypeScript core va
    PostgreSQL.
6.  Natijalar mos kelmasa, saqlash bloklanadi va xato qayd etiladi.
7.  Faqat barcha tekshiruvlar muvaffaqiyatli bo'lgach, savdo yozuvi
    ma'lumotlar bazasiga saqlanadi.
8.  Savdogar mijozlar tarixi va oldingi savdo yozuvlarini ko'ra oladi.

### Misol

Kiritish: \> chirmoq 10 ta 13 ming, yurak 5 ta 15 ming, momiq 20 ta 9
ming

Kutiladigan hisob: - Chirmoq: 10 × 13 000 = 130 000 so'm - Yurak: 5 × 15
000 = 75 000 so'm - Momiq: 20 × 9 000 = 180 000 so'm - **Jami: 385 000
so'm**

Bu misol test uchun. AI hisoblangan summalarni manba sifatida
belgilamasligi kerak; barcha summalarni deterministik kod hisoblaydi.

------------------------------------------------------------------------

## 2. Mahsulot tamoyillari va qat'iy qoidalar

1.  **AI faqat parsing qiladi.** Mahsulot nomi, miqdor, o'lchov birligi,
    narx va ehtimoliy mahsulot nomzodlarini ajratadi. U jami, qator
    summasi yoki chegirmani hisoblamaydi.
2.  **Hisob-kitob deterministik bo'ladi.** Bir xil kirish har safar bir
    xil natija berishi shart.
3.  **Ikki mustaqil hisoblash yo'li bo'ladi.** TypeScript
    `packages/core` va PostgreSQL hisoblari bir-biridan mustaqil
    implementatsiya qilinadi.
4.  **Tasdiqsiz saqlash yo'q.** Foydalanuvchi savdo qatorlarini
    tasdiqlamaguncha hech qanday savdo yozuvi yakuniy ma'lumot sifatida
    saqlanmaydi.
5.  **Noaniqlik yashirilmaydi.** Aniqligi yetarli bo'lmagan qator sariq
    ogohlantirish bilan belgilanadi.
6.  **Pul qiymatlari butun so'mda saqlanadi.** `float`/`double` pul
    hisoblash uchun ishlatilmaydi.
7.  **Ledger append-only bo'ladi.** Tasdiqlangan moliyaviy yozuv
    tarixini jim o'zgartirish yoki o'chirish mumkin emas. Tuzatishlar
    reversal yoki alohida tuzatish yozuvi bilan amalga oshiriladi.
8.  **Maxfiy ma'lumotlar repozitoriyga kiritilmaydi.** API kalitlari,
    service-role kalitlari va real mijoz ma'lumotlari commit qilinmaydi.
9.  **Taxminni fakt qilib ko'rsatmaslik.** Noma'lum qarorlar
    hujjatlashtirilsin; o'zboshimchalik bilan provayder, tarif yoki
    biznes qoidasini tanlamang.
10. **Har bir o'zgarish test bilan himoyalanadi.** Ayniqsa
    `packages/core` hisob-kitoblari uchun.

------------------------------------------------------------------------

## 3. Texnologik stek va repozitoriy tuzilishi

### Asosiy stek

-   **Mobil va web interfeys:** Expo + React Native + TypeScript
-   **Backend va ma'lumotlar bazasi:** Supabase Auth, PostgreSQL, Edge
    Functions, Row Level Security (RLS)
-   **Web deploy:** Vercel
-   **Mobil build:** EAS --- MVP web oqimi barqarorlashgandan keyin
-   **Testlar:** TypeScript core uchun unit va property/edge-case
    testlari; PostgreSQL hisoblari uchun SQL testlari yoki
    tekshiriladigan test skriptlari.

### Monorepo

``` text
hisobchi-go/
├── apps/
│   └── mobile/                 # Expo app: mobil + web UI
├── packages/
│   └── core/                   # Sof TypeScript: parsing natijasini tekshirish va hisoblash
├── supabase/
│   ├── migrations/             # Schema, constraints, functions, RLS
│   └── functions/              # Server-side Edge Functions
├── docs/
│   ├── TZ-MVP.md
│   ├── ARXITEKTURA.md
│   ├── QARORLAR.md
│   ├── MUAMMOLAR.md
│   ├── SUHBATLAR.md
│   └── RAQIBLAR.md
├── .env.example
├── .gitignore
└── README.md
```

**Muhim:** hisoblash biznes qoidalari faqat `packages/core` ichida
TypeScript implementatsiyasi sifatida bo'lsin. UI ichida alohida
hisoblash formulalarini takrorlamang. PostgreSQL hisoblash yo'li esa
alohida, mustaqil implementatsiya bo'lishi kerak.

------------------------------------------------------------------------

## 4. Hisob-kitob modeli

### Pul va miqdor

-   Pul: butun so'm (`integer` yoki xavfsiz diapazon talab qilsa
    `bigint`).
-   Miqdor: `qty_milli` --- miqdorni mingdan bir aniqlikda ifodalovchi
    butun son.
-   Birlik narxi: so'm/birlik, butun son.
-   `float` va `double` pul yoki miqdor formulalarida ishlatilmasin.
-   TypeScript katta sonlar uchun `BigInt` ishlatishi mumkin. JSON
    uzatishda `BigInt` to'g'ridan-to'g'ri serializatsiya qilinmasin;
    aniq string yoki xavfsiz integer formatidan foydalanilsin.

### Qator summasi

Matematik qoida:

``` text
line_total = floor((qty_milli * unit_price + 500) / 1000)
```

Bu formula musbat miqdor va narxlar uchun mingdan bir miqdorni so'mga
yaxlitlaydi. Kodda integer arithmetic ishlatilsin; SQL va TypeScript
natijasi bir xil bo'lishi shart.

-   `subtotal` --- qator summalarining yig'indisi.
-   Chegirma, soliq yoki boshqa qo'shimcha hisoblar MVP talablarida
    tasdiqlanmagan bo'lsa, ularni o'zboshimchalik bilan qo'shmang.
-   Miqdor, narx yoki jami manfiy bo'lishiga yo'l qo'ymang, agar alohida
    reversal modeli buni aniq talab qilmasa.
-   Chegaraviy qiymatlar va overflow holatlari tekshirilsin.

### Ikki yo'l bilan tekshirish

1.  TypeScript `packages/core` kiruvchi tasdiqlangan qatorlardan qator
    summasi va jami hisoblaydi.
2.  PostgreSQL funksiyasi xuddi shu ma'lumotni mustaqil hisoblaydi.
3.  Natijalar qator darajasida ham, jami darajasida ham taqqoslanadi.
4.  Bitta qiymat farq qilsa ham, saqlash bloklanadi; foydalanuvchiga
    tushunarli xabar ko'rsatiladi va texnik tafsilotlar logga yoziladi.
5.  Taqqoslash faqat UI'da emas, server ishonadigan qatlamda ham
    bajarilsin.

------------------------------------------------------------------------

## 5. AI parsing va noaniqliklarni boshqarish

### AI'dan kutiladigan natija

AI xom matnni strukturali JSON ko'rinishiga aylantiradi. Har bir qator
uchun imkon qadar: - `raw_text` - `product_name` - `quantity` - `unit` -
`unit_price` - `currency` (MVP'da UZS) - `confidence` yoki field-level
ishonchlilik - `warnings` - `candidate_products` --- faqat mos nomzodlar
mavjud bo'lsa

JSON schema qat'iy tekshirilsin. Noto'g'ri yoki kutilmagan maydonlar
xavfsiz rad etilsin; AI javobiga to'liq ishonib ketilmasin.

### Noaniqlik sabablari

Quyidagi holatlarda qatorni sariq rangda ko'rsatib, foydalanuvchidan
tasdiq so'rang: - mahsulot nomi bir nechta katalog elementiga mos
kelishi; - miqdor yoki son noaniq eshitilishi/yozilishi; - o'lchov
birligi tushunarsiz yoki mos kelmasligi; - birlik narxi yo'q yoki bir
nechta talqinga ega bo'lishi; - narx katalogdagi narxdan **±25% dan
ko'proq** farq qilishi; - AI natijasi schema tekshiruvidan o'tmasligi
yoki ishonchlilik chegarasi yetarli bo'lmasligi.

±25% --- dastlabki ogohlantirish qoidasi; uni `docs/QARORLAR.md` orqali
konfiguratsiyalanadigan va keyinchalik foydalanuvchi intervyulari bilan
tekshiriladigan qaror sifatida qayd eting.

### Mahsulot nomzodlari

-   AI nomzodlarni taklif qilishi mumkin, lekin yakuniy mahsulot
    tanlovini savdogar tasdiqlaydi.
-   Nomzodlar orasida mos keladigan mahsulot bo'lmasa, yangi nomni
    qo'lda kiritishga ruxsat bering.
-   AI'ga ma'lumotlar bazasiga bevosita yozish huquqi bermang.
-   AI javobidagi narx hech qachon hisoblangan summa deb qabul
    qilinmasin.

### Sonlarni aniqlash

`parseUzNumber` kabi deterministik parser alohida yozilsin va
testlansin. Masalan: - `13 ming` → 13000 - `15 000` → 15000 - `9 ming` →
9000

Boshqa tilga, noaniq talaffuzga yoki qo'llab-quvvatlanmaydigan formatga
kelganda parser taxminni jim qabul qilmasin; ogohlantirish chiqarsin.

------------------------------------------------------------------------

## 6. Tasdiqlash va saqlash oqimi

### Saqlashdan oldingi shartlar

-   Barcha majburiy maydonlar validatsiyadan o'tgan.
-   Noaniq qatorlar foydalanuvchi tomonidan hal qilingan yoki aniq
    tasdiqlangan.
-   Savdogar yakuniy qatorlar, narxlar va jami summani ko'rib
    tasdiqlagan.
-   TypeScript va PostgreSQL hisoblari mos kelgan.
-   Foydalanuvchi tegishli do'kon/tenantga kirish huquqiga ega.

### Atomiklik va takroriy so'rov

-   Saqlash bir transaction yoki atomik RPC orqali bajarilsin.
-   `client_op_id` yoki unga teng idempotency kaliti orqali takroriy
    yuborishdan dublikat yozuvlar hosil bo'lishining oldi olinsin.
-   Server tasdiqlangan qatorlar va jami summani qayta tekshirsin.
-   Faqat frontenddan kelgan `total` qiymatiga ishonmang.
-   Muvaffaqiyatsiz transaction yarimta savdo yozuvini qoldirmasligi
    kerak.

### Ledger va tuzatishlar

-   Tasdiqlangan yozuvlarni tarixdan jimgina o'chirmang yoki
    o'zgartirmang.
-   Xatoni tuzatish uchun reversal yoki yangi tuzatish yozuvi
    qo'shilsin.
-   Kim, qachon va nima sababdan tuzatganini audit qilish mumkin
    bo'lsin.
-   Audit yozuvlarida ortiqcha shaxsiy ma'lumot saqlamang.

------------------------------------------------------------------------

## 7. Ma'lumotlar bazasi va xavfsizlik

### Dastlabki entity'lar

Yakuniy schema `docs/ARXITEKTURA.md` va `docs/QARORLAR.md` bilan
moslashtirilsin. Kamida quyidagi tushunchalar qamrab olinsin: -
foydalanuvchi/profil; - do'kon yoki biznes; - do'kon a'zoligi/rol; -
mahsulot katalogi; - mijoz; - savdo yozuvi; - savdo qatorlari; -
append-only ledger yoki tuzatish yozuvlari; - audit hodisalari.

Ushbu ro'yxat yakuniy schema allaqachon tasdiqlangan degani emas. Mavjud
hujjatlarni tekshirib, zarur maydonlar va munosabatlarni
hujjatlashtiring.

### RLS va maxfiylik

-   Har bir foydalanuvchi faqat o'zi a'zo bo'lgan do'kon ma'lumotlarini
    ko'rsin.
-   RLS siyosatlari uchun ijobiy va salbiy testlar yozilsin.
-   `service_role` kaliti frontendga hech qachon yuborilmasin.
-   AI provayder kaliti faqat server tomonda saqlansin.
-   `.env` va maxfiy fayllar `.gitignore` ichida bo'lsin.
-   `.env.example` faqat kalit nomlari va soxta namunalarni o'z ichiga
    olsin.
-   Loglarda tokenlar, parollar, maxfiy promptlar va ortiqcha mijoz
    ma'lumotlari bo'lmasin.
-   Auth usuli va rol modeli mavjud qarorlar hujjatida aniq bo'lmasa,
    implementatsiyadan oldin `docs/QARORLAR.md` ga ochiq savol sifatida
    yozilsin.

------------------------------------------------------------------------

## 8. Interfeys va UX

### Asosiy ekranlar

1.  **Kirish/ro'yxatdan o'tish** --- tanlangan auth usuliga mos.
2.  **Bosh sahifa** --- yangi spiska kiritish va oxirgi savdolar.
3.  **Spiska kiritish** --- matn kiritish; ovozli kiritish mavjud
    bo'lsa, alohida boshqaruv.
4.  **Tekshirish ekrani** --- mahsulot, miqdor, birlik, birlik narxi,
    qator summasi va jami.
5.  **Noaniqlikni hal qilish** --- sariq qatorlar, tushunarli savol va
    mahsulot nomzodlari.
6.  **Tasdiqlash** --- saqlashdan oldingi yakuniy ko'rinish.
7.  **Mijozlar va savdo tarixi** --- oldingi yozuvlarni ko'rish va
    qidirish.
8.  **Xato holatlari** --- internet uzilishi, AI javobi noto'g'ri
    bo'lishi, hisoblar mos kelmasligi va ruxsat yo'qligi.

### UX talablari

-   Interfeys telefon ekranida qulay va web'da responsive bo'lsin.
-   Sariq rang faqat hal qilinishi kerak bo'lgan noaniqlikni anglatadi;
    rang bilan birga matnli izoh yoki ikonka ham bo'lsin.
-   Saqlashdan oldin jami summa yaqqol ko'rinsin.
-   Xato xabari foydalanuvchiga keyingi qadamni tushuntirsin.
-   Loading, empty, success va error holatlari loyihalansin.
-   Ma'lumot kiritish yo'qolib ketmasligi uchun xatolikda draftni saqlab
    qolish imkoniyati ko'rib chiqilsin; ammo tasdiqlanmagan draft
    ledger'ga kiritilmasin.
-   Asosiy matn kiritish oqimi STT provayderi ishlamasa ham ishlashi
    shart.

------------------------------------------------------------------------

## 9. Ovozli kiritish

Ovozli kiritish mahsulot talabiga kiradi, lekin STT provayderi
hujjatlarda tasdiqlanmagan bo'lsa, uni o'zboshimchalik bilan tanlamang.

1.  `docs/QARORLAR.md` da STT provayderi, xarajat,
    qo'llab-quvvatlanadigan tillar va maxfiylik savollarini qayd eting.
2.  Provayder tanlanmaguncha text input to'liq ishlaydigan MVP yo'li
    bo'lsin.
3.  STT natijasi ham xom matn sifatida parsing pipeline'ga kiradi.
4.  Noto'g'ri tanilgan son yoki mahsulot sariq ogohlantirish bilan
    ko'rsatiladi.
5.  Ovoz transkriptini foydalanuvchi tasdiqlashidan oldin savdo yozuviga
    aylantirmang.
6.  Ovoz yozuvlarini zaruratsiz uzoq muddat saqlamang.

------------------------------------------------------------------------

## 10. MVP doirasiga kiradigan va kirmaydigan ishlar

### MVP doirasida

-   matndan spiska parsing qilish;
-   strukturali qatorlar va sariq noaniqliklar;
-   mahsulot nomini tanlash yoki qo'lda tuzatish;
-   tasdiqlashdan oldin qator va jami summani ko'rsatish;
-   TypeScript va PostgreSQL mustaqil hisob-kitoblari;
-   mismatch bo'lsa saqlashni bloklash;
-   tasdiqlangan savdolarni atomik saqlash;
-   mijozlar va savdo tarixi uchun minimal oqim;
-   RLS va asosiy xavfsizlik;
-   asosiy testlar;
-   responsive Expo web build va Vercel deploy qilishga tayyorlash;
-   ovozli kiritish uchun hujjatlashtirilgan integratsiya nuqtasi; STT
    qarori tayyor bo'lsa, shu qarorga muvofiq implementatsiya.

### Hozircha MVP'dan tashqarida

Quyidagilar alohida tasdiqlanmaguncha qo'shilmasin: - rasm/OCR orqali
spiska o'qish; - ombor va zaxira boshqaruvi; - Telegram/SMS
xabarnomalari; - Bluetooth printer integratsiyasi; - App Store/Play
Store release; - murakkab offline sync queue; - to'liq qarzdorlik/credit
moduli; - tasdiqlanmagan soliq, chegirma yoki valyuta konvertatsiyasi; -
MVP uchun zarur bo'lmagan murakkab analitika.

------------------------------------------------------------------------

## 11. Test strategiyasi

### `packages/core` testlari

-   `13 ming`, `15 000`, `9 ming` son parser testlari;
-   bo'sh string, noto'g'ri format, ortiqcha bo'shliq va vergul/nuqta
    holatlari;
-   miqdor nol yoki manfiy;
-   narx nol, manfiy yoki diapazondan tashqari;
-   kasrli miqdor va `qty_milli` konvertatsiyasi;
-   yaxlitlashning chegaraviy holatlari;
-   overflow va xavfsiz integer chegaralari;
-   bo'sh spiska;
-   bir qatorli va ko'p qatorli savdo;
-   yuqoridagi 385 000 so'mlik misol;
-   AI JSON schema buzilgan holatlar;
-   noaniq mahsulot va birlik;
-   narx ±25% ogohlantirishi.

### DB/integratsiya testlari

-   TypeScript va SQL hisoblari bir xil natija berishi;
-   qator summasi yoki jami mismatch bo'lsa save bloklanishi;
-   transaction muvaffaqiyatsiz bo'lsa qisman yozuv qolmasligi;
-   `client_op_id` takrorlansa dublikat savdo yaratilmasligi;
-   boshqa do'kon foydalanuvchisi ma'lumotni o'qiy/yoza olmasligi;
-   tasdiqlanmagan qatorlar ledger'ga kirmasligi;
-   tuzatishlar tarixni o'chirib yubormasligi.

Har bir o'zgarishdan keyin tegishli testlar ishga tushirilsin. Test
ishlamagan bo'lsa, muvaffaqiyatli deb da'vo qilmang.

------------------------------------------------------------------------

## 12. Deploy va muhitlar

-   Lokal, test va production muhitlari ajratilsin.
-   Vercel environment variables xavfsiz kiritilsin.
-   Supabase migration'lar versiyalanib, repozitoriyda saqlansin.
-   Deploydan oldin build va testlar muvaffaqiyatli o'tsin.
-   Production'da ishlatilayotgan DB schema migration holati bilan
    mosligi tekshirilsin.
-   Hech qachon haqiqiy API kalitlarini kodga yozmang yoki GitHub'ga
    push qilmang.
-   Deployni muvaffaqiyatli deb faqat real build/deploy natijasi buni
    tasdiqlagandan keyin ayting.

------------------------------------------------------------------------

## 13. Raqobatchilar va pozitsiyalash

Mavjud raqobatchilar hujjati asosida ehtiyotkor bo'ling. Ayrim
raqobatchilarda ovoz yoki OCR kabi imkoniyatlar borligi qayd etilgan;
shuning uchun **"birinchi"**, **"bozorda hech kimda yo'q"** kabi
isbotlanmagan da'volar ishlatilmasin.

Dastlabki pozitsiyalash: \> **Ulgurji savdogar spiskasiga moslashgan,
noaniq ma'lumotni tasdiqlatadigan va hisobni ikki mustaqil yo'l bilan
tekshiradigan tizim.**

Bu --- tekshirilishi kerak bo'lgan pozitsiyalash gipotezasi. To'lovga
tayyorlik va narx intervyular orqali tasdiqlanmaguncha isbotlangan bozor
fakti sifatida ko'rsatilmasin.

------------------------------------------------------------------------

## 14. Claude Code uchun ish tartibi

Claude Code quyidagi tartibga qat'iy rioya qilsin:

1.  Ishni boshlashdan oldin mavjud repozitoriyni, `README.md` va `docs/`
    ichidagi barcha tegishli hujjatlarni o'qisin.
2.  `docs/ARXITEKTURA.md`, `docs/QARORLAR.md`, `docs/MUAMMOLAR.md`,
    `docs/SUHBATLAR.md`, `docs/RAQIBLAR.md` va mavjud `TZ-MVP.md`
    o'rtasidagi ziddiyatlarni aniqlasin.
3.  Ziddiyatlarni jim hal qilmasin. `docs/QARORLAR.md` ga qaror, asos va
    ochiq savollarni yozsin; xavfsizlik yoki moliyaviy yaxlitlikka
    taalluqli noaniqlik bo'lsa, implementatsiyadan oldin to'xtab, savol
    bersin.
4.  Dastlab qisqa audit va bajarish rejasini chiqarsin.
5.  Kichik, tekshiriladigan bosqichlarda ishlasin. Keraksiz katta
    refactor qilmasin.
6.  Har bir o'zgarishda tegishli testlarni yozsin yoki yangilasin.
7.  `packages/core` hisoblash qoidalarini UI yoki AI prompt ichida
    takrorlamasin.
8.  AI'dan kelgan qiymatlarni validatsiyasiz ishlatmasin.
9.  Hisob mismatch bo'lsa, uni yashirmasin va saqlashni chetlab
    o'tmasin.
10. Hech qachon test, build, migration yoki deploy ishlamagan bo'lsa,
    ishladi deb aytmasin.
11. Maxfiy ma'lumotni terminal chiqishi, log yoki commit ichiga chiqarib
    yubormasin.
12. Har bir bosqich oxirida o'zgartirilgan fayllar, bajarilgan testlar,
    natijalar va qolgan xavflarni qisqa hisobot qilsin.

### Claude Code uchun boshlang'ich topshiriq

> Avval mavjud repozitoriy va `docs/` hujjatlarini o'qi. Hali kodni
> o'zgartirma. Hujjatlardagi talablar, arxitektura, qarorlar, muammolar
> va raqobatchilar haqidagi ma'lumotlarni taqqosla. Qarama-qarshiliklar,
> noma'lum qarorlar, xavfsizlik xatarlari va MVP scope'iga kirmaydigan
> ishlarni ro'yxatla. Keyin fayllar bo'yicha bosqichma-bosqich
> implementatsiya rejasini, test strategiyasini va birinchi
> bajariladigan vazifani taklif qil. Hech qanday faktni o'ylab topma.
> Hisob-kitoblar, tasdiqlash va saqlash xavfsizligiga taalluqli
> noaniqliklarni o'zingcha hal qilma.

------------------------------------------------------------------------

## 15. Ochiq qarorlar --- implementatsiyadan oldin tekshiriladi

Mavjud hujjatlarda javobi aniq bo'lmagan yoki hujjatlar o'rtasida farq
qilishi mumkin bo'lgan savollar: - Supabase tanlovi barcha hujjatlarda
yakuniy qaror sifatida bir xil ko'rsatilganmi? - Auth usuli,
foydalanuvchi rollari va do'konga a'zolik modeli qanday? - STT
provayderi, narxi va o'zbekcha nutq sifati bo'yicha qaror bormi? -
Mahsulot katalogi va narx tarixi qanday yuritiladi? - `qty_milli` barcha
mahsulot birliklariga mos keladimi yoki birliklar uchun qo'shimcha model
kerakmi? - Miqdor/narxning ruxsat etilgan maksimal chegaralari qanday? -
Mijozlar tarixi uchun telefon raqami majburiymi? - Backup/restore va
audit log retention talablari qanday? - RLS, transaction/RPC va Edge
Function mas'uliyati aniq ajratilganmi?

Bu savollarga javobni mavjud qarorlar hujjatlaridan qidiring. Javob
topilmasa, taxmin qilmang --- ochiq qaror sifatida belgilang.

------------------------------------------------------------------------

## 16. MVP qabul mezonlari (Definition of Done)

MVP tayyor deb faqat quyidagilar bajarilganda hisoblanadi:

-   [ ] Foydalanuvchi matndan spiska kirita oladi.
-   [ ] AI natijasi schema bo'yicha validatsiyadan o'tadi.
-   [ ] Noaniq qatorlar sariq ogohlantirish va tushunarli sabab bilan
    ko'rsatiladi.
-   [ ] Foydalanuvchi mahsulot, miqdor, birlik va narxni tuzata oladi.
-   [ ] Foydalanuvchi tasdiqlashdan oldin yakuniy summani ko'radi.
-   [ ] TypeScript va PostgreSQL hisoblari mustaqil bajariladi.
-   [ ] Hisoblar mos kelmasa, saqlash qat'iy bloklanadi.
-   [ ] Tasdiqlanmagan savdo ledger'ga yozilmaydi.
-   [ ] Saqlash atomik va idempotent.
-   [ ] RLS boshqa do'kon ma'lumotlarini himoya qiladi.
-   [ ] Pul hisoblari floating-point xatolaridan xoli.
-   [ ] Core va DB uchun testlar mavjud va muvaffaqiyatli ishlaydi.
-   [ ] Secrets Git'ga kirmagan.
-   [ ] Responsive web build muvaffaqiyatli.
-   [ ] Deploy natijasi haqiqiy tekshiruv bilan tasdiqlangan.
-   [ ] Ochiq qarorlar va ma'lum cheklovlar hujjatlashtirilgan.

------------------------------------------------------------------------

## 17. Yakuniy qoida

**Ishonchli hisob --- chiroyli interfeysdan muhimroq.** AI taxmin
qilishi mumkin, lekin tizim taxminni fakt sifatida saqlamasligi kerak.
Foydalanuvchi tasdiqlashi, ikki mustaqil hisob mos kelishi va xavfsiz
saqlash bajarilishi --- MVP'ning asosiy himoya qatlamlaridir.
