import { useRef, useState } from "react";
import { Calculator, Check, Plus, Trash2, UserPlus } from "lucide-react";
import { useStore } from "../store";
import { Modal, useToast } from "../components/ui";
import { CustomerForm } from "./Customers";
import { parseItems } from "../lib/parser";
import { formatSom, lineTotal, parseQty, parseSom } from "../lib/money";
import { uid } from "../lib/id";
import type { DraftRow, Sale, SaleItem } from "../types";

const EXAMPLE = "3 ta non 4000, 2 ta sut 12000";

export default function NewSale({ onSaved }: { onSaved: () => void }) {
  const { db, saveSale } = useStore();
  const toast = useToast();
  const [text, setText] = useState("");
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [draftId, setDraftId] = useState(uid);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [addCust, setAddCust] = useState(false);
  const lock = useRef(false);

  const calc = rows.map((r) => {
    const qty = parseQty(r.qty);
    const price = parseSom(r.price);
    const ok = r.name.trim() !== "" && qty !== null && qty > 0 && price > 0;
    return { r, qty, price, ok, total: ok ? lineTotal(qty!, price) : 0 };
  });
  const grand = calc.reduce((a, x) => a + x.total, 0);

  function parse() {
    const found = parseItems(text);
    if (found.length === 0) { setError(`Mahsulot topilmadi. Masalan: ${EXAMPLE}`); return; }
    setError(""); setRows(found);
  }
  const patch = (id: string, p: Partial<DraftRow>) => { setRows((x) => x.map((r) => (r.id === id ? { ...r, ...p } : r))); setError(""); };

  async function confirm() {
    if (lock.current) return; // ikki marta bosishdan himoya
    if (rows.length === 0) return setError("Avval mahsulotlarni kiriting va “Hisoblash” tugmasini bosing.");
    if (calc.some((x) => !x.ok)) return setError("Ba’zi qatorlar to‘liq emas: nom, miqdor (>0) va narx (>0) bo‘lishi kerak.");
    lock.current = true; setSaving(true);
    const items: SaleItem[] = calc.map((x) => ({ id: x.r.id, name: x.r.name.trim(), qtyMilli: x.qty!, unit: x.r.unit, unitPrice: x.price, total: x.total }));
    const sale: Sale = { id: uid(), draftId, createdAt: new Date().toISOString(), customerId: customerId || null, items, total: grand };
    try {
      const { duplicate } = await saveSale(sale);
      toast(duplicate ? "info" : "success", duplicate ? "Bu savdo allaqachon saqlangan" : "Savdo saqlandi");
      setText(""); setRows([]); setCustomerId(""); setDraftId(uid()); setError("");
      onSaved();
    } catch {
      setError("Savdoni saqlab bo‘lmadi. Brauzer xotirasi to‘la yoki yopiq bo‘lishi mumkin. Qayta urinib ko‘ring.");
    } finally { lock.current = false; setSaving(false); }
  }

  return (
    <>
      <header className="page-head"><div><h1>Yangi savdo</h1><p>Mahsulotlarni matn ko‘rinishida yozing — qolganini o‘zi ajratadi</p></div></header>
      <section className="card">
        <label className="field">Mahsulotlar
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder={EXAMPLE}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) parse(); }} />
        </label>
        <p className="hint">Format: <code>miqdor nom narx</code>. Narx — bitta dona/kg uchun. Mahsulotlarni vergul yoki yangi qator bilan ajrating.</p>
        <div className="row-actions">
          <button className="btn primary" onClick={parse} disabled={!text.trim()}><Calculator size={18} />Hisoblash</button>
          <button className="btn ghost" onClick={() => setText(EXAMPLE)}>Namuna</button>
        </div>
      </section>

      {rows.length > 0 && (
        <section className="card">
          <h2>Tekshiring va tahrirlang</h2>
          <div className="rows">
            {calc.map(({ r, ok, total }) => (
              <div key={r.id} className={`edit-row ${ok ? "" : "bad"}`}>
                <input aria-label="Mahsulot nomi" className="c-name" value={r.name} onChange={(e) => patch(r.id, { name: e.target.value })} placeholder="Nomi" />
                <input aria-label="Miqdor" className="c-qty" inputMode="decimal" value={r.qty} onChange={(e) => patch(r.id, { qty: e.target.value })} placeholder="Miqdor" />
                <select aria-label="Birlik" className="c-unit" value={r.unit} onChange={(e) => patch(r.id, { unit: e.target.value })}>
                  <option value="dona">dona</option><option value="kg">kg</option><option value="l">litr</option>
                </select>
                <input aria-label="Birlik narxi" className="c-price" inputMode="numeric" value={r.price} onChange={(e) => patch(r.id, { price: e.target.value.replace(/[^\d\s]/g, "") })} placeholder="Narx" />
                <output className="c-total">{formatSom(total)}</output>
                <button className="icon-btn danger" aria-label="Qatorni o‘chirish" onClick={() => setRows((x) => x.filter((y) => y.id !== r.id))}><Trash2 size={18} /></button>
              </div>
            ))}
          </div>
          <button className="btn ghost" onClick={() => setRows((x) => [...x, { id: uid(), name: "", qty: "1", unit: "dona", price: "" }])}><Plus size={18} />Qator qo‘shish</button>

          <div className="customer-pick">
            <label className="field">Mijoz (ixtiyoriy)
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Mijozsiz savdo</option>
                {db.customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` — ${c.phone}` : ""}</option>)}
              </select>
            </label>
            <button className="btn ghost" onClick={() => setAddCust(true)}><UserPlus size={18} />Yangi mijoz</button>
          </div>

          <div className="total-bar"><span>Umumiy summa</span><strong>{formatSom(grand)}</strong></div>
          {error && <div className="alert error" role="alert">{error}</div>}
          <button className="btn primary big" onClick={confirm} disabled={saving}><Check size={20} />{saving ? "Saqlanmoqda…" : "Savdoni tasdiqlash"}</button>
        </section>
      )}
      {rows.length === 0 && error && <div className="alert error" role="alert">{error}</div>}
      {addCust && <Modal title="Yangi mijoz" onClose={() => setAddCust(false)}><CustomerForm onDone={(c) => { setCustomerId(c.id); setAddCust(false); }} /></Modal>}
    </>
  );
}
