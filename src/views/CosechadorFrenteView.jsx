import React from "react";
import "./CosechadorFrenteView.css";

export default function CosechadorFrenteView({ lotes, onMarcarCosechado, onActualizarAvance }) {
  // Lote en corte activo
  const loteActivo = lotes.find(l => l.estado === "EN_COSECHA") || lotes.find(l => l.id === "MF-11");

  return (
    <div className="view-container" style={{ padding: "0 24px", maxWidth: "800px", margin: "0 auto" }}>
      <div className="section-header-box" style={{ flexDirection: "column", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "28px" }}>🚜</span>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 800 }}>Modo Campo — Cuadrilla de Cosecha</h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              Frente N° 1 | Operador: Cosechadora John Deere CH570
            </p>
          </div>
        </div>
      </div>

      {loteActivo ? (
        <div className="field-card">
          <div className="field-card-header">
            <div>
              <span className="badge-status badge-active" style={{ fontSize: "12px" }}>EN COSECHA ACTIVA</span>
              <h1 style={{ fontSize: "28px", fontWeight: 900, fontFamily: "JetBrains Mono", marginTop: "4px" }}>
                {loteActivo.codigo}
              </h1>
              <p style={{ fontSize: "14px", color: "#94a3b8" }}>{loteActivo.finca}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase" }}>Caña a Cortar</div>
              <div style={{ fontSize: "24px", fontWeight: 800, color: "#38bdf8", fontFamily: "JetBrains Mono" }}>
                {loteActivo.toneladas} t
              </div>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>{loteActivo.has} hectáreas</div>
            </div>
          </div>

          {/* INDICADOR DE CAMINO DE SALIDA */}
          <div style={{ 
            background: loteActivo.camino.includes("tierra") ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
            border: `1px solid ${loteActivo.camino.includes("tierra") ? "#ef4444" : "#10b981"}`,
            borderRadius: "10px",
            padding: "14px",
            margin: "16px 0",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}>
            <span style={{ fontSize: "24px" }}>{loteActivo.camino.includes("tierra") ? "⚠️" : "🛣️"}</span>
            <div>
              <b style={{ color: "#ffffff", fontSize: "14px" }}>Camino de Salida: {loteActivo.camino}</b>
              <p style={{ fontSize: "12.5px", color: "#cbd5e1", marginTop: "2px" }}>
                {loteActivo.camino.includes("tierra") 
                  ? "Atención: Si comienza a llover, suspender carga de camiones para evitar atascos."
                  : "Acceso habilitado para camiones pesados aun con precipitaciones moderadas."}
              </p>
            </div>
          </div>

          {/* AVANCE DE CORTE */}
          <div style={{ margin: "20px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#cbd5e1" }}>Progreso de Corte del Cuadro:</span>
              <b style={{ fontSize: "16px", color: "#38bdf8", fontFamily: "JetBrains Mono" }}>{loteActivo.avancePct || 65}%</b>
            </div>
            <div className="progress-bar-bg" style={{ height: "12px" }}>
              <div className="progress-bar-fill" style={{ width: `${loteActivo.avancePct || 65}%` }}></div>
            </div>
          </div>

          {/* BOTONES TÁCTILES GRANDES */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "20px" }}>
            <button 
              className="btn-action" 
              style={{ padding: "16px", fontSize: "14px", justifyContent: "center", minHeight: "52px" }}
              onClick={() => alert("Camión solicitado. Despacho central notificado para arribo en 20 min.")}
            >
              🚛 Pedir Camión Vacío
            </button>
            <button 
              className="btn-action btn-primary" 
              style={{ padding: "16px", fontSize: "14px", justifyContent: "center", minHeight: "52px" }}
              onClick={() => onMarcarCosechado(loteActivo.id)}
            >
              ✔️ Finalizar Corte de Lote
            </button>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "40px", background: "#1e293b", borderRadius: "12px" }}>
          <p style={{ color: "#94a3b8" }}>No hay frentes asignados en este momento. El Jefe de Cosecha debe asignar un lote desde el Centro de Control.</p>
        </div>
      )}
    </div>
  );
}
