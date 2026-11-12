import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ROLES_INFO } from "../../../domain/constantes";
import { useSesion } from "../../../context/SesionContext";
import { fechaISO, formatFechaLarga } from "../../../utils/fechas";
import Icon from "../../ui/Icon/Icon";
import "./Header.css";

export default function Header({ title = "TrazaPlato" }) {
  const { usuario, rol, sucursal, requiereSucursal, cambiarRol, cerrar } = useSesion();
  const navigate = useNavigate();
  const [menuCuenta, setMenuCuenta] = useState(false);
  const contenedor = useRef(null);
  const fecha = new Date();
  const puedeCambiarSucursal = requiereSucursal && !usuario?.idSucursalTrabajo;

  useEffect(() => {
    if (!menuCuenta) return undefined;
    const alClic = (e) => {
      if (!contenedor.current?.contains(e.target)) setMenuCuenta(false);
    };
    const alTecla = (e) => e.key === "Escape" && setMenuCuenta(false);
    document.addEventListener("mousedown", alClic);
    document.addEventListener("keydown", alTecla);
    return () => {
      document.removeEventListener("mousedown", alClic);
      document.removeEventListener("keydown", alTecla);
    };
  }, [menuCuenta]);

  const elegirRol = (nuevo) => {
    setMenuCuenta(false);
    cambiarRol(nuevo);
    navigate(ROLES_INFO[nuevo].inicio);
  };

  return (
    <header className="topbar">
      <h1 className="topbar__title">{title}</h1>
      <div className="topbar__actions">
        {sucursal && (
          <button
            type="button"
            className="topbar__sucursal"
            onClick={() => puedeCambiarSucursal && navigate("/sucursal")}
            disabled={!puedeCambiarSucursal}
            title={puedeCambiarSucursal ? "Cambiar de sucursal" : "Sucursal asignada"}
          >
            <Icon nombre="sucursal" tamano={18} />
            <span>{sucursal.nombre}</span>
          </button>
        )}
        <div className="topbar__date">
          <span className="topbar__calendar" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <rect x="3.5" y="5" width="17" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M3.5 10h17M8 3.5v3M16 3.5v3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <time dateTime={fechaISO(fecha)}>{formatFechaLarga(fecha)}</time>
        </div>
        <div className="topbar__cuenta" ref={contenedor}>
          <button
            type="button"
            className="topbar__user"
            aria-label="Cuenta"
            aria-expanded={menuCuenta}
            onClick={() => setMenuCuenta((v) => !v)}
          >
            <span className="topbar__iniciales">
              {usuario ? `${usuario.nombre[0]}${usuario.apellido[0]}` : <Icon nombre="usuario" />}
            </span>
          </button>
          {menuCuenta && usuario && (
            <div className="topbar__desplegable" role="menu">
              <div className="topbar__persona">
                <strong>
                  {usuario.nombre} {usuario.apellido}
                </strong>
                <span>
                  {ROLES_INFO[rol]?.label}
                  {sucursal ? ` · ${sucursal.nombre}` : ""}
                </span>
              </div>
              {usuario.roles.length > 1 && (
                <div className="topbar__grupo">
                  <span className="topbar__grupo-titulo">Trabajar como</span>
                  {usuario.roles.map((r) => (
                    <button
                      key={r}
                      type="button"
                      role="menuitemradio"
                      aria-checked={r === rol}
                      className={`topbar__opcion ${r === rol ? "topbar__opcion--activa" : ""}`}
                      onClick={() => elegirRol(r)}
                    >
                      <Icon nombre={r === rol ? "check" : "cambiar"} tamano={18} />
                      {ROLES_INFO[r].label}
                    </button>
                  ))}
                </div>
              )}
              {puedeCambiarSucursal && (
                <button
                  type="button"
                  role="menuitem"
                  className="topbar__opcion"
                  onClick={() => {
                    setMenuCuenta(false);
                    navigate("/sucursal");
                  }}
                >
                  <Icon nombre="sucursal" tamano={18} />
                  Cambiar de sucursal
                </button>
              )}
              <button type="button" role="menuitem" className="topbar__opcion topbar__opcion--salir" onClick={cerrar}>
                <Icon nombre="salir" tamano={18} />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
