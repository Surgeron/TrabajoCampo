import Header from "../Header/Header";
import Sidebar from "../Sidebar/Sidebar";
import "./MainLayout.css";

export default function MainLayout({ title = "Comandas", children }) {
  return (
    <div className="layout">
      <Sidebar />
      <div className="layout__body">
        <Header title={title} />
        <main className="layout__main">{children}</main>
      </div>
    </div>
  );
}
