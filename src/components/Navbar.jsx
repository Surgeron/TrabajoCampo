import React from "react";
import { GestorSesion } from "../services/gestores";
import { ROL_META } from "../domain/enums";
import "./Navbar.css";

export default function Navbar({
  usuario,
  vistaActual,
  paradaAbierta,
  onCambiarVista,
  onCerrarSesion,
  onResetDatasheets,
  onExportarDatasheets
}) {
  const vistasPermitidas = GestorSesion.obtenerVistasPermitidas(usuario);
  const rolInfo = ROL_META[usuario?.rol];

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-icon">🌱</div>
        <div className="brand-text">
          <h1>
            PluviaZafra <span className="badge-client">Ingenio La Esperanza</span>
          </h1>
          <p>Priorización de Cosecha por Vulnerabilidad a la Lluvia (Datasheets)</p>
        </div>
      </div>

      {/* NAVEGACIÓN BASADA EN ROLES (PoLP) */}
      <nav className="nav-role-group">
        <div className="role-subgroup">
          <span className="role-label">
            {rolInfo?.avatar || "👤"} Módulos:
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

      {/* BARRA DE SESIÓN Y ACCIONES */}
      <div className="user-session-bar">
        {paradaAbierta && (
          <button
            className="badge-status badge-urgent"
            style={{ cursor: "pointer", padding: "6px 10px" }}
            onClick={() => {
              if (GestorSesion.tienePermisoVista(usuario, "paradas")) {
                onCambiarVista("paradas");
              }
            }}
            title="Parada de fábrica abierta actualmente (CU13)"
          >
            🚨 PARADA ABIERTA ({paradaAbierta.id})
          </button>
        )}

        {usuario && (
          <div className="user-profile-badge">
            <span className="user-avatar-circle">{rolInfo?.avatar || "👤"}</span>
            <div className="user-meta">
              <span className="user-name">{usuario.nombre}</span>
              <span className="user-role-tag">{rolInfo?.nombre || usuario.rol}</span>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <button
            className="btn-action"
            style={{ minHeight: "34px", padding: "6px 10px", fontSize: "12px" }}
            onClick={onExportarDatasheets}
            title="Descargar respaldo JSON completo de los datasheets"
          >
            📦 JSON
          </button>

          <button
            className="btn-action"
            style={{ minHeight: "34px", padding: "6px 10px", fontSize: "12px" }}
            onClick={onResetDatasheets}
            title="Restablecer datasheets a los datos iniciales de ejemplo"
          >
            🔄 Reset
          </button>

          <button
            className="btn-action btn-logout"
            style={{ minHeight: "34px", padding: "6px 10px", fontSize: "12px" }}
            onClick={onCerrarSesion}
            title="Cerrar sesión"
          >
            🚪 Salir
          </button>
        </div>
      </div>
    </header>
  );
}
