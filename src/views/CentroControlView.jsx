import React, { useState, useEffect, useRef } from "react";
import "./CentroControlView.css";

export default function CentroControlView({
  lotes,
  rankingDSS,
  escenarioActual,
  configEscenarios,
  onCambiarEscenario,
  loteSeleccionadoId,
  onSeleccionarLote,
  filtroActivo,
  onCambiarFiltro,
  onMarcarCosechado,
  onReabrirLote,
  onAsignarFrente
}) {
  const mapInstanceRef = useRef(null);
  const polygonLayersRef = useRef({});

  // Modo de visualización: "mapa" (solo mapa), "stats" (solo estadísticas), "dividido" (ambos)
  const [modoVisual, setModoVisual] = useState("mapa");
  const [busquedaLote, setBusquedaLote] = useState("");

  // Inicializar mapa de Leaflet
  useEffect(() => {
    if (!window.L || mapInstanceRef.current) return;
    const L = window.L;

    const map = L.map("map-dss", {
      scrollWheelZoom: false
    }).setView([-24.2300, -64.8450], 13);
    mapInstanceRef.current = map;

    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Esri World Imagery",
      maxZoom: 18
    }).addTo(map);

    const factoryIcon = L.divIcon({
      className: "factory-marker",
      html: '<div style="background:#fbbf24; color:#0f172a; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:800; border:3px solid #ffffff; box-shadow:0 0 16px rgba(251,191,36,0.8);">🏭</div>',
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    L.marker([-24.2255, -64.8638], { icon: factoryIcon }).addTo(map)
      .bindPopup(`
        <div style="font-family:'Plus Jakarta Sans',sans-serif; color:#0f172a;">
          <h4 style="margin:0; font-size:14px; font-weight:800;">🏭 Fábrica & Canchón Ingenio La Esperanza</h4>
          <p style="margin:4px 0 0; font-size:12px; color:#475569;">Patio de recepción y pesaje de caña. Destino final de camiones.</p>
        </div>
      `);

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

  // Forzar recalibración de tamaño de Leaflet al alternar entre Solo Mapa y Dividido
  useEffect(() => {
    if (mapInstanceRef.current && (modoVisual === "mapa" || modoVisual === "dividido")) {
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 150);
    }
  }, [modoVisual]);

  // Actualizar polígonos de lotes en el mapa
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    rankingDSS.forEach((lote) => {
      if (polygonLayersRef.current[lote.id]) {
        map.removeLayer(polygonLayersRef.current[lote.id]);
      }

      const poly = L.polygon(lote.coords, {
        color: lote.dss.color,
        weight: lote.id === loteSeleccionadoId ? 4 : 2,
        fillColor: lote.dss.color,
        fillOpacity: lote.estado === "COSECHADO" ? 0.3 : 0.65
      }).addTo(map);

      poly.bindTooltip(`<b>${lote.codigo}</b><br><span style="font-size:11px;">${lote.has} ha | ${lote.toneladas} t</span>`, {
        permanent: false,
        direction: "center"
      });

      poly.on("click", () => {
        onSeleccionarLote(lote.id);
        map.flyTo(lote.center, 14, { duration: 0.8 });
      });

      polygonLayersRef.current[lote.id] = poly;
    });
  }, [rankingDSS, loteSeleccionadoId]);

  const cfg = configEscenarios[escenarioActual];
  const loteSeleccionado = rankingDSS.find((l) => l.id === loteSeleccionadoId) || null;

  // Filtrado de lotes para el modo estadísticas
  const lotesParaStats = rankingDSS.filter((l) => {
    if (!busquedaLote.trim()) return true;
    const q = busquedaLote.toLowerCase();
    return (
      l.codigo.toLowerCase().includes(q) ||
      l.finca.toLowerCase().includes(q) ||
      l.suelo.toLowerCase().includes(q) ||
      l.camino.toLowerCase().includes(q)
    );
  });

  // Métricas analíticas del escenario activo
  const lotesEnRiesgoUrgente = rankingDSS.filter((l) => l.dss.badgeClass.includes("urgent")).length;
  const tonEnRiesgoUrgente = rankingDSS
    .filter((l) => l.dss.badgeClass.includes("urgent"))
    .reduce((acc, l) => acc + (Number(l.toneladas) || 0), 0);
  const lotesCosechadosCount = lotes.filter((l) => l.estado === "COSECHADO").length;
  const lotesEnPieCount = lotes.filter((l) => l.estado === "PENDIENTE").length;

  return (
    <div className="view-container">
      {/* BARRA DE ESCENARIOS DE LLUVIA */}
      <div className="scenario-strip">
        <div className="scenario-label">
          <span>⚡ Simulación de Lluvias:</span>
        </div>
        <div className="scenario-buttons">
          <button
            className={`btn-scenario ${escenarioActual === "live" ? "active" : ""}`}
            onClick={() => onCambiarEscenario("live")}
          >
            <span>☀️</span> 1. Tiempo Real (Open-Meteo)
          </button>
          <button
            className={`btn-scenario sc-rain ${escenarioActual === "light" ? "active" : ""}`}
            onClick={() => onCambiarEscenario("light")}
          >
            <span>🌦️</span> 2. Lluvia Leve (15 mm)
          </button>
          <button
            className={`btn-scenario sc-storm ${escenarioActual === "storm" ? "active" : ""}`}
            onClick={() => onCambiarEscenario("storm")}
          >
            <span>⛈️</span> 3. Temporal Severo (60 mm)
          </button>
          <button
            className={`btn-scenario sc-sat ${escenarioActual === "sat" ? "active" : ""}`}
            onClick={() => onCambiarEscenario("sat")}
          >
            <span>🌊</span> 4. Suelo Saturado (40mm + 20mm)
          </button>
        </div>
        <div className="scenario-info-badge">
          <span>📡</span> <span>{cfg.badge}</span>
        </div>
      </div>

      {/* SELECTOR DE MODO DE VISUALIZACIÓN DESACOPLADO */}
      <div className="subview-mode-bar">
        <div className="subview-toggle-group">
          <button
            className={`btn-subview ${modoVisual === "mapa" ? "active" : ""}`}
            onClick={() => setModoVisual("mapa")}
          >
            <span>🗺️</span> Solo Mapa Satelital
          </button>
          <button
            className={`btn-subview ${modoVisual === "stats" ? "active" : ""}`}
            onClick={() => setModoVisual("stats")}
          >
            <span>📊</span> Solo Estadísticas & Ranking
          </button>
          <button
            className={`btn-subview ${modoVisual === "dividido" ? "active" : ""}`}
            onClick={() => setModoVisual("dividido")}
          >
            <span>🔲</span> Vista Dividida (Ambos)
          </button>
        </div>

        <div className="subview-hint">
          {modoVisual === "mapa" && "💡 Vista satelital en pantalla completa. Hacé clic en cualquier cuadro para ver sus detalles."}
          {modoVisual === "stats" && "💡 Vista detallada del análisis agronómico y ranking sin saturación espacial."}
          {modoVisual === "dividido" && "💡 Vista combinada clásica para monitores panorámicos."}
        </div>
      </div>

      {/* WORKSPACE PRINCIPAL SEGÚN EL MODO ELEGIDO */}
      <div className={`main-workspace mode-${modoVisual}`}>
        {/* ============================================================== */}
        {/* 1. CONTENEDOR DEL MAPA (Oculto en CSS si modoVisual === 'stats') */}
        {/* ============================================================== */}
        <div
          className={`map-wrapper ${modoVisual === "mapa" ? "full-width" : ""}`}
          style={{ display: modoVisual === "stats" ? "none" : "block" }}
        >
          <div id="map-dss" style={{ width: "100%", height: "100%" }}></div>

          {/* LEYENDA DEL MAPA */}
          <div className="map-legend">
            <div style={{ fontWeight: 700, marginBottom: "2px", color: "#94a3b8", fontSize: "11px", textTransform: "uppercase" }}>
              Semáforo de Cosecha
            </div>
            <div className="legend-item"><div className="legend-color" style={{ background: "#ef4444" }}></div> Rojo: Urgente (Vulnerable)</div>
            <div className="legend-item"><div className="legend-color" style={{ background: "#f59e0b" }}></div> Amarillo: Precaución</div>
            <div className="legend-item"><div className="legend-color" style={{ background: "#10b981" }}></div> Verde: Seguro (Reserva)</div>
            <div className="legend-item"><div className="legend-color" style={{ background: "#3b82f6" }}></div> Azul: En Cosecha Activa</div>
            <div className="legend-item"><div className="legend-color" style={{ background: "#64748b" }}></div> Gris: Ya Cosechado</div>
            <div className="legend-item"><div className="legend-color" style={{ background: "#fbbf24", borderRadius: "50%" }}></div> ⭐ Fábrica La Esperanza</div>
          </div>

          {/* MINI-PANEL FLOTANTE EN MODO SOLO MAPA AL HACER CLIC EN UN LOTE */}
          {modoVisual === "mapa" && loteSeleccionado && (
            <div className="map-floating-lot-card">
              <div className="floating-header">
                <div>
                  <span className={`badge-status ${loteSeleccionado.dss.badgeClass}`}>
                    {loteSeleccionado.dss.badgeText}
                  </span>
                  <h3 style={{ fontSize: "16px", margin: "4px 0 0", color: "#f8fafc" }}>
                    Lote {loteSeleccionado.codigo}
                  </h3>
                  <span style={{ fontSize: "11.5px", color: "#94a3b8" }}>{loteSeleccionado.finca}</span>
                </div>
                <button
                  className="floating-close-btn"
                  onClick={() => onSeleccionarLote(null)}
                  title="Cerrar panel"
                >
                  &times;
                </button>
              </div>

              <div className="floating-details-grid">
                <div>Superficie: <b>{loteSeleccionado.has} ha</b></div>
                <div>Caña: <b>{loteSeleccionado.toneladas.toLocaleString()} t</b></div>
                <div>Camino: <b style={{ color: loteSeleccionado.camino.includes("tierra") ? "#f87171" : "#34d399" }}>{loteSeleccionado.camino}</b></div>
                <div>Distancia: <b>{loteSeleccionado.distanciaKm} km a fábrica</b></div>
              </div>

              <div className="floating-recommendation" style={{ "--rec-color": loteSeleccionado.dss.color }}>
                {loteSeleccionado.dss.recomendacion}
              </div>

              <div className="floating-actions">
                {loteSeleccionado.estado !== "COSECHADO" ? (
                  <button
                    className="btn-card-action btn-harvest"
                    onClick={() => onMarcarCosechado(loteSeleccionado.id)}
                  >
                    ✔️ Marcar Cosechado
                  </button>
                ) : (
                  <button
                    className="btn-card-action"
                    onClick={() => onReabrirLote(loteSeleccionado.id)}
                  >
                    🔄 Reabrir Lote
                  </button>
                )}
                {loteSeleccionado.estado === "PENDIENTE" && (
                  <button
                    className="btn-card-action"
                    onClick={() => onAsignarFrente(loteSeleccionado.id)}
                  >
                    🚜 Asignar Cuadrilla
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* 2. MODO SOLO ESTADÍSTICAS (PANTALLA COMPLETA ESPACIOSA)        */}
        {/* ============================================================== */}
        {modoVisual === "stats" && (
          <div className="stats-dashboard-container">
            {/* KPI STRIP SUPERIOR DE ANÁLISIS */}
            <div className="stats-kpi-grid">
              <div className="kpi-card" style={{ "--kpi-color": "#ef4444" }}>
                <div className="kpi-title">Urgencia Inmediata (Semáforo Rojo)</div>
                <div className="kpi-value-row">
                  <span className="kpi-value" style={{ color: "#f87171" }}>{lotesEnRiesgoUrgente} cuadros</span>
                </div>
                <span className="kpi-sub">{tonEnRiesgoUrgente.toLocaleString()} t en peligro por lluvias</span>
              </div>

              <div className="kpi-card" style={{ "--kpi-color": "#38bdf8" }}>
                <div className="kpi-title">Caña en Pie Pendiente</div>
                <div className="kpi-value-row">
                  <span className="kpi-value" style={{ color: "#38bdf8" }}>{lotesEnPieCount} lotes</span>
                </div>
                <span className="kpi-sub">Total disponible para programar cuadrillas</span>
              </div>

              <div className="kpi-card" style={{ "--kpi-color": "#10b981" }}>
                <div className="kpi-title">Lotes Cosechados</div>
                <div className="kpi-value-row">
                  <span className="kpi-value" style={{ color: "#34d399" }}>{lotesCosechadosCount}</span>
                  <span className="kpi-sub">de {lotes.length} totales</span>
                </div>
                <span className="kpi-sub">Ya ingresados o resguardados en canchón</span>
              </div>

              <div className="kpi-card" style={{ "--kpi-color": "#f59e0b" }}>
                <div className="kpi-title">Precipitación Simulación</div>
                <div className="kpi-value-row">
                  <span className="kpi-value" style={{ color: "#fbbf24" }}>{cfg.lluviaPrevistaMm} mm</span>
                </div>
                <span className="kpi-sub">{cfg.badge}</span>
              </div>
            </div>

            {/* BARRA DE FILTROS Y BÚSQUEDA ESPACIOSA */}
            <div className="stats-controls-row">
              <div className="filter-tabs">
                <button
                  className={`filter-tab ${filtroActivo === "todos" ? "active" : ""}`}
                  onClick={() => onCambiarFiltro("todos")}
                >
                  Todos ({lotes.length})
                </button>
                <button
                  className={`filter-tab ${filtroActivo === "pendientes" ? "active" : ""}`}
                  onClick={() => onCambiarFiltro("pendientes")}
                >
                  En Pie ({lotesEnPieCount})
                </button>
                <button
                  className={`filter-tab ${filtroActivo === "riesgo" ? "active" : ""}`}
                  onClick={() => onCambiarFiltro("riesgo")}
                >
                  🚨 En Riesgo ({lotesEnRiesgoUrgente})
                </button>
                <button
                  className={`filter-tab ${filtroActivo === "cosechados" ? "active" : ""}`}
                  onClick={() => onCambiarFiltro("cosechados")}
                >
                  ✔ Cosechados ({lotesCosechadosCount})
                </button>
              </div>

              <input
                type="text"
                className="form-control"
                style={{ width: "260px" }}
                placeholder="🔍 Buscar cuadro, finca o camino..."
                value={busquedaLote}
                onChange={(e) => setBusquedaLote(e.target.value)}
              />
            </div>

            {/* GRID DE LOTES DESPLEGADO EN MÚLTIPLES COLUMNAS (NO COLAPSADO) */}
            <div className="stats-cards-grid">
              {lotesParaStats.map((lote, index) => (
                <div
                  key={lote.id}
                  className={`lot-card ${lote.id === loteSeleccionadoId ? "selected" : ""}`}
                  onClick={() => onSeleccionarLote(lote.id)}
                >
                  <div className="lot-card-header">
                    <div className="lot-code">
                      {lote.estado === "PENDIENTE" && (
                        <span style={{ color: "#38bdf8", fontWeight: 800 }}>#{index + 1} Prioridad</span>
                      )}
                      <span style={{ fontSize: "16px" }}>{lote.codigo}</span>
                    </div>
                    <span className={`badge-status ${lote.dss.badgeClass}`}>{lote.dss.badgeText}</span>
                  </div>

                  <p style={{ fontSize: "12px", color: "#94a3b8", margin: "2px 0 8px" }}>{lote.finca}</p>

                  <div className="lot-details-grid">
                    <div className="lot-detail-item">Superficie: <b>{lote.has} ha</b></div>
                    <div className="lot-detail-item">Caña Estimada: <b>{Number(lote.toneladas).toLocaleString()} t</b></div>
                    <div className="lot-detail-item">Dist. Fábrica: <b>{lote.distanciaKm} km</b></div>
                    <div className="lot-detail-item">Tipo Suelo: <b>{lote.suelo}</b></div>
                    <div className="lot-detail-item" style={{ gridColumn: "span 2" }}>
                      Camino Salida:{" "}
                      <b style={{ color: lote.camino.includes("tierra") ? "#f87171" : "#34d399" }}>
                        {lote.camino}
                      </b>
                    </div>
                  </div>

                  <div className="lot-recommendation" style={{ "--rec-color": lote.dss.color }}>
                    {lote.dss.recomendacion}
                  </div>

                  <div className="lot-card-actions" style={{ marginTop: "14px" }}>
                    {lote.estado !== "COSECHADO" ? (
                      <button
                        className="btn-card-action btn-harvest"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarcarCosechado(lote.id);
                        }}
                      >
                        ✔️ Marcar Cosechado
                      </button>
                    ) : (
                      <button
                        className="btn-card-action"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReabrirLote(lote.id);
                        }}
                      >
                        🔄 Reabrir Lote
                      </button>
                    )}
                    {lote.estado === "PENDIENTE" && (
                      <button
                        className="btn-card-action"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAsignarFrente(lote.id);
                        }}
                      >
                        🚜 Asignar Cuadrilla
                      </button>
                    )}
                    <button
                      className="btn-card-action"
                      style={{ background: "#162032" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSeleccionarLote(lote.id);
                        setModoVisual("mapa");
                      }}
                    >
                      🗺️ Ver en Mapa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 3. MODO DIVIDIDO: SIDEBAR CLÁSICO AL LADO DEL MAPA             */}
        {/* ============================================================== */}
        {modoVisual === "dividido" && (
          <aside className="sidebar">
            <div className="sidebar-header">
              <h2><span>📋</span> Priorización de Cosecha (DSS)</h2>
              <span className="badge-status badge-safe">{lotesEnPieCount} en pie</span>
            </div>

            <div className="filter-tabs">
              <button
                className={`filter-tab ${filtroActivo === "todos" ? "active" : ""}`}
                onClick={() => onCambiarFiltro("todos")}
              >
                Todos ({lotes.length})
              </button>
              <button
                className={`filter-tab ${filtroActivo === "pendientes" ? "active" : ""}`}
                onClick={() => onCambiarFiltro("pendientes")}
              >
                En Pie
              </button>
              <button
                className={`filter-tab ${filtroActivo === "riesgo" ? "active" : ""}`}
                onClick={() => onCambiarFiltro("riesgo")}
              >
                En Riesgo
              </button>
              <button
                className={`filter-tab ${filtroActivo === "cosechados" ? "active" : ""}`}
                onClick={() => onCambiarFiltro("cosechados")}
              >
                Cosechados
              </button>
            </div>

            <div className="ranking-list">
              {rankingDSS.map((lote, index) => (
                <div
                  key={lote.id}
                  className={`lot-card ${lote.id === loteSeleccionadoId ? "selected" : ""}`}
                  onClick={() => onSeleccionarLote(lote.id)}
                >
                  <div className="lot-card-header">
                    <div className="lot-code">
                      {lote.estado === "PENDIENTE" && (
                        <span style={{ color: "#94a3b8", fontSize: "12px" }}>#{index + 1}</span>
                      )}
                      {lote.codigo}{" "}
                      <span style={{ fontSize: "12px", fontWeight: 500, color: "#94a3b8" }}>
                        ({lote.finca})
                      </span>
                    </div>
                    <span className={`badge-status ${lote.dss.badgeClass}`}>{lote.dss.badgeText}</span>
                  </div>

                  <div className="lot-details-grid">
                    <div className="lot-detail-item">Has / Ton: <b>{lote.has} ha / {lote.toneladas} t</b></div>
                    <div className="lot-detail-item">Dist. Fábrica: <b>{lote.distanciaKm} km</b></div>
                    <div className="lot-detail-item">Suelo: <b>{lote.suelo}</b></div>
                    <div className="lot-detail-item">Camino: <b>{lote.camino}</b></div>
                  </div>

                  <div className="lot-recommendation" style={{ "--rec-color": lote.dss.color }}>
                    {lote.dss.recomendacion}
                  </div>

                  <div className="lot-card-actions">
                    {lote.estado !== "COSECHADO" ? (
                      <button
                        className="btn-card-action btn-harvest"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarcarCosechado(lote.id);
                        }}
                      >
                        ✔️ Marcar Cosechado
                      </button>
                    ) : (
                      <button
                        className="btn-card-action"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReabrirLote(lote.id);
                        }}
                      >
                        🔄 Reabrir Lote
                      </button>
                    )}
                    {lote.estado === "PENDIENTE" && (
                      <button
                        className="btn-card-action"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAsignarFrente(lote.id);
                        }}
                      >
                        🚜 Asignar Cuadrilla
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
