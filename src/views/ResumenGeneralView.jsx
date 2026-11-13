import React from "react";
import "./ResumenGeneralView.css";

export default function ResumenGeneralView({
  metricas,
  escenarioActual,
  configEscenarios,
  onCambiarVista,
  usuario
}) {
  const {
    avancePct,
    cosechadas,
    totalToneladas,
    toneladasPendientes,
    pendientesCount,
    toneladasEnRiesgo,
    lotesEnRiesgoCount,
    frentesActivos
  } = metricas;

  const cfg = configEscenarios[escenarioActual];

  return (
    <div className="resumen-page-container">
      {/* CABECERA INSTITUCIONAL */}
      <div className="resumen-header-box">
        <div>
          <div className="resumen-badge-client">
            <span>🏭</span> INGENIO LA ESPERANZA — ZAFRA 2026
          </div>
          <h1 className="resumen-title">
            Tablero General de Campaña & Vulnerabilidad Hídrica
          </h1>
          <p className="resumen-subtitle">
            Monitoreo ejecutivo de avance de zafra, caña en pie disponible y riesgo de anegamiento por lluvias.
          </p>
        </div>

        {/* CHIP DE ESTADO METEOROLÓGICO */}
        <div className="resumen-weather-chip">
          <div className="weather-chip-icon">🌧️</div>
          <div>
            <div className="weather-chip-title">Simulación Activa</div>
            <div className="weather-chip-val">{cfg.nombre} ({cfg.lluviaPrevistaMm} mm)</div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* LAS 4 CARDS DE KPIS MOSTRADAS EN TODA LA PANTALLA         */}
      {/* ======================================================== */}
      <div className="resumen-kpis-fullscreen-grid">
        {/* CARD 1: AVANCE DE CAMPAÑA ZAFRA */}
        <div className="kpi-hero-card" style={{ "--hero-color": "var(--color-emerald)" }}>
          <div className="kpi-hero-header">
            <span className="kpi-hero-title">AVANCE DE CAMPAÑA ZAFRA</span>
            <span className="kpi-hero-icon">🌱</span>
          </div>

          <div className="kpi-hero-value-row">
            <span className="kpi-hero-value">{avancePct}%</span>
            <span className="kpi-hero-sub">
              <b>{cosechadas.toLocaleString()}</b> / {totalToneladas.toLocaleString()} ton
            </span>
          </div>

          <div className="kpi-hero-progress-bg">
            <div className="kpi-hero-progress-fill" style={{ width: `${avancePct}%` }}></div>
          </div>

          <div className="kpi-hero-footnote">
            <span>✔ Ritmo de cosecha sostenido en canchón central</span>
          </div>
        </div>

        {/* CARD 2: CAÑA EN PIE (PENDIENTE) */}
        <div className="kpi-hero-card" style={{ "--hero-color": "var(--color-blue)" }}>
          <div className="kpi-hero-header">
            <span className="kpi-hero-title">CAÑA EN PIE (PENDIENTE)</span>
            <span className="kpi-hero-icon">🌾</span>
          </div>

          <div className="kpi-hero-value-row">
            <span className="kpi-hero-value">{toneladasPendientes.toLocaleString()} t</span>
            <span className="kpi-hero-sub">en <b>{pendientesCount}</b> lotes</span>
          </div>

          <div className="kpi-hero-footnote" style={{ marginTop: "16px" }}>
            <span>📋 Disponibles para asignación y corte programado</span>
          </div>
        </div>

        {/* CARD 3: RIESGO INMINENTE POR LLUVIA */}
        <div className="kpi-hero-card" style={{ "--hero-color": toneladasEnRiesgo > 0 ? "var(--color-red)" : "#64748b" }}>
          <div className="kpi-hero-header">
            <span className="kpi-hero-title">RIESGO INMINENTE POR LLUVIA</span>
            <span className="kpi-hero-icon">⚠️</span>
          </div>

          <div className="kpi-hero-value-row">
            <span className="kpi-hero-value" style={{ color: toneladasEnRiesgo > 0 ? "#f87171" : "#ffffff" }}>
              {toneladasEnRiesgo.toLocaleString()} t
            </span>
            <span className="kpi-hero-sub">({lotesEnRiesgoCount} lotes en rojo)</span>
          </div>

          <div className="kpi-hero-footnote" style={{ marginTop: "16px" }}>
            <span style={{ color: toneladasEnRiesgo > 0 ? "#fca5a5" : "#94a3b8" }}>
              {toneladasEnRiesgo > 0
                ? "🚨 ¡Peligro de corte de caminos de tierra por lluvia!"
                : "✔ Sin lotes críticos por lluvia en este escenario"}
            </span>
          </div>
        </div>

        {/* CARD 4: FRENTES ACTIVOS DE CORTE */}
        <div className="kpi-hero-card" style={{ "--hero-color": "#8b5cf6" }}>
          <div className="kpi-hero-header">
            <span className="kpi-hero-title">FRENTES ACTIVOS DE CORTE</span>
            <span className="kpi-hero-icon">🚜</span>
          </div>

          <div className="kpi-hero-value-row">
            <span className="kpi-hero-value">{frentesActivos}</span>
            <span className="kpi-hero-sub">Cuadrillas operando</span>
          </div>

          <div className="kpi-hero-footnote" style={{ marginTop: "16px" }}>
            <span>⚙️ Ritmo nominal: ~120 t/hora de molienda continua</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* BOTÓN PROMINENTE: IR AL MAPA Y ESTADÍSTICAS               */}
      {/* ======================================================== */}
      <div className="resumen-cta-container">
        <button
          className="btn-cta-mapa"
          onClick={() => onCambiarVista("centro-control")}
        >
          <span className="cta-icon">🗺️</span>
          <div className="cta-text">
            <span className="cta-main-title">Ir al Mapa y Estadísticas DSS</span>
            <span className="cta-sub-title">Explorá los cuadros en mapa satelital, semáforos de lluvia y ranking de cosecha</span>
          </div>
          <span className="cta-arrow">&rarr;</span>
        </button>

        {/* ACCESOS RÁPIDOS ADICIONALES POR ROL */}
        <div className="resumen-secondary-links">
          {usuario?.rol === "JEFE_COSECHA" && (
            <>
              <button
                className="btn-action"
                style={{ padding: "10px 18px", fontSize: "13px" }}
                onClick={() => onCambiarVista("catastro")}
              >
                <span>📋</span> Ver Catastro de Cuadros
              </button>
              <button
                className="btn-action"
                style={{ padding: "10px 18px", fontSize: "13px" }}
                onClick={() => onCambiarVista("auditoria")}
              >
                <span>🏭</span> Ver Auditoría de Paradas
              </button>
            </>
          )}

          {usuario?.rol === "AUDITOR_FABRICA" && (
            <button
              className="btn-action btn-primary"
              style={{ padding: "10px 18px", fontSize: "13px" }}
              onClick={() => onCambiarVista("auditoria")}
            >
              <span>🏭</span> Ver Auditoría de Paradas
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
