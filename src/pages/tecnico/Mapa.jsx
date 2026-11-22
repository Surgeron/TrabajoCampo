// T04 – Mapa de lotes (CU14): coloreado por riesgo, estado de piso o zona; la reserva va con borde punteado.
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { Aviso, Campo, Cargando, Encabezado, ErrorCarga, Seccion } from '../../components/ui'
import MapaLotes, { Leyenda, MODOS } from '../../components/MapaLotes'
import { InsigniaPiso, InsigniaRiesgo, InsigniaZona } from '../../components/estados'
import { num } from '../../utils/formato'

export default function Mapa() {
  const { datos, cargando, error, recargar } = useApi('/lotes')
  const [modo, setModo] = useState('riesgo')
  const [filtros, setFiltros] = useState({ id_finca: '', zona: '', tipo_cultivo: '' })
  const [elegido, setElegido] = useState(null)

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

  return (
    <>
      <Encabezado codigo="T04" titulo="Mapa de lotes" descripcion="Tocá un lote para ver su resumen y abrir la ficha." />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
      {cargando && !datos && <Cargando texto="Cargando lotes…" />}
      {error && <ErrorCarga error={error} alReintentar={recargar} />}
      {datos && (
        <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
          <div className="flex flex-col gap-3">
            <MapaLotes lotes={lotes} modo={modo} alElegir={setElegido} alto="h-[65vh]" />
            <Leyenda modo={modo} />
            <Aviso tono="info">Las ubicaciones son aproximadas (calculadas desde la cabecera de cada finca) hasta tener las definitivas.</Aviso>
          </div>
          <Seccion titulo={elegido ? elegido.nombre : 'Lote elegido'}>
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
              <p className="text-sm text-tinta-2">Tocá un lote en el mapa. {lotes.length} lotes visibles.</p>
            )}
          </Seccion>
        </div>
      )}
    </>
  )
}
