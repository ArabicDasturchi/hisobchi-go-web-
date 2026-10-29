# Hisobchi Go — telefonda sinash yo'riqnomasi

Ilova: `apps/mobile` (Expo SDK 58, React Native 0.88, Expo Router, expo-sqlite).

## 1-yo'l: Expo Go (eng tez, QR-kod)

Expo Go'da ishlaydi: kiritish, tahlil, tekshirish, tasdiqlash, ikki mustaqil hisob,
SQLite'ga saqlash, mijozlar, tarix.
Expo Go'da **ishlamaydi**: ilova ichidagi ovozli kiritish (`expo-speech-recognition`
native modul). Bu holda ovoz tugmasi yashiriladi va klaviaturadagi mikrofon taklif qilinadi.

1. Telefonga Google Play'dan **Expo Go** o'rnating. U SDK 58 ni qo'llashi kerak
   (Expo Go → Settings/Profile'da qo'llab-quvvatlanadigan SDK ko'rsatiladi).
2. Kompyuter va telefon **bir xil Wi‑Fi** tarmog'ida bo'lsin.
3. Kompyuterda:

   ```bash
   cd C:\Users\humoy\Desktop\hisobchi-go
   npm install
   cd apps/mobile
   npx expo start
   ```

4. Expo Go ilovasida **Scan QR code** → terminaldagi QR kodni skanerlang.

### QR kod ochilmasa (ulanish xatosi)

Kompyuterda bir nechta tarmoq adapteri bor (masalan VirtualBox `192.168.56.1`).
Expo QR kodga noto'g'ri IP qo'yishi mumkin. Wi‑Fi IP manzilini `ipconfig` bilan
aniqlab, majburan bering (PowerShell):

```powershell
$env:REACT_NATIVE_PACKAGER_HOSTNAME = "<Wi-Fi IPv4 manzili>"
npx expo start
```

Yoki tunnel orqali (internet kerak, sekinroq):

```bash
npx expo start --tunnel
```

Windows Firewall Node.js uchun "Private networks" ruxsatini so'rasa — ruxsat bering.

## 2-yo'l: Android development build (ovozli kiritish bilan)

Kerak bo'ladi:
- **Android Studio** (Android SDK, Platform-Tools/`adb`, SDK Platform 35+, Build-Tools)
- **JDK 17** (Android Studio bilan birga keladi)
- Muhit o'zgaruvchilari: `ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk`,
  `PATH` ga `%ANDROID_HOME%\platform-tools` qo'shilgan bo'lsin
- Telefonda: **Developer options → USB debugging** yoqilgan, USB orqali ulangan

Tekshirish va o'rnatish:

```bash
adb devices                 # telefon "device" holatida ko'rinishi kerak
cd apps/mobile
npx expo run:android        # android/ papkani yaratadi, build qiladi va telefonga o'rnatadi
```

`android/` papka avtomatik yaratiladi va `.gitignore` da — qo'lda tahrirlamang.

Muqobil (lokal SDK'siz, Expo hisobi kerak): `npx eas-cli@latest build --profile development --platform android`
(avval `eas.json` sozlanishi kerak — hozir loyihada yo'q).

## Sinov ssenariysi (qo'lda)

1. Bosh ekran → **Yangi hisob** → **Namunani qo'yish** → **Tahlil qilish**.
2. Tekshirish ekranida 3 qator, sariq qator yo'q; taxminiy jami **111 000 so'm**.
3. Narxni o'chirib ko'ring → qator sariq bo'ladi, **Tasdiqlashga o'tish** o'chadi.
4. `chirmoq 10 ta 13 ming, yurak 5 ta 15 ming, momiq 20 ta 9 ming` → jami **385 000 so'm**.
5. Tasdiqlash: "TypeScript va SQLite hisoblari mos keldi" yozuvi, mijoz tanlash/yaratish,
   belgilash katakchasi → **Savdoni saqlash**.
6. Savdo tafsiloti ochiladi; **Tarix** va **Mijozlar** ekranlarida summa ko'rinadi.
7. Ilovani yopib qayta oching — ma'lumotlar saqlanib qolgan bo'lishi kerak.
8. (Dev build) **Ovoz bilan** → mikrofon ruxsati → ro'yxatni ayting.
