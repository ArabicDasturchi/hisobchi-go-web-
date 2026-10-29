import { useEffect, useState } from "react";
import { LayoutDashboard, Receipt, ShoppingCart, TriangleAlert, Users } from "lucide-react";
import { useStore } from "./store";
import { Spinner, ToastProvider } from "./components/ui";
import Dashboard from "./views/Dashboard";
import NewSale from "./views/NewSale";
import Sales from "./views/Sales";
import Customers from "./views/Customers";

type View = "dashboard" | "new" | "sales" | "customers";
const NAV: { id: View; label: string; icon: typeof Receipt }[] = [
  { id: "dashboard", label: "Panel", icon: LayoutDashboard },
  { id: "new", label: "Yangi savdo", icon: ShoppingCart },
  { id: "sales", label: "Savdolar", icon: Receipt },
  { id: "customers", label: "Mijozlar", icon: Users },
];
const fromHash = (): View => {
  const h = window.location.hash.replace("#", "") as View;
  return NAV.some((n) => n.id === h) ? h : "dashboard";
};

function Shell() {
  const { status, error, reload, resetAll } = useStore();
  const [view, setView] = useState<View>(fromHash);
  useEffect(() => {
    const h = () => setView(fromHash());
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  const go = (v: View) => { window.location.hash = v; setView(v); window.scrollTo(0, 0); };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><span className="logo">H</span><span>Hisobchi Go</span></div>
        <nav>
          {NAV.map(({ id, label, icon: I }) => (
            <button key={id} className={view === id ? "active" : ""} onClick={() => go(id)} aria-current={view === id ? "page" : undefined}><I size={20} /><span>{label}</span></button>
          ))}
        </nav>
        <p className="side-note">Ma’lumotlar faqat shu brauzerda saqlanadi. Mobil ilova bilan sinxronlanmaydi.</p>
      </aside>
      <main>
        {status === "loading" && <Spinner />}
        {status === "error" && (
          <div className="card center-msg col">
            <TriangleAlert size={28} color="var(--danger)" />
            <strong>Ma’lumotlarni o‘qib bo‘lmadi</strong>
            <p className="muted">{error}</p>
            <div className="row-actions">
              <button className="btn primary" onClick={reload}>Qayta urinish</button>
              <button className="btn ghost danger" onClick={() => { if (confirm("Brauzerdagi barcha Hisobchi Go ma’lumotlari o‘chiriladi. Davom etasizmi?")) resetAll(); }}>Ma’lumotlarni tozalash</button>
            </div>
          </div>
        )}
        {status === "ready" && (
          <>
            {view === "dashboard" && <Dashboard goNew={() => go("new")} />}
            {view === "new" && <NewSale onSaved={() => go("sales")} />}
            {view === "sales" && <Sales goNew={() => go("new")} />}
            {view === "customers" && <Customers />}
          </>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return <ToastProvider><Shell /></ToastProvider>;
}
