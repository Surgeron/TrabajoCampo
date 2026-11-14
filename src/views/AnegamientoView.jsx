import React, { useState, useMemo, useEffect } from "react";
import {
  GestorLotes,
  GestorZonas,
  GestorAnegamientos,
  GestorConfiguracion,
  GestorUsuarios
} from "../services/gestores";
import { EstadoLote, ESTADO_LOTE_META } from "../domain/enums";

function fechaLocalInputAhora() {
  const ahora = new Date();
  const offset = ahora.getTimezoneOffset() * 60000;
  return new Date(ahora.getTime() - offset).toISOString().slice(0, 16);
}

// <<interfaz>> InterfazAnegamiento (CU05)
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

  // Estado para cierre de anegamiento (CU05 1a)
  const [anegamientoACerrar, setAnegamientoACerrar] = useState(null);
  const [fechaFinCierre, setFechaFinCierre] = useState(fechaLocalInputAhora());

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
      setErrorMsg("La fecha y hora de inicio no puede ser futura (CU05 4a).");
      return;
    }

    // CU05 2c: Si algún lote seleccionado no está en estado PENDIENTE, pedir confirmación
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
            <span>🌊</span> Gestión de Anegamientos (CU05)
          </h2>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
            Registrá lotes intransitables por lluvia (pasan a estado Azul / Anegado) y cerrá el evento cuando recuperen acceso.
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

      {/* PANEL 1: ANEGAMIENTOS ABIERTOS (PARA CERRAR CUANDO SE RECUPERE EL LOTE) */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid #3b82f6",
          borderRadius: "12px",
          padding: "16px"
        }}
      >
        <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "10px", color: "#93c5fd" }}>
          🔵 Anegamientos Abiertos Actualmente ({abiertos.length})
        </h3>
        {abiertos.length === 0 ? (
          <p style={{ fontSize: "13px", color: "#94a3b8" }}>
            No hay lotes con anegamiento abierto en este momento.
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
            {abiertos.map((a) => (
              <div
                key={a.id}
                style={{
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "10px",
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <b style={{ fontSize: "14px", color: "#60a5fa" }}>{nombreLote(a.loteCodigo)}</b>
                  <span className="badge-status badge-anegado">Anegado</span>
                </div>
                <div style={{ fontSize: "12px", color: "#cbd5e1" }}>
                  Inicio: <b>{new Date(a.fechaInicio).toLocaleString()}</b>
                </div>
                {a.observaciones && (
                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>"{a.observaciones}"</div>
                )}
                <button
                  className="btn-action btn-primary"
                  style={{ minHeight: "36px", justifyContent: "center", marginTop: "4px" }}
                  onClick={() => {
                    setAnegamientoACerrar(a);
                    setFechaFinCierre(fechaLocalInputAhora());
                    setErrorMsg("");
                  }}
                >
                  ✅ Cerrar anegamiento (Recuperó acceso)
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* PANEL 2: REGISTRAR NUEVO ANEGAMIENTO (CU05 2a, 2b, 2c) */}
      <form
        onSubmit={registrarInicio}
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-color)",
          borderRadius: "12px",
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
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px",
                  borderRadius: "8px",
                  background: seleccionado ? "rgba(59, 130, 246, 0.16)" : "#0f172a",
                  border: `1px solid ${seleccionado ? "#3b82f6" : "#334155"}`,
                  cursor: yaAbierto ? "not-allowed" : "pointer",
                  opacity: yaAbierto ? 0.55 : 1
                }}
              >
                <input
                  type="checkbox"
                  disabled={yaAbierto}
                  checked={seleccionado}
                  onChange={() => toggleLote(l.codigo)}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <b style={{ fontSize: "13px" }}>{l.codigo} — {l.nombre}</b>
                  <span style={{ fontSize: "11px", color: "#94a3b8" }}>
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

      {/* PANEL 3: HISTORIAL COMPLETO DE ANEGAMIENTOS (ALIMENTA CU10) */}
      <h3 style={{ fontSize: "15px", fontWeight: 700, marginTop: "6px" }}>
        📚 Historial de Anegamientos ({todos.length}) — Inicio zafra vigente: {config.inicioZafra}
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
                  <td style={{ fontSize: "12px", color: "#cbd5e1" }}>{a.observaciones || "—"}</td>
                  <td style={{ fontSize: "12px", color: "#94a3b8" }}>{nombreUsuario(a.usuarioId)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL EXTENSIÓN 2c: LOTE NO PENDIENTE */}
      {modalConfirmarNoPendiente && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>⚠️ Confirmar Registro en Lote No Pendiente</h3>
              <button
                onClick={() => setModalConfirmarNoPendiente(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "20px", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "13.5px" }}>
                Alguno de los lotes seleccionados no está en estado <b>Pendiente</b> (por ejemplo, ya cosechado o en descanso).
                El registro igual impactará en el historial de vulnerabilidad (CU05 2c). ¿Deseás continuar?
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

      {/* MODAL CERRAR ANEGAMIENTO (CU05 1a) */}
      {anegamientoACerrar && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>✅ Cerrar Anegamiento — {anegamientoACerrar.loteCodigo}</h3>
              <button
                onClick={() => setAnegamientoACerrar(null)}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "20px", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "13px", color: "#cbd5e1" }}>
                Inicio del anegamiento: <b>{new Date(anegamientoACerrar.fechaInicio).toLocaleString()}</b>.
                Al cerrar, el lote vuelve a estado <b>Pendiente</b> y se recalcula su semáforo.
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
