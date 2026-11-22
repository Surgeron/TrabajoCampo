// T01 – Inicio del Equipo técnico agrícola
import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { escucharColeccion } from '../../services/tiempoReal'
import { BotonLink, Cargando, Encabezado, ErrorCarga, Seccion, Vacio } from '../../components/ui'
import { InsigniaRiesgo, InsigniaZona } from '../../components/estados'
import TarjetaAlerta from '../../components/TarjetaAlerta'
import Colchon from '../../components/Colchon'
import { fechaCorta, fechaHora, num } from '../../utils/formato'

function ResumenPronostico({ datos }) {
  const porFinca = useMemo(() => {
    const m = new Map()
    datos.pronosticos.forEach((p) => {
      const l = m.get(p.finca) || []
      l.push(p)
      m.set(p.finca, l)
    })
    return [...m.entries()].map(([finca, lista]) => [finca, lista.slice(0, datos.horizonte_dias)])
  }, [datos])
  if (!porFinca.length) return <Vacio titulo="Todavía no hay pronóstico cargado.">Usá “Actualizar ahora” en la pantalla de pronóstico.</Vacio>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="sr-only">Probabilidad de lluvia por finca en los próximos días</caption>
        <thead>
          <tr className="text-xs text-tenue">
            <th scope="col" className="py-1 text-left font-semibold">Finca</th>
            {porFinca[0][1].map((p) => (
              <th key={p.fecha_pronosticada} scope="col" className="py-1 text-right font-semibold">
                {fechaCorta(p.fecha_pronosticada)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {porFinca.map(([finca, lista]) => (
            <tr key={finca} className="border-t border-linea">
              <th scope="row" className="py-2 text-left font-semibold">{finca}</th>
              {lista.map((p) => (
                <td key={p.fecha_pronosticada} className="py-2 text-right">
                  <span className={`cifra text-lg ${p.prob_lluvia_pct >= datos.umbral_alerta ? 'font-semibold text-lluvia-oscuro' : ''}`}>
                    {num(p.prob_lluvia_pct, 0)} %
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function InicioTecnico() {
  const { perfil } = useAuth()
  const alertas = useApi('/alertas', { activas: true })
  const ranking = useApi('/ranking')
  const patio = useApi('/abastecimiento')
  const reserva = useApi('/reserva')
  const pronostico = useApi('/pronosticos')
  const recargarAlertas = alertas.recargar
  const recargarPatio = patio.recargar

  useEffect(() => escucharColeccion('alertas', () => recargarAlertas(true)), [recargarAlertas])
  useEffect(() => escucharColeccion('registros_patio', () => recargarPatio(true), { cantidad: 1 }), [recargarPatio])

  return (
    <>
      <Encabezado codigo="T01" titulo={`Hola, ${perfil.nombre}`} descripcion="Lo que conviene mirar antes de la reunión de la mañana." />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-6">
          <Seccion titulo="Alertas activas">
            {alertas.cargando && !alertas.datos && <Cargando />}
            {alertas.error && <ErrorCarga error={alertas.error} alReintentar={alertas.recargar} />}
            {alertas.datos &&
              (alertas.datos.length ? (
                <div className="flex flex-col gap-3">
                  {alertas.datos.map((a) => (
                    <TarjetaAlerta key={a.id} alerta={a} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-tinta-2">No hay alertas de lluvia ni de colchón bajo.</p>
              ))}
          </Seccion>

          <Seccion
            titulo="Primeros del ranking"
            acciones={
              <BotonLink to="/tecnico/ranking" variante="fantasma">
                Ver el ranking completo
              </BotonLink>
            }
          >
            {ranking.cargando && !ranking.datos && <Cargando texto="Calculando…" />}
            {ranking.error && <ErrorCarga error={ranking.error} alReintentar={ranking.recargar} />}
            {ranking.datos &&
              (ranking.datos.ranking.length ? (
                <ol className="divide-y divide-linea">
                  {ranking.datos.ranking.slice(0, 5).map((l) => (
                    <li key={l.id_unico} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                      <span className="cifra w-8 text-2xl font-semibold text-cana">{l.posicion}</span>
                      <Link to={`/tecnico/lotes/${l.id_unico}`} className="min-w-40 flex-1 font-semibold hover:underline">
                        {l.nombre} <span className="font-normal text-tinta-2">· {l.finca}</span>
                      </Link>
                      <InsigniaZona zona={l.zona} />
                      <InsigniaRiesgo nivel={l.riesgo} justificacion={l.riesgo_justificacion} />
                      <span className="cifra w-20 text-right whitespace-nowrap">{num(l.brix, 1)} °Bx</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <Vacio titulo="No queda ningún lote habilitado para cosechar." />
              ))}
          </Seccion>
        </div>

        <div className="flex flex-col gap-6">
          <Seccion
            titulo="Colchón en patio"
            acciones={
              <BotonLink to="/tecnico/abastecimiento" variante="fantasma">
                Abrir tablero
              </BotonLink>
            }
          >
            {patio.cargando && !patio.datos && <Cargando />}
            {patio.error && <ErrorCarga error={patio.error} alReintentar={patio.recargar} />}
            {patio.datos &&
              (patio.datos.calculo ? (
                <Colchon
                  calculo={patio.datos.calculo}
                  fechaHora={patio.datos.ultimo?.fecha_hora}
                  fabricaParada={patio.datos.fabrica_parada}
                  carrosParaReanudar={patio.datos.carros_para_reanudar}
                />
              ) : (
                <p className="text-sm text-tinta-2">Báscula todavía no registró carros.</p>
              ))}
          </Seccion>

          <Seccion
            titulo="Reserva disponible"
            descripcion="Hectáreas netas de lotes de reserva habilitados"
            acciones={
              <BotonLink to="/tecnico/reserva" variante="fantasma">
                Gestionar
              </BotonLink>
            }
          >
            {reserva.cargando && !reserva.datos && <Cargando />}
            {reserva.error && <ErrorCarga error={reserva.error} alReintentar={reserva.recargar} />}
            {reserva.datos && (
              <>
                <p className="cifra text-4xl font-semibold">
                  {num(reserva.datos.ha_total, 0)} <span className="text-lg font-normal text-tenue">ha</span>
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  {['Cercana', 'Media'].map((z) => (
                    <div key={z}>
                      <dt className="text-tenue">Zona {z.toLowerCase()}</dt>
                      <dd className="cifra text-xl font-semibold">{num(reserva.datos.ha_por_zona[z] || 0, 0)} ha</dd>
                    </div>
                  ))}
                </dl>
                {reserva.datos.avisos.map((a) => (
                  <p key={a} className="mt-2 text-sm text-atencion-texto">
                    {a}
                  </p>
                ))}
              </>
            )}
          </Seccion>

          <Seccion
            titulo="Pronóstico por finca"
            descripcion={pronostico.datos?.ultima_actualizacion_api ? `Actualizado ${fechaHora(pronostico.datos.ultima_actualizacion_api)}` : undefined}
            acciones={
              <BotonLink to="/tecnico/pronostico" variante="fantasma">
                Ver detalle
              </BotonLink>
            }
          >
            {pronostico.cargando && !pronostico.datos && <Cargando />}
            {pronostico.error && <ErrorCarga error={pronostico.error} alReintentar={pronostico.recargar} />}
            {pronostico.datos && <ResumenPronostico datos={pronostico.datos} />}
          </Seccion>
        </div>
      </div>
    </>
  )
}
