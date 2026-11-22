// Cliente del back end: agrega el token de Firebase y traduce los errores a mensajes claros.
import { auth } from '../firebase'

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

export class ErrorApi extends Error {
  constructor(status, mensaje, datos = {}) {
    super(mensaje)
    this.status = status
    this.campos = datos.campos || {}
    this.datos = datos
  }
  get sinConexion() {
    return this.status === 0
  }
}

function armarConsulta(params) {
  if (!params) return ''
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') q.append(k, v)
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

export async function pedir(ruta, { metodo = 'GET', cuerpo, params, señal } = {}) {
  const usuario = auth.currentUser
  const encabezados = { Accept: 'application/json' }
  if (usuario) {
    try {
      encabezados.Authorization = `Bearer ${await usuario.getIdToken()}`
    } catch {
      throw new ErrorApi(0, 'No hay conexión para validar la sesión. Revisá tu conexión e intentá de nuevo.')
    }
  }
  if (cuerpo !== undefined) encabezados['Content-Type'] = 'application/json'
  let resp
  try {
    resp = await fetch(`${API_URL}/api${ruta}${armarConsulta(params)}`, {
      method: metodo,
      headers: encabezados,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
      signal: señal,
    })
  } catch (e) {
    if (e.name === 'AbortError') throw e
    throw new ErrorApi(0, 'No hay conexión con el servidor. Revisá tu conexión e intentá de nuevo.')
  }
  let datos = null
  const texto = await resp.text()
  try {
    datos = texto ? JSON.parse(texto) : null
  } catch {
    datos = { detail: texto }
  }
  if (!resp.ok) {
    const mensaje =
      typeof datos?.detail === 'string'
        ? datos.detail
        : resp.status >= 500
          ? 'El servidor tuvo un problema. Intentá de nuevo en unos minutos.'
          : 'No se pudo completar la operación.'
    throw new ErrorApi(resp.status, mensaje, datos || {})
  }
  return datos
}

export const api = {
  get: (ruta, params, señal) => pedir(ruta, { params, señal }),
  post: (ruta, cuerpo) => pedir(ruta, { metodo: 'POST', cuerpo }),
  put: (ruta, cuerpo) => pedir(ruta, { metodo: 'PUT', cuerpo }),
}
