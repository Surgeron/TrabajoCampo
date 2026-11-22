// Formatos en español de Argentina (coma decimal, punto de miles, hora de Argentina).
const ZONA = 'America/Argentina/Buenos_Aires'

export function num(valor, decimales = 1) {
  if (valor === null || valor === undefined || valor === '' || Number.isNaN(Number(valor))) return '—'
  return Number(valor).toLocaleString('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
}

export function entero(valor) {
  return num(valor, 0)
}

export function usd(valor) {
  if (valor === null || valor === undefined) return '—'
  return `${entero(valor)} USD`
}

export function fecha(texto) {
  if (!texto) return '—'
  const [a, m, d] = String(texto).slice(0, 10).split('-')
  return `${d}/${m}/${a}`
}

export function fechaCorta(texto) {
  if (!texto) return '—'
  const [, m, d] = String(texto).slice(0, 10).split('-')
  return `${d}/${m}`
}

export function fechaHora(texto) {
  if (!texto) return '—'
  const d = new Date(texto)
  if (Number.isNaN(d.getTime())) return texto
  return d.toLocaleString('es-AR', {
    timeZone: ZONA,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
}

export function hora(texto) {
  if (!texto) return '—'
  const d = new Date(texto)
  return d.toLocaleTimeString('es-AR', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
}

// Fecha de hoy en Argentina, AAAA-MM-DD
export function hoyISO() {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date())
  return partes
}

// Fecha y hora local para <input type="datetime-local">, AAAA-MM-DDTHH:MM
export function ahoraLocal() {
  const f = new Intl.DateTimeFormat('sv-SE', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date())
  return f.replace(' ', 'T')
}

export function sumarDias(iso, dias) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

export function horasTexto(h) {
  if (h === null || h === undefined) return '—'
  const total = Math.round(Number(h) * 60)
  const hh = Math.floor(total / 60)
  const mm = total % 60
  return mm ? `${hh} h ${mm} min` : `${hh} h`
}

export const NOMBRE_DRENAJE = {
  bien: 'Bien drenado',
  medio: 'Medianamente drenado',
  imperfecto: 'Imperfectamente drenado',
}

export function textoDrenaje(codigo) {
  return NOMBRE_DRENAJE[codigo] || 'Sin dato'
}
