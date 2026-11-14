import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Camino,
  CAMINO_LABELS,
  CATEGORIA_LABELS,
  Drenaje,
  DRENAJE_LABELS,
  ESTADO_LOTE_META,
  EstadoLote,
  Rol,
  ROL_META,
  Suelo,
  SUELO_LABELS
} from "../domain/enums.js";
import {
  GestorAnegamientos,
  GestorAtributos,
  GestorConfiguracion,
  GestorIndice,
  GestorLotes,
  GestorUsuarios,
  GestorZonas
} from "../services/gestores.js";

function formatFecha(iso) {
  if (!iso) return "-";
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

function nombreUsuario(usuarioId) {
  if (!usuarioId) return "Sistema";
  const u = GestorUsuarios.obtenerPorId(usuarioId);
  return u ? u.nombre : usuarioId;
}

// ==========================================
// BOUNDARY UML: InterfazLotes (CU03)
// ==========================================
export function InterfazLotes({ usuario, onDatosCambiados, onToast, versionDatos }) {
  const mapContainerId = "map-admin-lotes";
  const mapRef = useRef(null);
  const layersRef = useRef([]);

  const zonas = useMemo(() => {
    void versionDatos;
    return GestorZonas.listarZonas();
  }, [versionDatos]);

  const [filtroZona, setFiltroZona] = useState("TODAS");
  const [filtroEstado, setFiltroEstado] = useState("TODOS");

  const lotes = useMemo(() => {
    void versionDatos;
    return GestorLotes.listarLotes({ zonaCodigo: filtroZona, estado: filtroEstado });
  }, [filtroZona, filtroEstado, versionDatos]);

  const todosLotes = useMemo(() => {
    void versionDatos;
    return GestorLotes.listarLotes();
  }, [versionDatos]);

  const [modoForm, setModoForm] = useState("crear"); // "crear" | "editar"
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [hectareas, setHectareas] = useState("");
  const [toneladas, setToneladas] = useState("");
  const [zonaCodigo, setZonaCodigo] = useState(() => zonas[0]?.codigo || "ZN-NORTE");
  const [poligono, setPoligono] = useState([]);
  const [modoDibujo, setModoDibujo] = useState(false);

  const [modalEstadoLote, setModalEstadoLote] = useState(null);
  const [nuevoEstado, setNuevoEstado] = useState(EstadoLote.PENDIENTE);
  const [motivoEstado, setMotivoEstado] = useState("");

  const [modalDescansoLote, setModalDescansoLote] = useState(null);
  const [mensajeDescanso, setMensajeDescanso] = useState("");

  useEffect(() => {
    if (!zonaCodigo && zonas.length > 0) {
      setZonaCodigo(zonas[0].codigo);
    }
  }, [zonas, zonaCodigo]);

  // Evaluación geométrica y de superficie en tiempo real (Compendio 4.12)
  const poligonoValido = useMemo(
    () => (poligono.length === 0 ? true : GestorLotes.validarPoligono(poligono)),
    [poligono]
  );

  const areaControl = useMemo(() => {
    if (poligono.length < 3) {
      return { areaCalculadaHa: 0, diferenciaPct: 0, superaUmbral: false };
    }
    return GestorLotes.controlarDiferenciaArea(Number(hectareas) || 0, poligono);
  }, [hectareas, poligono]);

  const superposicion = useMemo(() => {
    if (poligono.length < 3) return false;
    return GestorLotes.superponeConOtro(poligono, modoForm === "editar" ? codigo : null);
  }, [poligono, modoForm, codigo, versionDatos]);

  // Inicializar mapa Leaflet para dibujo de polígonos
  useEffect(() => {
    if (!window.L || mapRef.current) return;
    const L = window.L;
    const map = L.map(mapContainerId, { scrollWheelZoom: true }).setView([-24.228, -64.842], 12);
    mapRef.current = map;

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Esri World Imagery", maxZoom: 18 }
    ).addTo(map);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Click en mapa para dibujar vértices cuando modoDibujo está activo
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleClick = (e) => {
      if (!modoDibujo) return;
      const lat = Number(e.latlng.lat.toFixed(6));
      const lng = Number(e.latlng.lng.toFixed(6));
      setPoligono((prev) => [...prev, [lat, lng]]);
    };

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [modoDibujo]);

  // Renderizar lotes existentes + polígono en edición
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.L) return;
    const L = window.L;

    layersRef.current.forEach((l) => map.removeLayer(l));
    layersRef.current = [];

    todosLotes.forEach((l) => {
      if (!l.poligono || l.poligono.length < 3) return;
      if (modoForm === "editar" && l.codigo === codigo) return;
      const poly = L.polygon(l.poligono, {
        color: "#94a3b8",
        weight: 1.5,
        fillColor: "#64748b",
        fillOpacity: 0.22
      })
        .addTo(map)
        .bindTooltip(`${l.codigo} (${l.hectareas} ha)`);
      layersRef.current.push(poly);
    });

    if (poligono.length > 0) {
      poligono.forEach((pt, idx) => {
        const marker = L.circleMarker(pt, {
          radius: 5,
          color: "#ffffff",
          weight: 2,
          fillColor: "#38bdf8",
          fillOpacity: 1
        })
          .addTo(map)
          .bindTooltip(`V${idx + 1}`);
        layersRef.current.push(marker);
      });

      if (poligono.length >= 3) {
        const draftColor = !poligonoValido || superposicion ? "#ef4444" : "#10b981";
        const poly = L.polygon(poligono, {
          color: draftColor,
          weight: 2.5,
          dashArray: "5, 5",
          fillColor: draftColor,
          fillOpacity: 0.32
        }).addTo(map);
        layersRef.current.push(poly);
      } else if (poligono.length === 2) {
        const line = L.polyline(poligono, { color: "#38bdf8", weight: 2, dashArray: "4,4" }).addTo(map);
        layersRef.current.push(line);
      }
    }
  }, [todosLotes, poligono, poligonoValido, superposicion, modoForm, codigo]);

  const limpiarFormulario = () => {
    setModoForm("crear");
    setCodigo("");
    setNombre("");
    setHectareas("");
    setToneladas("");
    setZonaCodigo(zonas[0]?.codigo || "ZN-NORTE");
    setPoligono([]);
    setModoDibujo(false);
  };

  const iniciarEdicion = (l) => {
    setModoForm("editar");
    setCodigo(l.codigo);
    setNombre(l.nombre);
    setHectareas(String(l.hectareas));
    setToneladas(String(l.toneladas));
    setZonaCodigo(l.zonaCodigo);
    setPoligono(Array.isArray(l.poligono) ? l.poligono.map((p) => [...p]) : []);
    setModoDibujo(false);
    if (mapRef.current && l.poligono && l.poligono.length >= 3) {
      mapRef.current.fitBounds(l.poligono, { padding: [30, 30] });
    }
  };

  const guardarLote = (e) => {
    e.preventDefault();
    try {
      if (poligono.length > 0 && poligono.length < 3) {
        throw new Error("Si dibujás un polígono en el mapa debe tener al menos 3 vértices.");
      }
      if (!poligonoValido) {
        throw new Error("El polígono dibujado tiene aristas cruzadas. Corregí los vértices.");
      }

      if (modoForm === "crear") {
        const creado = GestorLotes.crearLote(
          { codigo, nombre, hectareas, toneladas, zonaCodigo, poligono },
          usuario
        );
        onToast?.(
          `Lote ${creado.codigo} creado (${creado.hectareas} ha).`,
          superposicion || areaControl.superaUmbral ? "warning" : "success"
        );
      } else {
        const editado = GestorLotes.modificarLote(codigo, {
          nombre,
          hectareas,
          toneladas,
          zonaCodigo,
          poligono
        });
        onToast?.(
          `Lote ${editado.codigo} actualizado.`,
          superposicion || areaControl.superaUmbral ? "warning" : "success"
        );
      }

      limpiarFormulario();
      onDatosCambiados?.();
    } catch (err) {
      onToast?.(err.message, "error");
    }
  };

  const abrirCambioEstado = (l) => {
    setModalEstadoLote(l);
    setNuevoEstado(l.estado);
    setMotivoEstado("");
  };

  const confirmarCambioEstado = (e) => {
    e.preventDefault();
    if (!modalEstadoLote) return;
    try {
      GestorLotes.cambiarEstado(
        modalEstadoLote.codigo,
        nuevoEstado,
        usuario,
        motivoEstado.trim() || "Cambio operativo manual (CU03)"
      );
      setModalEstadoLote(null);
      onDatosCambiados?.();
      onToast?.(
        `Estado de ${modalEstadoLote.codigo} actualizado a ${ESTADO_LOTE_META[nuevoEstado]?.label}.`,
        "success"
      );
    } catch (err) {
      onToast?.(err.message, "error");
    }
  };

  const solicitarBaja = (l) => {
    const res = GestorLotes.darDeBaja(l.codigo, usuario);
    if (res.eliminado) {
      onDatosCambiados?.();
      onToast?.(res.mensaje, "success");
    } else if (res.requiereDescanso) {
      setModalDescansoLote(l);
      setMensajeDescanso(res.mensaje);
    }
  };

  const confirmarPaseADescanso = () => {
    if (!modalDescansoLote) return;
    try {
      GestorLotes.cambiarEstado(
        modalDescansoLote.codigo,
        EstadoLote.EN_DESCANSO,
        usuario,
        "Baja solicitada con historial previo (RN02)"
      );
      setModalDescansoLote(null);
      onDatosCambiados?.();
      onToast?.(
        `Lote ${modalDescansoLote.codigo} pasado a 'En descanso' preservando historial (RN02).`,
        "info"
      );
    } catch (err) {
      onToast?.(err.message, "error");
    }
  };

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "18px",
          marginBottom: "20px"
        }}
      >
        {/* Formulario Alta / Modificación */}
        <div className="section-header-box">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <h3 style={{ margin: 0 }}>
              {modoForm === "crear" ? "➕ Nuevo Lote (CU03)" : `✏️ Editando ${codigo}`}
            </h3>
            {modoForm === "editar" && (
              <button type="button" className="btn-action" onClick={limpiarFormulario}>
                Cancelar edición
              </button>
            )}
          </div>

          <form onSubmit={guardarLote}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div className="form-group">
                <label>Código único (RN01) *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: PUE-18"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                  disabled={modoForm === "editar"}
                  required
                />
              </div>
              <div className="form-group">
                <label>Zona *</label>
                <select
                  className="form-control"
                  value={zonaCodigo}
                  onChange={(e) => setZonaCodigo(e.target.value)}
                  required
                >
                  {zonas.map((z) => (
                    <option key={z.codigo} value={z.codigo}>
                      {z.nombre} ({z.codigo})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Nombre descriptivo *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej: Cañaveral El Talar Sur"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div className="form-group">
                <label>Hectáreas declaradas *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="form-control"
                  placeholder="Ej: 48"
                  value={hectareas}
                  onChange={(e) => setHectareas(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Toneladas estimadas *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  className="form-control"
                  placeholder="Ej: 4200"
                  value={toneladas}
                  onChange={(e) => setToneladas(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Control de superficie Gauss / Shoelace (Compendio 4.12) */}
            {poligono.length >= 3 && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "8px",
                  marginBottom: "10px",
                  background: areaControl.superaUmbral
                    ? "rgba(245, 158, 11, 0.14)"
                    : "rgba(16, 185, 129, 0.1)",
                  border: areaControl.superaUmbral
                    ? "1px solid rgba(245, 158, 11, 0.45)"
                    : "1px solid rgba(16, 185, 129, 0.35)",
                  fontSize: "0.84rem"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                  <span>
                    📐 Área calculada (Gauss): <strong>{areaControl.areaCalculadaHa} ha</strong>
                    {Number(hectareas) > 0 && ` · Diferencia: ${areaControl.diferenciaPct}%`}
                  </span>
                  <button
                    type="button"
                    className="btn-action"
                    onClick={() => setHectareas(String(areaControl.areaCalculadaHa))}
                  >
                    Usar calculada
                  </button>
                </div>
                {areaControl.superaUmbral && (
                  <div style={{ color: "#fde68a", marginTop: "4px" }}>
                    ⚠️ La superficie declarada difiere más del 10% del polígono dibujado (Compendio 4.12).
                  </div>
                )}
              </div>
            )}

            {!poligonoValido && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  marginBottom: "10px",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.45)",
                  color: "#fca5a5",
                  fontSize: "0.84rem"
                }}
              >
                ❌ El polígono tiene segmentos que se cruzan consigo mismo.
              </div>
            )}

            {superposicion && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  marginBottom: "10px",
                  background: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid rgba(245, 158, 11, 0.45)",
                  color: "#fde68a",
                  fontSize: "0.84rem"
                }}
              >
                ⚠️ Advertencia: El polígono se superpone con el lote <strong>{superposicion}</strong>. Revisá los vértices antes de confirmar.
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", flexWrap: "wrap", gap: "8px" }}>
              <span className="subtitle" style={{ fontSize: "0.8rem" }}>
                Vértices: <strong>{poligono.length}</strong> (estado inicial: Pendiente)
              </span>
              <button type="submit" className="btn-primary">
                {modoForm === "crear" ? "✓ Crear Lote" : "✓ Guardar Cambios"}
              </button>
            </div>
          </form>
        </div>

        {/* Herramienta Mapa Polígono */}
        <div className="section-header-box" style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "10px" }}>
            <div>
              <h3 style={{ margin: 0 }}>🗺️ Polígono del Lote</h3>
              <span className="subtitle" style={{ fontSize: "0.8rem" }}>
                {modoDibujo
                  ? "Hacé clic sobre la imagen satelital para agregar vértices en orden."
                  : "Activá 'Dibujar polígono' para marcar el perímetro en el mapa."}
              </span>
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <button
                type="button"
                className={modoDibujo ? "btn-primary" : "btn-action"}
                onClick={() => setModoDibujo((v) => !v)}
              >
                {modoDibujo ? "🟢 Dibujando (pausar)" : "✏️ Dibujar polígono"}
              </button>
              <button
                type="button"
                className="btn-action"
                onClick={() => setPoligono((p) => p.slice(0, -1))}
                disabled={poligono.length === 0}
              >
                ↩ Deshacer
              </button>
              <button
                type="button"
                className="btn-action"
                onClick={() => setPoligono([])}
                disabled={poligono.length === 0}
              >
                🗑 Limpiar
              </button>
            </div>
          </div>

          <div
            id={mapContainerId}
            style={{
              width: "100%",
              height: "320px",
              borderRadius: "10px",
              border: modoDibujo ? "2px solid #38bdf8" : "1px solid var(--border-color)",
              cursor: modoDibujo ? "crosshair" : "grab"
            }}
          />
        </div>
      </div>

      {/* Tabla de Lotes */}
      <div className="section-header-box" style={{ marginBottom: "14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "12px", flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>📋 Padrón de Lotes ({lotes.length})</h3>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <div className="form-group" style={{ margin: 0, minWidth: "180px" }}>
              <label>Zona</label>
              <select className="form-control" value={filtroZona} onChange={(e) => setFiltroZona(e.target.value)}>
                <option value="TODAS">Todas las zonas</option>
                {zonas.map((z) => (
                  <option key={z.codigo} value={z.codigo}>
                    {z.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0, minWidth: "180px" }}>
              <label>Estado operativo</label>
              <select className="form-control" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                <option value="TODOS">Todos los estados</option>
                {Object.values(EstadoLote).map((e) => (
                  <option key={e} value={e}>
                    {ESTADO_LOTE_META[e].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="table-responsive-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Zona</th>
              <th>Hectáreas</th>
              <th>Toneladas</th>
              <th>Atributos</th>
              <th>Estado Operativo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {lotes.map((l) => {
              const meta = ESTADO_LOTE_META[l.estado];
              return (
                <tr key={l.codigo}>
                  <td><strong>{l.codigo}</strong></td>
                  <td>{l.nombre}</td>
                  <td>{l.zonaNombre}</td>
                  <td>{l.hectareas} ha</td>
                  <td>{l.toneladas.toLocaleString("es-AR")} t</td>
                  <td>
                    <span className={`badge-status ${l.completo ? "badge-safe" : "badge-incompleto"}`}>
                      {l.completo ? "Completo" : "Incompleto"}
                    </span>
                  </td>
                  <td>
                    <span className={`badge-status ${meta?.badgeClass || "badge-safe"}`}>
                      {meta?.label || l.estado}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <button type="button" className="btn-action" onClick={() => iniciarEdicion(l)}>
                        Editar
                      </button>
                      <button type="button" className="btn-action" onClick={() => abrirCambioEstado(l)}>
                        Estado
                      </button>
                      <button type="button" className="btn-action" onClick={() => solicitarBaja(l)}>
                        Baja
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal cambio manual de estado operativo (RN07: nunca semáforo manual) */}
      {modalEstadoLote && (
        <div className="modal-overlay" onClick={() => setModalEstadoLote(null)}>
          <div className="modal-card" style={{ padding: "20px", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 8px 0" }}>Cambiar Estado Operativo · {modalEstadoLote.codigo}</h3>
            <p className="subtitle" style={{ fontSize: "0.85rem", marginBottom: "14px" }}>
              Podés cambiar el estado operativo del lote, pero nunca el semáforo de urgencia (RN07: el semáforo es calculado automáticamente por el modelo).
            </p>
            <form onSubmit={confirmarCambioEstado}>
              <div className="form-group">
                <label>Nuevo estado operativo</label>
                <select
                  className="form-control"
                  value={nuevoEstado}
                  onChange={(e) => setNuevoEstado(e.target.value)}
                >
                  {Object.values(EstadoLote).map((est) => (
                    <option key={est} value={est}>
                      {ESTADO_LOTE_META[est].label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Motivo / observación</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: Frente de cosecha asignado hoy"
                  value={motivoEstado}
                  onChange={(e) => setMotivoEstado(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px" }}>
                <button type="button" className="btn-action" onClick={() => setModalEstadoLote(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Confirmar Estado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal RN02: Baja con historial requiere En descanso */}
      {modalDescansoLote && (
        <div className="modal-overlay" onClick={() => setModalDescansoLote(null)}>
          <div className="modal-card" style={{ padding: "20px", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 8px 0" }}>⚠️ Baja Bloqueada por Historial (RN02)</h3>
            <p style={{ fontSize: "0.92rem", marginBottom: "14px" }}>{mensajeDescanso}</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button type="button" className="btn-action" onClick={() => setModalDescansoLote(null)}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={confirmarPaseADescanso}>
                Pasar a &quot;En descanso&quot;
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// BOUNDARY UML: InterfazAtributosLote (CU04)
// ==========================================
export function InterfazAtributosLote({ usuario, onDatosCambiados, onToast, versionDatos }) {
  const lotes = useMemo(() => {
    void versionDatos;
    return GestorLotes.listarLotes();
  }, [versionDatos]);

  const incompletos = useMemo(() => {
    void versionDatos;
    return GestorAtributos.listarIncompletos();
  }, [versionDatos]);

  const config = useMemo(() => {
    void versionDatos;
    return GestorConfiguracion.obtenerVigente();
  }, [versionDatos]);

  const [loteCodigo, setLoteCodigo] = useState(() => incompletos[0]?.codigo || lotes[0]?.codigo || "");
  const loteActual = useMemo(
    () => lotes.find((l) => l.codigo === loteCodigo) || lotes[0] || null,
    [lotes, loteCodigo]
  );

  const [suelo, setSuelo] = useState("");
  const [drenaje, setDrenaje] = useState("");
  const [camino, setCamino] = useState("");

  useEffect(() => {
    if (!loteActual) return;
    setSuelo(loteActual.atributos?.suelo || "");
    setDrenaje(loteActual.atributos?.drenaje || "");
    setCamino(loteActual.atributos?.camino || "");
  }, [loteActual?.codigo, versionDatos]);

  const historial = useMemo(() => {
    void versionDatos;
    return loteActual ? GestorAtributos.historialDe(loteActual.codigo) : [];
  }, [loteActual, versionDatos]);

  const previewIVL = useMemo(() => {
    if (!loteActual || !suelo || !drenaje || !camino) return null;
    const ps = Number(config.puntajesSuelo?.[suelo] ?? 0);
    const pd = Number(config.puntajesDrenaje?.[drenaje] ?? 0);
    const pc = Number(config.puntajesCamino?.[camino] ?? 0);
    const evTot = GestorAnegamientos.contarTotales(loteActual.codigo);
    const evZafra = GestorAnegamientos.contarUltimaZafra(loteActual.codigo, config.inicioZafra);
    const ph = Math.min(evTot / config.topeHistorial, 1) * 100;
    const pz = Math.min(evZafra / config.topeUltimaZafra, 1) * 100;
    const idx = Number(
      (
        config.pesoSuelo * ps +
        config.pesoDrenaje * pd +
        config.pesoCamino * pc +
        config.pesoHistorial * ph +
        config.pesoUltimaZafra * pz
      ).toFixed(1)
    );
    return {
      indice: idx,
      categoria: GestorIndice.categorizar(idx, config),
      ps,
      pd,
      pc,
      evTot,
      evZafra,
      ph: Number(ph.toFixed(1)),
      pz: Number(pz.toFixed(1))
    };
  }, [loteActual, suelo, drenaje, camino, config, versionDatos]);

  const handleGuardar = (e) => {
    e.preventDefault();
    if (!loteActual) return;
    try {
      const res = GestorAtributos.registrarAtributos(
        loteActual.codigo,
        suelo || null,
        drenaje || null,
        camino || null,
        usuario
      );
      onDatosCambiados?.();
      if (res.completo) {
        onToast?.(
          `Atributos de ${loteActual.codigo} guardados (IVL estimado: ${res.indiceEstimado} · ${CATEGORIA_LABELS[res.categoria]}).`,
          "success"
        );
      } else {
        onToast?.(
          `Atributos parciales guardados para ${loteActual.codigo}. Aún faltan campos para completar el lote (RN11).`,
          "warning"
        );
      }
    } catch (err) {
      onToast?.(err.message, "error");
    }
  };

  return (
    <div>
      {incompletos.length > 0 && (
        <div
          className="section-header-box"
          style={{
            marginBottom: "16px",
            border: "1px solid rgba(245, 158, 11, 0.45)",
            background: "rgba(245, 158, 11, 0.08)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <div>
              <strong>⚠️ Lotes con atributos incompletos ({incompletos.length}):</strong>{" "}
              <span className="subtitle">Quedan fuera del ranking hasta completar suelo, drenaje y camino.</span>
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {incompletos.map((l) => (
                <button
                  key={l.codigo}
                  type="button"
                  className={loteCodigo === l.codigo ? "btn-primary" : "btn-action"}
                  onClick={() => setLoteCodigo(l.codigo)}
                >
                  {l.codigo} ({l.nombre})
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "18px", marginBottom: "18px" }}>
        <div className="section-header-box">
          <h3 style={{ margin: "0 0 12px 0" }}>🧱 Registrar Atributos de Vulnerabilidad (CU04)</h3>
          <form onSubmit={handleGuardar}>
            <div className="form-group">
              <label>Seleccionar Lote</label>
              <select
                className="form-control"
                value={loteActual?.codigo || ""}
                onChange={(e) => setLoteCodigo(e.target.value)}
              >
                {lotes.map((l) => (
                  <option key={l.codigo} value={l.codigo}>
                    {l.codigo} — {l.nombre} ({l.completo ? "Completo" : "⚠️ Incompleto"})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Tipo de Suelo</label>
              <select className="form-control" value={suelo} onChange={(e) => setSuelo(e.target.value)}>
                <option value="">-- Sin definir --</option>
                {Object.values(Suelo).map((s) => (
                  <option key={s} value={s}>
                    {SUELO_LABELS[s]} (Puntaje: {config.puntajesSuelo[s]})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Estado de Drenaje</label>
              <select className="form-control" value={drenaje} onChange={(e) => setDrenaje(e.target.value)}>
                <option value="">-- Sin definir --</option>
                {Object.values(Drenaje).map((d) => (
                  <option key={d} value={d}>
                    {DRENAJE_LABELS[d]} (Puntaje: {config.puntajesDrenaje[d]})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Camino de Acceso</label>
              <select className="form-control" value={camino} onChange={(e) => setCamino(e.target.value)}>
                <option value="">-- Sin definir --</option>
                {Object.values(Camino).map((c) => (
                  <option key={c} value={c}>
                    {CAMINO_LABELS[c]} (Puntaje: {config.puntajesCamino[c]})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px" }}>
              <span className="subtitle" style={{ fontSize: "0.8rem" }}>
                RN11: Cada guardado conserva el historial previo.
              </span>
              <button type="submit" className="btn-primary">
                ✓ Guardar Atributos
              </button>
            </div>
          </form>
        </div>

        {/* Vista previa de IVL */}
        <div className="section-header-box">
          <h3 style={{ margin: "0 0 12px 0" }}>🧮 Vista Previa de IVL ({loteActual?.codigo})</h3>
          {previewIVL ? (
            <div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "14px" }}>
                <span style={{ fontSize: "2.2rem", fontWeight: 700 }}>{previewIVL.indice}</span>
                <span className="subtitle">/ 100 pts</span>
                <span className="badge-status badge-warning" style={{ marginLeft: "auto" }}>
                  Categoría {CATEGORIA_LABELS[previewIVL.categoria]}
                </span>
              </div>

              <div style={{ display: "grid", gap: "8px", fontSize: "0.88rem" }}>
                <div>
                  Suelo ({SUELO_LABELS[suelo]}): <strong>{previewIVL.ps}</strong> × {config.pesoSuelo} ={" "}
                  <strong>{(previewIVL.ps * config.pesoSuelo).toFixed(2)}</strong>
                </div>
                <div>
                  Drenaje ({DRENAJE_LABELS[drenaje]}): <strong>{previewIVL.pd}</strong> × {config.pesoDrenaje} ={" "}
                  <strong>{(previewIVL.pd * config.pesoDrenaje).toFixed(2)}</strong>
                </div>
                <div>
                  Camino ({CAMINO_LABELS[camino]}): <strong>{previewIVL.pc}</strong> × {config.pesoCamino} ={" "}
                  <strong>{(previewIVL.pc * config.pesoCamino).toFixed(2)}</strong>
                </div>
                <div>
                  Historial anegamientos ({previewIVL.evTot}/{config.topeHistorial}):{" "}
                  <strong>{previewIVL.ph}</strong> × {config.pesoHistorial} ={" "}
                  <strong>{(previewIVL.ph * config.pesoHistorial).toFixed(2)}</strong>
                </div>
                <div>
                  Última zafra ({previewIVL.evZafra}/{config.topeUltimaZafra}):{" "}
                  <strong>{previewIVL.pz}</strong> × {config.pesoUltimaZafra} ={" "}
                  <strong>{(previewIVL.pz * config.pesoUltimaZafra).toFixed(2)}</strong>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: "18px", borderRadius: "8px", background: "rgba(148,163,184,0.1)", color: "var(--text-secondary)" }}>
              Completá los 3 atributos (suelo, drenaje y camino) para calcular el Índice de Vulnerabilidad por Lluvia (IVL).
              {loteActual && (!suelo || !drenaje || !camino) && (
                <div style={{ marginTop: "8px" }}>
                  Podés guardar un avance parcial, pero el lote figurará en <strong>Lotes incompletos</strong> hasta completarlos.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Historial de cambios (RN11) */}
      <div className="table-responsive-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Fecha y Hora</th>
              <th>Suelo</th>
              <th>Drenaje</th>
              <th>Camino</th>
              <th>Estado</th>
              <th>Registrado por</th>
            </tr>
          </thead>
          <tbody>
            {historial.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "18px" }}>
                  Sin entradas de atributos para {loteActual?.codigo}.
                </td>
              </tr>
            ) : (
              historial.map((h) => (
                <tr key={h.id}>
                  <td>{formatFecha(h.fechaHora)}</td>
                  <td>{h.suelo ? SUELO_LABELS[h.suelo] : "Faltante"}</td>
                  <td>{h.drenaje ? DRENAJE_LABELS[h.drenaje] : "Faltante"}</td>
                  <td>{h.camino ? CAMINO_LABELS[h.camino] : "Faltante"}</td>
                  <td>
                    <span className={`badge-status ${h.estaCompleto() ? "badge-safe" : "badge-incompleto"}`}>
                      {h.estaCompleto() ? "Completo" : "Parcial"}
                    </span>
                  </td>
                  <td>{nombreUsuario(h.usuarioId)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// BOUNDARY UML: InterfazZonas (CU07)
// ==========================================
export function InterfazZonas({ onDatosCambiados, onToast, versionDatos }) {
  const zonas = useMemo(() => {
    void versionDatos;
    return GestorZonas.listarZonas();
  }, [versionDatos]);

  const lotes = useMemo(() => {
    void versionDatos;
    return GestorLotes.listarLotes();
  }, [versionDatos]);

  const pluviometros = useMemo(() => {
    void versionDatos;
    return GestorZonas.listarPluviometros();
  }, [versionDatos]);

  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [latitud, setLatitud] = useState("-24.22");
  const [longitud, setLongitud] = useState("-64.84");
  const [pluvCodigo, setPluvCodigo] = useState("");

  const [zonaEditar, setZonaEditar] = useState(null);
  const [modalPluvZona, setModalPluvZona] = useState(null);
  const [nuevoPluvForm, setNuevoPluvForm] = useState({ codigo: "", latitud: "", longitud: "" });

  const handleCrearZona = (e) => {
    e.preventDefault();
    try {
      const z = GestorZonas.crearZona({
        codigo,
        nombre,
        latitud,
        longitud,
        pluviometroCodigo: pluvCodigo || undefined
      });
      setCodigo("");
      setNombre("");
      setPluvCodigo("");
      onDatosCambiados?.();
      onToast?.(`Zona ${z.nombre} (${z.codigo}) registrada.`, "success");
    } catch (err) {
      onToast?.(err.message, "error");
    }
  };

  const abrirModalPluv = (z) => {
    setModalPluvZona(z);
    setNuevoPluvForm({
      codigo: "",
      latitud: String(z.latitud),
      longitud: String(z.longitud)
    });
  };

  const handleConfirmarPluv = (e) => {
    e.preventDefault();
    if (!modalPluvZona) return;
    try {
      const teniaActivo = Boolean(GestorZonas.pluviometroActivo(modalPluvZona.codigo));
      const p = GestorZonas.registrarPluviometro(modalPluvZona.codigo, nuevoPluvForm);
      setModalPluvZona(null);
      onDatosCambiados?.();
      onToast?.(
        teniaActivo
          ? `Pluviómetro ${p.codigo} instalado en ${modalPluvZona.codigo}. El anterior pasó a inactivo conservando sus lecturas (RN04).`
          : `Pluviómetro ${p.codigo} registrado como activo en ${modalPluvZona.codigo}.`,
        "success"
      );
    } catch (err) {
      onToast?.(err.message, "error");
    }
  };

  const handleDesactivarPluv = (pluv) => {
    GestorZonas.desactivarPluviometro(pluv.codigo);
    onDatosCambiados?.();
    onToast?.(`Pluviómetro ${pluv.codigo} marcado como inactivo (RN04).`, "info");
  };

  const handleDarDeBajaZona = (z) => {
    try {
      GestorZonas.darDeBajaZona(z.codigo);
      onDatosCambiados?.();
      onToast?.(`Zona ${z.codigo} dada de baja.`, "success");
    } catch (err) {
      onToast?.(err.message, "error");
    }
  };

  const handleGuardarEditZona = (e) => {
    e.preventDefault();
    if (!zonaEditar) return;
    try {
      GestorZonas.modificarZona(zonaEditar.codigo, {
        nombre: zonaEditar.nombre,
        latitud: zonaEditar.latitud,
        longitud: zonaEditar.longitud
      });
      setZonaEditar(null);
      onDatosCambiados?.();
      onToast?.(`Zona ${zonaEditar.codigo} actualizada.`, "success");
    } catch (err) {
      onToast?.(err.message, "error");
    }
  };

  return (
    <div>
      {/* Crear Zona */}
      <div className="section-header-box" style={{ marginBottom: "18px" }}>
        <h3 style={{ margin: "0 0 12px 0" }}>📍 Nueva Zona Agroclimática y Pluviómetro (CU07)</h3>
        <form onSubmit={handleCrearZona}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "10px" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Código *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej: ZN-SUR"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                required
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Nombre *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej: Zona Sur"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Latitud *</label>
              <input
                type="number"
                step="0.0001"
                className="form-control"
                value={latitud}
                onChange={(e) => setLatitud(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Longitud *</label>
              <input
                type="number"
                step="0.0001"
                className="form-control"
                value={longitud}
                onChange={(e) => setLongitud(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Pluviómetro inicial (opcional)</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej: PLUV-SUR-01"
                value={pluvCodigo}
                onChange={(e) => setPluvCodigo(e.target.value.toUpperCase())}
              />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
            <button type="submit" className="btn-primary">
              + Registrar Zona
            </button>
          </div>
        </form>
      </div>

      {/* Tabla de Zonas */}
      <div className="table-responsive-wrapper" style={{ marginBottom: "18px" }}>
        <table className="custom-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Coordenadas Ref.</th>
              <th>Lotes asignados</th>
              <th>Pluviómetro activo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {zonas.map((z) => {
              const activo = GestorZonas.pluviometroActivo(z.codigo);
              const cantLotes = lotes.filter((l) => l.zonaCodigo === z.codigo).length;
              return (
                <tr key={z.codigo}>
                  <td><strong>{z.codigo}</strong></td>
                  <td>{z.nombre}</td>
                  <td>{z.latitud}, {z.longitud}</td>
                  <td>{cantLotes} lote(s)</td>
                  <td>
                    {activo ? (
                      <span className="badge-status badge-safe">🌧️ {activo.codigo}</span>
                    ) : (
                      <span className="badge-status badge-incompleto">Sin activo</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <button type="button" className="btn-action" onClick={() => setZonaEditar({ ...z })}>
                        Editar
                      </button>
                      <button type="button" className="btn-action" onClick={() => abrirModalPluv(z)}>
                        {activo ? "Reemplazar pluv." : "Asignar pluv."}
                      </button>
                      {activo && (
                        <button type="button" className="btn-action" onClick={() => handleDesactivarPluv(activo)}>
                          Desactivar pluv.
                        </button>
                      )}
                      <button type="button" className="btn-action" onClick={() => handleDarDeBajaZona(z)}>
                        Baja zona
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Historial de Pluviómetros (RN04) */}
      <div className="section-header-box">
        <h3 style={{ margin: "0 0 10px 0" }}>🌧️ Inventario e Historial de Pluviómetros (RN04)</h3>
        <div className="table-responsive-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Zona</th>
                <th>Coordenadas</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {pluviometros.map((p) => (
                <tr key={p.codigo}>
                  <td><strong>{p.codigo}</strong></td>
                  <td>{p.zonaCodigo}</td>
                  <td>{p.latitud}, {p.longitud}</td>
                  <td>
                    <span className={`badge-status ${p.activo ? "badge-safe" : "badge-harvested"}`}>
                      {p.activo ? "Activo" : "Inactivo (histórico preservado)"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal editar zona */}
      {zonaEditar && (
        <div className="modal-overlay" onClick={() => setZonaEditar(null)}>
          <div className="modal-card" style={{ padding: "20px", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 12px 0" }}>Editar Zona {zonaEditar.codigo}</h3>
            <form onSubmit={handleGuardarEditZona}>
              <div className="form-group">
                <label>Nombre</label>
                <input
                  type="text"
                  className="form-control"
                  value={zonaEditar.nombre}
                  onChange={(e) => setZonaEditar((z) => ({ ...z, nombre: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Latitud</label>
                <input
                  type="number"
                  step="0.0001"
                  className="form-control"
                  value={zonaEditar.latitud}
                  onChange={(e) => setZonaEditar((z) => ({ ...z, latitud: e.target.value }))}
                  required
                />
              </div>
              <div className="form-group">
                <label>Longitud</label>
                <input
                  type="number"
                  step="0.0001"
                  className="form-control"
                  value={zonaEditar.longitud}
                  onChange={(e) => setZonaEditar((z) => ({ ...z, longitud: e.target.value }))}
                  required
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px" }}>
                <button type="button" className="btn-action" onClick={() => setZonaEditar(null)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal asignar/reemplazar pluviómetro (RN04) */}
      {modalPluvZona && (
        <div className="modal-overlay" onClick={() => setModalPluvZona(null)}>
          <div className="modal-card" style={{ padding: "20px", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            {(() => {
              const actual = GestorZonas.pluviometroActivo(modalPluvZona.codigo);
              return (
                <>
                  <h3 style={{ margin: "0 0 8px 0" }}>
                    {actual ? `Reemplazar Pluviómetro en ${modalPluvZona.nombre}` : `Asignar Pluviómetro en ${modalPluvZona.nombre}`}
                  </h3>
                  {actual && (
                    <div
                      style={{
                        padding: "10px",
                        borderRadius: "8px",
                        background: "rgba(245, 158, 11, 0.14)",
                        border: "1px solid rgba(245, 158, 11, 0.45)",
                        color: "#fde68a",
                        fontSize: "0.85rem",
                        marginBottom: "12px"
                      }}
                    >
                      ⚠️ Esta zona ya tiene el pluviómetro activo <strong>{actual.codigo}</strong>. Al confirmar el reemplazo, el anterior quedará como <strong>inactivo</strong> (no se elimina) conservando todas sus lecturas históricas (RN04).
                    </div>
                  )}
                  <form onSubmit={handleConfirmarPluv}>
                    <div className="form-group">
                      <label>Código del nuevo pluviómetro *</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Ej: PLUV-NOR-02"
                        value={nuevoPluvForm.codigo}
                        onChange={(e) => setNuevoPluvForm((f) => ({ ...f, codigo: e.target.value.toUpperCase() }))}
                        required
                      />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div className="form-group">
                        <label>Latitud</label>
                        <input
                          type="number"
                          step="0.0001"
                          className="form-control"
                          value={nuevoPluvForm.latitud}
                          onChange={(e) => setNuevoPluvForm((f) => ({ ...f, latitud: e.target.value }))}
                        />
                      </div>
                      <div className="form-group">
                        <label>Longitud</label>
                        <input
                          type="number"
                          step="0.0001"
                          className="form-control"
                          value={nuevoPluvForm.longitud}
                          onChange={(e) => setNuevoPluvForm((f) => ({ ...f, longitud: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px" }}>
                      <button type="button" className="btn-action" onClick={() => setModalPluvZona(null)}>
                        Cancelar
                      </button>
                      <button type="submit" className="btn-primary">
                        {actual ? "Confirmar Reemplazo" : "Registrar Pluviómetro"}
                      </button>
                    </div>
                  </form>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// BOUNDARY UML: InterfazConfiguracion (CU06)
// ==========================================
export function InterfazConfiguracion({ usuario, onDatosCambiados, onToast, versionDatos }) {
  const vigente = useMemo(() => {
    void versionDatos;
    return GestorConfiguracion.obtenerVigente();
  }, [versionDatos]);

  const historial = useMemo(() => {
    void versionDatos;
    return GestorConfiguracion.listarHistorial();
  }, [versionDatos]);

  const [form, setForm] = useState(() => ({ ...vigente }));
  const [confirmRestaurar, setConfirmRestaurar] = useState(false);

  useEffect(() => {
    setForm({
      ...vigente,
      puntajesSuelo: { ...vigente.puntajesSuelo },
      puntajesDrenaje: { ...vigente.puntajesDrenaje },
      puntajesCamino: { ...vigente.puntajesCamino }
    });
  }, [vigente.version, versionDatos]);

  const sumaPesos = useMemo(() => {
    return Number(
      (
        Number(form.pesoSuelo || 0) +
        Number(form.pesoDrenaje || 0) +
        Number(form.pesoCamino || 0) +
        Number(form.pesoHistorial || 0) +
        Number(form.pesoUltimaZafra || 0)
      ).toFixed(4)
    );
  }, [form.pesoSuelo, form.pesoDrenaje, form.pesoCamino, form.pesoHistorial, form.pesoUltimaZafra]);

  const sumaValida = Math.abs(sumaPesos - 1) < 1e-4;

  const updatePuntaje = (tabla, key, val) => {
    setForm((f) => ({
      ...f,
      [tabla]: { ...f[tabla], [key]: Number(val) }
    }));
  };

  const handleGuardar = (e) => {
    e.preventDefault();
    try {
      const nueva = GestorConfiguracion.guardar(form, usuario);
      onDatosCambiados?.();
      onToast?.(`Configuración v${nueva.version} guardada y aplicada al modelo (RN10).`, "success");
    } catch (err) {
      onToast?.(err.message, "error");
    }
  };

  const handleRestaurar = () => {
    try {
      const nueva = GestorConfiguracion.restaurarPorDefecto(usuario);
      setConfirmRestaurar(false);
      onDatosCambiados?.();
      onToast?.(`Parámetros restaurados en versión v${nueva.version} (Compendio Parte 3).`, "info");
    } catch (err) {
      onToast?.(err.message, "error");
    }
  };

  return (
    <div>
      <form onSubmit={handleGuardar}>
        <div className="section-header-box" style={{ marginBottom: "18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
            <div>
              <h3 style={{ margin: "0 0 4px 0" }}>⚙️ Parámetros del Modelo (CU06 · Versión vigente v{vigente.version})</h3>
              <span className="subtitle" style={{ fontSize: "0.82rem" }}>
                Cada modificación genera una nueva versión auditada (RN10).
              </span>
            </div>
            <span className={`badge-status ${sumaValida ? "badge-safe" : "badge-urgent"}`}>
              Suma de pesos: {sumaPesos} {sumaValida ? "✓ (= 1.00)" : "⚠️ Debe sumar 1.00 (RN06)"}
            </span>
          </div>

          <h4 style={{ margin: "0 0 8px 0" }}>1. Pesos del Índice de Vulnerabilidad por Lluvia (IVL)</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "10px", marginBottom: "16px" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Peso Suelo (w_s)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                className="form-control"
                value={form.pesoSuelo}
                onChange={(e) => setForm((f) => ({ ...f, pesoSuelo: Number(e.target.value) }))}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Peso Drenaje (w_d)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                className="form-control"
                value={form.pesoDrenaje}
                onChange={(e) => setForm((f) => ({ ...f, pesoDrenaje: Number(e.target.value) }))}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Peso Camino (w_c)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                className="form-control"
                value={form.pesoCamino}
                onChange={(e) => setForm((f) => ({ ...f, pesoCamino: Number(e.target.value) }))}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Peso Historial (w_h)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                className="form-control"
                value={form.pesoHistorial}
                onChange={(e) => setForm((f) => ({ ...f, pesoHistorial: Number(e.target.value) }))}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Peso Última Zafra (w_z)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                className="form-control"
                value={form.pesoUltimaZafra}
                onChange={(e) => setForm((f) => ({ ...f, pesoUltimaZafra: Number(e.target.value) }))}
              />
            </div>
          </div>

          <h4 style={{ margin: "0 0 8px 0" }}>2. Tablas de Puntaje (0 a 100 pts)</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px", marginBottom: "16px" }}>
            <div style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <strong>Suelo</strong>
              {Object.values(Suelo).map((k) => (
                <div className="form-group" key={k} style={{ margin: "6px 0 0 0" }}>
                  <label>{SUELO_LABELS[k]}</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="form-control"
                    value={form.puntajesSuelo?.[k] ?? 0}
                    onChange={(e) => updatePuntaje("puntajesSuelo", k, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <strong>Drenaje</strong>
              {Object.values(Drenaje).map((k) => (
                <div className="form-group" key={k} style={{ margin: "6px 0 0 0" }}>
                  <label>{DRENAJE_LABELS[k]}</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="form-control"
                    value={form.puntajesDrenaje?.[k] ?? 0}
                    onChange={(e) => updatePuntaje("puntajesDrenaje", k, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div style={{ padding: "10px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <strong>Camino de Acceso</strong>
              {Object.values(Camino).map((k) => (
                <div className="form-group" key={k} style={{ margin: "6px 0 0 0" }}>
                  <label>{CAMINO_LABELS[k]}</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="form-control"
                    value={form.puntajesCamino?.[k] ?? 0}
                    onChange={(e) => updatePuntaje("puntajesCamino", k, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <h4 style={{ margin: "0 0 8px 0" }}>3. Topes, Lluvia Crítica, Ventanas y Umbrales</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: "10px", marginBottom: "16px" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Tope Historial (eventos)</label>
              <input
                type="number"
                min="1"
                className="form-control"
                value={form.topeHistorial}
                onChange={(e) => setForm((f) => ({ ...f, topeHistorial: Number(e.target.value) }))}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Tope Última Zafra (eventos)</label>
              <input
                type="number"
                min="1"
                className="form-control"
                value={form.topeUltimaZafra}
                onChange={(e) => setForm((f) => ({ ...f, topeUltimaZafra: Number(e.target.value) }))}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Lluvia Crítica LC (mm)</label>
              <input
                type="number"
                min="1"
                className="form-control"
                value={form.lluviaCriticaMm}
                onChange={(e) => setForm((f) => ({ ...f, lluviaCriticaMm: Number(e.target.value) }))}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Ventana Lluvia (horas)</label>
              <select
                className="form-control"
                value={form.ventanaLluviaHoras}
                onChange={(e) => setForm((f) => ({ ...f, ventanaLluviaHoras: Number(e.target.value) }))}
              >
                <option value={24}>24 h</option>
                <option value={48}>48 h</option>
                <option value={72}>72 h</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Horizonte Pronóstico (horas)</label>
              <select
                className="form-control"
                value={form.horizontePronosticoHoras}
                onChange={(e) => setForm((f) => ({ ...f, horizontePronosticoHoras: Number(e.target.value) }))}
              >
                <option value={24}>24 h</option>
                <option value={48}>48 h</option>
                <option value={72}>72 h</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Inicio de Zafra</label>
              <input
                type="date"
                className="form-control"
                value={form.inicioZafra}
                onChange={(e) => setForm((f) => ({ ...f, inicioZafra: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Umbral Cat. Media (pts)</label>
              <input
                type="number"
                min="1"
                max="99"
                className="form-control"
                value={form.umbralCategoriaMedia}
                onChange={(e) => setForm((f) => ({ ...f, umbralCategoriaMedia: Number(e.target.value) }))}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Umbral Cat. Alta (pts)</label>
              <input
                type="number"
                min="1"
                max="100"
                className="form-control"
                value={form.umbralCategoriaAlta}
                onChange={(e) => setForm((f) => ({ ...f, umbralCategoriaAlta: Number(e.target.value) }))}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Umbral Semáforo Amarillo</label>
              <input
                type="number"
                min="1"
                max="99"
                className="form-control"
                value={form.umbralSemaforoAmarillo}
                onChange={(e) => setForm((f) => ({ ...f, umbralSemaforoAmarillo: Number(e.target.value) }))}
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Umbral Semáforo Rojo</label>
              <input
                type="number"
                min="1"
                max="100"
                className="form-control"
                value={form.umbralSemaforoRojo}
                onChange={(e) => setForm((f) => ({ ...f, umbralSemaforoRojo: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <button type="button" className="btn-action" onClick={() => setConfirmRestaurar(true)}>
              ↺ Restaurar valores iniciales
            </button>
            <button type="submit" className="btn-primary">
              ✓ Guardar Nueva Versión (v{vigente.version + 1})
            </button>
          </div>
        </div>
      </form>

      {/* Historial de configuraciones (RN10) */}
      <div className="section-header-box">
        <h3 style={{ margin: "0 0 10px 0" }}>📜 Historial de Versiones de Configuración (RN10)</h3>
        <div className="table-responsive-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Versión</th>
                <th>Fecha</th>
                <th>Autor</th>
                <th>Pesos (S/D/C/H/Z)</th>
                <th>LC (mm)</th>
                <th>Semáforo (A/R)</th>
                <th>Inicio Zafra</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((c) => (
                <tr key={c.version}>
                  <td>
                    <strong>v{c.version}</strong>{" "}
                    {c.version === vigente.version && <span className="badge-status badge-safe">Vigente</span>}
                  </td>
                  <td>{formatFecha(c.fechaHora)}</td>
                  <td>{nombreUsuario(c.usuarioId)}</td>
                  <td>
                    {c.pesoSuelo}/{c.pesoDrenaje}/{c.pesoCamino}/{c.pesoHistorial}/{c.pesoUltimaZafra}
                  </td>
                  <td>{c.lluviaCriticaMm} mm</td>
                  <td>
                    {c.umbralSemaforoAmarillo} / {c.umbralSemaforoRojo}
                  </td>
                  <td>{c.inicioZafra}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {confirmRestaurar && (
        <div className="modal-overlay" onClick={() => setConfirmRestaurar(false)}>
          <div className="modal-card" style={{ padding: "20px", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 8px 0" }}>↺ Restaurar Valores Iniciales</h3>
            <p style={{ fontSize: "0.9rem", marginBottom: "14px" }}>
              Se creará una nueva versión (v{vigente.version + 1}) con los parámetros originales del Compendio (LC = 60 mm, pesos 0.20/0.25/0.20/0.15/0.20, umbrales 34/67).
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button type="button" className="btn-action" onClick={() => setConfirmRestaurar(false)}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={handleRestaurar}>
                Confirmar Restauración
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// BOUNDARY UML: InterfazUsuarios (CU02)
// ==========================================
export function InterfazUsuarios({ onDatosCambiados, onToast, versionDatos }) {
  const usuarios = useMemo(() => {
    void versionDatos;
    return GestorUsuarios.listarUsuarios();
  }, [versionDatos]);

  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [rol, setRol] = useState(Rol.OPERADOR_CAMPO);
  const [clave, setClave] = useState("123");

  const handleCrearUsuario = (e) => {
    e.preventDefault();
    try {
      const nuevo = GestorUsuarios.crearUsuario(nombre, correo, rol, clave);
      setNombre("");
      setCorreo("");
      setClave("123");
      onDatosCambiados?.();
      onToast?.(`Usuario ${nuevo.nombre} creado con rol ${ROL_META[nuevo.rol].nombre}.`, "success");
    } catch (err) {
      onToast?.(err.message, "error");
    }
  };

  const handleCambiarRol = (u, nuevoRol) => {
    if (u.rol === nuevoRol) return;
    try {
      GestorUsuarios.cambiarRol(u, nuevoRol);
      onDatosCambiados?.();
      onToast?.(`Rol de ${u.nombre} actualizado a ${ROL_META[nuevoRol].nombre}.`, "success");
    } catch (err) {
      onToast?.(err.message, "error");
    }
  };

  const handleToggleEstado = (u) => {
    try {
      if (u.habilitado) {
        GestorUsuarios.deshabilitar(u);
        onToast?.(`Usuario ${u.nombre} deshabilitado.`, "info");
      } else {
        GestorUsuarios.habilitar(u);
        onToast?.(`Usuario ${u.nombre} habilitado.`, "success");
      }
      onDatosCambiados?.();
    } catch (err) {
      onToast?.(err.message, "error");
    }
  };

  return (
    <div>
      <div className="section-header-box" style={{ marginBottom: "18px" }}>
        <h3 style={{ margin: "0 0 12px 0" }}>👥 Nuevo Usuario y Asignación de Rol (CU02)</h3>
        <form onSubmit={handleCrearUsuario}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Nombre completo *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ej: Laura Méndez"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Correo electrónico *</label>
              <input
                type="email"
                className="form-control"
                placeholder="laura@esperanza.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Rol en el sistema *</label>
              <select className="form-control" value={rol} onChange={(e) => setRol(e.target.value)}>
                {Object.values(Rol).map((r) => (
                  <option key={r} value={r}>
                    {ROL_META[r].avatar} {ROL_META[r].nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Clave inicial</label>
              <input
                type="text"
                className="form-control"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                required
              />
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
            <button type="submit" className="btn-primary">
              + Crear Usuario
            </button>
          </div>
        </form>
      </div>

      <div className="table-responsive-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol asignado</th>
              <th>Estado</th>
              <th>Protección RN05</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const esUltimoAdmin = GestorUsuarios.esUltimoAdministrador(u);
              return (
                <tr key={u.id}>
                  <td><strong>{u.nombre}</strong></td>
                  <td>{u.correo}</td>
                  <td>
                    <select
                      className="form-control"
                      value={u.rol}
                      onChange={(e) => handleCambiarRol(u, e.target.value)}
                      style={{ minWidth: "190px" }}
                    >
                      {Object.values(Rol).map((r) => (
                        <option key={r} value={r}>
                          {ROL_META[r].nombre}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className={`badge-status ${u.habilitado ? "badge-safe" : "badge-urgent"}`}>
                      {u.habilitado ? "Habilitado" : "Deshabilitado"}
                    </span>
                  </td>
                  <td>
                    {esUltimoAdmin ? (
                      <span className="subtitle" style={{ fontSize: "0.78rem", color: "#fde68a" }}>
                        🛡️ Último Admin activo
                      </span>
                    ) : (
                      <span className="subtitle" style={{ fontSize: "0.78rem" }}>-</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-action"
                      onClick={() => handleToggleEstado(u)}
                    >
                      {u.habilitado ? "Deshabilitar" : "Habilitar"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==========================================
// VISTA ADMINISTRACIÓN CON 5 PESTAÑAS UML
// ==========================================
export default function AdministracionView({
  usuario,
  onDatosCambiados,
  onToast,
  versionDatos
}) {
  const [tab, setTab] = useState("lotes");

  const tabs = [
    { id: "lotes", label: "🌾 Lotes y Polígonos (CU03)" },
    { id: "atributos", label: "🧱 Atributos IVL (CU04)" },
    { id: "zonas", label: "📍 Zonas y Pluviómetros (CU07)" },
    { id: "config", label: "⚙️ Parámetros Modelo (CU06)" },
    { id: "usuarios", label: "👥 Usuarios y Roles (CU02)" }
  ];

  return (
    <div className="view-container">
      <div className="section-header-box" style={{ marginBottom: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ margin: "0 0 4px 0" }}>⚙️ Panel de Administración</h1>
            <p className="subtitle" style={{ margin: 0 }}>
              Gestión estructural del sistema PluviaZafra: catastro de lotes, atributos, zonas agroclimáticas, parámetros y cuentas.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px" }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={tab === t.id ? "btn-primary" : "btn-action"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "lotes" && (
        <InterfazLotes
          usuario={usuario}
          onDatosCambiados={onDatosCambiados}
          onToast={onToast}
          versionDatos={versionDatos}
        />
      )}
      {tab === "atributos" && (
        <InterfazAtributosLote
          usuario={usuario}
          onDatosCambiados={onDatosCambiados}
          onToast={onToast}
          versionDatos={versionDatos}
        />
      )}
      {tab === "zonas" && (
        <InterfazZonas
          onDatosCambiados={onDatosCambiados}
          onToast={onToast}
          versionDatos={versionDatos}
        />
      )}
      {tab === "config" && (
        <InterfazConfiguracion
          usuario={usuario}
          onDatosCambiados={onDatosCambiados}
          onToast={onToast}
          versionDatos={versionDatos}
        />
      )}
      {tab === "usuarios" && (
        <InterfazUsuarios
          onDatosCambiados={onDatosCambiados}
          onToast={onToast}
          versionDatos={versionDatos}
        />
      )}
    </div>
  );
}
