import React, { useState } from "react";
import { GestorCatastro } from "../services/GestorCatastro";

export default function CatastroView({ lotes = [], onActualizarLote }) {
  const [loteEditando, setLoteEditando] = useState(null);
  const [nuevoCamino, setNuevoCamino] = useState("");
  const [nuevoDrenaje, setNuevoDrenaje] = useState("");
  const [nuevoSuelo, setNuevoSuelo] = useState("");
  const [filtroFinca, setFiltroFinca] = useState("TODAS");
  const [busqueda, setBusqueda] = useState("");

  const lotesSeguros = Array.isArray(lotes) ? lotes : [];

  const iniciarEdicion = (lote) => {
    setLoteEditando(lote);
    setNuevoCamino(lote.camino || "");
    setNuevoDrenaje(lote.drenaje || "");
    setNuevoSuelo(lote.suelo || "");
  };

  const guardarCambios = () => {
    if (!loteEditando) return;
    if (onActualizarLote) {
      onActualizarLote(loteEditando.id, {
        camino: nuevoCamino,
        drenaje: nuevoDrenaje,
        suelo: nuevoSuelo
      });
    }
    setLoteEditando(null);
  };

  // Filtrado compuesto: por Finca y por texto de búsqueda
  const lotesFiltrados = lotesSeguros.filter((l) => {
    const coincideFinca =
      filtroFinca === "TODAS" ||
      (l.finca && l.finca.toLowerCase().includes(filtroFinca.toLowerCase()));

    const query = busqueda.trim().toLowerCase();
    const coincideTexto =
      !query ||
      (l.codigo && l.codigo.toLowerCase().includes(query)) ||
      (l.finca && l.finca.toLowerCase().includes(query)) ||
      (l.suelo && l.suelo.toLowerCase().includes(query)) ||
      (l.camino && l.camino.toLowerCase().includes(query));

    return coincideFinca && coincideTexto;
  });

  // Métricas rápidas de Catastro
  const totalHas = lotesSeguros.reduce((acc, l) => acc + (Number(l.has) || 0), 0);
  const totalToneladas = lotesSeguros.reduce((acc, l) => acc + (Number(l.toneladas) || 0), 0);
  const totalCriticos = lotesSeguros.filter((l) => (l.ivlEstatico || 0) >= 4.0).length;
  const totalCosechados = lotesSeguros.filter((l) => l.estado === "COSECHADO").length;

  return (
    <div className="view-container" style={{ padding: "0 24px" }}>
      {/* CABECERA */}
      <div className="section-header-box">
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
            <span>📋</span> Catastro Cañero — Gestión de Cuadros y Accesos
          </h2>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
            Administración de características edáficas y caminos de salida para cada lote de Ingenio La Esperanza.
          </p>
        </div>

        {/* FILTROS Y BÚSQUEDA */}
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="text"
            className="form-control"
            style={{ width: "190px", fontSize: "12.5px" }}
            placeholder="🔍 Buscar lote o camino..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          <select
            className="form-control"
            style={{ width: "auto", fontSize: "12.5px" }}
            value={filtroFinca}
            onChange={(e) => setFiltroFinca(e.target.value)}
          >
            <option value="TODAS">Todas las fincas ({lotesSeguros.length})</option>
            <option value="Esperanza">Finca Central La Esperanza</option>
            <option value="Miraflores">Finca Miraflores</option>
            <option value="Puesto">Finca El Puesto</option>
            <option value="Arrayanal">Finca Arrayanal</option>
          </select>
        </div>
      </div>

      {/* STRIP DE MÉTRICAS RESUMEN */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "12px" }}>
        <div className="kpi-card" style={{ "--kpi-color": "#38bdf8" }}>
          <div className="kpi-title">Cuadros en Catastro</div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: "#38bdf8" }}>{lotesSeguros.length}</span>
            <span className="kpi-sub">lotes registrados</span>
          </div>
          <span className="kpi-sub">{totalCosechados} cosechados | {lotesSeguros.length - totalCosechados} activos</span>
        </div>

        <div className="kpi-card" style={{ "--kpi-color": "#10b981" }}>
          <div className="kpi-title">Superficie Total</div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: "#34d399" }}>{totalHas.toLocaleString()} ha</span>
          </div>
          <span className="kpi-sub">{totalToneladas.toLocaleString()} toneladas estimadas</span>
        </div>

        <div className="kpi-card" style={{ "--kpi-color": "#f87171" }}>
          <div className="kpi-title">Vulnerabilidad Crítica (IVL ≥ 4.0)</div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: "#f87171" }}>{totalCriticos} cuadros</span>
          </div>
          <span className="kpi-sub">Suelo arcilloso o salida en tierra virgen</span>
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
            {lotesFiltrados.length === 0 ? (
              <tr>
                <td colSpan="10" style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>
                  🔍 No se encontraron cuadros con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              lotesFiltrados.map((lote) => {
                const caminoStr = String(lote.camino || "").toLowerCase();
                const esTierra = caminoStr.includes("tierra");
                const ivl = Number(lote.ivlEstatico) || 1.0;

                return (
                  <tr key={lote.id}>
                    <td>
                      <b style={{ fontFamily: "JetBrains Mono", color: "#38bdf8", fontSize: "14px" }}>
                        {lote.codigo}
                      </b>
                    </td>
                    <td>{lote.finca}</td>
                    <td><b>{lote.has} ha</b></td>
                    <td><b>{Number(lote.toneladas || 0).toLocaleString()} t</b></td>
                    <td>{lote.suelo}</td>
                    <td>{lote.drenaje}</td>
                    <td>
                      <span
                        style={{
                          fontSize: "12px",
                          color: esTierra ? "#f87171" : "#34d399",
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        {esTierra ? "⚠️ " : "🛣️ "}
                        {lote.camino}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`ivl-pill ${
                          ivl >= 4.0 ? "ivl-high" : ivl >= 2.5 ? "ivl-mid" : "ivl-low"
                        }`}
                        title="Índice de Vulnerabilidad de Lote Estático (Pondera suelo, pendiente y camino)"
                      >
                        {ivl.toFixed(1)} / 5.0
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge-status ${
                          lote.estado === "COSECHADO"
                            ? "badge-harvested"
                            : lote.estado === "EN_COSECHA"
                            ? "badge-active"
                            : "badge-safe"
                        }`}
                      >
                        {lote.estado === "COSECHADO" ? "✔ Cosechado" : lote.estado === "EN_COSECHA" ? "🚜 En Cosecha" : "⏳ Pendiente"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-action"
                        style={{ fontSize: "11.5px", padding: "6px 12px", minHeight: "30px", whiteSpace: "nowrap" }}
                        onClick={() => iniciarEdicion(lote)}
                      >
                        ✏️ Editar Accesos
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
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
