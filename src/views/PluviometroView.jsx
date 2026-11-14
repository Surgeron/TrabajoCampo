import React, { useState, useMemo } from "react";
import {
  GestorZonas,
  GestorLecturas,
  GestorConfiguracion,
  GestorUsuarios
} from "../services/gestores";
import "./PluviometroView.css";

function isoALocalInput(isoStr) {
  const d = isoStr ? new Date(isoStr) : new Date();
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

function fechaLocalInputAhora() {
  return isoALocalInput();
}

export default function PluviometroView({
  usuario,
  onDatosCambiados,
  onMarcarAnegamiento,
  onToast,
  versionDatos
}) {
  const zonas = useMemo(() => GestorZonas.listarZonas(), [versionDatos]);
  const config = useMemo(() => GestorConfiguracion.obtenerVigente(), [versionDatos]);
  const usuarios = useMemo(() => GestorUsuarios.listarUsuarios(), [versionDatos]);

  const [zonaCodigo, setZonaCodigo] = useState(zonas[0]?.codigo || "");
  const [milimetros, setMilimetros] = useState("15");
  const [fechaHora, setFechaHora] = useState(fechaLocalInputAhora());
  const [errorMsg, setErrorMsg] = useState("");
  const [ultimoAcumulado, setUltimoAcumulado] = useState(null);

  // Modales de confirmación (>300 mm) y duplicada
  const [modalValorAlto, setModalValorAlto] = useState(false);
  const [lecturaDuplicada, setLecturaDuplicada] = useState(null);

  // Modal de edición de lectura
  const [lecturaEditar, setLecturaEditar] = useState(null);
  const [editMm, setEditMm] = useState("");
  const [editFechaHora, setEditFechaHora] = useState("");
  const [editError, setEditError] = useState("");

  const lecturas = useMemo(() => GestorLecturas.listarLecturas(), [versionDatos]);
  const pluvActivo = useMemo(
    () => (zonaCodigo ? GestorZonas.pluviometroActivo(zonaCodigo) : null),
    [zonaCodigo, versionDatos]
  );
  const acumuladoActualZona = useMemo(() => {
    if (!zonaCodigo) return { mm: 0, cantidadLecturas: 0, sinLecturas: true };
    return GestorLecturas.acumuladoZona(zonaCodigo, config.ventanaLluviaHoras);
  }, [zonaCodigo, config.ventanaLluviaHoras, versionDatos]);

  const ejecutarGuardado = () => {
    try {
      const res = GestorLecturas.registrarLectura(
        zonaCodigo,
        fechaHora,
        Number(milimetros),
        usuario
      );
      setUltimoAcumulado({
        zonaNombre: zonas.find((z) => z.codigo === zonaCodigo)?.nombre || zonaCodigo,
        ...res.acumulado
      });
      setModalValorAlto(false);
      setLecturaDuplicada(null);
      setErrorMsg("");
      setMilimetros("0");
      setFechaHora(fechaLocalInputAhora());
      if (onDatosCambiados) onDatosCambiados();
      if (onToast) {
        onToast(
          `Lectura registrada (${res.lectura.milimetros} mm). Acumulado ${config.ventanaLluviaHoras}h: ${res.acumulado.mm} mm.`
        );
      }
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");

    const validacion = GestorLecturas.validarLectura(zonaCodigo, fechaHora, milimetros);
    if (!validacion.valida) {
      setErrorMsg(validacion.errores.join(" "));
      return;
    }

    if (validacion.requiereConfirmacionValorAlto) {
      setModalValorAlto(true);
      return;
    }

    if (validacion.lecturaExistente) {
      setLecturaDuplicada(validacion.lecturaExistente);
      return;
    }

    ejecutarGuardado();
  };

  const confirmarValorAlto = () => {
    setModalValorAlto(false);
    const duplicada = GestorLecturas.existeLectura(zonaCodigo, fechaHora);
    if (duplicada) {
      setLecturaDuplicada(duplicada);
      return;
    }
    ejecutarGuardado();
  };

  const confirmarReemplazo = () => {
    if (!lecturaDuplicada) return;
    try {
      const res = GestorLecturas.reemplazarLectura(
        lecturaDuplicada,
        Number(milimetros),
        usuario
      );
      setUltimoAcumulado({
        zonaNombre: zonas.find((z) => z.codigo === zonaCodigo)?.nombre || zonaCodigo,
        ...res.acumulado
      });
      setLecturaDuplicada(null);
      setErrorMsg("");
      if (onDatosCambiados) onDatosCambiados();
      if (onToast) {
        onToast(`Lectura reemplazada correctamente. Acumulado: ${res.acumulado.mm} mm.`);
      }
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const nombreUsuario = (uid) => usuarios.find((u) => u.id === uid)?.nombre || uid || "Sistema";
  const nombreZona = (zc) => zonas.find((z) => z.codigo === zc)?.nombre || zc;

  const abrirEditarLectura = (l) => {
    setLecturaEditar(l);
    setEditMm(String(l.milimetros));
    setEditFechaHora(isoALocalInput(l.fechaHora));
    setEditError("");
  };

  const guardarEdicionLectura = (e) => {
    e.preventDefault();
    setEditError("");
    try {
      const res = GestorLecturas.modificarLectura(
        lecturaEditar,
        {
          milimetros: Number(editMm),
          fechaHora: new Date(editFechaHora).toISOString()
        },
        usuario
      );
      setLecturaEditar(null);
      onDatosCambiados();
      onToast(`Lectura actualizada. Acumulado en zona: ${res.acumulado.mm} mm.`, "success");
    } catch (err) {
      setEditError(err.message);
    }
  };

  return (
    <div className="view-container" style={{ padding: "16px 24px", maxWidth: "940px", margin: "0 auto", width: "100%" }}>
      <div className="section-header-box" style={{ flexDirection: "column", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "28px" }}>🌧️</span>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 800 }}>
              Registrar Lectura de Pluviómetro
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Carga manual de milímetros de lluvia por zona · Ventana de acumulación vigente:{" "}
              <b>{config.ventanaLluviaHoras} horas</b>.
            </p>
          </div>
        </div>
      </div>

      {/* FORMULARIO */}
      <div className="field-card" style={{ marginBottom: "8px" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {errorMsg && (
            <div className="login-error-alert" style={{ marginBottom: 0 }}>
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
            <div className="form-group">
              <label>Zona (pluviómetro activo):</label>
              <select
                className="form-control"
                value={zonaCodigo}
                onChange={(e) => setZonaCodigo(e.target.value)}
              >
                {zonas.map((z) => {
                  const pluv = GestorZonas.pluviometroActivo(z.codigo);
                  return (
                    <option key={z.codigo} value={z.codigo}>
                      {z.nombre} ({pluv ? pluv.codigo : "Sin pluviómetro"})
                    </option>
                  );
                })}
              </select>
              {!pluvActivo && (
                <span style={{ fontSize: "11.5px", color: "#f87171" }}>
                  ⚠️ Esta zona no tiene un pluviómetro activo asignado.
                </span>
              )}
            </div>

            <div className="form-group">
              <label>Fecha y Hora de la lectura:</label>
              <input
                type="datetime-local"
                className="form-control"
                value={fechaHora}
                onChange={(e) => setFechaHora(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Milímetros leídos (mm):</label>
              <input
                type="number"
                step="0.5"
                className="form-control"
                style={{ fontSize: "18px", fontWeight: 800, fontFamily: "JetBrains Mono" }}
                value={milimetros}
                onChange={(e) => setMilimetros(e.target.value)}
                required
              />
            </div>
          </div>

          <div
            className="inset-box"
            style={{
              padding: "10px 14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px"
            }}
          >
            <span style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>
              Acumulado vigente de <b>{nombreZona(zonaCodigo)}</b> ({config.ventanaLluviaHoras} h):{" "}
              <b style={{ fontFamily: "JetBrains Mono", color: "var(--bordo-light)" }}>
                {acumuladoActualZona.mm} mm
              </b>{" "}
              ({acumuladoActualZona.cantidadLecturas} lecturas)
            </span>
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Cargado por: <b>{usuario?.nombre}</b>
            </span>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              type="submit"
              className="btn-action btn-primary"
              disabled={!pluvActivo}
              style={{ flex: 1, minHeight: "46px", justifyContent: "center", fontSize: "14px" }}
            >
              💾 Guardar Lectura de Pluviómetro
            </button>

            {onMarcarAnegamiento && (
              <button
                type="button"
                className="btn-action"
                style={{
                  minHeight: "46px",
                  borderColor: "var(--bordo-bright)",
                  color: "var(--bordo-light)",
                  background: "rgba(158, 28, 56, 0.14)"
                }}
                onClick={() => onMarcarAnegamiento(zonaCodigo)}
              >
                🌊 Observé un lote intransitable
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ACUMULADO TRAS GUARDAR */}
      {ultimoAcumulado && (
        <div
          className="alert-banner"
          style={{
            background: "rgba(22, 163, 74, 0.14)",
            border: "1px solid var(--color-green)",
            padding: "12px 16px"
          }}
        >
          <span style={{ fontSize: "13px", color: "#dcfce7" }}>
            ✅ <b>Acumulado actualizado en {ultimoAcumulado.zonaNombre}:</b>{" "}
            <b style={{ fontFamily: "JetBrains Mono", fontSize: "15px" }}>
              {ultimoAcumulado.mm} mm
            </b>{" "}
            en las últimas {config.ventanaLluviaHoras} h ({ultimoAcumulado.cantidadLecturas} lecturas).
          </span>
          {onMarcarAnegamiento && (
            <button
              className="btn-action"
              style={{ minHeight: "32px", fontSize: "12px" }}
              onClick={() => onMarcarAnegamiento(zonaCodigo)}
            >
              🌊 Registrar anegamiento observado
            </button>
          )}
        </div>
      )}

      {/* HISTORIAL DE LECTURAS */}
      <h3 style={{ fontSize: "16px", marginTop: "8px" }}>
        📋 Registro Histórico de Lecturas ({lecturas.length})
      </h3>
      <div className="table-responsive-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Fecha y Hora</th>
              <th>Zona</th>
              <th>Pluviómetro</th>
              <th>Milímetros</th>
              <th>Usuario</th>
              <th style={{ width: "90px" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {lecturas.map((l) => (
              <tr key={l.id}>
                <td>{new Date(l.fechaHora).toLocaleString()}</td>
                <td><b>{nombreZona(l.zonaCodigo)}</b></td>
                <td style={{ fontFamily: "JetBrains Mono", color: "var(--bordo-light)" }}>{l.pluviometroCodigo}</td>
                <td>
                  <b
                    style={{
                      fontFamily: "JetBrains Mono",
                      color: l.milimetros >= 30 ? "#f87171" : l.milimetros >= 15 ? "#fbbf24" : "#34d399"
                    }}
                  >
                    {l.milimetros} mm
                  </b>
                </td>
                <td style={{ fontSize: "12px", color: "var(--text-muted)" }}>{nombreUsuario(l.usuarioId)}</td>
                <td>
                  <button
                    type="button"
                    className="btn-action"
                    style={{ minHeight: "30px", padding: "4px 10px", fontSize: "12px" }}
                    onClick={() => abrirEditarLectura(l)}
                  >
                    ✏️ Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL EDITAR LECTURA */}
      {lecturaEditar && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>✏️ Corregir Lectura ({nombreZona(lecturaEditar.zonaCodigo)})</h3>
              <button
                type="button"
                onClick={() => setLecturaEditar(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "20px", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>
            <form onSubmit={guardarEdicionLectura}>
              <div className="modal-body">
                {editError && (
                  <div className="login-error-alert" style={{ marginBottom: 0 }}>
                    <span>⚠️</span>
                    <span>{editError}</span>
                  </div>
                )}
                <div className="form-group">
                  <label>Pluviómetro</label>
                  <input
                    className="form-control"
                    value={`${lecturaEditar.pluviometroCodigo} · ${nombreZona(lecturaEditar.zonaCodigo)}`}
                    disabled
                  />
                </div>
                <div className="form-group">
                  <label>Fecha y Hora de la lectura</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={editFechaHora}
                    onChange={(e) => setEditFechaHora(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Milímetros leídos (mm)</label>
                  <input
                    type="number"
                    step="0.5"
                    className="form-control"
                    style={{ fontSize: "16px", fontWeight: 800, fontFamily: "JetBrains Mono" }}
                    value={editMm}
                    onChange={(e) => setEditMm(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-action" onClick={() => setLecturaEditar(null)}>
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

      {/* MODAL CONFIRMAR VALOR MAYOR A 300 mm */}
      {modalValorAlto && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>⚠️ Confirmar Valor Inusualmente Alto</h3>
              <button
                onClick={() => setModalValorAlto(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "20px", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "13.5px", color: "var(--text-primary)" }}>
                Ingresaste <b>{milimetros} mm</b>, un registro poco habitual (superior a <b>300 mm</b>).
                ¿Confirmás que el valor es correcto?
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-action" onClick={() => setModalValorAlto(false)}>
                Corregir valor
              </button>
              <button className="btn-action btn-primary" onClick={confirmarValorAlto}>
                Confirmar {milimetros} mm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LECTURA DUPLICADA */}
      {lecturaDuplicada && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3>⚠️ Lectura Existente en la Misma Fecha y Hora</h3>
              <button
                onClick={() => setLecturaDuplicada(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "20px", cursor: "pointer" }}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "13.5px", color: "var(--text-primary)" }}>
                Ya existe una lectura registrada para <b>{nombreZona(zonaCodigo)}</b> en ese horario con{" "}
                <b>{lecturaDuplicada.milimetros} mm</b>. ¿Deseás reemplazarla por{" "}
                <b>{milimetros} mm</b>?
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-action" onClick={() => setLecturaDuplicada(null)}>
                Cancelar
              </button>
              <button className="btn-action btn-primary" onClick={confirmarReemplazo}>
                Reemplazar lectura
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
