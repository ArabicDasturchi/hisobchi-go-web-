import { Banknote, Receipt, ShoppingCart, TrendingUp, Users } from "lucide-react";
import { useStore } from "../store";
import { Empty } from "../components/ui";
import { formatSom } from "../lib/money";
import { fmtDate, isToday } from "../lib/format";

export default function Dashboard({ goNew }: { goNew: () => void }) {
  const { db } = useStore();
  const today = db.sales.filter((s) => isToday(s.createdAt));
  const todaySum = today.reduce((a, s) => a + s.total, 0);
  const allSum = db.sales.reduce((a, s) => a + s.total, 0);
  const name = (id: string | null) => db.customers.find((c) => c.id === id)?.name ?? "Mijozsiz savdo";
  const top = db.customers
    .map((c) => ({ c, sum: db.sales.filter((s) => s.customerId === c.id).reduce((a, s) => a + s.total, 0) }))
    .filter((x) => x.sum > 0).sort((a, b) => b.sum - a.sum).slice(0, 5);
  const recent = [...today].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);

  const stats = [
    { icon: <Banknote size={20} />, label: "Bugungi tushum", value: formatSom(todaySum), tone: "green" },
    { icon: <Receipt size={20} />, label: "Bugungi savdolar", value: String(today.length), tone: "blue" },
    { icon: <TrendingUp size={20} />, label: "Jami tushum", value: formatSom(allSum), tone: "green" },
    { icon: <Users size={20} />, label: "Mijozlar", value: String(db.customers.length), tone: "blue" },
  ];
  return (
    <>
      <header className="page-head">
        <div><h1>Boshqaruv paneli</h1><p>Bugungi holat bir qarashda</p></div>
        <button className="btn primary" onClick={goNew}><ShoppingCart size={18} />Yangi savdo</button>
      </header>
      <div className="stats">
        {stats.map((s) => (
          <div key={s.label} className="card stat">
            <span className={`stat-icon ${s.tone}`}>{s.icon}</span>
            <small>{s.label}</small>
            <strong>{s.value}</strong>
          </div>
        ))}
      </div>
      <div className="grid-2">
        <section className="card">
          <h2>Bugungi savdolar</h2>
          {recent.length === 0 ? <Empty icon={<Receipt size={26} />} title="Bugun savdo yo‘q" hint="Yangi savdo saqlanganda shu yerda ko‘rinadi." /> : (
            <ul className="plain">{recent.map((s) => (
              <li key={s.id}><span>{name(s.customerId)}<small>{fmtDate(s.createdAt)}</small></span><strong>{formatSom(s.total)}</strong></li>
            ))}</ul>
          )}
        </section>
        <section className="card">
          <h2>Eng faol mijozlar</h2>
          {top.length === 0 ? <Empty icon={<Users size={26} />} title="Hali ma’lumot yo‘q" hint="Savdoga mijoz biriktirsangiz, reyting shu yerda chiqadi." /> : (
            <ul className="plain">{top.map(({ c, sum }) => (
              <li key={c.id}><span>{c.name}</span><strong>{formatSom(sum)}</strong></li>
            ))}</ul>
          )}
        </section>
      </div>
    </>
  );
}
