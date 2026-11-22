// Validaciones de formulario. Cada regla devuelve un mensaje o null.
import { hoyISO } from './formato'

export const reglas = {
  requerido: (msg = 'Es obligatorio.') => (v) => (v === undefined || v === null || String(v).trim() === '' ? msg : null),
  numero: (msg = 'Debe ser un número.') => (v) => (v === '' || v === null || v === undefined ? null : Number.isNaN(Number(v)) ? msg : null),
  entero: (msg = 'Debe ser un número entero.') => (v) => (v === '' || v === null || v === undefined ? null : Number.isInteger(Number(v)) ? null : msg),
  minimo: (min, msg) => (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v) < min ? msg || `Debe ser mayor o igual a ${min}.` : null),
  mayorQue: (min, msg) => (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v) <= min ? msg || `Debe ser mayor a ${min}.` : null),
  maximo: (max, msg) => (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v) > max ? msg || `Debe ser menor o igual a ${max}.` : null),
  largoMax: (n) => (v) => (v && String(v).length > n ? `Máximo ${n} caracteres.` : null),
  fechaNoFutura: (msg = 'La fecha no puede ser futura.') => (v) => (v && v > hoyISO() ? msg : null),
  fechaDesde: (desde, msg) => (v) => (v && desde && v < desde ? msg || `Debe ser desde el ${desde}.` : null),
  fechaHasta: (hasta, msg) => (v) => (v && hasta && v > hasta ? msg || `Debe ser hasta el ${hasta}.` : null),
  email: (msg = 'Ingresá un correo válido.') => (v) => (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? msg : null),
}

export function validar(valores, esquema) {
  const errores = {}
  Object.entries(esquema).forEach(([campo, lista]) => {
    for (const regla of lista) {
      const msg = regla(valores[campo], valores)
      if (msg) {
        errores[campo] = msg
        break
      }
    }
  })
  return errores
}
