import { useMemo, useState, type FormEvent } from "react";
import { Phone, Plus, Users } from "lucide-react";
import { useStore } from "../store";
import { useToast, Empty, Modal } from "../components/ui";
import { formatSom } from "../lib/money";
import { fmtDate } from "../lib/format";
import type { Customer } from "../types";

export function CustomerForm({ onDone }: { onDone: (c: Customer) => void }) {
  const { addCustomer } = useStore();
  const toast = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setErr("Mijoz ismini kiriting (kamida 2 ta belgi).");
    setBusy(true);
    try {
      const c = await addCustomer(name, phone);
      toast("success", `“${c.name}” qo‘shildi`);
      onDone(c);
    } catch {
      setErr("Saqlab bo‘lmadi. Brauzer xotirasi to‘la yoki yopiq bo‘lishi mumkin.");
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="form">
      <label>Ism<input autoFocus value={name} onChange={(e) => { setName(e.target.value); setErr(""); }} placeholder="Masalan, Aziz Karimov" /></label>
      <label>Telefon (ixtiyoriy)<input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="+998 90 123 45 67" /></label>
      {err && <div className="alert error">{err}</div>}
      <button className="btn primary" disabled={busy}>Mijozni saqlash</button>
    </form>
  );
}

export default function Customers() {
  const { db } = useStore();
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(() => db.customers.map((c) => {
    const sales = db.sales.filter((s) => s.customerId === c.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { c, sales, sum: sales.reduce((a, s) => a + s.total, 0) };
  }).sort((a, b) => b.sum - a.sum), [db]);
  const open = rows.find((r) => r.c.id === openId);

  return (
    <>
      <header className="page-head">
        <div><h1>Mijozlar</h1><p>Mijozlar ro‘yxati va ularning savdo tarixi</p></div>
        <button className="btn primary" onClick={() => setAdding(true)}><Plus size={18} />Mijoz qo‘shish</button>
      </header>
      {rows.length === 0 ? (
        <div className="card"><Empty icon={<Users size={28} />} title="Hali mijozlar yo‘q" hint="Doimiy xaridorlaringizni qo‘shing va ularning xaridlarini kuzating."
          action={<button className="btn primary" onClick={() => setAdding(true)}>Birinchi mijozni qo‘shish</button>} /></div>
      ) : (
        <div className="list">
          {rows.map(({ c, sales, sum }) => (
            <button key={c.id} className="list-item" onClick={() => setOpenId(c.id)}>
              <span className="avatar">{c.name.charAt(0).toUpperCase()}</span>
              <span className="grow"><strong>{c.name}</strong><small>{c.phone || "Telefon kiritilmagan"}</small></span>
              <span className="right"><strong>{formatSom(sum)}</strong><small>{sales.length} ta savdo</small></span>
            </button>
          ))}
        </div>
      )}
      {adding && <Modal title="Yangi mijoz" onClose={() => setAdding(false)}><CustomerForm onDone={() => setAdding(false)} /></Modal>}
      {open && (
        <Modal title={open.c.name} onClose={() => setOpenId(null)}>
          {open.c.phone && <p className="muted"><Phone size={14} /> {open.c.phone}</p>}
          <div className="kv"><span>Jami xaridlar</span><strong>{formatSom(open.sum)}</strong></div>
          <h3>Savdo tarixi</h3>
          {open.sales.length === 0 ? <p className="muted">Bu mijoz hali xarid qilmagan.</p> : (
            <ul className="plain">
              {open.sales.map((s) => (
                <li key={s.id}><span>{fmtDate(s.createdAt)}<small>{s.items.map((i) => i.name).join(", ")}</small></span><strong>{formatSom(s.total)}</strong></li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </>
  );
}
