// T02 – Ranking de cosecha (CU13, incluye CU12). Se calcula en el momento y no se guarda.
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { useAvisos } from '../../context/AvisosContext'
import { exportarExcel, exportarPdf } from '../../services/exportar'
import { Aviso, Boton, BotonLink, Cargando, Encabezado, ErrorCarga, Insignia, Seccion, Tabla, Vacio } from '../../components/ui'
import { InsigniaPiso, InsigniaRiesgo, InsigniaZona } from '../../components/estados'
import { fechaHora, num } from '../../utils/formato'

const COLUMNAS_EXPORTAR = [
  { clave: 'posicion', titulo: 'Posición', tipo: 'numero' },
  { clave: 'finca', titulo: 'Finca' },
  { clave: 'nombre', titulo: 'Lote' },
  { clave: 'nro_lote', titulo: 'Nro.' },
  { clave: 'zona', titulo: 'Zona' },
  { clave: 'variedad', titulo: 'Variedad' },
  { clave: 'brix', titulo: 'Brix', tipo: 'numero' },
  { clave: 'drenaje_nombre', titulo: 'Drenaje' },
  { clave: 'riesgo', titulo: 'Riesgo' },
  { clave: 'area_neta_ha', titulo: 'Ha netas', tipo: 'numero' },
  { clave: 'motivo', titulo: 'Motivo' },
]

function FilaRanking({ l }) {
  return (
    <li className="grid grid-cols-[3.25rem_1fr] gap-x-3 border-b border-linea py-4 last:border-0 md:grid-cols-[4.5rem_1fr_auto] md:gap-x-5">
      <p className="cifra row-span-2 text-4xl font-semibold text-cana md:text-5xl" aria-label={`Posición ${l.posicion}`}>
        {l.posicion}
      </p>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <Link to={`/tecnico/lotes/${l.id_unico}`} className="font-display text-lg font-semibold hover:underline">
            {l.nombre}
          </Link>
          <span className="text-sm text-tinta-2">
            {l.finca} · lote {l.nro_lote}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <InsigniaRiesgo nivel={l.riesgo} justificacion={l.riesgo_justificacion} />
          <InsigniaZona zona={l.zona} madurez={l.madurez} />
          {l.tipo_cultivo === 'Orgánico' && <Insignia tono="cana">Orgánico</Insignia>}
          {l.en_reserva && <Insignia>Reserva</Insignia>}
          {l.avisos?.map((a) => (
            <Insignia key={a} tono="atencion" icono={<span aria-hidden="true">▲</span>}>
              {a}
            </Insignia>
          ))}
        </div>
        <p className="mt-1.5 text-sm text-tinta-2">{l.motivo}</p>
      </div>
      <dl className="col-start-2 mt-2 flex gap-5 text-sm md:col-start-3 md:row-span-2 md:row-start-1 md:mt-0 md:text-right">
        <div>
          <dt className="text-xs text-tenue">Brix</dt>
          <dd className="cifra text-xl font-semibold">{num(l.brix, 1)}</dd>
        </div>
        <div>
          <dt className="text-xs text-tenue">Ha netas</dt>
          <dd className="cifra text-xl font-semibold">{num(l.area_neta_ha, 1)}</dd>
        </div>
        <div className="min-w-24">
          <dt className="text-xs text-tenue">Drenaje</dt>
          <dd className="text-sm font-semibold">{l.drenaje_nombre || 'Sin dato'}</dd>
        </div>
      </dl>
    </li>
  )
}

export default function Ranking() {
  const { datos, cargando, error, recargar } = useApi('/ranking')
  const { avisar } = useAvisos()
  const [verExcluidos, setVerExcluidos] = useState(false)
  const [exportando, setExportando] = useState(null)

  const exportar = async (formato) => {
    setExportando(formato)
    try {
      const args = {
        titulo: 'Ranking de cosecha',
        subtitulo: `Calculado el ${fechaHora(datos.fecha_hora)}. El sistema recomienda; la decisión final es del equipo técnico.`,
        columnas: COLUMNAS_EXPORTAR,
        filas: datos.ranking,
      }
      await (formato === 'pdf' ? exportarPdf(args) : exportarExcel(args))
      avisar('Ranking exportado.')
    } catch {
      avisar('No se pudo exportar el ranking.', 'error')
    } finally {
      setExportando(null)
    }
  }

  return (
    <>
      <Encabezado
        codigo="T02"
        titulo="Ranking de cosecha"
        descripcion="Primero los lotes con riesgo alto (mal drenados, maduros y con lluvia de 70 % o más); después por zona, lejana → media → cercana, y dentro de cada zona por mayor Brix."
        acciones={
          <>
            <Boton variante="secundario" icono="actualizar" onClick={() => recargar()} cargando={cargando && !!datos}>
              Recalcular
            </Boton>
            <BotonLink to="/tecnico/mapa" icono="mapa">
              Ver en el mapa
            </BotonLink>
            <BotonLink to="/tecnico/simulador" icono="simular">
              Simular escenario
            </BotonLink>
          </>
        }
      />
      {cargando && !datos && <Cargando texto="Calculando el ranking…" />}
      {error && <ErrorCarga error={error} alReintentar={recargar} />}
      {datos && (
        <div className="flex flex-col gap-6">
          {datos.en_cosecha.length > 0 && (
            <Seccion titulo="En cosecha ahora" descripcion="Lotes con cosecha registrada y sin terminar. Van aparte del orden.">
              <ul className="flex flex-wrap gap-2">
                {datos.en_cosecha.map((l) => (
                  <li key={l.id_unico}>
                    <Link
                      to={`/tecnico/lotes/${l.id_unico}`}
                      className="inline-flex min-h-11 items-center gap-2 rounded-md border border-cana/40 bg-cana-claro px-3 text-sm font-semibold text-cana-oscuro hover:border-cana"
                    >
                      {l.nombre}
                      <span className="font-normal text-tinta-2">
                        {l.finca} · {l.zona || 'sin zona'}
                      </span>
                      {l.avisos?.length > 0 && <span className="text-atencion-texto">▲</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </Seccion>
          )}

          <Seccion
            titulo={`Orden recomendado · ${datos.ranking.length} lotes`}
            descripcion={`Calculado el ${fechaHora(datos.fecha_hora)}`}
            acciones={
              <>
                <Boton variante="fantasma" icono="descargar" onClick={() => exportar('xlsx')} cargando={exportando === 'xlsx'} disabled={!datos.ranking.length}>
                  Excel
                </Boton>
                <Boton variante="fantasma" icono="descargar" onClick={() => exportar('pdf')} cargando={exportando === 'pdf'} disabled={!datos.ranking.length}>
                  PDF
                </Boton>
              </>
            }
          >
            {datos.ranking.length ? (
              <ol className="-my-4">
                {datos.ranking.map((l) => (
                  <FilaRanking key={l.id_unico} l={l} />
                ))}
              </ol>
            ) : (
              <Vacio titulo="No queda ningún lote habilitado para cosechar.">
                Revisá el estado de piso y las mediciones de Brix: los lotes inhabilitados o con menos de {datos.brix_minimo} °Bx no
                entran al ranking.
              </Vacio>
            )}
          </Seccion>

          <Seccion
            titulo={`Fuera del ranking · ${datos.excluidos.length} lotes`}
            acciones={
              <Boton variante="fantasma" onClick={() => setVerExcluidos((v) => !v)} aria-expanded={verExcluidos}>
                {verExcluidos ? 'Ocultar' : 'Mostrar'}
              </Boton>
            }
          >
            {verExcluidos ? (
              <Tabla
                etiqueta="Lotes fuera del ranking"
                claveFila="id_unico"
                columnas={[
                  { clave: 'nombre', titulo: 'Lote', ordenable: true, render: (l) => <Link className="font-semibold hover:underline" to={`/tecnico/lotes/${l.id_unico}`}>{l.nombre}</Link> },
                  { clave: 'finca', titulo: 'Finca', ordenable: true },
                  { clave: 'zona', titulo: 'Zona', ordenable: true, render: (l) => l.zona || 'Sin zona' },
                  { clave: 'estado_piso', titulo: 'Piso', render: (l) => <InsigniaPiso estado={l.estado_piso} /> },
                  { clave: 'brix', titulo: 'Brix', alinear: 'derecha', ordenable: true, render: (l) => num(l.brix, 1) },
                  { clave: 'motivo', titulo: 'Motivo', ordenable: true },
                ]}
                filas={datos.excluidos}
              />
            ) : (
              <p className="text-sm text-tinta-2">
                {Object.entries(
                  datos.excluidos.reduce((acc, e) => ({ ...acc, [e.motivo]: (acc[e.motivo] || 0) + 1 }), {}),
                )
                  .map(([m, n]) => `${m}: ${n}`)
                  .join(' · ')}
              </p>
            )}
          </Seccion>
          <Aviso tono="info">El sistema recomienda; la decisión final queda en el equipo técnico.</Aviso>
        </div>
      )}
    </>
  )
}
