// CU08 sin señal: la lectura queda guardada en el celular y se envía al volver la conexión.
import { api } from './api'

const CLAVE = 'cola_lecturas_v2'

function leer() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE) || '[]')
  } catch {
    return []
  }
}

function escribir(lista) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lista))
  } catch {
    // almacenamiento lleno o bloqueado: no se puede guardar
  }
  window.dispatchEvent(new Event('cola-lecturas'))
}

export function pendientes() {
  return leer()
}

export function encolar(lectura) {
  const lista = leer().filter((l) => !(l.id_pluviometro === lectura.id_pluviometro && l.fecha === lectura.fecha))
  lista.push({ ...lectura, guardada: new Date().toISOString(), estado: 'pendiente' })
  escribir(lista)
}

export function quitar(lectura) {
  escribir(leer().filter((l) => !(l.id_pluviometro === lectura.id_pluviometro && l.fecha === lectura.fecha)))
}

let enviando = false

// Envía las pendientes. Las que chocan con una lectura existente quedan marcadas para corregir a mano.
export async function enviarPendientes() {
  if (enviando || !navigator.onLine) return { enviadas: 0 }
  enviando = true
  let enviadas = 0
  try {
    for (const l of leer()) {
      if (l.estado === 'conflicto') continue
      try {
        await api.post('/lecturas', { id_pluviometro: l.id_pluviometro, fecha: l.fecha, mm: l.mm })
        quitar(l)
        enviadas += 1
      } catch (e) {
        if (e.sinConexion) break
        escribir(
          leer().map((x) =>
            x.id_pluviometro === l.id_pluviometro && x.fecha === l.fecha
              ? { ...x, estado: 'conflicto', mensaje: e.message, existente: e.datos?.lectura || null }
              : x,
          ),
        )
      }
    }
  } finally {
    enviando = false
  }
  return { enviadas }
}
