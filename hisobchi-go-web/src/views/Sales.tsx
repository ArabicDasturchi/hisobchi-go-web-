import { useState } from "react";
import { Receipt, ShoppingCart } from "lucide-react";
import { useStore } from "../store";
import { Empty, Modal } from "../components/ui";
import { formatQty, formatSom } from "../lib/money";
import { fmtDate } from "../lib/format";

export default function Sales({ goNew }: { goNew: () => void }) {
  const { db } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const sales = [...db.sales].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const name = (id: string | null) => db.customers.find((c) => c.id === id)?.name ?? "Mijozsiz savdo";
  const open = sales.find((s) => s.id === openId);

  return (
    <>
      <header className="page-head"><div><h1>Savdolar tarixi</h1><p>Barcha saqlangan savdolar</p></div></header>
      {sales.length === 0 ? (
        <div className="card"><Empty icon={<Receipt size={28} />} title="Hali savdo saqlanmagan" hint="Birinchi savdoni kiriting — u shu yerda ko‘rinadi."
          action={<button className="btn primary" onClick={goNew}><ShoppingCart size={18} />Yangi savdo</button>} /></div>
      ) : (
        <div className="list">
          {sales.map((s) => (
            <button key={s.id} className="list-item" onClick={() => setOpenId(s.id)}>
              <span className="grow"><strong>{name(s.customerId)}</strong><small>{fmtDate(s.createdAt)} · {s.items.length} ta mahsulot</small></span>
              <strong className="money">{formatSom(s.total)}</strong>
            </button>
          ))}
        </div>
      )}
      {open && (
        <Modal title="Savdo tafsilotlari" onClose={() => setOpenId(null)}>
          <div className="kv"><span>Mijoz</span><strong>{name(open.customerId)}</strong></div>
          <div className="kv"><span>Sana</span><strong>{fmtDate(open.createdAt)}</strong></div>
          <div className="scroll-x">
            <table className="table">
              <thead><tr><th>Mahsulot</th><th>Miqdor</th><th>Narx</th><th>Jami</th></tr></thead>
              <tbody>
                {open.items.map((i) => (
                  <tr key={i.id}><td>{i.name}</td><td>{formatQty(i.qtyMilli)} {i.unit}</td><td>{formatSom(i.unitPrice)}</td><td>{formatSom(i.total)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="total-bar"><span>Umumiy summa</span><strong>{formatSom(open.total)}</strong></div>
        </Modal>
      )}
    </>
  );
}
