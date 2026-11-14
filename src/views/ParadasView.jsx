import React, { useMemo, useState } from "react";
import {
  CausaParada,
  CAUSA_PARADA_LABELS,
  EstadoParada,
  ESTADO_PARADA_LABELS
} from "../domain/enums.js";
import { GestorParadas, GestorSesion, GestorUsuarios } from "../services/gestores.js";

function toLocalDateTimeInput(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatFechaHora(iso) {
  if (!iso) return "En curso";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDuracionEnCurso(fechaInicio) {
  if (!fechaInicio) return "-";
  const diffMs = Date.now() - new Date(fechaInicio).getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) return "0.00 h";
  return `${(diffMs / 3600000).toFixed(2)} h (en curso)`;
}

function nombreUsuario(usuarioId) {
  if (!usuarioId) return "Sistema";
  const u = GestorUsuarios.obtenerPorId(usuarioId);
  return u ? u.nombre : usuarioId;
}

// ==========================================
// BOUNDARY UML: InterfazParada (CU13)
// ==========================================
export function InterfazParada({ usuario, onDatosCambiados, onToast, versionDatos }) {
  const paradaAbierta = useMemo(() => {
    void versionDatos;
    return GestorParadas.obtenerAbierta();
  }, [versionDatos]);

  const [causa, setCausa] = useState(CausaParada.FALTA_CANA_EN_PATIO);
  const [detalle, setDetalle] = useState("");
  const [fechaInicio, setFechaInicio] = useState(() => toLocalDateTimeInput());
  const [toneladasPatio, setToneladasPatio] = useState("");
  const [fechaFin, setFechaFin] = useState(() => toLocalDateTimeInput());
  const [errorForm, setErrorForm] = useState("");

  const handleAbrirParada = (e) => {
    e.preventDefault();
    setErrorForm("");
    try {
      const nueva = GestorParadas.abrirParada(
        causa,
        detalle,
        fechaInicio ? new Date(fechaInicio).toISOString() : new Date().toISOString(),
        toneladasPatio === "" ? null : Number(toneladasPatio),
        usuario
      );
      setDetalle("");
      setToneladasPatio("");
      setFechaInicio(toLocalDateTimeInput());
      setFechaFin(toLocalDateTimeInput());
      onDatosCambiados?.();
      onToast?.(`Parada ${nueva.id} abierta (${CAUSA_PARADA_LABELS[nueva.causa]}).`, "warning");
    } catch (err) {
      setErrorForm(err.message);
      onToast?.(err.message, "error");
    }
  };

  const handleCerrarParada = (e) => {
    e.preventDefault();
    if (!paradaAbierta) return;
    setErrorForm("");
    try {
      const cerrada = GestorParadas.cerrarParada(
        paradaAbierta,
        fechaFin ? new Date(fechaFin).toISOString() : new Date().toISOString(),
        usuario
      );
      setFechaInicio(toLocalDateTimeInput());
      onDatosCambiados?.();
      onToast?.(
        `Parada ${cerrada.id} cerrada (${cerrada.duracionHoras ?? 0} h registradas).`,
        "success"
      );
    } catch (err) {
      setErrorForm(err.message);
      onToast?.(err.message, "error");
    }
  };

  return (
    <div
      className="section-header-box"
      style={{
        marginBottom: "20px",
        border: paradaAbierta ? "1px solid rgba(239,68,68,0.6)" : "1px solid var(--border-color)",
        background: paradaAbierta ? "rgba(239,68,68,0.06)" : "var(--bg-card)"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap", marginBottom: "14px" }}>
        <div>
          <h2 style={{ margin: "0 0 4px 0", fontSize: "1.15rem" }}>
            {paradaAbierta ? "🔴 Parada de Fábrica en Curso (RN12)" : "🟢 Registrar Apertura de Parada (CU13)"}
          </h2>
          <p className="subtitle" style={{ margin: 0 }}>
            {paradaAbierta
              ? "Mientras exista una parada abierta no puede abrirse otra. Registrá el horario de finalización para reanudar la molienda."
              : "Seleccioná la causa del catálogo cerrado. Admite registro retroactivo si la parada comenzó antes."}
          </p>
        </div>
        <span className={`badge-status ${paradaAbierta ? "badge-urgent" : "badge-safe"}`}>
          {paradaAbierta ? `ABIERTA · ${paradaAbierta.id}` : "MOLIENDA ACTIVA"}
        </span>
      </div>

      {errorForm && (
        <div
          style={{
            marginBottom: "14px",
            padding: "10px 12px",
            borderRadius: "8px",
            background: "rgba(239, 68, 68, 0.14)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            color: "#fca5a5",
            fontSize: "0.88rem"
          }}
        >
          ⚠️ {errorForm}
        </div>
      )}

      {paradaAbierta ? (
        <form onSubmit={handleCerrarParada}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
              padding: "12px",
              borderRadius: "8px",
              background: "rgba(15,23,42,0.55)",
              border: "1px solid rgba(255,255,255,0.08)",
              marginBottom: "14px"
            }}
          >
            <div>
              <div className="subtitle" style={{ fontSize: "0.75rem" }}>Causa</div>
              <strong>{CAUSA_PARADA_LABELS[paradaAbierta.causa] || paradaAbierta.causa}</strong>
            </div>
            <div>
              <div className="subtitle" style={{ fontSize: "0.75rem" }}>Inicio</div>
              <strong>{formatFechaHora(paradaAbierta.fechaInicio)}</strong>
            </div>
            <div>
              <div className="subtitle" style={{ fontSize: "0.75rem" }}>Transcurrido</div>
              <strong>{formatDuracionEnCurso(paradaAbierta.fechaInicio)}</strong>
            </div>
            <div>
              <div className="subtitle" style={{ fontSize: "0.75rem" }}>Toneladas en patio</div>
              <strong>{paradaAbierta.toneladasPatio !== null ? `${paradaAbierta.toneladasPatio} t` : "No informado"}</strong>
            </div>
            {paradaAbierta.detalle && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div className="subtitle" style={{ fontSize: "0.75rem" }}>Detalle</div>
                <span>{paradaAbierta.detalle}</span>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="form-group" style={{ margin: 0, minWidth: "240px", flex: "1 1 240px" }}>
              <label>Fecha y hora de fin / reanudación</label>
              <input
                type="datetime-local"
                className="form-control"
                value={fechaFin}
                max={toLocalDateTimeInput()}
                onChange={(e) => setFechaFin(e.target.value)}
                required
              />
            </div>
            <button
              type="button"
              className="btn-action"
              onClick={() => setFechaFin(toLocalDateTimeInput())}
            >
              Usar hora actual
            </button>
            <button type="submit" className="btn-primary">
              ✓ Cerrar Parada y Calcular Duración
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleAbrirParada}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Causa de la parada *</label>
              <select
                className="form-control"
                value={causa}
                onChange={(e) => setCausa(e.target.value)}
              >
                {Object.values(CausaParada).map((c) => (
                  <option key={c} value={c}>
                    {CAUSA_PARADA_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Fecha y hora de inicio *</label>
              <input
                type="datetime-local"
                className="form-control"
                value={fechaInicio}
                max={toLocalDateTimeInput()}
                onChange={(e) => setFechaInicio(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>
                Toneladas en patio {causa === CausaParada.FALTA_CANA_EN_PATIO ? "(recomendado)" : "(opcional)"}
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                className="form-control"
                placeholder={causa === CausaParada.FALTA_CANA_EN_PATIO ? "Ej: 15 (stock crítico)" : "Ej: 120"}
                value={toneladasPatio}
                onChange={(e) => setToneladasPatio(e.target.value)}
              />
            </div>
          </div>

          {causa === CausaParada.FALTA_CANA_EN_PATIO && (
            <div
              style={{
                marginTop: "10px",
                padding: "8px 12px",
                borderRadius: "6px",
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.35)",
                color: "#fde68a",
                fontSize: "0.82rem"
              }}
            >
              💡 Para "Falta de caña en el patio" conviene registrar las toneladas remanentes en canchón para correlacionar con el desabastecimiento por lluvia.
            </div>
          )}

          <div className="form-group" style={{ marginTop: "12px", marginBottom: "14px" }}>
            <label>
              Detalle u observación {causa === CausaParada.OTRA ? "* (obligatorio para causa Otra - RN13)" : "(opcional)"}
            </label>
            <textarea
              className="form-control"
              rows={2}
              placeholder={
                causa === CausaParada.OTRA
                  ? "Describí el motivo concreto de la parada..."
                  : "Información adicional del frente o sector afectado..."
              }
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              required={causa === CausaParada.OTRA}
            />
          </div>

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn-action"
              onClick={() => setFechaInicio(toLocalDateTimeInput())}
            >
              Restablecer hora actual
            </button>
            <button type="submit" className="btn-primary">
              🚨 Registrar Apertura de Parada
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ==========================================
// BOUNDARY UML: InterfazHistorialParadas (CU14)
// ==========================================
export function InterfazHistorialParadas({
  usuario,
  onDatosCambiados,
  onToast,
  versionDatos
}) {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [causaFiltro, setCausaFiltro] = useState("TODAS");
  const [paradaDetalle, setParadaDetalle] = useState(null);
  const [paradaEditar, setParadaEditar] = useState(null);

  const [editForm, setEditForm] = useState({
    causa: CausaParada.LLUVIA,
    detalle: "",
    fechaInicio: "",
    fechaFin: "",
    toneladasPatio: ""
  });

  const puedeCorregir = GestorSesion.puedeEjecutar(usuario, "CU13");

  const paradas = useMemo(() => {
    void versionDatos;
    return GestorParadas.listarHistorial(desde || null, hasta || null, causaFiltro);
  }, [desde, hasta, causaFiltro, versionDatos]);

  const resumen = useMemo(() => GestorParadas.totalesPorCausa(paradas), [paradas]);

  const abrirEdicion = (p) => {
    setParadaEditar(p);
    setEditForm({
      causa: p.causa,
      detalle: p.detalle || "",
      fechaInicio: toLocalDateTimeInput(p.fechaInicio),
      fechaFin: p.fechaFin ? toLocalDateTimeInput(p.fechaFin) : "",
      toneladasPatio: p.toneladasPatio !== null && p.toneladasPatio !== undefined ? String(p.toneladasPatio) : ""
    });
  };

  const guardarEdicion = (e) => {
    e.preventDefault();
    if (!paradaEditar) return;
    try {
      const actualizada = GestorParadas.corregirParada(
        paradaEditar,
        {
          causa: editForm.causa,
          detalle: editForm.detalle,
          fechaInicio: editForm.fechaInicio ? new Date(editForm.fechaInicio).toISOString() : undefined,
          fechaFin: editForm.fechaFin ? new Date(editForm.fechaFin).toISOString() : null,
          toneladasPatio: editForm.toneladasPatio === "" ? null : Number(editForm.toneladasPatio)
        },
        usuario
      );
      setParadaEditar(null);
      onDatosCambiados?.();
      onToast?.(`Parada ${actualizada.id} corregida y auditada.`, "success");
    } catch (err) {
      onToast?.(err.message, "error");
    }
  };

  const handleExportarCSV = () => {
    GestorParadas.exportarCSV(paradas);
    onToast?.(`Exportadas ${paradas.length} paradas a CSV.`, "info");
  };

  const causaPrincipal = useMemo(() => {
    const lista = Object.values(resumen.porCausa).filter((x) => x.horas > 0);
    if (!lista.length) return null;
    return lista.sort((a, b) => b.horas - a.horas)[0];
  }, [resumen]);

  return (
    <div>
      {/* Barra de filtros + Exportar CSV */}
      <div className="section-header-box" style={{ marginBottom: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", flex: 1 }}>
            <div className="form-group" style={{ margin: 0, minWidth: "155px" }}>
              <label>Desde</label>
              <input
                type="date"
                className="form-control"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: "155px" }}>
              <label>Hasta</label>
              <input
                type="date"
                className="form-control"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: "220px" }}>
              <label>Filtrar por causa</label>
              <select
                className="form-control"
                value={causaFiltro}
                onChange={(e) => setCausaFiltro(e.target.value)}
              >
                <option value="TODAS">Todas las causas</option>
                {Object.values(CausaParada).map((c) => (
                  <option key={c} value={c}>
                    {CAUSA_PARADA_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            {(desde || hasta || causaFiltro !== "TODAS") && (
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button
                  type="button"
                  className="btn-action"
                  onClick={() => {
                    setDesde("");
                    setHasta("");
                    setCausaFiltro("TODAS");
                  }}
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn-action"
            onClick={handleExportarCSV}
            disabled={paradas.length === 0}
          >
            📥 Exportar CSV
          </button>
        </div>
      </div>

      {/* KPIs resumen */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "14px",
          marginBottom: "18px"
        }}
      >
        <div className="kpi-card">
          <div className="kpi-label">Total de paradas (filtro)</div>
          <div className="kpi-value">{resumen.cantidadParadas}</div>
          <div className="kpi-sub">
            {paradas.some((p) => p.estaAbierta()) ? "Incluye 1 parada en curso" : "Todas cerradas"}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Horas acumuladas (cerradas)</div>
          <div className="kpi-value">{resumen.horasTotales} h</div>
          <div className="kpi-sub">Suma de duración horaria en paradas cerradas</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Mayor impacto</div>
          <div className="kpi-value" style={{ fontSize: "1.15rem" }}>
            {causaPrincipal ? causaPrincipal.etiqueta : "Sin datos"}
          </div>
          <div className="kpi-sub">
            {causaPrincipal ? `${causaPrincipal.horas} h (${causaPrincipal.porcentaje}%)` : "0 horas"}
          </div>
        </div>
      </div>

      {/* Totales por causa */}
      <div className="section-header-box" style={{ marginBottom: "18px" }}>
        <h3 style={{ margin: "0 0 10px 0", fontSize: "1rem" }}>📊 Distribución por Causa</h3>
        <div className="table-responsive-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Causa</th>
                <th>Paradas</th>
                <th>Horas cerradas</th>
                <th>% del total</th>
                <th style={{ width: "35%" }}>Participación</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(resumen.porCausa).map((item) => (
                <tr key={item.causa}>
                  <td><strong>{item.etiqueta}</strong></td>
                  <td>{item.cantidad}</td>
                  <td>{item.horas} h</td>
                  <td>{item.porcentaje}%</td>
                  <td>
                    <div
                      style={{
                        height: "8px",
                        borderRadius: "4px",
                        background: "rgba(255,255,255,0.08)",
                        overflow: "hidden"
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min(100, item.porcentaje)}%`,
                          background: item.causa === CausaParada.LLUVIA || item.causa === CausaParada.FALTA_CANA_EN_PATIO
                            ? "#ef4444"
                            : "#38bdf8"
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tabla cronológica de paradas */}
      <div className="table-responsive-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Estado</th>
              <th>Causa</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>Duración</th>
              <th>Ton. patio</th>
              <th>Detalle</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paradas.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "24px", color: "var(--text-secondary)" }}>
                  No hay paradas registradas para los filtros seleccionados.
                </td>
              </tr>
            ) : (
              paradas.map((p) => {
                const abierta = p.estaAbierta();
                return (
                  <tr
                    key={p.id}
                    style={abierta ? { background: "rgba(239, 68, 68, 0.08)" } : undefined}
                  >
                    <td>
                      <strong>{p.id}</strong>
                      {p.fechaModificacion && (
                        <div className="subtitle" style={{ fontSize: "0.7rem" }}>
                          ✏️ Corregida
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge-status ${abierta ? "badge-urgent" : "badge-harvested"}`}>
                        {ESTADO_PARADA_LABELS[p.estado] || p.estado}
                      </span>
                    </td>
                    <td>{CAUSA_PARADA_LABELS[p.causa] || p.causa}</td>
                    <td>{formatFechaHora(p.fechaInicio)}</td>
                    <td>{abierta ? <strong>En curso</strong> : formatFechaHora(p.fechaFin)}</td>
                    <td>
                      {abierta
                        ? formatDuracionEnCurso(p.fechaInicio)
                        : `${p.duracionHoras ?? 0} h`}
                    </td>
                    <td>{p.toneladasPatio !== null ? `${p.toneladasPatio} t` : "-"}</td>
                    <td style={{ maxWidth: "240px" }}>
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.detalle || "-"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          className="btn-action"
                          onClick={() => setParadaDetalle(p)}
                        >
                          Ver
                        </button>
                        {puedeCorregir && (
                          <button
                            type="button"
                            className="btn-action"
                            onClick={() => abrirEdicion(p)}
                          >
                            Corregir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de detalle (CU14) */}
      {paradaDetalle && (
        <div className="modal-overlay" onClick={() => setParadaDetalle(null)}>
          <div className="modal-card" style={{ padding: "20px", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h3 style={{ margin: 0 }}>Detalle de Parada {paradaDetalle.id}</h3>
              <span className={`badge-status ${paradaDetalle.estaAbierta() ? "badge-urgent" : "badge-harvested"}`}>
                {ESTADO_PARADA_LABELS[paradaDetalle.estado]}
              </span>
            </div>

            <div style={{ display: "grid", gap: "8px", fontSize: "0.9rem", marginBottom: "16px" }}>
              <div><strong>Causa:</strong> {CAUSA_PARADA_LABELS[paradaDetalle.causa]}</div>
              <div><strong>Inicio:</strong> {formatFechaHora(paradaDetalle.fechaInicio)}</div>
              <div><strong>Fin:</strong> {paradaDetalle.estaAbierta() ? "En curso" : formatFechaHora(paradaDetalle.fechaFin)}</div>
              <div>
                <strong>Duración:</strong>{" "}
                {paradaDetalle.estaAbierta()
                  ? formatDuracionEnCurso(paradaDetalle.fechaInicio)
                  : `${paradaDetalle.duracionHoras ?? 0} horas`}
              </div>
              <div>
                <strong>Toneladas en patio:</strong>{" "}
                {paradaDetalle.toneladasPatio !== null ? `${paradaDetalle.toneladasPatio} t` : "No especificado"}
              </div>
              <div><strong>Detalle:</strong> {paradaDetalle.detalle || "Sin detalle adicional"}</div>
              <div><strong>Abierta por:</strong> {nombreUsuario(paradaDetalle.abiertaPorId)}</div>
              {paradaDetalle.cerradaPorId && (
                <div><strong>Cerrada por:</strong> {nombreUsuario(paradaDetalle.cerradaPorId)}</div>
              )}
              {paradaDetalle.fechaModificacion && (
                <div style={{ padding: "8px", borderRadius: "6px", background: "rgba(245,158,11,0.12)" }}>
                  <strong>Última corrección:</strong> {formatFechaHora(paradaDetalle.fechaModificacion)} por{" "}
                  {nombreUsuario(paradaDetalle.modificadaPorId)}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" className="btn-primary" onClick={() => setParadaDetalle(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de corrección (CU13 extensión) */}
      {paradaEditar && (
        <div className="modal-overlay" onClick={() => setParadaEditar(null)}>
          <div className="modal-card" style={{ padding: "20px", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 12px 0" }}>✏️ Corregir Parada {paradaEditar.id}</h3>
            <form onSubmit={guardarEdicion}>
              <div className="form-group">
                <label>Causa *</label>
                <select
                  className="form-control"
                  value={editForm.causa}
                  onChange={(e) => setEditForm((f) => ({ ...f, causa: e.target.value }))}
                >
                  {Object.values(CausaParada).map((c) => (
                    <option key={c} value={c}>
                      {CAUSA_PARADA_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Inicio *</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={editForm.fechaInicio}
                  max={toLocalDateTimeInput()}
                  onChange={(e) => setEditForm((f) => ({ ...f, fechaInicio: e.target.value }))}
                  required
                />
              </div>
              {paradaEditar.estado === EstadoParada.CERRADA && (
                <div className="form-group">
                  <label>Fin *</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={editForm.fechaFin}
                    max={toLocalDateTimeInput()}
                    onChange={(e) => setEditForm((f) => ({ ...f, fechaFin: e.target.value }))}
                    required
                  />
                </div>
              )}
              <div className="form-group">
                <label>Toneladas en patio</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  className="form-control"
                  value={editForm.toneladasPatio}
                  onChange={(e) => setEditForm((f) => ({ ...f, toneladasPatio: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label>Detalle {editForm.causa === CausaParada.OTRA ? "* (RN13)" : ""}</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={editForm.detalle}
                  onChange={(e) => setEditForm((f) => ({ ...f, detalle: e.target.value }))}
                  required={editForm.causa === CausaParada.OTRA}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
                <button type="button" className="btn-action" onClick={() => setParadaEditar(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Guardar Corrección
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// VISTA COMPLETA: PARADAS DE FÁBRICA
// ==========================================
export default function ParadasView({
  usuario,
  onDatosCambiados,
  onToast,
  versionDatos
}) {
  const puedeRegistrar = GestorSesion.puedeEjecutar(usuario, "CU13");

  return (
    <div className="view-container">
      <div className="section-header-box" style={{ marginBottom: "18px" }}>
        <h1 style={{ margin: "0 0 4px 0" }}>🏭 Paradas de Fábrica</h1>
        <p className="subtitle" style={{ margin: 0 }}>
          {puedeRegistrar
            ? "CU13 & CU14 — Apertura, cierre, corrección y análisis histórico de paradas de molienda."
            : "CU14 — Consulta cronológica, distribución por causa y exportación CSV de paradas de molienda."}
        </p>
      </div>

      {puedeRegistrar && (
        <InterfazParada
          usuario={usuario}
          onDatosCambiados={onDatosCambiados}
          onToast={onToast}
          versionDatos={versionDatos}
        />
      )}

      <InterfazHistorialParadas
        usuario={usuario}
        onDatosCambiados={onDatosCambiados}
        onToast={onToast}
        versionDatos={versionDatos}
      />
    </div>
  );
}
