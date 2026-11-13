// ==========================================
// DATASET DE DOMINIO INICIAL - INGENIO LA ESPERANZA
// ==========================================

export const FINCAS = [
  { id: "finca-esp", nombre: "Finca Central La Esperanza", lat: -24.2255, lng: -64.8638, lotesCount: 3 },
  { id: "finca-mf", nombre: "Finca Miraflores (Río Grande)", lat: -24.2580, lng: -64.8420, lotesCount: 3 },
  { id: "finca-pue", nombre: "Finca El Puesto", lat: -24.2120, lng: -64.8190, lotesCount: 2 },
  { id: "finca-arr", nombre: "Finca Arrayanal", lat: -24.1920, lng: -64.8380, lotesCount: 1 }
];

export const LOTES_INICIALES = [
  {
    id: "ESP-00",
    codigo: "ESP-00",
    finca: "Finca Central La Esperanza",
    idFinca: "finca-esp",
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
    ivlEstatico: 1.5,
    cuadrillaAsignada: null,
    avancePct: 100
  },
  {
    id: "MF-01",
    codigo: "MF-01",
    finca: "Finca Miraflores (Río Grande)",
    idFinca: "finca-mf",
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
    ivlEstatico: 3.2,
    cuadrillaAsignada: null,
    avancePct: 100
  },
  {
    id: "MF-11",
    codigo: "MF-11",
    finca: "Finca Miraflores (Río Grande)",
    idFinca: "finca-mf",
    estado: "EN_COSECHA",
    has: 45,
    toneladas: 3600,
    suelo: "Franco-arenoso",
    drenaje: "Excelente",
    camino: "Ripio secundario",
    distanciaKm: 11.0,
    avancePct: 65,
    cuadrillaAsignada: "Frente N° 1 (Cuadrilla Norte - Cosechadora CH570)",
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
    finca: "Finca Miraflores (Río Grande)",
    idFinca: "finca-mf",
    estado: "PENDIENTE",
    has: 50,
    toneladas: 4100,
    suelo: "Arcilloso pesado",
    drenaje: "Deficiente (Bajo)",
    camino: "Callejón de tierra virgen",
    distanciaKm: 9.8,
    cuadrillaAsignada: null,
    avancePct: 0,
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
    finca: "Finca El Puesto",
    idFinca: "finca-pue",
    estado: "PENDIENTE",
    has: 55,
    toneladas: 4400,
    suelo: "Arcilloso",
    drenaje: "Deficiente",
    camino: "Tierra virgen (2 km a ripio)",
    distanciaKm: 16.0,
    cuadrillaAsignada: null,
    avancePct: 0,
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
    finca: "Finca Central La Esperanza",
    idFinca: "finca-esp",
    estado: "PENDIENTE",
    has: 35,
    toneladas: 2800,
    suelo: "Arcilloso",
    drenaje: "Medio",
    camino: "Callejón de tierra mejorado",
    distanciaKm: 5.5,
    cuadrillaAsignada: null,
    avancePct: 0,
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
    finca: "Finca El Puesto",
    idFinca: "finca-pue",
    estado: "PENDIENTE",
    has: 38,
    toneladas: 3000,
    suelo: "Franco-limoso",
    drenaje: "Medio",
    camino: "Callejón de tierra",
    distanciaKm: 14.0,
    cuadrillaAsignada: null,
    avancePct: 0,
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
    finca: "Finca Central La Esperanza",
    idFinca: "finca-esp",
    estado: "PENDIENTE",
    has: 40,
    toneladas: 3200,
    suelo: "Franco",
    drenaje: "Bueno",
    camino: "Ripio pesado / Pavimento",
    distanciaKm: 3.0,
    cuadrillaAsignada: null,
    avancePct: 0,
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
    finca: "Finca Arrayanal",
    idFinca: "finca-arr",
    estado: "PENDIENTE",
    has: 60,
    toneladas: 4800,
    suelo: "Franco",
    drenaje: "Excelente",
    camino: "Ripio consolidado (RP 56)",
    distanciaKm: 11.5,
    cuadrillaAsignada: null,
    avancePct: 0,
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

export const PARADAS_INICIALES = [
  {
    id: "PAR-01",
    fecha: "2026-10-24",
    fincaAfectada: "Finca Miraflores",
    duracionHoras: 8.5,
    causa: "FALTA_CANA_LLUVIA",
    toneladasNoMolidas: 4200,
    costoARS: 25000000,
    observaciones: "Temporal de 55 mm anegó callejón vecinal; camiones pesados hundidos."
  },
  {
    id: "PAR-02",
    fecha: "2026-11-02",
    fincaAfectada: "Finca El Puesto",
    duracionHoras: 6.0,
    causa: "FALTA_CANA_LLUVIA",
    toneladasNoMolidas: 2900,
    costoARS: 17500000,
    observaciones: "Barro arcilloso impidió egreso de cuadrilla nocturna."
  }
];

export const LECTURAS_PLUV_INICIALES = [
  { id: "pluv-01", finca: "Finca Miraflores", mm: 45, fecha: "Hoy 07:00", observaciones: "Lluvia intensa de madrugada" },
  { id: "pluv-02", finca: "Finca El Puesto", mm: 20, fecha: "Hoy 07:00", observaciones: "Lloviznas intermitentes" },
  { id: "pluv-03", finca: "Finca Central La Esperanza", mm: 5, fecha: "Hoy 07:00", observaciones: "Piso firme" }
];

export const CONFIG_ESCENARIOS = {
  live: {
    nombre: "Tiempo Real (Open-Meteo)",
    lluviaPrevistaMm: 2.0,
    probabilidadPct: 15,
    lluviaCaidaMm: 0.0,
    desc: "Pronóstico en vivo: San Pedro de Jujuy.",
    badge: "📡 En vivo Open-Meteo: Seco (2 mm prev)"
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
    desc: "¡Alerta Meteorológica! Precipitaciones torrenciales.",
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
