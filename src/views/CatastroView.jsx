import React, { useState } from "react";
import { GestorCatastro } from "../services/GestorCatastro";

export default function CatastroView({ lotes, onActualizarLote }) {
  const [loteEditando, setLoteEditando] = useState(null);
  const [nuevoCamino, setNuevoCamino] = useState("");
  const [nuevoDrenaje, setNuevoDrenaje] = useState("");
  const [nuevoSuelo, setNuevoSuelo] = useState("");
  const [filtroFinca, setFiltroFinca] = useState("TODAS");

  const iniciarEdicion = (lote) => {
    setLoteEditando(lote);
    setNuevoCamino(lote.camino);
    setNuevoDrenaje(lote.drenaje);
    setNuevoSuelo(lote.suelo);
  };

  const guardarCambios = () => {
    if (!loteEditando) return;
    onActualizarLote(loteEditando.id, {
      camino: nuevoCamino,
      drenaje: nuevoDrenaje,
      suelo: nuevoSuelo
    });
    setLoteEditando(null);
  };

  const lotesFiltrados = filtroFinca === "TODAS" 
    ? lotes 
    : lotes.filter(l => l.finca.includes(filtroFinca));

  return (
    <div className="view-container" style={{ padding: "0 24px" }}>
      <div className="section-header-box">
        <div>
          <h2 style="font-size:18px; font-weight:800; display:flex; align-items:center; gap:8px;">
            <span>📋</span> Catastro Cañero — Gestión de Cuadros y Accesos
          </h2>
          <p style="font-size:13px; color:var(--text-muted); margin-top:2px;">
            Administración de características edáficas y caminos de salida para cada lote de Ingenio La Esperanza.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <label style={{ fontSize: "12.5px", color: "#94a3b8", fontWeight: 600 }}>Filtrar por Finca:</label>
          <select 
            className="form-control" 
            style={{ width: "auto" }} 
            value={filtroFinca} 
            onChange={(e) => setFiltroFinca(e.target.value)}
          >
            <option value="TODAS">Todas las fincas ({lotes.length})</option>
            <option value="Esperanza">Finca Central La Esperanza</option>
            <option value="Miraflores">Finca Miraflores</option>
            <option value="Puesto">Finca El Puesto</option>
            <option value="Arrayanal">Finca Arrayanal</option>
          </select>
        </div>
      </div>

      {/* TABLA DE CATASTRO */}
      <div className="table-responsive-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Código Lote</th>
              <th>Finca / Zona</th>
              <th>Superficie</th>
              <th>Caña Estimada</th>
              <th>Tipo de Suelo</th>
              <th>Drenaje</th>
              <th>Camino de Acceso</th>
              <th>IVL Estático</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {lotesFiltrados.map((lote) => (
              <tr key={lote.id}>
                <td>
                  <b style={{ fontFamily: "JetBrains Mono", color: "#38bdf8" }}>{lote.codigo}</b>
                </td>
                <td>{lote.finca}</td>
                <td>{lote.has} ha</td>
                <td><b>{lote.toneladas.toLocaleString()} t</b></td>
                <td>{lote.suelo}</td>
                <td>{lote.drenaje}</td>
                <td>
                  <span style={{ 
                    fontSize: "12px", 
                    color: lote.camino.includes("tierra") ? "#f87171" : "#34d399",
                    fontWeight: 600
                  }}>
                    {lote.camino}
                  </span>
                </td>
                <td>
                  <span className={`ivl-pill ${lote.ivlEstatico >= 4.0 ? 'ivl-high' : lote.ivlEstatico >= 2.5 ? 'ivl-mid' : 'ivl-low'}`}>
                    {lote.ivlEstatico} / 5.0
                  </span>
                </td>
                <td>
                  <span className={`badge-status ${
                    lote.estado === 'COSECHADO' ? 'badge-harvested' :
                    lote.estado === 'EN_COSECHA' ? 'badge-active' : 'badge-safe'
                  }`}>
                    {lote.estado}
                  </span>
                </td>
                <td>
                  <button 
                    className="btn-action" 
                    style={{ fontSize: "11.5px", padding: "5px 10px", minHeight: "30px" }}
                    onClick={() => iniciarEdicion(lote)}
                  >
                    ✏️ Editar Accesos
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL EDICIÓN RÁPIDA DE CONDICIONES */}
      {loteEditando && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ fontSize: "15px" }}>✏️ Modificar Condiciones: Lote {loteEditando.codigo}</h3>
              <button 
                onClick={() => setLoteEditando(null)} 
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "18px", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "12.5px", color: "#94a3b8" }}>
                Actualizá el tipo de camino o drenaje si la cuadrilla realizó enripiado o si se detectó erosión por lluvias.
              </p>

              <div className="form-group">
                <label>Camino de Salida a Ruta:</label>
                <select className="form-control" value={nuevoCamino} onChange={(e) => setNuevoCamino(e.target.value)}>
                  <option value="Callejón de tierra virgen">Callejón de tierra virgen (Sin ripio - Muy vulnerable)</option>
                  <option value="Callejón de tierra mejorado">Callejón de tierra mejorado (Soporta lluvia ligera)</option>
                  <option value="Tierra virgen (2 km a ripio)">Tierra virgen (2 km a ripio)</option>
                  <option value="Ripio secundario">Ripio secundario (Transitable)</option>
                  <option value="Ripio consolidado / RP 56">Ripio consolidado / RP 56 (Pavimento - Blindado)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Nivel de Drenaje del Cuadro:</label>
                <select className="form-control" value={nuevoDrenaje} onChange={(e) => setNuevoDrenaje(e.target.value)}>
                  <option value="Deficiente (Bajo)">Deficiente / Bajo (Bajo cota de canal, retiene agua)</option>
                  <option value="Medio">Medio (Escurrimiento normal)</option>
                  <option value="Excelente">Excelente / Alto (Pendiente favorable)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Tipo de Suelo:</label>
                <select className="form-control" value={nuevoSuelo} onChange={(e) => setNuevoSuelo(e.target.value)}>
                  <option value="Arcilloso pesado">Arcilloso pesado (Colapso rápido con agua)</option>
                  <option value="Arcilloso">Arcilloso (Retención media-alta)</option>
                  <option value="Franco-limoso">Franco-limoso</option>
                  <option value="Franco">Franco</option>
                  <option value="Franco-arenoso">Franco-arenoso (Rápida infiltración)</option>
                </select>
              </div>

              <div style={{ background: "#111a2e", padding: "10px", borderRadius: "8px", border: "1px solid #334155" }}>
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>Nuevo IVL Estático proyectado: </span>
                <b style={{ color: "#38bdf8", fontFamily: "JetBrains Mono" }}>
                  {GestorCatastro.calcularIVL(nuevoSuelo, nuevoDrenaje, nuevoCamino)} / 5.0
                </b>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-action" onClick={() => setLoteEditando(null)}>Cancelar</button>
              <button className="btn-action btn-primary" onClick={guardarCambios}>Guardar y Recalcular IVL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
