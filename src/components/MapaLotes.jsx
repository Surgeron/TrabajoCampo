// Mapa de lotes (CU14) con Leaflet. Ubicaciones aproximadas hasta tener las definitivas.
import { useEffect, useMemo } from 'react'
import { CircleMarker, MapContainer, Polygon, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { COLOR_PISO, COLOR_RIESGO, COLOR_ZONA } from './estados'
import { num } from '../utils/formato'

const INGENIO = [-24.22426178105287, -64.83473626514535]
const GRIS = '#d3d8d3'

export const MODOS = {
  riesgo: {
    titulo: 'Riesgo',
    color: (l) => (l.riesgo ? COLOR_RIESGO[l.riesgo] : GRIS),
    leyenda: [...Object.entries(COLOR_RIESGO).map(([k, c]) => [`Riesgo ${k.toLowerCase()}`, c]), ['No aplica', GRIS]],
  },
  piso: {
    titulo: 'Estado de piso',
    color: (l) => COLOR_PISO[l.estado_piso] || GRIS,
    leyenda: Object.entries(COLOR_PISO),
  },
  zona: {
    titulo: 'Zona',
    color: (l) => COLOR_ZONA[l.zona] || GRIS,
    leyenda: [...Object.entries(COLOR_ZONA), ['Sin zona', GRIS]],
  },
}

function Encuadre({ lotes }) {
  const mapa = useMap()
  useEffect(() => {
    const puntos = lotes.flatMap((l) => (l.poligono?.length ? l.poligono.map((p) => [p.lat, p.lng]) : l.latitud ? [[l.latitud, l.longitud]] : []))
    if (puntos.length) mapa.fitBounds([...puntos, INGENIO], { padding: [24, 24] })
  }, [lotes, mapa])
  return null
}

export function Leyenda({ modo }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-tinta-2" aria-label={`Leyenda: ${MODOS[modo].titulo}`}>
      {MODOS[modo].leyenda.map(([texto, color]) => (
        <li key={texto} className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm border border-black/15" style={{ background: color }} />
          {texto}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-sm border-2 border-dashed border-tinta" />
        Lote de reserva
      </li>
    </ul>
  )
}

export default function MapaLotes({ lotes, modo = 'riesgo', alElegir, alto = 'h-[60vh]', resaltar }) {
  const conUbicacion = useMemo(() => lotes.filter((l) => l.poligono?.length || l.latitud), [lotes])
  return (
    <div className={`${alto} min-h-80 overflow-hidden rounded-lg border border-linea`}>
      <MapContainer center={INGENIO} zoom={11} scrollWheelZoom className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Encuadre lotes={conUbicacion} />
        <CircleMarker center={INGENIO} radius={8} pathOptions={{ color: '#123524', fillColor: '#b9d24a', fillOpacity: 1, weight: 3 }}>
          <Tooltip>Ingenio La Esperanza</Tooltip>
        </CircleMarker>
        {conUbicacion.map((l) => {
          const color = MODOS[modo].color(l)
          const destacado = resaltar?.has?.(l.id_unico)
          const opciones = {
            color: l.en_reserva ? '#16241b' : destacado ? '#16241b' : color,
            weight: l.en_reserva || destacado ? 3 : 1.5,
            dashArray: l.en_reserva ? '6 4' : undefined,
            fillColor: color,
            fillOpacity: 0.55,
          }
          const eventos = alElegir ? { click: () => alElegir(l) } : undefined
          const tooltip = (
            <Tooltip sticky>
              <strong>{l.nombre}</strong> · {l.finca}
              <br />
              {l.zona || 'Sin zona'} · {l.riesgo ? `riesgo ${l.riesgo.toLowerCase()}` : 'riesgo no aplica'} · {l.estado_piso}
              {l.brix != null && (
                <>
                  <br />
                  {num(l.brix, 1)} °Bx · {num(l.area_neta_ha, 1)} ha netas
                </>
              )}
            </Tooltip>
          )
          return l.poligono?.length ? (
            <Polygon key={l.id_unico} positions={l.poligono.map((p) => [p.lat, p.lng])} pathOptions={opciones} eventHandlers={eventos}>
              {tooltip}
            </Polygon>
          ) : (
            <CircleMarker key={l.id_unico} center={[l.latitud, l.longitud]} radius={6} pathOptions={opciones} eventHandlers={eventos}>
              {tooltip}
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
