import React, { useEffect, useRef } from "react";
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

  // Actualizar capas en el mapa
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

  return (
    <div className="view-container">
      {/* BARRA DE ESCENARIOS */}
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

      {/* WORKSPACE: MAPA + RANKING */}
      <div className="main-workspace">
        <div className="map-wrapper">
          <div id="map-dss" style={{ width: "100%", height: "100%" }}></div>

          <div className="map-legend">
            <div style={{ fontWeight: 700, marginBottom: "2px", color: "#94a3b8", fontSize: "11px", textTransform: "uppercase" }}>
              Estado de Lotes
            </div>
            <div className="legend-item"><div className="legend-color" style={{ background: "#ef4444" }}></div> Rojo: Urgente (Vulnerable)</div>
            <div className="legend-item"><div className="legend-color" style={{ background: "#f59e0b" }}></div> Amarillo: Precaución</div>
            <div className="legend-item"><div className="legend-color" style={{ background: "#10b981" }}></div> Verde: Seguro (Reserva)</div>
            <div className="legend-item"><div className="legend-color" style={{ background: "#3b82f6" }}></div> Azul: En Cosecha Activa</div>
            <div className="legend-item"><div className="legend-color" style={{ background: "#64748b" }}></div> Gris: Ya Cosechado</div>
            <div className="legend-item"><div className="legend-color" style={{ background: "#fbbf24", borderRadius: "50%" }}></div> ⭐ Fábrica La Esperanza</div>
          </div>
        </div>

        {/* SIDEBAR RANKING */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2><span>📋</span> Priorización de Cosecha (DSS)</h2>
            <span className="badge-status badge-safe">{lotes.filter(l => l.estado === "PENDIENTE").length} en pie</span>
          </div>

          <div className="filter-tabs">
            <button className={`filter-tab ${filtroActivo === "todos" ? "active" : ""}`} onClick={() => onCambiarFiltro("todos")}>Todos ({lotes.length})</button>
            <button className={`filter-tab ${filtroActivo === "pendientes" ? "active" : ""}`} onClick={() => onCambiarFiltro("pendientes")}>En Pie</button>
            <button className={`filter-tab ${filtroActivo === "riesgo" ? "active" : ""}`} onClick={() => onCambiarFiltro("riesgo")}>En Riesgo</button>
            <button className={`filter-tab ${filtroActivo === "cosechados" ? "active" : ""}`} onClick={() => onCambiarFiltro("cosechados")}>Cosechados</button>
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
                    {lote.estado === "PENDIENTE" && <span style={{ color: "#94a3b8", fontSize: "12px" }}>#{index + 1}</span>}
                    {lote.codigo} <span style={{ fontSize: "12px", fontWeight: 500, color: "#94a3b8" }}>({lote.finca})</span>
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
                      onClick={(e) => { e.stopPropagation(); onMarcarCosechado(lote.id); }}
                    >
                      ✔️ Marcar Cosechado
                    </button>
                  ) : (
                    <button
                      className="btn-card-action"
                      onClick={(e) => { e.stopPropagation(); onReabrirLote(lote.id); }}
                    >
                      🔄 Reabrir Lote
                    </button>
                  )}
                  {lote.estado === "PENDIENTE" && (
                    <button
                      className="btn-card-action"
                      onClick={(e) => { e.stopPropagation(); onAsignarFrente(lote.id); }}
                    >
                      🚜 Asignar Cuadrilla
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
