// ==========================================
// DATASHEETS STORE (PERSISTENCIA TABULAR SIN SQL / SIN FIREBASE)
// Almacenamiento por hojas de datos en memoria + localStorage
// ==========================================

import {
  Rol,
  EstadoLote,
  Suelo,
  Drenaje,
  Camino,
  CausaParada,
  EstadoParada
} from "./enums.js";

const STORAGE_KEY = "pluviazafra_datasheets_v1";

function horasAtrasISO(horas) {
  return new Date(Date.now() - horas * 3600000).toISOString();
}

function diasAdelanteDate(dias) {
  const d = new Date(Date.now() + dias * 86400000);
  return d.toISOString().split("T")[0];
}

// Crea polígonos rectangulares centrados en (lat, lng) con área aproximada en ha
function crearPoligonoRect(lat, lng, hectareas) {
  const areaM2 = hectareas * 10000;
  const ladoM = Math.sqrt(areaM2);
  const anchoM = ladoM * 1.25;
  const altoM = areaM2 / anchoM;
  const dLat = (altoM / 2) / 111194;
  const dLng = (anchoM / 2) / (111194 * Math.cos((lat * Math.PI) / 180));
  return [
    [Number((lat + dLat).toFixed(5)), Number((lng - dLng).toFixed(5))],
    [Number((lat + dLat).toFixed(5)), Number((lng + dLng).toFixed(5))],
    [Number((lat - dLat).toFixed(5)), Number((lng + dLng).toFixed(5))],
    [Number((lat - dLat).toFixed(5)), Number((lng - dLng).toFixed(5))]
  ];
}

export function crearDatasheetsIniciales() {
  return {
    metadata: {
      nombre: "PluviaZafra Datasheets",
      organizacion: "Ingenio La Esperanza",
      versionEsquema: 1,
      actualizadoEn: new Date().toISOString()
    },

    // Hoja 1: usuarios (CU01, CU02)
    usuarios: [
      {
        id: "usr-admin",
        nombre: "Ing. Marcos Tolaba",
        correo: "admin@laesperanza.com.ar",
        rol: Rol.ADMINISTRADOR,
        habilitado: true,
        clave: "123"
      },
      {
        id: "usr-jefe",
        nombre: "Ing. Carlos Mendoza",
        correo: "jefe@laesperanza.com.ar",
        rol: Rol.JEFE_COSECHA,
        habilitado: true,
        clave: "123"
      },
      {
        id: "usr-operador",
        nombre: "Roberto Farfán",
        correo: "operador@laesperanza.com.ar",
        rol: Rol.OPERADOR_CAMPO,
        habilitado: true,
        clave: "123"
      },
      {
        id: "usr-supervisor",
        nombre: "Lic. Horacio Valdiviezo",
        correo: "supervisor@laesperanza.com.ar",
        rol: Rol.SUPERVISOR_FABRICA,
        habilitado: true,
        clave: "123"
      },
      {
        id: "usr-inactivo",
        nombre: "Pedro Gómez",
        correo: "inactivo@laesperanza.com.ar",
        rol: Rol.OPERADOR_CAMPO,
        habilitado: false,
        clave: "123"
      }
    ],

    // Hoja 2: zonas (CU07)
    zonas: [
      {
        codigo: "ZN-NORTE",
        nombre: "Zona Norte — Miraflores",
        latitud: -24.258,
        longitud: -64.842
      },
      {
        codigo: "ZN-SUR",
        nombre: "Zona Sur — El Puesto",
        latitud: -24.212,
        longitud: -64.819
      },
      {
        codigo: "ZN-CENTRO",
        nombre: "Zona Central — La Esperanza",
        latitud: -24.2255,
        longitud: -64.8638
      },
      {
        codigo: "ZN-ESTE",
        nombre: "Zona Este — Arrayanal",
        latitud: -24.192,
        longitud: -64.838
      }
    ],

    // Hoja 3: pluviometros (CU07, RN04)
    pluviometros: [
      {
        codigo: "PLUV-N01",
        zonaCodigo: "ZN-NORTE",
        latitud: -24.2575,
        longitud: -64.8415,
        activo: true
      },
      {
        codigo: "PLUV-S01",
        zonaCodigo: "ZN-SUR",
        latitud: -24.2115,
        longitud: -64.8185,
        activo: true
      },
      {
        codigo: "PLUV-C01",
        zonaCodigo: "ZN-CENTRO",
        latitud: -24.225,
        longitud: -64.863,
        activo: false // Reemplazado históricamente por PLUV-C02 (RN04)
      },
      {
        codigo: "PLUV-C02",
        zonaCodigo: "ZN-CENTRO",
        latitud: -24.2258,
        longitud: -64.864,
        activo: true
      },
      {
        codigo: "PLUV-E01",
        zonaCodigo: "ZN-ESTE",
        latitud: -24.1918,
        longitud: -64.8375,
        activo: true
      }
    ],

    // Hoja 4: lotes (CU03)
    lotes: [
      {
        codigo: "LOTE-A",
        nombre: "Lote A — Miraflores Bajo",
        hectareas: 48,
        toneladas: 1800,
        zonaCodigo: "ZN-NORTE",
        estado: EstadoLote.PENDIENTE,
        semaforo: null,
        poligono: crearPoligonoRect(-24.258, -64.842, 48)
      },
      {
        codigo: "LOTE-B",
        nombre: "Lote B — Miraflores Medio",
        hectareas: 35,
        toneladas: 1200,
        zonaCodigo: "ZN-NORTE",
        estado: EstadoLote.PENDIENTE,
        semaforo: null,
        poligono: crearPoligonoRect(-24.251, -64.849, 35)
      },
      {
        codigo: "LOTE-C",
        nombre: "Lote C — Miraflores Alto",
        hectareas: 60,
        toneladas: 2500,
        zonaCodigo: "ZN-NORTE",
        estado: EstadoLote.PENDIENTE,
        semaforo: null,
        poligono: crearPoligonoRect(-24.266, -64.832, 60)
      },
      {
        codigo: "PUE-12",
        nombre: "El Puesto Zanja",
        hectareas: 55,
        toneladas: 4400,
        zonaCodigo: "ZN-SUR",
        estado: EstadoLote.PENDIENTE,
        semaforo: null,
        poligono: crearPoligonoRect(-24.205, -64.808, 55)
      },
      {
        codigo: "PUE-05",
        nombre: "El Puesto Bajo",
        hectareas: 38,
        toneladas: 3000,
        zonaCodigo: "ZN-SUR",
        estado: EstadoLote.ANEGADO,
        semaforo: null,
        poligono: crearPoligonoRect(-24.213, -64.821, 38)
      },
      {
        codigo: "ESP-01",
        nombre: "La Esperanza Norte",
        hectareas: 40,
        toneladas: 3200,
        zonaCodigo: "ZN-CENTRO",
        estado: EstadoLote.PENDIENTE,
        semaforo: null,
        poligono: crearPoligonoRect(-24.234, -64.864, 40)
      },
      {
        codigo: "ESP-08",
        nombre: "La Esperanza Fondo",
        hectareas: 35,
        toneladas: 2800,
        zonaCodigo: "ZN-CENTRO",
        estado: EstadoLote.EN_COSECHA,
        semaforo: null,
        poligono: crearPoligonoRect(-24.243, -64.875, 35)
      },
      {
        codigo: "ESP-00",
        nombre: "La Esperanza Casco",
        hectareas: 35,
        toneladas: 2800,
        zonaCodigo: "ZN-CENTRO",
        estado: EstadoLote.COSECHADO,
        semaforo: null,
        poligono: crearPoligonoRect(-24.227, -64.872, 35)
      },
      {
        codigo: "ARR-02",
        nombre: "Arrayanal RP 56",
        hectareas: 60,
        toneladas: 4800,
        zonaCodigo: "ZN-ESTE",
        estado: EstadoLote.EN_DESCANSO,
        semaforo: null,
        poligono: crearPoligonoRect(-24.192, -64.838, 60)
      },
      {
        codigo: "ARR-09",
        nombre: "Arrayanal Ampliación",
        hectareas: 42,
        toneladas: 3100,
        zonaCodigo: "ZN-ESTE",
        estado: EstadoLote.PENDIENTE,
        semaforo: null,
        poligono: crearPoligonoRect(-24.185, -64.829, 42)
      }
    ],

    // Hoja 5: atributosVulnerabilidad (CU04, RN11 - historial conservado)
    atributosVulnerabilidad: [
      {
        id: "atr-001",
        loteCodigo: "LOTE-A",
        suelo: Suelo.ARCILLOSO,
        drenaje: Drenaje.MALO,
        camino: Camino.TIERRA,
        fechaHora: "2026-04-15T10:00:00.000Z",
        usuarioId: "usr-admin"
      },
      {
        id: "atr-002",
        loteCodigo: "LOTE-B",
        suelo: Suelo.FRANCO,
        drenaje: Drenaje.MALO,
        camino: Camino.ENRIPIADO,
        fechaHora: "2026-04-15T10:15:00.000Z",
        usuarioId: "usr-admin"
      },
      {
        id: "atr-003",
        loteCodigo: "LOTE-C",
        suelo: Suelo.ARENOSO,
        drenaje: Drenaje.BUENO,
        camino: Camino.CONSOLIDADO,
        fechaHora: "2026-04-15T10:30:00.000Z",
        usuarioId: "usr-admin"
      },
      {
        id: "atr-004",
        loteCodigo: "PUE-12",
        suelo: Suelo.ARCILLOSO,
        drenaje: Drenaje.MALO,
        camino: Camino.TIERRA,
        fechaHora: "2026-04-16T09:00:00.000Z",
        usuarioId: "usr-admin"
      },
      {
        id: "atr-005",
        loteCodigo: "PUE-05",
        suelo: Suelo.FRANCO,
        drenaje: Drenaje.REGULAR,
        camino: Camino.TIERRA,
        fechaHora: "2026-04-16T09:20:00.000Z",
        usuarioId: "usr-admin"
      },
      {
        id: "atr-006",
        loteCodigo: "ESP-01",
        suelo: Suelo.FRANCO,
        drenaje: Drenaje.BUENO,
        camino: Camino.CONSOLIDADO,
        fechaHora: "2026-04-16T09:40:00.000Z",
        usuarioId: "usr-admin"
      },
      {
        id: "atr-007",
        loteCodigo: "ESP-08",
        suelo: Suelo.ARCILLOSO,
        drenaje: Drenaje.REGULAR,
        camino: Camino.ENRIPIADO,
        fechaHora: "2026-04-16T10:00:00.000Z",
        usuarioId: "usr-admin"
      },
      {
        id: "atr-008",
        loteCodigo: "ESP-00",
        suelo: Suelo.FRANCO,
        drenaje: Drenaje.BUENO,
        camino: Camino.CONSOLIDADO,
        fechaHora: "2026-04-16T10:15:00.000Z",
        usuarioId: "usr-admin"
      },
      {
        id: "atr-009",
        loteCodigo: "ARR-02",
        suelo: Suelo.FRANCO,
        drenaje: Drenaje.BUENO,
        camino: Camino.CONSOLIDADO,
        fechaHora: "2026-04-16T10:30:00.000Z",
        usuarioId: "usr-admin"
      }
      // ARR-09 deliberadamente sin atributos para evidenciar lotes incompletos (CU10 2a / CU11 5a)
    ],

    // Hoja 6: anegamientos (CU05, CU10)
    anegamientos: [
      // LOTE-A: 4 eventos totales, 2 en la última zafra (>= 2026-05-01)
      {
        id: "ang-001",
        loteCodigo: "LOTE-A",
        fechaInicio: "2024-11-12T08:00:00.000Z",
        fechaFin: "2024-11-14T16:00:00.000Z",
        observaciones: "Zafra 2024: corte de acceso sur por lluvia intensa.",
        usuarioId: "usr-operador"
      },
      {
        id: "ang-002",
        loteCodigo: "LOTE-A",
        fechaInicio: "2025-10-05T07:30:00.000Z",
        fechaFin: "2025-10-07T14:00:00.000Z",
        observaciones: "Zafra 2025: acumulación en bajos arcillosos.",
        usuarioId: "usr-operador"
      },
      {
        id: "ang-003",
        loteCodigo: "LOTE-A",
        fechaInicio: "2026-06-18T06:00:00.000Z",
        fechaFin: "2026-06-20T18:00:00.000Z",
        observaciones: "Zafra 2026: barro intransitable en callejón.",
        usuarioId: "usr-operador"
      },
      {
        id: "ang-004",
        loteCodigo: "LOTE-A",
        fechaInicio: "2026-10-24T07:00:00.000Z",
        fechaFin: "2026-10-26T12:00:00.000Z",
        observaciones: "Zafra 2026: temporal de 55 mm.",
        usuarioId: "usr-jefe"
      },

      // LOTE-B: 3 eventos totales, 1 en la última zafra (>= 2026-05-01)
      {
        id: "ang-005",
        loteCodigo: "LOTE-B",
        fechaInicio: "2024-11-14T09:00:00.000Z",
        fechaFin: "2024-11-15T18:00:00.000Z",
        observaciones: "Zafra 2024: anegamiento parcial en cabecera.",
        usuarioId: "usr-operador"
      },
      {
        id: "ang-006",
        loteCodigo: "LOTE-B",
        fechaInicio: "2025-11-02T08:00:00.000Z",
        fechaFin: "2025-11-03T17:00:00.000Z",
        observaciones: "Zafra 2025: drenaje saturado.",
        usuarioId: "usr-operador"
      },
      {
        id: "ang-007",
        loteCodigo: "LOTE-B",
        fechaInicio: "2026-09-12T06:30:00.000Z",
        fechaFin: "2026-09-13T16:00:00.000Z",
        observaciones: "Zafra 2026: laguna temporal en sector este.",
        usuarioId: "usr-operador"
      },

      // PUE-12: 5 eventos totales, 2 en última zafra
      {
        id: "ang-008",
        loteCodigo: "PUE-12",
        fechaInicio: "2024-09-20T07:00:00.000Z",
        fechaFin: "2024-09-22T12:00:00.000Z",
        observaciones: "Zafra 2024: desborde zanja.",
        usuarioId: "usr-operador"
      },
      {
        id: "ang-009",
        loteCodigo: "PUE-12",
        fechaInicio: "2024-11-01T07:00:00.000Z",
        fechaFin: "2024-11-03T12:00:00.000Z",
        observaciones: "Zafra 2024: suelo saturado.",
        usuarioId: "usr-operador"
      },
      {
        id: "ang-010",
        loteCodigo: "PUE-12",
        fechaInicio: "2025-10-18T07:00:00.000Z",
        fechaFin: "2025-10-20T12:00:00.000Z",
        observaciones: "Zafra 2025: camino de tierra cortado.",
        usuarioId: "usr-operador"
      },
      {
        id: "ang-011",
        loteCodigo: "PUE-12",
        fechaInicio: "2026-07-04T07:00:00.000Z",
        fechaFin: "2026-07-06T12:00:00.000Z",
        observaciones: "Zafra 2026: acceso impedido para camiones.",
        usuarioId: "usr-operador"
      },
      {
        id: "ang-012",
        loteCodigo: "PUE-12",
        fechaInicio: "2026-11-02T07:00:00.000Z",
        fechaFin: "2026-11-03T18:00:00.000Z",
        observaciones: "Zafra 2026: barro pesado en callejón principal.",
        usuarioId: "usr-jefe"
      },

      // PUE-05: anegamiento ABIERTO actual (estado = ANEGADO)
      {
        id: "ang-013",
        loteCodigo: "PUE-05",
        fechaInicio: horasAtrasISO(18),
        fechaFin: null,
        observaciones: "Anegamiento activo observado tras chaparrón nocturno; acceso bloqueado.",
        usuarioId: "usr-operador"
      }
    ],

    // Hoja 7: lecturas de pluviómetros (CU08)
    lecturas: [
      // ZN-NORTE (10 + 8 + 7 = 25 mm en últimas 48h)
      {
        id: "lec-001",
        zonaCodigo: "ZN-NORTE",
        pluviometroCodigo: "PLUV-N01",
        fechaHora: horasAtrasISO(36),
        milimetros: 10,
        usuarioId: "usr-operador"
      },
      {
        id: "lec-002",
        zonaCodigo: "ZN-NORTE",
        pluviometroCodigo: "PLUV-N01",
        fechaHora: horasAtrasISO(20),
        milimetros: 8,
        usuarioId: "usr-operador"
      },
      {
        id: "lec-003",
        zonaCodigo: "ZN-NORTE",
        pluviometroCodigo: "PLUV-N01",
        fechaHora: horasAtrasISO(6),
        milimetros: 7,
        usuarioId: "usr-operador"
      },
      // Lectura antigua (>72h) para demostrar ventana temporal
      {
        id: "lec-004",
        zonaCodigo: "ZN-NORTE",
        pluviometroCodigo: "PLUV-N01",
        fechaHora: horasAtrasISO(120),
        milimetros: 18,
        usuarioId: "usr-operador"
      },
      // ZN-SUR (22 + 18 = 40 mm en últimas 48h)
      {
        id: "lec-005",
        zonaCodigo: "ZN-SUR",
        pluviometroCodigo: "PLUV-S01",
        fechaHora: horasAtrasISO(28),
        milimetros: 22,
        usuarioId: "usr-operador"
      },
      {
        id: "lec-006",
        zonaCodigo: "ZN-SUR",
        pluviometroCodigo: "PLUV-S01",
        fechaHora: horasAtrasISO(8),
        milimetros: 18,
        usuarioId: "usr-operador"
      },
      // ZN-CENTRO (5 mm en últimas 48h)
      {
        id: "lec-007",
        zonaCodigo: "ZN-CENTRO",
        pluviometroCodigo: "PLUV-C02",
        fechaHora: horasAtrasISO(14),
        milimetros: 5,
        usuarioId: "usr-operador"
      },
      // ZN-ESTE (12 mm en últimas 48h)
      {
        id: "lec-008",
        zonaCodigo: "ZN-ESTE",
        pluviometroCodigo: "PLUV-E01",
        fechaHora: horasAtrasISO(10),
        milimetros: 12,
        usuarioId: "usr-operador"
      }
    ],

    // Hoja 8: pronosticos (CU09)
    pronosticos: [
      {
        id: "pro-norte-1",
        zonaCodigo: "ZN-NORTE",
        fechaConsulta: horasAtrasISO(0.15),
        horizonteHoras: 48,
        desactualizado: false,
        dias: [
          { fecha: diasAdelanteDate(0), milimetros: 15 },
          { fecha: diasAdelanteDate(1), milimetros: 15 }
        ]
      },
      {
        id: "pro-sur-1",
        zonaCodigo: "ZN-SUR",
        fechaConsulta: horasAtrasISO(0.15),
        horizonteHoras: 48,
        desactualizado: false,
        dias: [
          { fecha: diasAdelanteDate(0), milimetros: 15 },
          { fecha: diasAdelanteDate(1), milimetros: 10 }
        ]
      },
      {
        id: "pro-centro-1",
        zonaCodigo: "ZN-CENTRO",
        fechaConsulta: horasAtrasISO(0.15),
        horizonteHoras: 48,
        desactualizado: false,
        dias: [
          { fecha: diasAdelanteDate(0), milimetros: 5 },
          { fecha: diasAdelanteDate(1), milimetros: 5 }
        ]
      },
      {
        id: "pro-este-1",
        zonaCodigo: "ZN-ESTE",
        fechaConsulta: horasAtrasISO(0.15),
        horizonteHoras: 48,
        desactualizado: false,
        dias: [
          { fecha: diasAdelanteDate(0), milimetros: 4 },
          { fecha: diasAdelanteDate(1), milimetros: 4 }
        ]
      }
    ],

    // Hoja 9: configuraciones (CU06, RN10)
    configuraciones: [
      {
        version: 1,
        fechaHora: "2026-05-01T08:00:00.000Z",
        usuarioId: "usr-admin",
        pesoSuelo: 0.2,
        pesoDrenaje: 0.25,
        pesoCamino: 0.2,
        pesoHistorial: 0.15,
        pesoUltimaZafra: 0.2,
        puntajesSuelo: {
          [Suelo.ARENOSO]: 20,
          [Suelo.FRANCO]: 50,
          [Suelo.ARCILLOSO]: 90
        },
        puntajesDrenaje: {
          [Drenaje.BUENO]: 10,
          [Drenaje.REGULAR]: 50,
          [Drenaje.MALO]: 100
        },
        puntajesCamino: {
          [Camino.CONSOLIDADO]: 10,
          [Camino.ENRIPIADO]: 40,
          [Camino.TIERRA]: 90
        },
        topeHistorial: 5,
        topeUltimaZafra: 2,
        umbralCategoriaMedia: 34,
        umbralCategoriaAlta: 67,
        umbralSemaforoAmarillo: 34,
        umbralSemaforoRojo: 67,
        lluviaCriticaMm: 60,
        ventanaLluviaHoras: 48,
        horizontePronosticoHoras: 48,
        inicioZafra: "2026-05-01"
      }
    ],

    // Hoja 10: rankings oficiales (CU11, RN10, RN16)
    rankings: [],

    // Hoja 11: paradas de fábrica (CU13, CU14, RN12, RN13)
    paradas: [
      {
        id: "PAR-01",
        causa: CausaParada.FALTA_CANA_EN_PATIO,
        detalle: "Desabastecimiento matutino por atraso en transporte de zona sur.",
        fechaInicio: "2026-11-10T03:30:00.000Z",
        fechaFin: "2026-11-10T07:00:00.000Z",
        toneladasPatio: 0,
        estado: EstadoParada.CERRADA,
        abiertaPorId: "usr-supervisor",
        cerradaPorId: "usr-supervisor",
        modificadaPorId: null,
        fechaModificacion: null
      },
      {
        id: "PAR-02",
        causa: CausaParada.LLUVIA,
        detalle: "Temporal de 55 mm en Miraflores impidió ingreso de camiones.",
        fechaInicio: "2026-10-24T06:00:00.000Z",
        fechaFin: "2026-10-24T14:30:00.000Z",
        toneladasPatio: 120,
        estado: EstadoParada.CERRADA,
        abiertaPorId: "usr-supervisor",
        cerradaPorId: "usr-supervisor",
        modificadaPorId: null,
        fechaModificacion: null
      },
      {
        id: "PAR-03",
        causa: CausaParada.MANTENIMIENTO_PROGRAMADO,
        detalle: "Limpieza programada de trapiche N° 2.",
        fechaInicio: "2026-11-02T08:00:00.000Z",
        fechaFin: "2026-11-02T12:00:00.000Z",
        toneladasPatio: 950,
        estado: EstadoParada.CERRADA,
        abiertaPorId: "usr-supervisor",
        cerradaPorId: "usr-supervisor",
        modificadaPorId: null,
        fechaModificacion: null
      }
    ],

    // Hoja 12: auditoría de cambios de estado de lotes (CU03 1b)
    cambiosEstadoLote: []
  };
}

function leerStorage() {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.lotes) || !Array.isArray(parsed.zonas)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function escribirStorage(data) {
  if (typeof window === "undefined" || !window.localStorage) {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignorar error si cuota de localStorage está llena
  }
}

class DatasheetStoreClass {
  constructor() {
    this._data = leerStorage() || crearDatasheetsIniciales();
    this._listeners = new Set();
    if (!leerStorage()) {
      escribirStorage(this._data);
    }
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    this._data.metadata.actualizadoEn = new Date().toISOString();
    escribirStorage(this._data);
    this._listeners.forEach((fn) => {
      try {
        fn(this._data);
      } catch {
        // Ignorar errores de suscriptores individuales
      }
    });
  }

  getSheet(nombreHoja) {
    if (!this._data[nombreHoja]) {
      this._data[nombreHoja] = [];
    }
    return this._data[nombreHoja];
  }

  setSheet(nombreHoja, filas) {
    this._data[nombreHoja] = filas;
    this._notify();
  }

  mutate(fn) {
    const res = fn(this._data);
    this._notify();
    return res;
  }

  snapshot() {
    return JSON.parse(JSON.stringify(this._data));
  }

  reset() {
    this._data = crearDatasheetsIniciales();
    this._notify();
    return this._data;
  }

  exportJSON() {
    return JSON.stringify(this._data, null, 2);
  }
}

export const DatasheetStore = new DatasheetStoreClass();
