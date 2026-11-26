// Insignias de dominio: riesgo, estado de piso, zona y drenaje. El color nunca va solo: ícono + texto.
import { Insignia } from './ui'

const RIESGO = {
  Alto: { tono: 'critico', simbolo: '▲' },
  Medio: { tono: 'atencion', simbolo: '◆' },
  Bajo: { tono: 'bien', simbolo: '●' },
  'Sin datos': { tono: 'neutro', simbolo: '?' },
}

export function InsigniaRiesgo({ nivel, justificacion }) {
  if (!nivel) return <span className="text-xs text-tenue">No aplica</span>
  const r = RIESGO[nivel] || RIESGO['Sin datos']
  return (
    <Insignia tono={r.tono} title={justificacion} icono={<span aria-hidden="true">{r.simbolo}</span>}>
      Riesgo {nivel.toLowerCase()}
    </Insignia>
  )
}

const PISO = {
  Habilitado: { tono: 'bien', simbolo: '●' },
  'Con restricciones': { tono: 'atencion', simbolo: '◐' },
  Inhabilitado: { tono: 'critico', simbolo: '✕' },
}

export function InsigniaPiso({ estado }) {
  if (!estado) return null
  const p = PISO[estado] || PISO.Habilitado
  return (
    <Insignia tono={p.tono} icono={<span aria-hidden="true">{p.simbolo}</span>}>
      {estado}
    </Insignia>
  )
}

export function InsigniaZona({ zona, madurez }) {
  if (!zona) return <Insignia>Sin zona</Insignia>
  // La zona media tiene madurez media: no se repite
  const mostrarMadurez = madurez && madurez !== zona
  return (
    <Insignia tono="lluvia" title={madurez ? `Madurez ${madurez.toLowerCase()}` : undefined}>
      Zona {zona.toLowerCase()}
      {mostrarMadurez && <span className="font-normal">· {madurez.toLowerCase()}</span>}
    </Insignia>
  )
}

export const COLOR_RIESGO = { Alto: '#DC2B4A', Medio: '#D97706', Bajo: '#15803D', 'Sin datos': '#7C646A' }
export const COLOR_PISO = { Habilitado: '#15803D', 'Con restricciones': '#D97706', Inhabilitado: '#DC2B4A' }
// Rampa ordinal de un solo tono (bordó a rosa) para las zonas: lejana a cercana
export const COLOR_ZONA = { Lejana: '#561325', Media: '#B81D38', Cercana: '#E57A8E' }
