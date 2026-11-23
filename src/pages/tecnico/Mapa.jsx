// T04 – Mapa de lotes (CU14): coloreado por riesgo, estado de piso o zona; la reserva va con borde punteado.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { Campo, Cargando, ErrorCarga } from '../../components/ui'
import MapaLotes, { Leyenda, MODOS } from '../../components/MapaLotes'
import { InsigniaPiso, InsigniaRiesgo, InsigniaZona } from '../../components/estados'
import { num } from '../../utils/formato'

export default function Mapa() {
  const { datos, cargando, error, recargar } = useApi('/lotes')
  const [modo, setModo] = useState('riesgo')
  const [filtros, setFiltros] = useState({ id_finca: '', zona: '', tipo_cultivo: '' })
  const [elegido, setElegido] = useState(null)
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const [fichaAbierta, setFichaAbierta] = useState(false)

  const fincas = useMemo(() => [...new Map((datos || []).map((l) => [l.id_finca, l.finca])).entries()], [datos])
  const lotes = useMemo(
    () =>
      (datos || []).filter(
        (l) =>
          (!filtros.id_finca || l.id_finca === filtros.id_finca) &&
          (!filtros.zona || l.zona === filtros.zona) &&
          (!filtros.tipo_cultivo || l.tipo_cultivo === filtros.tipo_cultivo),
      ),
    [datos, filtros],
  )
  const cambiar = (k) => (e) => setFiltros((f) => ({ ...f, [k]: e.target.value }))
  const elegirLote = (lote) => {
    setElegido(lote)
    setFichaAbierta(true)
  }

  return (
    <div className="relative h-[calc(100dvh-7.5rem)] w-full overflow-hidden lg:h-dvh">
      {cargando && !datos && (
        <div className="grid h-full place-items-center p-6">
          <Cargando texto="Cargando lotes…" />
        </div>
      )}
      {error && (
        <div className="grid h-full place-items-center p-6">
          <ErrorCarga error={error} alReintentar={recargar} />
        </div>
      )}
      {datos && (
        <>
          <MapaLotes lotes={lotes} modo={modo} alElegir={elegirLote} pantallaCompleta />

          {/* Controles desplegables sobre el mapa */}
          <div className="pointer-events-none absolute inset-x-3 top-3 left-14 z-[600] flex flex-wrap items-start justify-between gap-2">
            {/* Desplegable de filtros */}
            <div className="pointer-events-auto w-full max-w-xs overflow-hidden rounded-lg border border-linea bg-superficie/95 shadow-lg backdrop-blur-sm sm:w-auto sm:min-w-64">
              <button
                type="button"
                onClick={() => setFiltrosAbiertos((a) => !a)}
                aria-expanded={filtrosAbiertos}
                className="flex min-h-11 w-full items-center justify-between gap-3 px-3.5 py-2 text-left text-sm font-semibold text-tinta hover:bg-cana-claro/60"
              >
                <span>
                  Filtros · <span className="font-normal text-tinta-2">{MODOS[modo].titulo} ({lotes.length})</span>
                </span>
                <span aria-hidden="true" className="text-xs text-tenue">
                  {filtrosAbiertos ? '▲' : '▼'}
                </span>
              </button>
              {filtrosAbiertos && (
                <div className="grid gap-3 border-t border-linea p-3.5">
                  <Campo etiqueta="Colorear por">
                    {(a) => (
                      <select {...a} className="campo-entrada" value={modo} onChange={(e) => setModo(e.target.value)}>
                        {Object.entries(MODOS).map(([k, m]) => (
                          <option key={k} value={k}>
                            {m.titulo}
                          </option>
                        ))}
                      </select>
                    )}
                  </Campo>
                  <Campo etiqueta="Finca">
                    {(a) => (
                      <select {...a} className="campo-entrada" value={filtros.id_finca} onChange={cambiar('id_finca')}>
                        <option value="">Todas</option>
                        {fincas.map(([id, n]) => (
                          <option key={id} value={id}>
                            {n}
                          </option>
                        ))}
                      </select>
                    )}
                  </Campo>
                  <Campo etiqueta="Zona">
                    {(a) => (
                      <select {...a} className="campo-entrada" value={filtros.zona} onChange={cambiar('zona')}>
                        <option value="">Todas</option>
                        <option>Lejana</option>
                        <option>Media</option>
                        <option>Cercana</option>
                      </select>
                    )}
                  </Campo>
                  <Campo etiqueta="Tipo de cultivo">
                    {(a) => (
                      <select {...a} className="campo-entrada" value={filtros.tipo_cultivo} onChange={cambiar('tipo_cultivo')}>
                        <option value="">Todos</option>
                        <option>Convencional</option>
                        <option>Orgánico</option>
                      </select>
                    )}
                  </Campo>
                </div>
              )}
            </div>

            {/* Desplegable de ficha del lote */}
            <div className="pointer-events-auto w-full max-w-xs overflow-hidden rounded-lg border border-linea bg-superficie/95 shadow-lg backdrop-blur-sm sm:w-80">
              <button
                type="button"
                onClick={() => setFichaAbierta((a) => !a)}
                aria-expanded={fichaAbierta}
                className="flex min-h-11 w-full items-center justify-between gap-3 px-3.5 py-2 text-left text-sm font-semibold text-tinta hover:bg-cana-claro/60"
              >
                <span className="truncate">{elegido ? elegido.nombre : 'Ficha del lote'}</span>
                <span aria-hidden="true" className="shrink-0 text-xs text-tenue">
                  {fichaAbierta ? '▲' : '▼'}
                </span>
              </button>
              {fichaAbierta && (
                <div className="border-t border-linea p-3.5">
                  {elegido ? (
                    <div className="flex flex-col gap-3 text-sm">
                      <p className="text-tinta-2">
                        {elegido.finca} · lote {elegido.nro_lote}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <InsigniaZona zona={elegido.zona} madurez={elegido.madurez} />
                        <InsigniaPiso estado={elegido.estado_piso} />
                        <InsigniaRiesgo nivel={elegido.riesgo} />
                      </div>
                      {elegido.riesgo_justificacion && <p>{elegido.riesgo_justificacion}</p>}
                      <dl className="grid grid-cols-2 gap-3">
                        <div>
                          <dt className="text-xs text-tenue">Brix</dt>
                          <dd className="cifra text-xl font-semibold">{num(elegido.brix, 1)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-tenue">Ha netas</dt>
                          <dd className="cifra text-xl font-semibold">{num(elegido.area_neta_ha, 1)}</dd>
                        </div>
                      </dl>
                      <Link to={`/tecnico/lotes/${elegido.id_unico}`} className="font-semibold text-cana hover:underline">
                        Abrir la ficha
                      </Link>
                    </div>
                  ) : (
                    <p className="text-sm text-tinta-2">Tocá un lote en el mapa para ver su resumen. {lotes.length} lotes visibles.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Colores de referencia inferiores */}
          <div className="pointer-events-auto absolute inset-x-3 bottom-3 z-[600] mx-auto w-fit max-w-[calc(100%-1.5rem)] rounded-lg border border-linea bg-superficie/95 px-4 py-2.5 shadow-lg backdrop-blur-sm">
            <Leyenda modo={modo} />
          </div>
        </>
      )}
    </div>
  )
}
