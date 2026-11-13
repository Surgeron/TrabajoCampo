import React from "react";

export default function KpiBar({ metricas }) {
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

  return (
    <section className="kpi-row">
      <div className="kpi-card" style={{ "--kpi-color": "var(--color-emerald)" }}>
        <div className="kpi-title">Avance de Campaña Zafra</div>
        <div className="kpi-value-row">
          <span className="kpi-value">{avancePct}%</span>
          <span className="kpi-sub">{cosechadas.toLocaleString()} / {totalToneladas.toLocaleString()} ton</span>
        </div>
        <div className="progress-bar-bg">
          <div className="progress-bar-fill" style={{ width: `${avancePct}%` }}></div>
        </div>
      </div>

      <div className="kpi-card" style={{ "--kpi-color": "var(--color-blue)" }}>
        <div className="kpi-title">Caña en Pie (Pendiente)</div>
        <div className="kpi-value-row">
          <span className="kpi-value">{toneladasPendientes.toLocaleString()} t</span>
          <span className="kpi-sub">en {pendientesCount} lotes</span>
        </div>
        <span className="kpi-sub">Disponibles para asignación</span>
      </div>

      <div className="kpi-card" style={{ "--kpi-color": "var(--color-red)" }}>
        <div className="kpi-title">Riesgo Inminente por Lluvia</div>
        <div className="kpi-value-row">
          <span className="kpi-value" style={{ color: "#f87171" }}>{toneladasEnRiesgo.toLocaleString()} t</span>
          <span className="kpi-sub">({lotesEnRiesgoCount} lotes en rojo)</span>
        </div>
        <span className="kpi-sub">{toneladasEnRiesgo > 0 ? "¡Atención! Peligro de anegamiento" : "Sin lotes críticos por lluvia"}</span>
      </div>

      <div className="kpi-card" style={{ "--kpi-color": "#8b5cf6" }}>
        <div className="kpi-title">Frentes Activos de Corte</div>
        <div className="kpi-value-row">
          <span className="kpi-value">{frentesActivos}</span>
          <span className="kpi-sub">Cuadrillas operando</span>
        </div>
        <span className="kpi-sub">Ritmo nominal: ~120 t/hora</span>
      </div>
    </section>
  );
}
