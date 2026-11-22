// Selector de lote: primero la finca, después el lote por nombre o número.
import { useEffect, useMemo, useState } from 'react'
import { useApi } from '../hooks/useApi'
import { Campo, Cargando, ErrorCarga } from './ui'

export default function BuscadorLote({ valor, alCambiar, error, filtroLote, etiqueta = 'Lote', ayuda, recargarKey, alElegirLote }) {
  const { datos: lotes, cargando, error: errorCarga, recargar } = useApi('/lotes')
  const [finca, setFinca] = useState('')
  const [texto, setTexto] = useState('')

  useEffect(() => {
    if (recargarKey) recargar(true)
  }, [recargarKey, recargar])

  const fincas = useMemo(() => {
    const m = new Map()
    ;(lotes || []).forEach((l) => m.set(l.id_finca, l.finca))
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [lotes])

  const seleccionado = useMemo(() => (lotes || []).find((l) => l.id_unico === valor) || null, [lotes, valor])
  const fincaActiva = finca || seleccionado?.id_finca || ''

  useEffect(() => {
    alElegirLote?.(seleccionado)
  }, [seleccionado, alElegirLote])

  const opciones = useMemo(() => {
    const t = texto.trim().toLowerCase()
    return (lotes || [])
      .filter((l) => (!fincaActiva || l.id_finca === fincaActiva) && (!filtroLote || filtroLote(l)))
      .filter((l) => !t || `${l.nombre} ${l.nro_lote}`.toLowerCase().includes(t))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }, [lotes, fincaActiva, texto, filtroLote])

  if (cargando) return <Cargando texto="Cargando lotes…" />
  if (errorCarga) return <ErrorCarga error={errorCarga} alReintentar={recargar} />

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Campo etiqueta="Finca">
        {(a) => (
          <select
            {...a}
            className="campo-entrada"
            value={fincaActiva}
            onChange={(e) => {
              setFinca(e.target.value)
              alCambiar('', null)
            }}
          >
            <option value="">Todas</option>
            {fincas.map(([id, nombre]) => (
              <option key={id} value={id}>
                {nombre}
              </option>
            ))}
          </select>
        )}
      </Campo>
      <Campo etiqueta="Buscar por nombre o número">
        {(a) => (
          <input
            {...a}
            type="search"
            className="campo-entrada"
            value={texto}
            maxLength={60}
            placeholder="Ej.: Los Blancos o 4001"
            onChange={(e) => setTexto(e.target.value)}
          />
        )}
      </Campo>
      <Campo etiqueta={etiqueta} requerido error={error} ayuda={ayuda || `${opciones.length} lotes en la lista`} className="sm:col-span-2">
        {(a) => (
          <select
            {...a}
            className="campo-entrada"
            value={valor}
            onChange={(e) => {
              const id = e.target.value
              const lote = opciones.find((l) => l.id_unico === id) || null
              alCambiar(id, lote)
            }}
          >
            <option value="">Elegí un lote</option>
            {opciones.map((l) => (
              <option key={l.id_unico} value={l.id_unico}>
                {l.nombre} · lote {l.nro_lote} · {l.finca}
                {l.estado_lote === 'En preparación' ? ' (en preparación)' : ''}
              </option>
            ))}
          </select>
        )}
      </Campo>
    </div>
  )
}
