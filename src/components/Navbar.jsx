import React from "react";

export default function Navbar({ vistaActual, onCambiarVista, onResetDemo }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-icon">🌱</div>
        <div className="brand-text">
          <h1>PluviaZafra <span className="badge-client">Ingenio La Esperanza</span></h1>
          <p>Sistema DSS de Apoyo a la Priorización de Cosecha por Lluvia</p>
        </div>
      </div>

      {/* NAVEGACIÓN SEPARADA POR ROL / RESPONSABILIDAD */}
      <nav className="nav-role-group">
        <div className="role-subgroup">
          <span className="role-label">👨‍💼 Jefe de Cosecha:</span>
          <button
            className={`btn-nav ${vistaActual === "centro-control" ? "active" : ""}`}
            onClick={() => onCambiarVista("centro-control")}
          >
            🗺️ Control GIS
          </button>
          <button
            className={`btn-nav ${vistaActual === "catastro" ? "active" : ""}`}
            onClick={() => onCambiarVista("catastro")}
          >
            📋 Catastro Lotes
          </button>
          <button
            className={`btn-nav ${vistaActual === "auditoria" ? "active" : ""}`}
            onClick={() => onCambiarVista("auditoria")}
          >
            🏭 Auditoría Paradas
          </button>
        </div>

        <div className="role-subgroup">
          <span className="role-label">🚜 Cosechador (Campo):</span>
          <button
            className={`btn-nav ${vistaActual === "frente" ? "active" : ""}`}
            onClick={() => onCambiarVista("frente")}
          >
            🚜 Mi Frente
          </button>
          <button
            className={`btn-nav ${vistaActual === "pluviometro" ? "active" : ""}`}
            onClick={() => onCambiarVista("pluviometro")}
          >
            🌧️ Pluviómetro
          </button>
        </div>

        <button className="btn-action" style={{ minHeight: "34px", padding: "6px 12px" }} onClick={onResetDemo}>
          🔄 Reset
        </button>
      </nav>
    </header>
  );
}
