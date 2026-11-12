import { NavLink } from "react-router-dom";
import { useSesion } from "../../../context/SesionContext";
import { useContadores } from "../../../hooks/useContadores";
import { navegacionDelRol } from "../../../routes/navegacion";
import Icon from "../../ui/Icon/Icon";
import "./BottomNav.css";

/** Barra inferior del celular con las tareas más frecuentes del rol (máximo 4) y el menú. */
export default function BottomNav({ onAbrirMenu }) {
  const { rol } = useSesion();
  const contadores = useContadores();
  const items = navegacionDelRol(rol)
    .filter((i) => i.principal)
    .slice(0, 4);

  return (
    <nav className="barra-inferior no-imprimir" aria-label="Accesos rápidos">
      {items.map((item) => {
        const cantidad = item.contador ? contadores[item.contador] : 0;
        return (
          <NavLink
            key={item.id}
            to={item.ruta}
            end={item.ruta === "/comandas"}
            className={({ isActive }) => `barra-inferior__item ${isActive ? "barra-inferior__item--activo" : ""}`}
          >
            <span className="barra-inferior__icono">
              <Icon nombre={item.icono} />
              {cantidad > 0 && <span className="barra-inferior__contador">{cantidad}</span>}
            </span>
            <span className="barra-inferior__texto">{item.etiquetaCorta || item.etiqueta}</span>
          </NavLink>
        );
      })}
      <button type="button" className="barra-inferior__item" onClick={onAbrirMenu}>
        <span className="barra-inferior__icono">
          <Icon nombre="menu" />
        </span>
        <span className="barra-inferior__texto">Menú</span>
      </button>
    </nav>
  );
}
