export interface Customer { id: string; name: string; phone: string; createdAt: string }
export interface SaleItem { id: string; name: string; qtyMilli: number; unit: string; unitPrice: number; total: number }
export interface Sale { id: string; draftId: string; createdAt: string; customerId: string | null; items: SaleItem[]; total: number }
export interface DB { version: 1; customers: Customer[]; sales: Sale[] }
/** Tahrirlash jadvalidagi qator (matn ko‘rinishida; hisob-kitob butun sonlarda bajariladi). */
export interface DraftRow { id: string; name: string; qty: string; unit: string; price: string }
