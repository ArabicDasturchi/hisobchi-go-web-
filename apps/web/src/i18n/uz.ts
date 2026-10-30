/**
 * Interfeys matnlari (o'zbek, lotin). Ko'p tillilik uchun: shu shakldagi boshqa lug'at qo'shiladi
 * va `useT()` joriy tilni tanlaydi. Umumiy (bir necha sahifada takrorlanadigan) yorliqlar shu yerda.
 */
export const uz = {
  app: { name: 'Hisobchi Go', tagline: 'Savdo va qarz hisobi — oddiy va aniq' },
  nav: {
    dashboard: 'Bosh sahifa',
    sales: 'Savdolar',
    newSale: 'Yangi savdo',
    customers: 'Mijozlar',
    products: 'Mahsulotlar',
    payments: "To'lovlar",
    reports: 'Hisobotlar',
    settings: 'Sozlamalar',
    menu: 'Menyu',
    signOut: 'Chiqish',
  },
  units: {
    dona: 'dona',
    kg: 'kg',
    g: 'g',
    litr: 'litr',
    metr: 'metr',
    pachka: 'pachka',
    qop: 'qop',
    karobka: 'karobka',
    tonna: 'tonna',
  },
  methods: { naqd: 'Naqd', karta: 'Karta', otkazma: "O'tkazma" },
  roles: { owner: 'Egasi', admin: 'Administrator', member: 'Xodim' },
  status: { posted: 'Saqlangan', reversed: 'Bekor qilingan' },
  common: {
    save: 'Saqlash',
    cancel: 'Bekor qilish',
    close: 'Yopish',
    edit: 'Tahrirlash',
    delete: "O'chirish",
    search: 'Qidirish',
    retry: 'Qayta urinish',
    loading: 'Yuklanmoqda…',
    all: 'Hammasi',
    back: 'Orqaga',
    noCustomer: 'Mijozsiz',
    som: "so'm",
  },
} as const;

export type Messages = typeof uz;

const dictionaries = { uz } as const;
export type Locale = keyof typeof dictionaries;
export const DEFAULT_LOCALE: Locale = 'uz';

export function getMessages(locale: Locale = DEFAULT_LOCALE): Messages {
  return dictionaries[locale];
}

/** Hozircha bitta til; komponentlar shu orqali oladi — keyin kontekstga ulanadi */
export function useT(): Messages {
  return uz;
}
