import React, { useState } from "react";
import { GestorParadasFabrica } from "../services/GestorParadasFabrica";
import "./AuditoriaParadasView.css";

export default function AuditoriaParadasView({ paradas, onRegistrarParada }) {
  const [modalNuevo, setModalNuevo] = useState(false);
  const [fincaAfectada, setFincaAfectada] = useState("Finca Miraflores");
  const [causa, setCausa] = useState("FALTA_CANA_LLUVIA");
  const [horas, setHoras] = useState(6.0);
  const [toneladas, setToneladas] = useState(3000);
  const [observaciones, setObservaciones] = useState("Lluvia cortó el camino vecinal; no ingresaron camiones al canchón.");

  const totales = GestorParadasFabrica.calcularTotales(paradas);

  const handleSubmit = (e) => {
    e.preventDefault();
    onRegistrarParada({
      fincaAfectada,
      causa,
      duracionHoras: Number(horas),
      toneladasNoMolidas: Number(toneladas),
      observaciones
    });
    setModalNuevo(false);
  };

  return (
    <div className="view-container" style={{ padding: "0 24px" }}>
      <div className="section-header-box">
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
            <span>🏭</span> Auditoría de Paradas de Fábrica (Impacto y Finanzas)
          </h2>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
            Métricas de horas de molienda perdidas por desabastecimiento de caña e incidentes climáticos en Zafra.
          </p>
        </div>

        <button className="btn-action btn-primary" onClick={() => setModalNuevo(true)}>
          <span>➕</span> Registrar Nueva Parada
        </button>
      </div>

      {/* METRIC CARDS RESUMEN */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "20px" }}>
        <div className="kpi-card" style={{ "--kpi-color": "var(--color-red)" }}>
          <div className="kpi-title">Horas Totales Detenidas</div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: "#f87171" }}>{totales.horasTotales} hs</span>
            <span className="kpi-sub">en {paradas.length} paradas</span>
          </div>
          <span className="kpi-sub">Causa dominante: Lluvias en accesos de tierra</span>
        </div>

        <div className="kpi-card" style={{ "--kpi-color": "var(--color-amber)" }}>
          <div className="kpi-title">Caña No Molida Acumulada</div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: "#fbbf24" }}>{totales.tonNoMolidas.toLocaleString()} t</span>
          </div>
          <span className="kpi-sub">Retraso en entrega de azúcar y bioetanol</span>
        </div>

        <div className="kpi-card" style={{ "--kpi-color": "#8b5cf6" }}>
          <div className="kpi-title">Costo Económico Parada</div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: "#a78bfa" }}>$ {(totales.costoTotalARS / 1000000).toFixed(1)} M ARS</span>
          </div>
          <span className="kpi-sub">Costos fijos en vacío y cuadrillas paradas</span>
        </div>
      </div>

      {/* TABLA HISTORIAL */}
      <div className="table-responsive-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Fecha</th>
              <th>Finca / Zona del Corte</th>
              <th>Duración</th>
              <th>Causa</th>
              <th>Caña No Molida</th>
              <th>Pérdida Estimada ($)</th>
              <th>Detalle del Incidente</th>
            </tr>
          </thead>
          <tbody>
            {paradas.map((p) => (
              <tr key={p.id}>
                <td><b style={{ fontFamily: "JetBrains Mono", color: "#38bdf8" }}>{p.id}</b></td>
                <td>{p.fecha}</td>
                <td><b>{p.fincaAfectada}</b></td>
                <td><span style={{ color: "#f87171", fontWeight: 700 }}>{p.duracionHoras} hs</span></td>
                <td>
                  <span className="badge-status badge-urgent">
                    {p.causa === "FALTA_CANA_LLUVIA" ? "Falta de Caña (Lluvia)" : p.causa}
                  </span>
                </td>
                <td><b>{p.toneladasNoMolidas.toLocaleString()} t</b></td>
                <td style={{ color: "#fbbf24", fontFamily: "JetBrains Mono", fontWeight: 700 }}>
                  $ {p.costoARS.toLocaleString()}
                </td>
                <td style={{ fontSize: "12px", color: "#cbd5e1" }}>{p.observaciones}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL NUEVA PARADA */}
      {modalNuevo && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ fontSize: "15px" }}>🏭 Registrar Parada de Trapiche</h3>
              <button 
                onClick={() => setModalNuevo(false)} 
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "18px", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Finca / Sector Afectado:</label>
                  <select className="form-control" value={fincaAfectada} onChange={(e) => setFincaAfectada(e.target.value)}>
                    <option value="Finca Miraflores">Finca Miraflores</option>
                    <option value="Finca El Puesto">Finca El Puesto</option>
                    <option value="Finca Central La Esperanza">Finca Central La Esperanza</option>
                    <option value="Finca Arrayanal">Finca Arrayanal</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Causa Principal:</label>
                  <select className="form-control" value={causa} onChange={(e) => setCausa(e.target.value)}>
                    <option value="FALTA_CANA_LLUVIA">Falta de caña por lluvias / anegamiento de accesos</option>
                    <option value="ROTURA_MECANICA">Falla mecánica en fábrica / trapiche</option>
                    <option value="CORTE_ENERGIA">Corte de energía de red</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Duración de la Parada (Horas):</label>
                  <input 
                    type="number" 
                    step="0.5" 
                    min="0.5" 
                    className="form-control" 
                    value={horas} 
                    onChange={(e) => setHoras(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Toneladas de Caña No Molidas:</label>
                  <input 
                    type="number" 
                    min="100" 
                    className="form-control" 
                    value={toneladas} 
                    onChange={(e) => setToneladas(e.target.value)} 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Observaciones:</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={observaciones} 
                    onChange={(e) => setObservaciones(e.target.value)} 
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-action" onClick={() => setModalNuevo(false)}>Cancelar</button>
                <button type="submit" className="btn-action btn-primary">Registrar Parada</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
