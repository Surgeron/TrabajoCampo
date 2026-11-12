import { NavLink, useNavigate } from "react-router-dom";
import { ROLES_INFO } from "../../../domain/constantes";
import { useSesion } from "../../../context/SesionContext";
import { useContadores } from "../../../hooks/useContadores";
import { navegacionDelRol } from "../../../routes/navegacion";
import Icon from "../../ui/Icon/Icon";
import "./Sidebar.css";

/**
 * Menú lateral.
 * Escritorio: completo. Tablet: riel de íconos. Celular: panel deslizable (abierto/onCerrar).
 */
export default function Sidebar({ abierto = false, onCerrar }) {
  const { usuario, rol, cambiarRol, cerrar } = useSesion();
  const contadores = useContadores();
  const navigate = useNavigate();
  const items = navegacionDelRol(rol);

  return (
    <>
      <div className={`sidebar__fondo ${abierto ? "sidebar__fondo--visible" : ""}`} onClick={onCerrar} aria-hidden="true" />
      <aside className={`sidebar ${abierto ? "sidebar--abierto" : ""}`} aria-label="Menú principal">
        <div className="sidebar__brand">
          <ChefHat className="sidebar__logo" />
          <strong>TrazaPlato</strong>
          <span className="sidebar__tagline">Las Vertientes S.R.L.</span>
          <button type="button" className="sidebar__cerrar" onClick={onCerrar} aria-label="Cerrar menú">
            <Icon nombre="cerrar" />
          </button>
        </div>

        <nav className="sidebar__nav" aria-label="Principal">
          {items.map((item) => {
            const cantidad = item.contador ? contadores[item.contador] : 0;
            return (
              <NavLink
                key={item.id}
                to={item.ruta}
                end={item.ruta === "/comandas"}
                className={({ isActive }) => (isActive ? "sidebar__link sidebar__link--active" : "sidebar__link")}
                onClick={onCerrar}
                title={item.etiqueta}
              >
                <span className="sidebar__icono">
                  <Icon nombre={item.icono} />
                  {cantidad > 0 && <span className="sidebar__punto" aria-hidden="true" />}
                </span>
                <span className="sidebar__texto">{item.etiqueta}</span>
                {cantidad > 0 && (
                  <span className="sidebar__contador" aria-label={`${cantidad} pendientes`}>
                    {cantidad}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {usuario && (
          <div className="sidebar__cuenta">
            <span className="sidebar__usuario">
              {usuario.nombre} {usuario.apellido}
            </span>
            {usuario.roles.length > 1 && (
              <div className="sidebar__roles" role="group" aria-label="Cambiar de rol">
                {usuario.roles.map((r) => (
                  <button
                    key={r}
                    type="button"
                    className={`sidebar__rol ${r === rol ? "sidebar__rol--activo" : ""}`}
                    onClick={() => {
                      cambiarRol(r);
                      onCerrar?.();
                      navigate(ROLES_INFO[r].inicio);
                    }}
                    aria-pressed={r === rol}
                  >
                    {ROLES_INFO[r].label}
                  </button>
                ))}
              </div>
            )}
            <button type="button" className="sidebar__link sidebar__salir" onClick={cerrar} title="Cerrar sesión">
              <span className="sidebar__icono">
                <Icon nombre="salir" />
              </span>
              <span className="sidebar__texto">Cerrar sesión</span>
            </button>
          </div>
        )}

        <ChefHat className="sidebar__mark" />
        <svg className="sidebar__wave" viewBox="0 0 240 80" aria-hidden="true">
          <path
            d="M-20 58 C30 74 55 16 120 28 C175 38 190 8 270 20"
            fill="none"
            stroke="#ff8d1f"
            strokeWidth="16"
            strokeLinecap="round"
          />
        </svg>
      </aside>
    </>
  );
}

export function ChefHat({ className }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <path
        fill="currentColor"
        d="M32 6c-5.2 0-9.6 3-11.6 7.3A12 12 0 0 0 8 24.2c0 2.6.9 5 2.4 6.9C11 40.6 16.2 48 24 48h16c7.8 0 13-7.4 13.6-16.9A10.2 10.2 0 0 0 56 24.2 12 12 0 0 0 43.6 13.3C41.6 9 37.2 6 32 6z"
      />
      <path fill="currentColor" d="M22 48h20v8a3 3 0 0 1-3 3H25a3 3 0 0 1-3-3v-8z" />
    </svg>
  );
}
