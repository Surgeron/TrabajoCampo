import React, { useState, useMemo, useEffect } from "react";
import {
  GestorLotes,
  GestorZonas,
  GestorAnegamientos,
  GestorConfiguracion,
  GestorUsuarios
} from "../services/gestores";
import { EstadoLote, ESTADO_LOTE_META } from "../domain/enums";

function isoALocalInput(isoStr) {
  const d = isoStr ? new Date(isoStr) : new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

function fechaLocalInputAhora() {
  return isoALocalInput();
}

export default function AnegamientoView({
  usuario,
  zonaPreseleccionada = null,
  lotePreseleccionado = null,
  onDatosCambiados,
  onRecalcularRanking,
  onToast,
  versionDatos
}) {
  const zonas = useMemo(() => GestorZonas.listarZonas(), [versionDatos]);
  const lotes = useMemo(() => GestorLotes.listarLotes(), [versionDatos]);
  const abiertos = useMemo(() => GestorAnegamientos.listarAbiertos(), [versionDatos]);
  const todos = useMemo(() => GestorAnegamientos.listarTodos(), [versionDatos]);
  const config = useMemo(() => GestorConfiguracion.obtenerVigente(), [versionDatos]);
  const usuarios = useMemo(() => GestorUsuarios.listarUsuarios(), [versionDatos]);

  const [filtroZona, setFiltroZona] = useState(zonaPreseleccionada || "TODAS");
  const [lotesSeleccionados, setLotesSeleccionados] = useState(
    lotePreseleccionado ? [lotePreseleccionado] : []
  );
  const [fechaInicio, setFechaInicio] = useState(fechaLocalInputAhora());
  const [observaciones, setObservaciones] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [modalConfirmarNoPendiente, setModalConfirmarNoPendiente] = useState(false);

  // Estado para cierre de anegamiento
  const [anegamientoACerrar, setAnegamientoACerrar] = useState(null);
  const [fechaFinCierre, setFechaFinCierre] = useState(fechaLocalInputAhora());

  // Estado para edición de anegamiento
  const [anegEditar, setAnegEditar] = useState(null);
  const [editInicio, setEditInicio] = useState("");
  const [editFin, setEditFin] = useState("");
  const [editObs, setEditObs] = useState("");
  const [editErr, setEditErr] = useState("");

  useEffect(() => {
    if (zonaPreseleccionada) setFiltroZona(zonaPreseleccionada);
  }, [zonaPreseleccionada]);

  useEffect(() => {
    if (lotePreseleccionado) setLotesSeleccionados([lotePreseleccionado]);
  }, [lotePreseleccionado]);

  const codigosConEventoAbierto = useMemo(
    () => new Set(abiertos.map((a) => a.loteCodigo)),
    [abiertos]
  );

  const lotesVisibles = useMemo(() => {
    return lotes.filter((l) => filtroZona === "TODAS" || l.zonaCodigo === filtroZona);
  }, [lotes, filtroZona]);

  const toggleLote = (codigo) => {
    if (codigosConEventoAbierto.has(codigo)) return;
    setLotesSeleccionados((prev) =>
      prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo]
    );
  };

  const ejecutarApertura = () => {
    try {
      const res = GestorAnegamientos.abrir(
        lotesSeleccionados,
        fechaInicio,
        observaciones,
        usuario
      );
      setModalConfirmarNoPendiente(false);
      setLotesSeleccionados([]);
      setObservaciones("");
      setFechaInicio(fechaLocalInputAhora());
      setErrorMsg("");
      if (onRecalcularRanking) onRecalcularRanking();
      else if (onDatosCambiados) onDatosCambiados();

      if (onToast) {
        onToast(
          `Anegamiento registrado en ${res.creados.map((c) => c.loteCodigo).join(", ")}. Estado pasado a ANEGADO.`
        );
      }
    } catch (err) {
      setErrorMsg(err.message);
      setModalConfirmarNoPendiente(false);
    }
  };

  const registrarInicio = (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (lotesSeleccionados.length === 0) {
      setErrorMsg("Seleccioná al menos un lote para registrar el anegamiento.");
      return;
    }

    if (new Date(fechaInicio) > new Date()) {
      setErrorMsg("La fecha y hora de inicio no puede ser futura.");
      return;
    }

    // Si algún lote seleccionado no está en estado PENDIENTE, pedir confirmación
    const hayNoPendientes = lotesSeleccionados.some((cod) => {
      const l = lotes.find((x) => x.codigo === cod);
      return l && l.estado !== EstadoLote.PENDIENTE;
    });

    if (hayNoPendientes) {
      setModalConfirmarNoPendiente(true);
      return;
    }

    ejecutarApertura();
  };

  const abrirEditarAnegamiento = (a) => {
    setAnegEditar(a);
    setEditInicio(isoALocalInput(a.fechaInicio));
    setEditFin(a.fechaFin ? isoALocalInput(a.fechaFin) : "");
    setEditObs(a.observaciones || "");
    setEditErr("");
  };

  const guardarEdicionAnegamiento = (e) => {
    e.preventDefault();
    setEditErr("");
    try {
      GestorAnegamientos.modificar(
        anegEditar,
        {
          fechaInicio: new Date(editInicio).toISOString(),
          fechaFin: editFin ? new Date(editFin).toISOString() : null,
          observaciones: editObs
        },
        usuario
      );
      setAnegEditar(null);
      if (onRecalcularRanking) onRecalcularRanking();
      else if (onDatosCambiados) onDatosCambiados();
      onToast?.("Registro de anegamiento actualizado.", "success");
    } catch (err) {
      setEditErr(err.message);
    }
  };

  const confirmarCierreAnegamiento = () => {
    if (!anegamientoACerrar) return;
    setErrorMsg("");
    try {
      const res = GestorAnegamientos.cerrar(anegamientoACerrar, fechaFinCierre, usuario);
      setAnegamientoACerrar(null);
      if (onRecalcularRanking) onRecalcularRanking();
      else if (onDatosCambiados) onDatosCambiados();
      if (onToast) {
        onToast(
          `Anegamiento cerrado para ${res.loteCodigo}. Lote devuelto a PENDIENTE y semáforo recalculado.`
        );
      }
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const nombreUsuario = (uid) => usuarios.find((u) => u.id === uid)?.nombre || uid || "Sistema";
  const nombreLote = (cod) => {
    const l = lotes.find((x) => x.codigo === cod);
    return l ? `${l.codigo} — ${l.nombre}` : cod;
  };
  const fechaCorteZafra = new Date(`${config.inicioZafra}T00:00:00`);

  return (
    <div className="view-container" style={{ padding: "16px 24px", maxWidth: "1050px", margin: "0 auto", width: "100%" }}>
      <div className="section-header-box">
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
            <span>🌊</span> Gestión de Anegamientos
          </h2>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "2px" }}>
            Registrá lotes intransitables por agua (pasan a estado Anegado) y cerrá el evento cuando recuperen acceso.
          </p>
        </div>
        <span className="badge-status badge-anegado">{abiertos.length} evento(s) abierto(s)</span>
      </div>

      {errorMsg && (
        <div className="login-error-alert" style={{ marginBottom: 0 }}>
          <span>⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* PANEL 1: ANEGAMIENTOS ABIERTOS */}
      <div
        className="panel-card"
        style={{
          borderColor: abiertos.length > 0 ? "var(--color-anegado)" : "var(--border-color)",
          padding: "16px"
        }}
      >
        <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "10px", color: abiertos.length > 0 ? "#93c5fd" : "var(--text-primary)" }}>
          🔵 Anegamientos Abiertos Actualmente ({abiertos.length})
        </h3>
        {abiertos.length === 0 ? (
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            No hay lotes con anegamiento abierto en este momento.
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
            {abiertos.map((a) => (
              <div
                key={a.id}
                className="inset-box"
                style={{
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <b style={{ fontSize: "14px", color: "#93c5fd" }}>{nombreLote(a.loteCodigo)}</b>
                  <span className="badge-status badge-anegado">Anegado</span>
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  Inicio: <b>{new Date(a.fechaInicio).toLocaleString()}</b>
                </div>
                {a.observaciones && (
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>"{a.observaciones}"</div>
                )}
                <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                  <button
                    className="btn-action btn-primary"
                    style={{ flex: 1, minHeight: "36px", justifyContent: "center" }}
                    onClick={() => {
                      setAnegamientoACerrar(a);
                      setFechaFinCierre(fechaLocalInputAhora());
                      setErrorMsg("");
                    }}
                  >
                    ✅ Cerrar anegamiento
                  </button>
                  <button
                    className="btn-action"
                    style={{ minHeight: "36px", padding: "6px 12px" }}
                    onClick={() => abrirEditarAnegamiento(a)}
                  >
                    ✏️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PANEL 2: REGISTRAR NUEVO ANEGAMIENTO */}
      <form
        onSubmit={registrarInicio}
        className="panel-card"
        style={{
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "14px"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <h3 style={{ fontSize: "15px", fontWeight: 700 }}>
            📝 Registrar Lote(s) Intransitable(s)
          </h3>
          <select
            className="form-control"
            style={{ width: "auto", fontSize: "12.5px", padding: "6px 10px" }}
            value={filtroZona}
            onChange={(e) => setFiltroZona(e.target.value)}
          >
            <option value="TODAS">Todas las zonas</option>
            {zonas.map((z) => (
              <option key={z.codigo} value={z.codigo}>
                {z.nombre}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: "8px"
          }}
        >
          {lotesVisibles.map((l) => {
            const yaAbierto = codigosConEventoAbierto.has(l.codigo);
            const seleccionado = lotesSeleccionados.includes(l.codigo);
            const meta = ESTADO_LOTE_META[l.estado];
            return (
              <label
                key={l.codigo}
                className={`lot-pick-item ${seleccionado ? "selected" : ""} ${yaAbierto ? "disabled" : ""}`}
              >
                <input
                  type="checkbox"
                  disabled={yaAbierto}
                  checked={seleccionado}
                  onChange={() => toggleLote(l.codigo)}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <b style={{ fontSize: "13px" }}>{l.codigo} — {l.nombre}</b>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                    {l.zonaNombre} · {meta?.label} {yaAbierto && "(Ya abierto)"}
                  </span>
                </div>
              </label>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
          <div className="form-group">
            <label>Fecha y hora de inicio:</label>
            <input
              type="datetime-local"
              className="form-control"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Observaciones (opcional):</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ej. Agua acumulada en cabecera y callejón cortado"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>
        </div>

        <button type="submit" className="btn-action btn-primary" style={{ justifyContent: "center", minHeight: "44px" }}>
          🌊 Confirmar Anegamiento ({lotesSeleccionados.length} lote/s seleccionado/s)
        </button>
      </form>

      {/* PANEL 3: HISTORIAL COMPLETO DE ANEGAMIENTOS */}
      <h3 style={{ fontSize: "15px", fontWeight: 700, marginTop: "6px" }}>
        📚 Historial de Anegamientos ({todos.length}) — Inicio de zafra: {config.inicioZafra}
      </h3>
      <div className="table-responsive-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Lote</th>
              <th>Inicio</th>
              <th>Fin</th>
              <th>Zafra</th>
              <th>Observaciones</th>
              <th>Registrado por</th>
              <th style={{ width: "90px" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {todos.map((a) => {
              const enUltimaZafra = new Date(a.fechaInicio) >= fechaCorteZafra;
              return (
                <tr key={a.id}>
                  <td><b>{nombreLote(a.loteCodigo)}</b></td>
                  <td>{new Date(a.fechaInicio).toLocaleString()}</td>
                  <td>
                    {a.fechaFin ? (
                      new Date(a.fechaFin).toLocaleString()
                    ) : (
                      <span className="badge-status badge-anegado">Abierto</span>
                    )}
                  </td>
                  <td>
                    {enUltimaZafra ? (
                      <span className="badge-status badge-warning">Última zafra</span>
                    ) : (
                      <span className="badge-status badge-harvested">Histórico</span>
                    )}
                  </td>
                  <td style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{a.observaciones || "—"}</td>
                  <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>{nombreUsuario(a.usuarioId)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn-action"
                      style={{ minHeight: "30px", padding: "4px 10px", fontSize: "12px" }}
                      onClick={() => abrirEditarAnegamiento(a)}
                    >
                      ✏️ Editar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL EDITAR ANEGAMIENTO */}
      {anegEditar && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>✏️ Editar Anegamiento — {anegEditar.loteCodigo}</h3>
              <button
                type="button"
                onClick={() => setAnegEditar(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "20px", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={guardarEdicionAnegamiento}>
              <div className="modal-body">
                {editErr && (
                  <div className="login-error-alert" style={{ marginBottom: 0 }}>
                    <span>⚠️</span>
                    <span>{editErr}</span>
                  </div>
                )}
                <div className="form-group">
                  <label>Fecha y hora de inicio</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={editInicio}
                    onChange={(e) => setEditInicio(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Fecha y hora de fin (dejar vacío si sigue abierto)</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={editFin}
                      onChange={(e) => setEditFin(e.target.value)}
                    />
                    {editFin && (
                      <button
                        type="button"
                        className="btn-action"
                        style={{ padding: "6px 10px" }}
                        onClick={() => setEditFin("")}
                        title="Reabrir evento"
                      >
                        Reabrir
                      </button>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label>Observaciones</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editObs}
                    onChange={(e) => setEditObs(e.target.value)}
                    placeholder="Detalle del estado del lote o camino"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-action" onClick={() => setAnegEditar(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-action btn-primary">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LOTE NO PENDIENTE */}
      {modalConfirmarNoPendiente && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>⚠️ Confirmar Registro en Lote No Pendiente</h3>
              <button
                onClick={() => setModalConfirmarNoPendiente(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "20px", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "13.5px" }}>
                Alguno de los lotes seleccionados no está en estado <b>Pendiente</b> (por ejemplo, ya cosechado o en descanso).
                El registro igualmente quedará asentado en el historial del lote. ¿Deseás continuar?
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-action" onClick={() => setModalConfirmarNoPendiente(false)}>
                Cancelar
              </button>
              <button className="btn-action btn-primary" onClick={ejecutarApertura}>
                Confirmar y registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CERRAR ANEGAMIENTO */}
      {anegamientoACerrar && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>✅ Cerrar Anegamiento — {anegamientoACerrar.loteCodigo}</h3>
              <button
                onClick={() => setAnegamientoACerrar(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "20px", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                Inicio del anegamiento: <b>{new Date(anegamientoACerrar.fechaInicio).toLocaleString()}</b>.
                Al cerrar, el lote vuelve a estado <b>Pendiente</b> y se recalcula su prioridad.
              </p>
              <div className="form-group">
                <label>Fecha y hora de recuperación de acceso:</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={fechaFinCierre}
                  onChange={(e) => setFechaFinCierre(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-action" onClick={() => setAnegamientoACerrar(null)}>
                Cancelar
              </button>
              <button className="btn-action btn-primary" onClick={confirmarCierreAnegamiento}>
                Confirmar cierre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
