import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  GestorLotes,
  GestorZonas,
  GestorLecturas,
  GestorPronostico,
  GestorRanking,
  GestorParadas,
  GestorAnegamientos,
  GestorConfiguracion,
  GestorIndice
} from "../services/gestores";
import {
  EstadoLote,
  Semaforo,
  SEMAFORO_META,
  ESTADO_LOTE_META,
  SUELO_LABELS,
  DRENAJE_LABELS,
  CAMINO_LABELS,
  CATEGORIA_LABELS,
  CAUSA_PARADA_LABELS
} from "../domain/enums";
import "./CentroControlView.css";

// <<interfaz>> InterfazAlertaRiesgo (CU15)
export function InterfazAlertaRiesgo({
  lotesRojos,
  toneladasEnRiesgo,
  esSimulacion,
  pronosticoDesactualizado,
  onAbrirDetalleLote,
  onCerrarAlerta
}) {
  if (!lotesRojos || lotesRojos.length === 0) return null;

  const zonasAfectadas = [...new Set(lotesRojos.map((l) => l.zonaNombre))];

  return (
    <div
      style={{
        margin: "12px 24px 0",
        background: esSimulacion
          ? "linear-gradient(90deg, rgba(153,27,27,0.92), rgba(124,45,18,0.92))"
          : "linear-gradient(90deg, rgba(127,29,29,0.95), rgba(153,27,27,0.88))",
        border: "1px solid #ef4444",
        borderRadius: "12px",
        padding: "14px 18px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        boxShadow: "0 8px 24px rgba(239, 68, 68, 0.25)"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "20px" }}>🚨</span>
            <b style={{ fontSize: "15px", color: "#ffffff" }}>
              ALERTA DE RIESGO (CU15): {lotesRojos.length} lote(s) en Semáforo ROJO —{" "}
              {toneladasEnRiesgo.toLocaleString()} t de caña en riesgo
            </b>
            {esSimulacion && (
              <span className="badge-status badge-warning">Escenario Simulado</span>
            )}
            {pronosticoDesactualizado && (
              <span className="badge-status badge-warning">Pronóstico desactualizado</span>
            )}
          </div>
          <p style={{ fontSize: "12.5px", color: "#fecaca", marginTop: "4px" }}>
            Zonas comprometidas: <b>{zonasAfectadas.join(", ")}</b>. Priorizar cosecha antes de que queden intransitables.
          </p>
        </div>

        <button
          className="btn-action"
          style={{ minHeight: "30px", padding: "4px 10px", fontSize: "12px", background: "rgba(0,0,0,0.3)" }}
          onClick={onCerrarAlerta}
          title="Ocultar alerta hasta el próximo cálculo de ranking"
        >
          ✕ Ocultar
        </button>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {lotesRojos.map((it) => (
          <button
            key={it.loteCodigo}
            className="btn-action"
            style={{
              minHeight: "30px",
              padding: "4px 10px",
              fontSize: "12px",
              background: "rgba(15, 23, 42, 0.75)",
              borderColor: "#fca5a5"
            }}
            onClick={() => onAbrirDetalleLote(it.loteCodigo)}
          >
            🔴 <b>{it.loteCodigo}</b> ({it.toneladas.toLocaleString()} t · Riesgo {it.puntajeRiesgo})
          </button>
        ))}
      </div>
    </div>
  );
}

// <<interfaz>> InterfazSimulador (CU16)
export function InterfazSimulador({
  zonas,
  lluviasPorZona,
  onAjustarLluviaZona,
  onElegirEscenarioRapido,
  onRestablecerDatosReales,
  onCerrarSimulador
}) {
  return (
    <div
      style={{
        margin: "12px 24px 0",
        background: "#162032",
        border: "2px solid #f59e0b",
        borderRadius: "12px",
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "14px"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "20px" }}>🧪</span>
          <div>
            <b style={{ fontSize: "15px", color: "#fbbf24" }}>
              Simulador Interactivo de Precipitaciones (CU16)
            </b>
            <p style={{ fontSize: "12px", color: "#fde68a" }}>
              Modo simulación: los cambios no se guardan ni alteran el ranking oficial ni las lecturas reales (esSimulacion = true).
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            className="btn-action"
            style={{ fontSize: "12px", minHeight: "32px" }}
            onClick={() => onElegirEscenarioRapido("SECO")}
          >
            ☀️ Seco (0 mm)
          </button>
          <button
            className="btn-action"
            style={{ fontSize: "12px", minHeight: "32px" }}
            onClick={() => onElegirEscenarioRapido("MODERADA")}
          >
            🌦️ Lluvia moderada (30 mm)
          </button>
          <button
            className="btn-action"
            style={{ fontSize: "12px", minHeight: "32px", borderColor: "#ef4444", color: "#fca5a5" }}
            onClick={() => onElegirEscenarioRapido("TORMENTA")}
          >
            ⛈️ Tormenta fuerte (70 mm)
          </button>
          <button
            className="btn-action"
            style={{ fontSize: "12px", minHeight: "32px" }}
            onClick={onRestablecerDatosReales}
          >
            🔄 Restablecer datos reales
          </button>
          <button
            className="btn-action btn-logout"
            style={{ fontSize: "12px", minHeight: "32px" }}
            onClick={onCerrarSimulador}
          >
            Salir del simulador
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "12px"
        }}
      >
        {zonas.map((z) => {
          const vals = lluviasPorZona[z.codigo] || { lluviaAcumulada: 0, lluviaPrevista: 0 };
          const total = Number(vals.lluviaAcumulada || 0) + Number(vals.lluviaPrevista || 0);
          return (
            <div
              key={z.codigo}
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
                <b style={{ fontSize: "13px", color: "#f8fafc" }}>{z.nombre}</b>
                <span style={{ fontSize: "11.5px", fontFamily: "JetBrains Mono", color: "#38bdf8" }}>
                  Total: {total} mm
                </span>
              </div>

              <label style={{ fontSize: "11.5px", color: "#cbd5e1", display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Lluvia acumulada (A):</span>
                  <b>{vals.lluviaAcumulada} mm</b>
                </div>
                <input
                  type="range"
                  min="0"
                  max="120"
                  step="1"
                  value={vals.lluviaAcumulada}
                  onChange={(e) =>
                    onAjustarLluviaZona(z.codigo, Number(e.target.value), vals.lluviaPrevista)
                  }
                />
              </label>

              <label style={{ fontSize: "11.5px", color: "#cbd5e1", display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Lluvia prevista (P):</span>
                  <b>{vals.lluviaPrevista} mm</b>
                </div>
                <input
                  type="range"
                  min="0"
                  max="120"
                  step="1"
                  value={vals.lluviaPrevista}
                  onChange={(e) =>
                    onAjustarLluviaZona(z.codigo, vals.lluviaAcumulada, Number(e.target.value))
                  }
                />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Vista unificada para <<interfaz>> InterfazMapa, InterfazRanking, InterfazAlertaRiesgo, InterfazSimulador
export default function CentroControlView({
  usuario,
  rankingOficial,
  onGenerarRanking,
  onIrAAnegamiento,
  onToast,
  versionDatos
}) {
  const mapInstanceRef = useRef(null);
  const polygonLayersRef = useRef({});
  const markerLayersRef = useRef([]);

  const [modoVisual, setModoVisual] = useState("dividido"); // "mapa" | "stats" | "dividido"
  const [loteSeleccionadoCodigo, setLoteSeleccionadoCodigo] = useState(null);
  const [filtroZona, setFiltroZona] = useState("TODAS");
  const [filtroEstado, setFiltroEstado] = useState("TODOS"); // TODOS | ROJO | AMARILLO | VERDE | OPERATIVOS
  const [alertaOcultaParaId, setAlertaOcultaParaId] = useState(null);

  // Estado del Simulador (CU16) - efímero, no persiste
  const [simuladorActivo, setSimuladorActivo] = useState(false);
  const [lluviasSimuladas, setLuviasSimuladas] = useState({});

  const configVigente = useMemo(() => GestorConfiguracion.obtenerVigente(), [versionDatos]);
  const zonas = useMemo(() => GestorZonas.listarZonas(), [versionDatos]);
  const todosLotes = useMemo(() => GestorLotes.listarLotes(), [versionDatos]);
  const paradaAbierta = useMemo(() => GestorParadas.obtenerAbierta(), [versionDatos]);

  // Ranking mostrado (oficial o simulado)
  const rankingActivo = useMemo(() => {
    if (simuladorActivo) {
      return GestorRanking.simularRanking(lluviasSimuladas);
    }
    return rankingOficial;
  }, [simuladorActivo, lluviasSimuladas, rankingOficial]);

  // Al salir de la vista, el simulador se desactiva automáticamente (CU16 6a)
  useEffect(() => {
    return () => {
      setSimuladorActivo(false);
    };
  }, []);

  const abrirSimulador = () => {
    const iniciales = {};
    for (const z of zonas) {
      const acum = GestorLecturas.acumuladoZona(z.codigo, configVigente.ventanaLluviaHoras);
      const pron = GestorPronostico.obtenerUltimoGuardado(z.codigo);
      iniciales[z.codigo] = {
        lluviaAcumulada: acum.mm,
        lluviaPrevista: pron ? pron.milimetrosPrevistos() : 0
      };
    }
    setLuviasSimuladas(iniciales);
    setSimuladorActivo(true);
    setAlertaOcultaParaId(null);
  };

  const ajustarLluviaZona = (zonaCodigo, mmAcum, mmPrev) => {
    const a = Number.isNaN(Number(mmAcum)) || Number(mmAcum) < 0 ? 0 : Number(mmAcum);
    const p = Number.isNaN(Number(mmPrev)) || Number(mmPrev) < 0 ? 0 : Number(mmPrev);
    setLuviasSimuladas((prev) => ({
      ...prev,
      [zonaCodigo]: { lluviaAcumulada: a, lluviaPrevista: p }
    }));
    setAlertaOcultaParaId(null);
  };

  const elegirEscenarioRapido = (tipo) => {
    const nuevos = {};
    for (const z of zonas) {
      if (tipo === "SECO") {
        nuevos[z.codigo] = { lluviaAcumulada: 0, lluviaPrevista: 0 };
      } else if (tipo === "MODERADA") {
        nuevos[z.codigo] = { lluviaAcumulada: 15, lluviaPrevista: 15 };
      } else if (tipo === "TORMENTA") {
        nuevos[z.codigo] = { lluviaAcumulada: 35, lluviaPrevista: 35 };
      }
    }
    setLuviasSimuladas(nuevos);
    setAlertaOcultaParaId(null);
  };

  const restablecerDatosReales = () => {
    setSimuladorActivo(false);
    setLuviasSimuladas({});
    setAlertaOcultaParaId(null);
    if (onToast) onToast("Simulador cerrado. Mostrando ranking oficial vigente.");
  };

  // Datos de Alerta (CU15)
  const infoRojo = useMemo(
    () => GestorRanking.obtenerLotesEnRojo(rankingActivo),
    [rankingActivo]
  );
  const mostrarBannerAlerta =
    infoRojo.cantidad > 0 &&
    alertaOcultaParaId !== (simuladorActivo ? JSON.stringify(lluviasSimuladas) : rankingActivo?.id);

  // Mapa de ítems del ranking por código de lote para consulta rápida
  const itemPorLote = useMemo(() => {
    const map = {};
    (rankingActivo?.items || []).forEach((it) => {
      map[it.loteCodigo] = it;
    });
    return map;
  }, [rankingActivo]);

  // Inicializar mapa Leaflet (InterfazMapa)
  useEffect(() => {
    if (!window.L || mapInstanceRef.current) return;
    const L = window.L;

    const map = L.map("map-dss", {
      scrollWheelZoom: true
    }).setView([-24.228, -64.842], 12);
    mapInstanceRef.current = map;

    L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Esri World Imagery",
        maxZoom: 18
      }
    ).addTo(map);

    const factoryIcon = L.divIcon({
      className: "factory-marker",
      html: '<div style="background:#fbbf24; color:#0f172a; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; border:3px solid #ffffff; box-shadow:0 0 14px rgba(251,191,36,0.8);">🏭</div>',
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    L.marker([-24.2255, -64.8638], { icon: factoryIcon })
      .addTo(map)
      .bindPopup("<b>🏭 Ingenio La Esperanza</b><br>Fábrica y Patio de Caña");

    const handleResize = () => {
      if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current && (modoVisual === "mapa" || modoVisual === "dividido")) {
      setTimeout(() => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      }, 150);
    }
  }, [modoVisual, simuladorActivo, mostrarBannerAlerta]);

  // Dibujar polígonos de todos los lotes y pluviómetros (InterfazMapa.dibujarLotes)
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    Object.values(polygonLayersRef.current).forEach((layer) => map.removeLayer(layer));
    polygonLayersRef.current = {};
    markerLayersRef.current.forEach((m) => map.removeLayer(m));
    markerLayersRef.current = [];

    // Marcadores de pluviómetros activos por zona
    zonas.forEach((z) => {
      const pluv = GestorZonas.pluviometroActivo(z.codigo);
      if (pluv) {
        const rainIcon = L.divIcon({
          className: "rain-marker",
          html: '<div style="background:#0284c7; color:#fff; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; border:2px solid #fff;">🌧️</div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        const m = L.marker([pluv.latitud, pluv.longitud], { icon: rainIcon })
          .addTo(map)
          .bindTooltip(`Pluviómetro ${pluv.codigo} (${z.nombre})`);
        markerLayersRef.current.push(m);
      }
    });

    // Dibujar lotes filtrados por zona
    todosLotes.forEach((lote) => {
      if (filtroZona !== "TODAS" && lote.zonaCodigo !== filtroZona) return;
      if (!Array.isArray(lote.poligono) || lote.poligono.length < 3) return;

      const itemRnk = itemPorLote[lote.codigo];
      let color = "#94a3b8";
      let dashArray = null;
      let labelEstado = ESTADO_LOTE_META[lote.estado]?.label || lote.estado;

      if (lote.estado === EstadoLote.PENDIENTE) {
        if (itemRnk) {
          color = SEMAFORO_META[itemRnk.semaforo]?.color || "#10b981";
          labelEstado = `Semáforo ${itemRnk.semaforo} (${itemRnk.puntajeRiesgo})`;
        } else {
          color = "#a855f7";
          dashArray = "5, 5";
          labelEstado = "Incompleto (sin atributos)";
        }
      } else {
        color = ESTADO_LOTE_META[lote.estado]?.color || "#64748b";
      }

      const poly = L.polygon(lote.poligono, {
        color: lote.codigo === loteSeleccionadoCodigo ? "#ffffff" : color,
        weight: lote.codigo === loteSeleccionadoCodigo ? 4 : 2,
        fillColor: color,
        fillOpacity: lote.estado === EstadoLote.COSECHADO ? 0.32 : 0.65,
        dashArray
      }).addTo(map);

      poly.bindTooltip(
        `<b>${lote.codigo}</b> — ${lote.nombre}<br><span style="font-size:11px;">${labelEstado} | ${lote.hectareas} ha | ${lote.toneladas} t</span>`,
        { direction: "center" }
      );

      poly.on("click", () => {
        setLoteSeleccionadoCodigo(lote.codigo);
      });

      polygonLayersRef.current[lote.codigo] = poly;
    });
  }, [todosLotes, itemPorLote, zonas, filtroZona, loteSeleccionadoCodigo]);

  // Filtrado de ítems para InterfazRanking
  const itemsFiltrados = useMemo(() => {
    return (rankingActivo?.items || []).filter((it) => {
      if (filtroZona !== "TODAS" && it.zonaCodigo !== filtroZona) return false;
      if (
        (filtroEstado === Semaforo.ROJO ||
          filtroEstado === Semaforo.AMARILLO ||
          filtroEstado === Semaforo.VERDE) &&
        it.semaforo !== filtroEstado
      ) {
        return false;
      }
      if (filtroEstado === "OPERATIVOS") return false;
      return true;
    });
  }, [rankingActivo, filtroZona, filtroEstado]);

  const lotesOperativos = useMemo(() => {
    return todosLotes.filter((l) => {
      if (l.estado === EstadoLote.PENDIENTE) return false;
      if (filtroZona !== "TODAS" && l.zonaCodigo !== filtroZona) return false;
      if (
        filtroEstado === Semaforo.ROJO ||
        filtroEstado === Semaforo.AMARILLO ||
        filtroEstado === Semaforo.VERDE
      ) {
        return false;
      }
      return true;
    });
  }, [todosLotes, filtroZona, filtroEstado]);

  const lotesIncompletosFiltrados = useMemo(() => {
    return (rankingActivo?.lotesIncompletos || []).filter(
      (l) => filtroZona === "TODAS" || l.zonaCodigo === filtroZona
    );
  }, [rankingActivo, filtroZona]);

  // Detalle completo del lote seleccionado (CU12 paso 6)
  const detalleLote = useMemo(() => {
    if (!loteSeleccionadoCodigo) return null;
    const lote = todosLotes.find((l) => l.codigo === loteSeleccionadoCodigo);
    if (!lote) return null;
    const itemRnk = itemPorLote[lote.codigo] || null;
    const desglose = GestorIndice.calcularDesglose(lote.codigo, configVigente);
    const zona = zonas.find((z) => z.codigo === lote.zonaCodigo);
    const acum = GestorLecturas.acumuladoZona(
      lote.zonaCodigo,
      configVigente.ventanaLluviaHoras
    );
    const pron = GestorPronostico.obtenerUltimoGuardado(lote.zonaCodigo);
    const anegTotales = GestorAnegamientos.contarTotales(lote.codigo);
    const anegZafra = GestorAnegamientos.contarUltimaZafra(
      lote.codigo,
      configVigente.inicioZafra
    );
    const sinPoligono = !Array.isArray(lote.poligono) || lote.poligono.length < 3;

    return {
      lote,
      itemRnk,
      desglose,
      zona,
      acum,
      pron,
      anegTotales,
      anegZafra,
      sinPoligono
    };
  }, [loteSeleccionadoCodigo, todosLotes, itemPorLote, configVigente, zonas]);

  const seleccionarLote = (codigo) => {
    setLoteSeleccionadoCodigo(codigo);
    const lote = todosLotes.find((l) => l.codigo === codigo);
    if (
      lote &&
      Array.isArray(lote.poligono) &&
      lote.poligono.length >= 3 &&
      mapInstanceRef.current
    ) {
      const lats = lote.poligono.map((p) => p[0]);
      const lngs = lote.poligono.map((p) => p[1]);
      const center = [
        lats.reduce((a, b) => a + b, 0) / lats.length,
        lngs.reduce((a, b) => a + b, 0) / lngs.length
      ];
      mapInstanceRef.current.flyTo(center, 14, { duration: 0.6 });
    }
  };

  return (
    <div className="view-container">
      {/* AVISO PARADA DE FÁBRICA ABIERTA (CU12 1a / CU13) */}
      {paradaAbierta && (
        <div
          style={{
            margin: "12px 24px 0",
            background: "rgba(239, 68, 68, 0.16)",
            border: "1px solid #ef4444",
            borderRadius: "10px",
            padding: "10px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap"
          }}
        >
          <span style={{ fontSize: "13px", color: "#fecaca" }}>
            🏭 <b>ATENCIÓN — PARADA DE FÁBRICA EN CURSO ({paradaAbierta.id}):</b> Causa:{" "}
            <b>{CAUSA_PARADA_LABELS[paradaAbierta.causa]}</b> · Iniciada:{" "}
            {new Date(paradaAbierta.fechaInicio).toLocaleString()}
          </span>
          <span className="badge-status badge-urgent">ABIERTA</span>
        </div>
      )}

      {/* BARRA SUPERIOR DE CONTROLES DEL RANKING Y SIMULADOR */}
      <div className="scenario-strip">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <button
            className="btn-action btn-primary"
            disabled={simuladorActivo}
            onClick={() => onGenerarRanking(usuario)}
            title="Ejecutar CU11 con lecturas reales y pronóstico vigente"
          >
            🔄 Recalcular Ranking Oficial (CU11)
          </button>

          <button
            className={`btn-scenario ${simuladorActivo ? "active sc-rain" : ""}`}
            onClick={() => (simuladorActivo ? restablecerDatosReales() : abrirSimulador())}
          >
            🧪 {simuladorActivo ? "Simulador Activo (CU16)" : "Simular Precipitaciones (CU16)"}
          </button>
        </div>

        <div className="scenario-info-badge">
          <span>
            {simuladorActivo ? "🧪 SIMULACIÓN (No persistida)" : "📊 Ranking Oficial"} · Config v
            {rankingActivo?.configuracionVersion} · Lluvia crítica: {configVigente.lluviaCriticaMm} mm
          </span>
        </div>
      </div>

      {/* <<interfaz>> InterfazSimulador (CU16) */}
      {simuladorActivo && (
        <InterfazSimulador
          zonas={zonas}
          lluviasPorZona={lluviasSimuladas}
          onAjustarLluviaZona={ajustarLluviaZona}
          onElegirEscenarioRapido={elegirEscenarioRapido}
          onRestablecerDatosReales={restablecerDatosReales}
          onCerrarSimulador={restablecerDatosReales}
        />
      )}

      {/* <<interfaz>> InterfazAlertaRiesgo (CU15) */}
      {mostrarBannerAlerta && (
        <InterfazAlertaRiesgo
          lotesRojos={infoRojo.items}
          toneladasEnRiesgo={infoRojo.toneladasEnRiesgo}
          esSimulacion={simuladorActivo}
          pronosticoDesactualizado={infoRojo.items.some((i) => i.pronosticoDesactualizado)}
          onAbrirDetalleLote={seleccionarLote}
          onCerrarAlerta={() =>
            setAlertaOcultaParaId(
              simuladorActivo ? JSON.stringify(lluviasSimuladas) : rankingActivo?.id
            )
          }
        />
      )}

      {/* SELECTOR DE VISTA Y FILTROS (CU12 4a) */}
      <div className="subview-mode-bar">
        <div className="subview-toggle-group">
          <button
            className={`btn-subview ${modoVisual === "dividido" ? "active" : ""}`}
            onClick={() => setModoVisual("dividido")}
          >
            🔲 Mapa + Ranking
          </button>
          <button
            className={`btn-subview ${modoVisual === "mapa" ? "active" : ""}`}
            onClick={() => setModoVisual("mapa")}
          >
            🗺️ Solo Mapa
          </button>
          <button
            className={`btn-subview ${modoVisual === "stats" ? "active" : ""}`}
            onClick={() => setModoVisual("stats")}
          >
            📋 Solo Ranking y Detalle
          </button>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          <select
            className="form-control"
            style={{ padding: "6px 10px", fontSize: "12.5px" }}
            value={filtroZona}
            onChange={(e) => setFiltroZona(e.target.value)}
          >
            <option value="TODAS">Todas las zonas ({zonas.length})</option>
            {zonas.map((z) => (
              <option key={z.codigo} value={z.codigo}>
                {z.nombre}
              </option>
            ))}
          </select>

          <select
            className="form-control"
            style={{ padding: "6px 10px", fontSize: "12.5px" }}
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="TODOS">Todos los estados</option>
            <option value={Semaforo.ROJO}>🔴 Semáforo Rojo (Urgente)</option>
            <option value={Semaforo.AMARILLO}>🟡 Semáforo Amarillo (Atención)</option>
            <option value={Semaforo.VERDE}>🟢 Semáforo Verde (Puede esperar)</option>
            <option value="OPERATIVOS">🚜 Estados Operativos (No en ranking)</option>
          </select>
        </div>
      </div>

      {/* AVISOS DEL RANKING (CU11 4a-4d / mostrarAvisos) */}
      {rankingActivo?.avisos?.length > 0 && (
        <div
          style={{
            margin: "0 24px",
            background: "rgba(245, 158, 11, 0.12)",
            border: "1px solid #f59e0b",
            borderRadius: "10px",
            padding: "8px 14px",
            fontSize: "12px",
            color: "#fde68a"
          }}
        >
          <b>⚠️ Advertencias del cálculo:</b> {rankingActivo.avisos.join(" · ")}
        </div>
      )}

      {/* ESPACIO PRINCIPAL: <<interfaz>> InterfazMapa + <<interfaz>> InterfazRanking */}
      <div className={`main-workspace mode-${modoVisual}`}>
        {/* 1. MAPA LEAFLET (CU12) */}
        <div
          className={`map-wrapper ${modoVisual === "mapa" ? "full-width" : ""}`}
          style={{ display: modoVisual === "stats" ? "none" : "block" }}
        >
          <div id="map-dss" style={{ width: "100%", height: "100%" }}></div>

          {/* LEYENDA SIEMPRE VISIBLE (CU12 Requisitos especiales) */}
          <div className="map-legend">
            <div style={{ fontWeight: 700, marginBottom: "2px", color: "#94a3b8", fontSize: "10.5px", textTransform: "uppercase" }}>
              Semáforo (Pendientes)
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: "#ef4444" }}></div> Rojo: Urgente (R ≥ {configVigente.umbralSemaforoRojo})
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: "#f59e0b" }}></div> Amarillo: Atención ({configVigente.umbralSemaforoAmarillo}–{configVigente.umbralSemaforoRojo - 1})
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: "#10b981" }}></div> Verde: Puede esperar (&lt; {configVigente.umbralSemaforoAmarillo})
            </div>
            <div style={{ fontWeight: 700, margin: "4px 0 2px", color: "#94a3b8", fontSize: "10.5px", textTransform: "uppercase" }}>
              Operativos / Otros
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: "#3b82f6" }}></div> Azul: Anegado
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: "#f97316" }}></div> Naranja: En cosecha
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: "#64748b" }}></div> Gris: Cosechado
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: "#94a3b8" }}></div> Gris claro: En descanso
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: "#a855f7" }}></div> Violeta: Incompleto
            </div>
          </div>

          {/* DETALLE FLOTANTE AL SELECCIONAR UN LOTE (CU12 paso 6) */}
          {detalleLote && (
            <div className="map-floating-lot-card">
              <div className="floating-header">
                <div>
                  <span
                    className={`badge-status ${
                      detalleLote.itemRnk
                        ? SEMAFORO_META[detalleLote.itemRnk.semaforo]?.badgeClass
                        : detalleLote.lote.estado === EstadoLote.PENDIENTE
                        ? "badge-incompleto"
                        : ESTADO_LOTE_META[detalleLote.lote.estado]?.badgeClass
                    }`}
                  >
                    {detalleLote.itemRnk
                      ? `Semáforo ${detalleLote.itemRnk.semaforo} — ${SEMAFORO_META[detalleLote.itemRnk.semaforo]?.label}`
                      : detalleLote.lote.estado === EstadoLote.PENDIENTE
                      ? "Incompleto"
                      : ESTADO_LOTE_META[detalleLote.lote.estado]?.label}
                  </span>
                  <h3 style={{ fontSize: "16px", margin: "4px 0 0", color: "#f8fafc" }}>
                    {detalleLote.lote.codigo} — {detalleLote.lote.nombre}
                  </h3>
                  <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>
                    {detalleLote.zona?.nombre}
                  </span>
                </div>
                <button
                  className="floating-close-btn"
                  onClick={() => setLoteSeleccionadoCodigo(null)}
                  title="Cerrar detalle"
                >
                  &times;
                </button>
              </div>

              {detalleLote.sinPoligono && (
                <div style={{ fontSize: "11.5px", color: "#fbbf24", marginBottom: "6px" }}>
                  ⚠️ Este lote no tiene polígono dibujado en el mapa.
                </div>
              )}

              <div className="floating-details-grid">
                <div>Superficie: <b>{detalleLote.lote.hectareas} ha</b></div>
                <div>Caña est.: <b>{detalleLote.lote.toneladas.toLocaleString()} t</b></div>
                <div>
                  Suelo:{" "}
                  <b>{detalleLote.desglose ? SUELO_LABELS[detalleLote.desglose.vigente.suelo] : "Falta"}</b>
                </div>
                <div>
                  Drenaje:{" "}
                  <b>{detalleLote.desglose ? DRENAJE_LABELS[detalleLote.desglose.vigente.drenaje] : "Falta"}</b>
                </div>
                <div>
                  Camino:{" "}
                  <b>{detalleLote.desglose ? CAMINO_LABELS[detalleLote.desglose.vigente.camino] : "Falta"}</b>
                </div>
                <div>
                  Anegamientos: <b>{detalleLote.anegTotales} tot / {detalleLote.anegZafra} zafra</b>
                </div>
              </div>

              {detalleLote.desglose ? (
                <div
                  className="floating-recommendation"
                  style={{
                    "--rec-color": detalleLote.itemRnk
                      ? SEMAFORO_META[detalleLote.itemRnk.semaforo]?.color
                      : "#38bdf8"
                  }}
                >
                  <div>
                    <b>Índice Vulnerabilidad (I):</b> {detalleLote.desglose.indice} (
                    {CATEGORIA_LABELS[detalleLote.desglose.categoria]})
                  </div>
                  {detalleLote.itemRnk && (
                    <div style={{ marginTop: "4px" }}>
                      <b>Lluvia (A + P):</b> {detalleLote.itemRnk.lluviaAcumulada} +{" "}
                      {detalleLote.itemRnk.lluviaPrevista} mm · <b>f =</b> {detalleLote.itemRnk.factorLluvia}
                      <br />
                      <b>Puntaje de Riesgo (R):</b>{" "}
                      <span style={{ fontFamily: "JetBrains Mono", fontSize: "14px", fontWeight: 800 }}>
                        {detalleLote.itemRnk.puntajeRiesgo}
                      </span>{" "}
                      (Puesto #{detalleLote.itemRnk.posicion})
                    </div>
                  )}
                  <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                    Último cálculo: {new Date(rankingActivo?.fechaHora || Date.now()).toLocaleString()}
                  </div>
                </div>
              ) : (
                <div className="floating-recommendation" style={{ "--rec-color": "#a855f7" }}>
                  Lote excluido del cálculo: faltan cargar atributos de vulnerabilidad (CU04).
                </div>
              )}

              {onIrAAnegamiento && detalleLote.lote.estado !== EstadoLote.ANEGADO && (
                <div className="floating-actions">
                  <button
                    className="btn-card-action"
                    onClick={() => onIrAAnegamiento(detalleLote.lote.codigo)}
                  >
                    🌊 Reportar Anegamiento (CU05)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. RANKING DE PRIORIDAD (CU11) */}
        {modoVisual !== "mapa" && (
          <aside className={modoVisual === "dividido" ? "sidebar" : "stats-dashboard-container"}>
            <div className="sidebar-header">
              <h2>
                <span>📋</span> Ranking de Prioridad de Cosecha (CU11)
              </h2>
              <span className="badge-status badge-safe">
                {itemsFiltrados.length} elegibles
              </span>
            </div>

            <div className={modoVisual === "dividido" ? "ranking-list" : "stats-cards-grid"}>
              {itemsFiltrados.length === 0 && filtroEstado !== "OPERATIVOS" && (
                <div style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "13px" }}>
                  No hay lotes elegibles para el filtro seleccionado.
                </div>
              )}

              {itemsFiltrados.map((it) => {
                const meta = SEMAFORO_META[it.semaforo];
                const loteObj = todosLotes.find((l) => l.codigo === it.loteCodigo);
                const sinPoligono = !loteObj?.poligono || loteObj.poligono.length < 3;

                return (
                  <div
                    key={it.loteCodigo}
                    className={`lot-card ${loteSeleccionadoCodigo === it.loteCodigo ? "selected" : ""}`}
                    onClick={() => seleccionarLote(it.loteCodigo)}
                  >
                    <div className="lot-card-header">
                      <div className="lot-code">
                        <span style={{ color: "#38bdf8" }}>#{it.posicion}</span>
                        <span>{it.loteCodigo}</span>
                        <span style={{ fontSize: "12px", fontWeight: 500, color: "#94a3b8" }}>
                          {it.loteNombre}
                        </span>
                      </div>
                      <span className={`badge-status ${meta?.badgeClass}`}>
                        {it.semaforo} · {meta?.label}
                      </span>
                    </div>

                    <div className="lot-details-grid">
                      <div className="lot-detail-item">Zona: <b>{it.zonaNombre}</b></div>
                      <div className="lot-detail-item">Caña: <b>{it.toneladas.toLocaleString()} t ({it.hectareas} ha)</b></div>
                      <div className="lot-detail-item">
                        Índice (I): <b>{it.indice} ({CATEGORIA_LABELS[it.categoria]})</b>
                      </div>
                      <div className="lot-detail-item">
                        Lluvia (A+P): <b>{it.lluviaAcumulada} + {it.lluviaPrevista} mm</b>
                      </div>
                    </div>

                    <div className="lot-recommendation" style={{ "--rec-color": meta?.color }}>
                      Puntaje de riesgo <b>R = I × f = {it.indice} × {it.factorLluvia} = {it.puntajeRiesgo}</b>
                      {sinPoligono && (
                        <div style={{ color: "#fbbf24", marginTop: "2px" }}>
                          ⚠️ Sin polígono en el mapa
                        </div>
                      )}
                      {(it.sinLecturas || it.pronosticoDesactualizado) && (
                        <div style={{ color: "#fde68a", marginTop: "2px" }}>
                          {it.sinLecturas && "Sin lecturas recientes · "}
                          {it.pronosticoDesactualizado && "Pronóstico desactualizado"}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* LOTES INCOMPLETOS (CU10 2a / CU11 5a) */}
              {lotesIncompletosFiltrados.length > 0 && filtroEstado === "TODOS" && (
                <div style={{ gridColumn: "1 / -1", marginTop: "8px" }}>
                  <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#d8b4fe", textTransform: "uppercase", marginBottom: "6px" }}>
                    ⚠️ Lotes excluidos por atributos incompletos ({lotesIncompletosFiltrados.length})
                  </div>
                  {lotesIncompletosFiltrados.map((inc) => (
                    <div
                      key={inc.loteCodigo}
                      className={`lot-card ${loteSeleccionadoCodigo === inc.loteCodigo ? "selected" : ""}`}
                      onClick={() => seleccionarLote(inc.loteCodigo)}
                      style={{ borderColor: "#a855f7", marginBottom: "8px" }}
                    >
                      <div className="lot-card-header">
                        <div className="lot-code">{inc.loteCodigo} — {inc.loteNombre}</div>
                        <span className="badge-status badge-incompleto">Incompleto</span>
                      </div>
                      <p style={{ fontSize: "12px", color: "#e9d5ff" }}>{inc.motivo}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* LOTES EN ESTADOS OPERATIVOS (No entran al ranking) */}
              {lotesOperativos.length > 0 &&
                (filtroEstado === "TODOS" || filtroEstado === "OPERATIVOS") && (
                  <div style={{ gridColumn: "1 / -1", marginTop: "8px" }}>
                    <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px" }}>
                      Lotes fuera del ranking (Estados operativos: {lotesOperativos.length})
                    </div>
                    {lotesOperativos.map((l) => {
                      const metaOp = ESTADO_LOTE_META[l.estado];
                      return (
                        <div
                          key={l.codigo}
                          className={`lot-card ${loteSeleccionadoCodigo === l.codigo ? "selected" : ""}`}
                          onClick={() => seleccionarLote(l.codigo)}
                          style={{ marginBottom: "8px", opacity: 0.88 }}
                        >
                          <div className="lot-card-header">
                            <div className="lot-code">{l.codigo} — {l.nombre}</div>
                            <span className={`badge-status ${metaOp?.badgeClass}`}>
                              {metaOp?.label}
                            </span>
                          </div>
                          <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                            {l.zonaNombre} · {l.hectareas} ha · {l.toneladas.toLocaleString()} t
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
