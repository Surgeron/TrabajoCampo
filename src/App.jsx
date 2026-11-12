import React, { useState, useEffect, useRef } from "react";
import "./App.css";

// 1. DATASET: 9 LOTES REPRESENTATIVOS DE LA ESPERANZA / SAN PEDRO DE JUJUY
const LOTES_BASE = [
  {
    id: "ESP-00",
    codigo: "ESP-00",
    finca: "La Esperanza Central",
    estado: "COSECHADO",
    has: 35,
    toneladas: 2800,
    suelo: "Franco",
    drenaje: "Bueno",
    camino: "Ripio consolidado / RP 56",
    distanciaKm: 2.5,
    coords: [
      [-24.2260, -64.8720],
      [-24.2260, -64.8660],
      [-24.2300, -64.8660],
      [-24.2300, -64.8720]
    ],
    center: [-24.2280, -64.8690],
    ivlEstatico: 1.5
  },
  {
    id: "MF-01",
    codigo: "MF-01",
    finca: "Miraflores",
    estado: "COSECHADO",
    has: 40,
    toneladas: 3200,
    suelo: "Arcilloso",
    drenaje: "Medio",
    camino: "Ripio secundario",
    distanciaKm: 8.5,
    coords: [
      [-24.2500, -64.8510],
      [-24.2500, -64.8450],
      [-24.2540, -64.8450],
      [-24.2540, -64.8510]
    ],
    center: [-24.2520, -64.8480],
    ivlEstatico: 3.2
  },
  {
    id: "MF-11",
    codigo: "MF-11",
    finca: "Miraflores Loma",
    estado: "EN_COSECHA",
    has: 45,
    toneladas: 3600,
    suelo: "Franco-arenoso",
    drenaje: "Excelente",
    camino: "Ripio secundario",
    distanciaKm: 11.0,
    avancePct: 65,
    coords: [
      [-24.2630, -64.8340],
      [-24.2630, -64.8280],
      [-24.2670, -64.8280],
      [-24.2670, -64.8340]
    ],
    center: [-24.2650, -64.8310],
    ivlEstatico: 1.8
  },
  {
    id: "MF-03",
    codigo: "MF-03",
    finca: "Miraflores Bajo",
    estado: "PENDIENTE",
    has: 50,
    toneladas: 4100,
    suelo: "Arcilloso pesado",
    drenaje: "Deficiente (Bajo)",
    camino: "Callejón de tierra virgen",
    distanciaKm: 9.8,
    coords: [
      [-24.2560, -64.8450],
      [-24.2560, -64.8390],
      [-24.2600, -64.8390],
      [-24.2600, -64.8450]
    ],
    center: [-24.2580, -64.8420],
    ivlEstatico: 4.8
  },
  {
    id: "PUE-12",
    codigo: "PUE-12",
    finca: "El Puesto (Zanja)",
    estado: "PENDIENTE",
    has: 55,
    toneladas: 4400,
    suelo: "Arcilloso",
    drenaje: "Deficiente",
    camino: "Tierra virgen (2 km a ripio)",
    distanciaKm: 16.0,
    coords: [
      [-24.2030, -64.8110],
      [-24.2030, -64.8050],
      [-24.2070, -64.8050],
      [-24.2070, -64.8110]
    ],
    center: [-24.2050, -64.8080],
    ivlEstatico: 4.6
  },
  {
    id: "ESP-08",
    codigo: "ESP-08",
    finca: "La Esperanza Fondo",
    estado: "PENDIENTE",
    has: 35,
    toneladas: 2800,
    suelo: "Arcilloso",
    drenaje: "Medio",
    camino: "Callejón mejorado",
    distanciaKm: 5.5,
    coords: [
      [-24.2400, -64.8790],
      [-24.2400, -64.8730],
      [-24.2440, -64.8730],
      [-24.2440, -64.8790]
    ],
    center: [-24.2420, -64.8760],
    ivlEstatico: 3.6
  },
  {
    id: "PUE-05",
    codigo: "PUE-05",
    finca: "El Puesto",
    estado: "PENDIENTE",
    has: 38,
    toneladas: 3000,
    suelo: "Franco-limoso",
    drenaje: "Medio",
    camino: "Callejón de tierra",
    distanciaKm: 14.0,
    coords: [
      [-24.2100, -64.8220],
      [-24.2100, -64.8160],
      [-24.2140, -64.8160],
      [-24.2140, -64.8220]
    ],
    center: [-24.2120, -64.8190],
    ivlEstatico: 3.5
  },
  {
    id: "ESP-01",
    codigo: "ESP-01",
    finca: "La Esperanza Central",
    estado: "PENDIENTE",
    has: 40,
    toneladas: 3200,
    suelo: "Franco",
    drenaje: "Bueno",
    camino: "Ripio pesado / Pavimento",
    distanciaKm: 3.0,
    coords: [
      [-24.2310, -64.8670],
      [-24.2310, -64.8610],
      [-24.2350, -64.8610],
      [-24.2350, -64.8670]
    ],
    center: [-24.2330, -64.8640],
    ivlEstatico: 1.2
  },
  {
    id: "ARR-02",
    codigo: "ARR-02",
    finca: "Arrayanal",
    estado: "PENDIENTE",
    has: 60,
    toneladas: 4800,
    suelo: "Franco",
    drenaje: "Excelente",
    camino: "Ripio consolidado (RP 56)",
    distanciaKm: 11.5,
    coords: [
      [-24.1900, -64.8410],
      [-24.1900, -64.8350],
      [-24.1940, -64.8350],
      [-24.1940, -64.8410]
    ],
    center: [-24.1920, -64.8380],
    ivlEstatico: 1.4
  }
];

const CONFIG_ESCENARIOS = {
  live: {
    nombre: "Tiempo Real (Open-Meteo)",
    lluviaPrevistaMm: 2.0,
    probabilidadPct: 15,
    lluviaCaidaMm: 0.0,
    desc: "Pronóstico en vivo: San Pedro de Jujuy.",
    badge: "📡 En vivo Open-Meteo: Seco (2 mm)"
  },
  light: {
    nombre: "Lluvia Leve (15 mm)",
    lluviaPrevistaMm: 15.0,
    probabilidadPct: 70,
    lluviaCaidaMm: 5.0,
    desc: "Llovizna moderada prevista en 24h.",
    badge: "🌦️ Simulación: 15 mm en 24h"
  },
  storm: {
    nombre: "Temporal Severo de Yungas (60 mm)",
    lluviaPrevistaMm: 60.0,
    probabilidadPct: 90,
    lluviaCaidaMm: 15.0,
    desc: "¡Alerta naranja! Precipitaciones torrenciales.",
    badge: "⛈️ ALERTA NARANJA: 60 mm inminentes"
  },
  sat: {
    nombre: "Suelo Saturado (40 mm caídos + 20 mm)",
    lluviaPrevistaMm: 20.0,
    probabilidadPct: 80,
    lluviaCaidaMm: 40.0,
    desc: "Suelo ya empapado por lluvias previas.",
    badge: "🌊 Suelo Saturado: 40 mm acum + 20 mm"
  }
};

export default function App() {
  const [lotes, setLotes] = useState(LOTES_BASE);
  const [escenarioActual, setEscenarioActual] = useState("live");
  const [filtroActivo, setFiltroActivo] = useState("todos");
  const [loteSeleccionadoId, setLoteSeleccionadoId] = useState(null);
  
  const [modalPluviometro, setModalPluviometro] = useState(false);
  const [modalParadas, setModalParadas] = useState(false);
  const [toast, setToast] = useState({ visible: false, text: "" });

  const [pluvFinca, setPluvFinca] = useState("Miraflores");
  const [pluvMm, setPluvMm] = useState(45);
  const [pluvObs, setPluvObs] = useState("Callejón bajo anegado por lluvia de madrugada.");

  const [paradaCausa, setParadaCausa] = useState("FALTA_CANA_LLUVIA");
  const [paradaHoras, setParadaHoras] = useState(6.0);
  const [paradaTon, setParadaTon] = useState(2800);

  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const polygonLayersRef = useRef({});

  // 1. Helper DSS
  const calcularPrioridad = (lote, cfgClima) => {
    if (lote.estado === "COSECHADO") {
      return {
        puntaje: 0,
        semaforo: "COSECHADO",
        color: "#64748b",
        recomendacion: "Lote ya cosechado. Caña recibida en fábrica sin riesgo.",
        badgeClass: "badge-harvested",
        badgeText: "Cosechado ✔️"
      };
    }
    if (lote.estado === "EN_COSECHA") {
      return {
        puntaje: 8.5,
        semaforo: "EN_COSECHA",
        color: "#3b82f6",
        recomendacion: `Frente activo cortando (${lote.avancePct || 65}% completado). No interrumpir.`,
        badgeClass: "badge-active",
        badgeText: `En Cosecha (${lote.avancePct || 65}%)`
      };
    }

    const rMet = Math.min(10, ((cfgClima.lluviaCaidaMm * 0.4) + (cfgClima.lluviaPrevistaMm * (cfgClima.probabilidadPct / 100) * 0.6)) / 3.0);
    const puntaje = (lote.ivlEstatico * 1.0) + (rMet * 0.9);

    if (puntaje >= 6.5) {
      return {
        puntaje,
        semaforo: "ROJO",
        color: "#ef4444",
        recomendacion: `🚨 COSECHAR URGENTE: Suelo ${lote.suelo} y ${lote.camino}. Quedará intransitable con ${cfgClima.lluviaPrevistaMm} mm.`,
        badgeClass: "badge-urgent",
        badgeText: "Urgente Cosechar 🚨"
      };
    } else if (puntaje >= 4.0) {
      return {
        puntaje,
        semaforo: "AMARILLO",
        color: "#f59e0b",
        recomendacion: `⚠️ MONITOREO: Camino sensible pero transitable. Programar en segunda línea.`,
        badgeClass: "badge-warning",
        badgeText: "Precaución ⚠️"
      };
    } else {
      return {
        puntaje,
        semaforo: "VERDE",
        color: "#10b981",
        recomendacion: `🟢 LOTE SEGURO / RESERVA: Acceso con ripio firme. Conservar para días de lluvia.`,
        badgeClass: "badge-safe",
        badgeText: "Reserva Segura 🟢"
      };
    }
  };

  const showToast = (text) => {
    setToast({ visible: true, text });
    setTimeout(() => {
      setToast({ visible: false, text: "" });
    }, 3500);
  };

  // 2. Inicializar Mapa Leaflet
  useEffect(() => {
    if (!window.L || mapInstanceRef.current) return;

    const L = window.L;
    const map = L.map("map").setView([-24.2300, -64.8450], 13);
    mapInstanceRef.current = map;

    // Satélite
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Esri World Imagery',
      maxZoom: 18
    }).addTo(map);

    // Fábrica
    const factoryIcon = L.divIcon({
      className: 'factory-marker',
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

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 3. Renderizar polígonos cuando cambian lotes o escenario
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;
    const cfg = CONFIG_ESCENARIOS[escenarioActual];

    lotes.forEach((lote) => {
      const dss = calcularPrioridad(lote, cfg);

      if (polygonLayersRef.current[lote.id]) {
        map.removeLayer(polygonLayersRef.current[lote.id]);
      }

      const poly = L.polygon(lote.coords, {
        color: dss.color,
        weight: lote.id === loteSeleccionadoId ? 4 : 2,
        fillColor: dss.color,
        fillOpacity: lote.estado === "COSECHADO" ? 0.3 : 0.65
      }).addTo(map);

      poly.bindTooltip(`<b>${lote.codigo}</b><br><span style="font-size:11px;">${lote.has} ha | ${lote.toneladas} t</span>`, {
        permanent: false,
        direction: "center"
      });

      poly.on("click", () => {
        setLoteSeleccionadoId(lote.id);
        map.flyTo(lote.center, 14, { duration: 0.8 });
      });

      polygonLayersRef.current[lote.id] = poly;
    });
  }, [lotes, escenarioActual, loteSeleccionadoId]);

  // KPIs
  const totalToneladas = lotes.reduce((acc, l) => acc + l.toneladas, 0);
  const cosechadas = lotes.filter((l) => l.estado === "COSECHADO").reduce((acc, l) => acc + l.toneladas, 0);
  const pendientes = lotes.filter((l) => l.estado === "PENDIENTE");
  const toneladasPendientes = pendientes.reduce((acc, l) => acc + l.toneladas, 0);
  const cfg = CONFIG_ESCENARIOS[escenarioActual];
  const enRiesgoRojo = lotes.filter((l) => l.estado === "PENDIENTE" && calcularPrioridad(l, cfg).semaforo === "ROJO");
  const toneladasEnRiesgo = enRiesgoRojo.reduce((acc, l) => acc + l.toneladas, 0);
  const frentesActivos = lotes.filter((l) => l.estado === "EN_COSECHA").length;
  const avancePct = ((cosechadas / totalToneladas) * 100).toFixed(1);

  // Lista filtrada para ranking
  let listaRanking = [...lotes].map(l => ({ ...l, dss: calcularPrioridad(l, cfg) }));
  if (filtroActivo === "pendientes") {
    listaRanking = listaRanking.filter(l => l.estado === "PENDIENTE");
  } else if (filtroActivo === "riesgo") {
    listaRanking = listaRanking.filter(l => l.dss.semaforo === "ROJO" || l.dss.semaforo === "AMARILLO");
  } else if (filtroActivo === "cosechados") {
    listaRanking = listaRanking.filter(l => l.estado === "COSECHADO");
  }
  listaRanking.sort((a, b) => (b.dss.puntaje || 0) - (a.dss.puntaje || 0));

  // Acciones
  const handleMarcarCosechado = (id) => {
    setLotes(prev => prev.map(l => l.id === id ? { ...l, estado: "COSECHADO" } : l));
    showToast(`Lote ${id} marcado como COSECHADO. El avance de Zafra subió.`);
  };

  const handleReabrirLote = (id) => {
    setLotes(prev => prev.map(l => l.id === id ? { ...l, estado: "PENDIENTE" } : l));
    showToast(`Lote ${id} reabierto a PENDIENTE.`);
  };

  const handleAsignarFrente = (id) => {
    setLotes(prev => prev.map(l => l.id === id ? { ...l, estado: "EN_COSECHA", avancePct: 15 } : l));
    showToast(`Frente de cosecha asignado al Lote ${id}.`);
  };

  const handleGuardarPluviometro = () => {
    setModalPluviometro(false);
    showToast(`Lectura guardada: ${pluvMm} mm en ${pluvFinca}. Recalculando...`);
    if (pluvMm >= 30) {
      setEscenarioActual("sat");
    } else {
      setEscenarioActual("light");
    }
  };

  const handleGuardarParada = () => {
    setModalParadas(false);
    showToast(`Parada registrada: ${paradaHoras} hs (${paradaTon} t no molidas).`);
  };

  const handleReset = () => {
    setLotes(JSON.parse(JSON.stringify(LOTES_BASE)));
    setEscenarioActual("live");
    setLoteSeleccionadoId(null);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([-24.2300, -64.8450], 13);
    }
    showToast("Demostración restablecida a valores iniciales.");
  };

  return (
    <div className="app-container">
      {/* TOPBAR */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">🌱</div>
          <div className="brand-text">
            <h1>PluviaZafra <span className="badge-client">Ingenio La Esperanza</span></h1>
            <p>Sistema de Apoyo a la Priorización de Cosecha por Vulnerabilidad Hídrica</p>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="btn-action" onClick={() => setModalPluviometro(true)}>
            <span>🌧️</span> Cargar Pluviómetro
          </button>
          <button className="btn-action" onClick={() => setModalParadas(true)}>
            <span>⚠️</span> Registro de Paradas
          </button>
          <button className="btn-action btn-primary" onClick={handleReset}>
            <span>🔄</span> Reiniciar Demo
          </button>
        </div>
      </header>

      {/* SCENARIO STRIP */}
      <div className="scenario-strip">
        <div className="scenario-label">
          <span>⚡ Modo Simulación de Lluvias:</span>
        </div>
        <div className="scenario-buttons">
          <button
            className={`btn-scenario ${escenarioActual === "live" ? "active" : ""}`}
            onClick={() => { setEscenarioActual("live"); showToast("Escenario: Tiempo Real (Open-Meteo)"); }}
          >
            <span>☀️</span> 1. Tiempo Real (Open-Meteo)
          </button>
          <button
            className={`btn-scenario sc-rain ${escenarioActual === "light" ? "active" : ""}`}
            onClick={() => { setEscenarioActual("light"); showToast("Escenario: Lluvia Leve (15 mm)"); }}
          >
            <span>🌦️</span> 2. Lluvia Leve (15 mm)
          </button>
          <button
            className={`btn-scenario sc-storm ${escenarioActual === "storm" ? "active" : ""}`}
            onClick={() => { setEscenarioActual("storm"); showToast("Escenario: Temporal Severo (60 mm)"); }}
          >
            <span>⛈️</span> 3. Temporal Severo (60 mm)
          </button>
          <button
            className={`btn-scenario sc-sat ${escenarioActual === "sat" ? "active" : ""}`}
            onClick={() => { setEscenarioActual("sat"); showToast("Escenario: Suelo Saturado (40mm + 20mm)"); }}
          >
            <span>🌊</span> 4. Suelo Saturado (40mm caídos + 20mm)
          </button>
        </div>
        <div className="scenario-info-badge">
          <span>📡</span> <span>{cfg.badge}</span>
        </div>
      </div>

      {/* KPI ROW */}
      <section className="kpi-row">
        <div className="kpi-card" style={{ "--kpi-color": "var(--color-emerald)" }}>
          <div className="kpi-title">Avance de Campaña Zafra</div>
          <div className="kpi-value-row">
            <span className="kpi-value">{avancePct}%</span>
            <span className="kpi-sub">{cosechadas.toLocaleString()} / {totalToneladas.toLocaleString()} ton</span>
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${avancePct}%` }}></div>
          </div>
        </div>

        <div className="kpi-card" style={{ "--kpi-color": "var(--color-blue)" }}>
          <div className="kpi-title">Caña en Pie (Pendiente)</div>
          <div className="kpi-value-row">
            <span className="kpi-value">{toneladasPendientes.toLocaleString()} t</span>
            <span className="kpi-sub">en {pendientes.length} lotes</span>
          </div>
          <span className="kpi-sub">Listos para cuadrillas y frentes</span>
        </div>

        <div className="kpi-card" style={{ "--kpi-color": "var(--color-red)" }}>
          <div className="kpi-title">Riesgo Inminente por Lluvia</div>
          <div className="kpi-value-row">
            <span className="kpi-value" style={{ color: "#f87171" }}>{toneladasEnRiesgo.toLocaleString()} t</span>
            <span className="kpi-sub">({enRiesgoRojo.length} lotes en rojo)</span>
          </div>
          <span className="kpi-sub">{toneladasEnRiesgo > 0 ? "¡Atención! Caña en peligro de corte" : "Sin lotes críticos por lluvia"}</span>
        </div>

        <div className="kpi-card" style={{ "--kpi-color": "#8b5cf6" }}>
          <div className="kpi-title">Frentes Activos de Corte</div>
          <div className="kpi-value-row">
            <span className="kpi-value">{frentesActivos}</span>
            <span className="kpi-sub">Frente N° 1 (MF-11)</span>
          </div>
          <span className="kpi-sub">Ritmo: ~120 t/hora despachadas</span>
        </div>
      </section>

      {/* MAIN WORKSPACE */}
      <main className="main-workspace">
        <div id="map" ref={mapRef}></div>

        <div className="map-legend">
          <div style={{ fontWeight: 700, marginBottom: "2px", color: "#94a3b8", fontSize: "11px", textTransform: "uppercase" }}>
            Estado de Lotes
          </div>
          <div className="legend-item"><div className="legend-color" style={{ background: "#ef4444" }}></div> Rojo: Cosechar Urgente (Vulnerable)</div>
          <div className="legend-item"><div className="legend-color" style={{ background: "#f59e0b" }}></div> Amarillo: Precaución / Monitoreo</div>
          <div className="legend-item"><div className="legend-color" style={{ background: "#10b981" }}></div> Verde: Seguro (Reserva para lluvia)</div>
          <div className="legend-item"><div className="legend-color" style={{ background: "#3b82f6" }}></div> Azul: En Cosecha Activa (Cuadrilla)</div>
          <div className="legend-item"><div className="legend-color" style={{ background: "#64748b" }}></div> Gris: Ya Cosechado</div>
          <div className="legend-item"><div className="legend-color" style={{ background: "#fbbf24", borderRadius: "50%" }}></div> ⭐ Fábrica / Canchón La Esperanza</div>
        </div>

        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2><span>📋</span> Priorización de Cosecha (DSS)</h2>
            <span className="badge-status badge-safe">{pendientes.length} en pie</span>
          </div>

          <div className="filter-tabs">
            <button className={`filter-tab ${filtroActivo === "todos" ? "active" : ""}`} onClick={() => setFiltroActivo("todos")}>Todos ({lotes.length})</button>
            <button className={`filter-tab ${filtroActivo === "pendientes" ? "active" : ""}`} onClick={() => setFiltroActivo("pendientes")}>En Pie</button>
            <button className={`filter-tab ${filtroActivo === "riesgo" ? "active" : ""}`} onClick={() => setFiltroActivo("riesgo")}>En Riesgo</button>
            <button className={`filter-tab ${filtroActivo === "cosechados" ? "active" : ""}`} onClick={() => setFiltroActivo("cosechados")}>Cosechados</button>
          </div>

          <div className="ranking-list">
            {listaRanking.map((lote, index) => (
              <div
                key={lote.id}
                className={`lot-card ${lote.id === loteSeleccionadoId ? "selected" : ""}`}
                onClick={() => {
                  setLoteSeleccionadoId(lote.id);
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.flyTo(lote.center, 14, { duration: 0.8 });
                  }
                }}
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
                      onClick={(e) => { e.stopPropagation(); handleMarcarCosechado(lote.id); }}
                    >
                      ✔️ Simular: Marcar Cosechado
                    </button>
                  ) : (
                    <button
                      className="btn-card-action"
                      onClick={(e) => { e.stopPropagation(); handleReabrirLote(lote.id); }}
                    >
                      🔄 Reabrir Lote
                    </button>
                  )}
                  {lote.estado === "PENDIENTE" && (
                    <button
                      className="btn-card-action"
                      onClick={(e) => { e.stopPropagation(); handleAsignarFrente(lote.id); }}
                    >
                      🚜 Asignar Cuadrilla
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </main>

      {/* MODAL PLUVIÓMETRO */}
      {modalPluviometro && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ fontSize: "15px" }}>🌧️ Registro de Pluviómetro (Módulo Cosechador)</h3>
              <button onClick={() => setModalPluviometro(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "18px", cursor: "pointer" }}>&times;</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "12.5px", color: "#94a3b8" }}>Simula la carga manual de lluvia del encargado de frente en campo.</p>
              <div className="form-group">
                <label>Finca / Puesto:</label>
                <select className="form-control" value={pluvFinca} onChange={(e) => setPluvFinca(e.target.value)}>
                  <option value="Miraflores">Finca Miraflores (Zona Baja Río)</option>
                  <option value="El Puesto">Finca El Puesto (Sector Zanjas)</option>
                  <option value="La Esperanza">Finca Central La Esperanza</option>
                  <option value="Arrayanal">Finca Arrayanal (Norte)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Precipitación caída en las últimas 24 hs (mm):</label>
                <input type="number" className="form-control" value={pluvMm} onChange={(e) => setPluvMm(Number(e.target.value))} min="0" max="250" />
              </div>
              <div className="form-group">
                <label>Observaciones de transitabilidad:</label>
                <input type="text" className="form-control" value={pluvObs} onChange={(e) => setPluvObs(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-action" onClick={() => setModalPluviometro(false)}>Cancelar</button>
              <button className="btn-action btn-primary" onClick={handleGuardarPluviometro}>Guardar Lectura y Recalcular</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARADAS */}
      {modalParadas && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <h3 style={{ fontSize: "15px" }}>🏭 Registro de Paradas de Fábrica (Impacto)</h3>
              <button onClick={() => setModalParadas(false)} style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "18px", cursor: "pointer" }}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ background: "#1e293b", border: "1px solid #334155", padding: "12px", borderRadius: "8px" }}>
                <div style={{ fontSize: "11px", textTransform: "uppercase", color: "#94a3b8", fontWeight: 700 }}>Impacto Zafra 2026 (Histórico)</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "6px" }}>
                  <div><b>Horas Totales Paradas:</b> <span style={{ color: "#f87171", fontFamily: "JetBrains Mono", fontWeight: 700 }}>14.5 hs</span></div>
                  <div><b>Costo Estimado:</b> <span style={{ color: "#fbbf24", fontFamily: "JetBrains Mono", fontWeight: 700 }}>$ 42.500.000 ARS</span></div>
                </div>
              </div>
              <div className="form-group">
                <label>Causa:</label>
                <select className="form-control" value={paradaCausa} onChange={(e) => setParadaCausa(e.target.value)}>
                  <option value="FALTA_CANA_LLUVIA">Falta de caña por anegamiento de lotes / caminos</option>
                  <option value="ROTURA_MECANICA">Falla mecánica en trapiche / fábrica</option>
                  <option value="CORTE_ENERGIA">Corte de suministro eléctrico</option>
                </select>
              </div>
              <div className="form-group">
                <label>Duración estimada (Horas):</label>
                <input type="number" className="form-control" value={paradaHoras} onChange={(e) => setParadaHoras(Number(e.target.value))} min="0.5" step="0.5" />
              </div>
              <div className="form-group">
                <label>Toneladas de caña no molidas:</label>
                <input type="number" className="form-control" value={paradaTon} onChange={(e) => setParadaTon(Number(e.target.value))} min="100" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-action" onClick={() => setModalParadas(false)}>Cerrar</button>
              <button className="btn-action btn-primary" onClick={handleGuardarParada}>Registrar Incidente</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast.visible && (
        <div className="toast">
          <span>✅</span> <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}
