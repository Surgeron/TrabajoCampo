// Cliente híbrido en tiempo real (FastAPI + Cloud Firestore onSnapshot + SSE + respaldo offline).
//
// Arquitectura:
// 1. Todas las operaciones transaccionales y validaciones de negocio se ejecutan contra
//    la API FastAPI en Python (`VITE_API_URL`, por defecto http://localhost:8000).
// 2. Las pantallas de Cocina, Salón, Caja y Administración reciben cambios en tiempo real por:
//    - Listeners `onSnapshot` directos sobre Cloud Firestore (`src/firebase.js`),
//    - Canal Server-Sent Events (`/api/eventos`) desde FastAPI, y
//    - Sincronización entre pestañas (`storage`).
// 3. Si el servidor backend no está encendido (por ejemplo en un despliegue estático
//    como GitHub Pages o si `VITE_USE_MOCK=true`), delega automáticamente al motor local
//    (`mockLocal.js`) sin interrumpir el uso del sistema.

import { collection, onSnapshot } from "firebase/firestore";
import { db as firestoreDb } from "../firebase";
import * as mockLocal from "./mockLocal";
import { ApiError, COLECCIONES_MAESTRAS } from "./mockLocal";

export { ApiError, COLECCIONES_MAESTRAS };

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");
const FORZAR_MOCK = import.meta.env.VITE_USE_MOCK === "true";
const CLAVE_CACHE_API = "trazaplato.datos.api";

const COLECCIONES_TIEMPO_REAL = [
  "comandas",
  "pagos",
  "facturas",
  "movimientos",
  "desperdicios",
  "sucursales",
  "usuarios",
  "empresas",
  "convenios",
  "trabajadores",
  "productos",
  "insumos",
  "motivosDesperdicio",
];

let estadoActual = leerCacheLocal() || mockLocal.obtenerDatos();
let modoOffline = FORZAR_MOCK;
const suscriptores = new Set();

let desuscribirFirestore = null;
let fuenteEventos = null;
let refrescoPendiente = null;

function leerCacheLocal() {
  try {
    const texto = window.localStorage.getItem(CLAVE_CACHE_API);
    return texto ? JSON.parse(texto) : null;
  } catch {
    return null;
  }
}

function guardarCacheLocal(datos) {
  try {
    window.localStorage.setItem(CLAVE_CACHE_API, JSON.stringify(datos));
  } catch {
    // Se ignora si el almacenamiento está lleno.
  }
}

function actualizarEstado(nuevosDatos, { guardar = true } = {}) {
  if (!nuevosDatos) return;
  estadoActual = nuevosDatos;
  if (guardar) guardarCacheLocal(nuevosDatos);
  suscriptores.forEach((callback) => callback(estadoActual));
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (evento) => {
    if (evento.key !== CLAVE_CACHE_API || !evento.newValue) return;
    try {
      const datos = JSON.parse(evento.newValue);
      actualizarEstado(datos, { guardar: false });
    } catch {
      // Se ignora un valor corrupto.
    }
  });
}

// ---------------------------------------------------------------------------
// Comunicación HTTP con FastAPI
// ---------------------------------------------------------------------------

function cabecerasSesion(sesion) {
  const headers = { "Content-Type": "application/json" };
  if (sesion?.idUsuario) headers["X-Usuario-Id"] = String(sesion.idUsuario);
  if (sesion?.rol) headers["X-Usuario-Rol"] = String(sesion.rol);
  if (sesion?.idSucursal) headers["X-Sucursal-Id"] = String(sesion.idSucursal);
  return headers;
}

async function peticionApi(ruta, { metodo = "GET", cuerpo = undefined, sesion = null } = {}) {
  const opciones = {
    method: metodo,
    headers: cabecerasSesion(sesion),
  };
  if (cuerpo !== undefined) {
    opciones.body = JSON.stringify(cuerpo);
  }

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, opciones);
  } catch (errorRed) {
    modoOffline = true;
    throw errorRed;
  }

  modoOffline = false;
  const esJson = (respuesta.headers.get("content-type") || "").includes("application/json");
  const payload = esJson ? await respuesta.json() : null;

  if (!respuesta.ok) {
    const codigo = payload?.codigo || "ERROR_API";
    const mensaje = payload?.mensaje || payload?.detail || "No se pudo completar la operación.";
    const detalles = payload?.detalles ?? null;
    throw new ApiError(codigo, mensaje, detalles);
  }

  if (payload && typeof payload === "object" && "datos" in payload && payload.datos) {
    actualizarEstado(payload.datos);
  }

  return payload && typeof payload === "object" && "resultado" in payload ? payload.resultado : payload;
}

function esErrorDeRed(error) {
  return !(error instanceof ApiError) && (error instanceof TypeError || error?.name === "TypeError");
}

async function ejecutarConRespaldo(llamadaRemota, llamadaLocal) {
  if (FORZAR_MOCK) return llamadaLocal();
  try {
    return await llamadaRemota();
  } catch (error) {
    if (esErrorDeRed(error)) {
      return llamadaLocal();
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Suscripciones en Tiempo Real (Firestore onSnapshot + FastAPI SSE)
// ---------------------------------------------------------------------------

function iniciarEscuchaFirestore() {
  if (desuscribirFirestore || FORZAR_MOCK || !firestoreDb) return;
  try {
    const funcionesBaja = COLECCIONES_TIEMPO_REAL.map((nombreColeccion) => {
      const ref = collection(firestoreDb, nombreColeccion);
      return onSnapshot(
        ref,
        (snapshot) => {
          if (snapshot.empty) return;
          const lista = snapshot.docs.map((docSnap) => {
            const docData = {
              id: docSnap.id,
              ...docSnap.data(),
            };
            if (nombreColeccion === "usuarios") {
              delete docData.password;
            }
            return docData;
          });
          if (nombreColeccion === "comandas" || nombreColeccion === "movimientos") {
            lista.sort((a, b) => (a.numero || 0) - (b.numero || 0));
          }
          if (estadoActual) {
            actualizarEstado({
              ...estadoActual,
              [nombreColeccion]: lista,
            });
          }
        },
        () => {
          // Si Firestore aún no está habilitado en Google Cloud Console, el canal SSE
          // de FastAPI mantiene el tiempo real activo sin mostrar errores en consola.
        },
      );
    });

    desuscribirFirestore = () => {
      funcionesBaja.forEach((fn) => {
        try {
          fn();
        } catch {
          // Ignorar al cerrar.
        }
      });
      desuscribirFirestore = null;
    };
  } catch {
    desuscribirFirestore = null;
  }
}

function programarRefrescoRemoto() {
  if (refrescoPendiente) return;
  refrescoPendiente = setTimeout(async () => {
    refrescoPendiente = null;
    try {
      const datos = await peticionApi("/api/datos");
      actualizarEstado(datos);
    } catch {
      // Se ignora si se desconectó momentáneamente.
    }
  }, 120);
}

function iniciarEscuchaSSE() {
  if (fuenteEventos || FORZAR_MOCK || typeof window === "undefined" || typeof EventSource === "undefined") {
    return;
  }
  try {
    const es = new EventSource(`${API_URL}/api/eventos`);
    es.onmessage = (evento) => {
      try {
        const data = JSON.parse(evento.data);
        if (data?.version) {
          programarRefrescoRemoto();
        }
      } catch {
        // Ignorar mensajes de latido.
      }
    };
    es.onerror = () => {
      // EventSource reintenta automáticamente.
    };
    fuenteEventos = es;
  } catch {
    fuenteEventos = null;
  }
}

function detenerEscuchasSiNoHaySuscriptores() {
  if (suscriptores.size > 0) return;
  if (desuscribirFirestore) desuscribirFirestore();
  if (fuenteEventos) {
    try {
      fuenteEventos.close();
    } catch {
      // Ignorar.
    }
    fuenteEventos = null;
  }
}

// ---------------------------------------------------------------------------
// API Pública (mismo contrato que src/services/mockApi.js)
// ---------------------------------------------------------------------------

export const obtenerDatos = () => (modoOffline ? mockLocal.obtenerDatos() : estadoActual);

export function suscribirse(callback) {
  suscriptores.add(callback);
  const bajaLocal = mockLocal.suscribirse((datosMock) => {
    if (modoOffline) callback(datosMock);
  });
  iniciarEscuchaFirestore();
  iniciarEscuchaSSE();

  return () => {
    suscriptores.delete(callback);
    bajaLocal();
    detenerEscuchasSiNoHaySuscriptores();
  };
}

export async function cargarDatos() {
  return ejecutarConRespaldo(
    async () => {
      const datos = await peticionApi("/api/datos");
      actualizarEstado(datos);
      return datos;
    },
    async () => {
      const datos = await mockLocal.cargarDatos();
      estadoActual = datos;
      return datos;
    },
  );
}

export function iniciarSesion(nombreUsuario, password) {
  return ejecutarConRespaldo(
    () =>
      peticionApi("/api/auth/login", {
        metodo: "POST",
        cuerpo: { nombreUsuario, password },
      }),
    () => mockLocal.iniciarSesion(nombreUsuario, password),
  );
}

export function registrarComanda(pedido, sesion) {
  return ejecutarConRespaldo(
    () =>
      peticionApi("/api/comandas", {
        metodo: "POST",
        cuerpo: pedido,
        sesion,
      }),
    () => mockLocal.registrarComanda(pedido, sesion),
  );
}

export function marcarListo(idComanda, sesion) {
  return ejecutarConRespaldo(
    () =>
      peticionApi(`/api/comandas/${encodeURIComponent(idComanda)}/listo`, {
        metodo: "PATCH",
        sesion,
      }),
    () => mockLocal.marcarListo(idComanda, sesion),
  );
}

export function marcarEntregado(idComanda, sesion) {
  return ejecutarConRespaldo(
    () =>
      peticionApi(`/api/comandas/${encodeURIComponent(idComanda)}/entregado`, {
        metodo: "PATCH",
        sesion,
      }),
    () => mockLocal.marcarEntregado(idComanda, sesion),
  );
}

export function agregarAdicion(idComanda, payload, sesion) {
  return ejecutarConRespaldo(
    () =>
      peticionApi(`/api/comandas/${encodeURIComponent(idComanda)}/adiciones`, {
        metodo: "POST",
        cuerpo: payload,
        sesion,
      }),
    () => mockLocal.agregarAdicion(idComanda, payload, sesion),
  );
}

export function cerrarCuentaCorriente(idComanda, payload, sesion) {
  return ejecutarConRespaldo(
    () =>
      peticionApi(`/api/comandas/${encodeURIComponent(idComanda)}/cuenta-corriente`, {
        metodo: "POST",
        cuerpo: payload,
        sesion,
      }),
    () => mockLocal.cerrarCuentaCorriente(idComanda, payload, sesion),
  );
}

export function cobrarComandas(cobro, sesion) {
  return ejecutarConRespaldo(
    () =>
      peticionApi("/api/cobros", {
        metodo: "POST",
        cuerpo: cobro,
        sesion,
      }),
    () => mockLocal.cobrarComandas(cobro, sesion),
  );
}

export function completarFacturas(payload, sesion) {
  return ejecutarConRespaldo(
    () =>
      peticionApi("/api/facturas/completar", {
        metodo: "POST",
        cuerpo: payload,
        sesion,
      }),
    () => mockLocal.completarFacturas(payload, sesion),
  );
}

export function anularComanda(idComanda, motivo, sesion) {
  return ejecutarConRespaldo(
    () =>
      peticionApi(`/api/comandas/${encodeURIComponent(idComanda)}/anular`, {
        metodo: "POST",
        cuerpo: { motivo },
        sesion,
      }),
    () => mockLocal.anularComanda(idComanda, motivo, sesion),
  );
}

export function registrarMovimiento(movimiento, sesion) {
  return ejecutarConRespaldo(
    () =>
      peticionApi("/api/deposito/movimientos", {
        metodo: "POST",
        cuerpo: movimiento,
        sesion,
      }),
    () => mockLocal.registrarMovimiento(movimiento, sesion),
  );
}

export function registrarDesperdicio(desperdicio, sesion) {
  return ejecutarConRespaldo(
    () =>
      peticionApi("/api/desperdicios", {
        metodo: "POST",
        cuerpo: desperdicio,
        sesion,
      }),
    () => mockLocal.registrarDesperdicio(desperdicio, sesion),
  );
}

export function generarInforme(idInforme, filtros, sesion) {
  return ejecutarConRespaldo(
    () =>
      peticionApi(`/api/informes/${encodeURIComponent(idInforme)}`, {
        metodo: "POST",
        cuerpo: filtros,
        sesion,
      }),
    () => mockLocal.generarInforme(idInforme, filtros, sesion),
  );
}

export function buscarComandas(filtros, sesion) {
  return ejecutarConRespaldo(
    () =>
      peticionApi("/api/comandas/buscar", {
        metodo: "POST",
        cuerpo: filtros,
        sesion,
      }),
    () => mockLocal.buscarComandas(filtros, sesion),
  );
}

export function guardarMaestro(coleccion, registro, sesion) {
  return ejecutarConRespaldo(
    () =>
      peticionApi(`/api/maestros/${encodeURIComponent(coleccion)}`, {
        metodo: "POST",
        cuerpo: registro,
        sesion,
      }),
    () => mockLocal.guardarMaestro(coleccion, registro, sesion),
  );
}

export function cambiarActivoMaestro(coleccion, id, activo, sesion) {
  return ejecutarConRespaldo(
    () =>
      peticionApi(`/api/maestros/${encodeURIComponent(coleccion)}/${encodeURIComponent(id)}/activo`, {
        metodo: "PATCH",
        cuerpo: { activo },
        sesion,
      }),
    () => mockLocal.cambiarActivoMaestro(coleccion, id, activo, sesion),
  );
}

export function importarTrabajadores(idEmpresa, filas, sesion) {
  return ejecutarConRespaldo(
    () =>
      peticionApi("/api/trabajadores/importar", {
        metodo: "POST",
        cuerpo: { idEmpresa, filas },
        sesion,
      }),
    () => mockLocal.importarTrabajadores(idEmpresa, filas, sesion),
  );
}

export function restablecerDatos(sesion) {
  return ejecutarConRespaldo(
    () =>
      peticionApi("/api/admin/restablecer", {
        metodo: "POST",
        sesion,
      }),
    () => mockLocal.restablecerDatos(sesion),
  );
}
