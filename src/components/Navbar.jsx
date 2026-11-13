import React from "react";
import { GestorAutenticacion } from "../services/GestorAutenticacion";

export default function Navbar({
  usuario,
  vistaActual,
  onCambiarVista,
  onCerrarSesion,
  onResetDemo
}) {
  const vistasPermitidas = GestorAutenticacion.obtenerVistasPermitidas(usuario);

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-icon">🌱</div>
        <div className="brand-text">
          <h1>
            PluviaZafra <span className="badge-client">Ingenio La Esperanza</span>
          </h1>
          <p>Sistema DSS de Apoyo a la Priorización de Cosecha por Lluvia</p>
        </div>
      </div>

      {/* NAVEGACIÓN BASADA EN EL PRINCIPIO DE MÍNIMO PRIVILEGIO (PoLP) */}
      <nav className="nav-role-group">
        <div className="role-subgroup">
          <span className="role-label">
            {usuario?.avatar} Módulos autorizados:
          </span>
          {vistasPermitidas.map((v) => (
            <button
              key={v.id}
              className={`btn-nav ${vistaActual === v.id ? "active" : ""}`}
              onClick={() => onCambiarVista(v.id)}
              title={v.descripcion}
            >
              <span>{v.icono}</span> {v.titulo}
            </button>
          ))}
        </div>
      </nav>

      {/* INFORMACIÓN DEL USUARIO LOGUEADO Y ACCIONES DE SESIÓN */}
      <div className="user-session-bar">
        {usuario && (
          <div className="user-profile-badge">
            <span className="user-avatar-circle">{usuario.avatar}</span>
            <div className="user-meta">
              <span className="user-name">{usuario.nombre}</span>
              <span className="user-role-tag">{usuario.cargo || usuario.rol}</span>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            className="btn-action"
            style={{ minHeight: "34px", padding: "6px 12px", fontSize: "12px" }}
            onClick={onResetDemo}
            title="Restablecer datos de simulación"
          >
            🔄 Reset
          </button>

          <button
            className="btn-action btn-logout"
            style={{ minHeight: "34px", padding: "6px 12px", fontSize: "12px" }}
            onClick={onCerrarSesion}
            title="Cerrar sesión actual para probar otro perfil"
          >
            🚪 Salir
          </button>
        </div>
      </div>
    </header>
  );
}
