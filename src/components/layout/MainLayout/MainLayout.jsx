import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import BottomNav from "../BottomNav/BottomNav";
import Header from "../Header/Header";
import Sidebar from "../Sidebar/Sidebar";
import "./MainLayout.css";

export default function MainLayout({ title = "Comandas", children }) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const location = useLocation();

  // Al cambiar de pantalla se cierra el menú del celular y se vuelve arriba.
  useEffect(() => {
    setMenuAbierto(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="layout">
      <Sidebar abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} />
      <div className="layout__body">
        <Header title={title} />
        <main className="layout__main">{children}</main>
      </div>
      <BottomNav onAbrirMenu={() => setMenuAbierto(true)} />
    </div>
  );
}
