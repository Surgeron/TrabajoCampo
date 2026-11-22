// T11 – Pronóstico de lluvia (CU11): automático cada 1 hora, “Actualizar ahora” y carga manual.
import { useMemo, useState } from 'react'
import { api } from '../../services/api'
import { useApi } from '../../hooks/useApi'
import { useAvisos } from '../../context/AvisosContext'
import { Aviso, Boton, BotonLink, Cargando, Encabezado, ErrorCarga, Insignia, Seccion, Vacio } from '../../components/ui'
import { fechaCorta, fechaHora, hoyISO, num } from '../../utils/formato'

export default function Pronostico() {
  const { datos, cargando, error, recargar } = useApi('/pronosticos')
  const { avisar } = useAvisos()
  const [actualizando, setActualizando] = useState(false)
  const [errorServicio, setErrorServicio] = useState(null)

  const actualizar = async () => {
    setActualizando(true)
    setErrorServicio(null)
    try {
      const r = await api.post('/pronosticos/actualizar')
      avisar(`Pronóstico actualizado: ${r.registros_actualizados} registros.${r.alertas.length ? ` ${r.alertas.length} alerta(s) de lluvia para Fábrica.` : ''}`)
      await recargar(true)
    } catch (e) {
      setErrorServicio(e.message)
    } finally {
      setActualizando(false)
    }
  }

  const tabla = useMemo(() => {
    if (!datos) return null
    const dias = [...new Set(datos.pronosticos.map((p) => p.fecha_pronosticada))].sort().slice(0, 7)
    const porFinca = datos.fincas.map((f) => ({
      finca: f,
      dias: dias.map((d) => datos.pronosticos.find((p) => p.id_finca === f.id && p.fecha_pronosticada === d)),
    }))
    return { dias, porFinca }
  }, [datos])

  return (
    <>
      <Encabezado
        codigo="T11"
        titulo="Pronóstico de lluvia"
        descripcion="Lluvia prevista por finca y por día. Con 70 % o más para una finca con cosecha en curso, se avisa a Fábrica."
        acciones={
          <>
            <Boton variante="lluvia" icono="actualizar" onClick={actualizar} cargando={actualizando}>
              Actualizar ahora
            </Boton>
            <BotonLink to="/tecnico/pronostico/manual" icono="editar">
              Cargar a mano
            </BotonLink>
          </>
        }
      />
      {errorServicio && (
        <Aviso tono="alerta" titulo={errorServicio} className="mb-4">
          Se muestra el último pronóstico guardado
          {datos?.ultima_actualizacion_api ? `, actualizado el ${fechaHora(datos.ultima_actualizacion_api)}` : ''}.
        </Aviso>
      )}
      {cargando && !datos && <Cargando />}
      {error && <ErrorCarga error={error} alReintentar={recargar} />}
      {datos && (
        <>
          <dl className="mb-6 flex flex-wrap gap-x-10 gap-y-3 text-sm">
            <div>
              <dt className="text-tenue">Última actualización automática</dt>
              <dd className="font-semibold">{fechaHora(datos.ultima_actualizacion_api)}</dd>
            </div>
            <div>
              <dt className="text-tenue">Frecuencia</dt>
              <dd className="font-semibold">Cada {datos.frecuencia_min} minutos</dd>
            </div>
            <div>
              <dt className="text-tenue">Umbral de alerta</dt>
              <dd className="font-semibold">{datos.umbral_alerta} %</dd>
            </div>
            <div>
              <dt className="text-tenue">Días que cuentan para el riesgo</dt>
              <dd className="font-semibold">{datos.horizonte_dias} (valor a confirmar)</dd>
            </div>
          </dl>
          {datos.servicio?.ultimo_error && (
            <Aviso tono="alerta" className="mb-4" titulo="El último intento automático tuvo errores">
              {datos.servicio.ultimo_error}
            </Aviso>
          )}
          <Seccion titulo="Probabilidad de lluvia y milímetros previstos" sinMargen>
            {tabla.dias.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[42rem] border-collapse text-sm">
                  <caption className="sr-only">Pronóstico por finca y día</caption>
                  <thead>
                    <tr className="border-b border-linea-fuerte text-xs text-tenue">
                      <th scope="col" className="px-4 py-2 text-left font-semibold">Finca</th>
                      {tabla.dias.map((d, i) => (
                        <th key={d} scope="col" className={`px-3 py-2 text-right font-semibold ${i < datos.horizonte_dias ? 'text-tinta' : ''}`}>
                          {d === hoyISO() ? 'Hoy' : fechaCorta(d)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tabla.porFinca.map(({ finca, dias }) => (
                      <tr key={finca.id} className="border-b border-linea last:border-0">
                        <th scope="row" className="px-4 py-3 text-left">
                          <span className="font-semibold">{finca.nombre}</span>
                          {finca.latitud == null && <span className="block text-xs font-normal text-tenue">Sin ubicación: solo carga manual</span>}
                        </th>
                        {dias.map((p, i) =>
                          p ? (
                            <td key={i} className={`px-3 py-3 text-right ${p.prob_lluvia_pct >= datos.umbral_alerta ? 'bg-lluvia-claro' : ''}`}>
                              <span className={`cifra block text-xl ${p.prob_lluvia_pct >= datos.umbral_alerta ? 'font-semibold text-lluvia-oscuro' : ''}`}>
                                {num(p.prob_lluvia_pct, 0)} %
                              </span>
                              <span className="block text-xs text-tinta-2">{num(p.mm_previstos, 1)} mm</span>
                              {p.fuente === 'Manual' && <Insignia className="mt-1">Manual</Insignia>}
                            </td>
                          ) : (
                            <td key={i} className="px-3 py-3 text-right text-tenue">
                              —
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-5">
                <Vacio titulo="Todavía no hay pronóstico guardado." accion={<Boton variante="lluvia" onClick={actualizar} cargando={actualizando}>Actualizar ahora</Boton>}>
                  El back end lo consulta cada hora. También podés cargarlo a mano.
                </Vacio>
              </div>
            )}
          </Seccion>
          <p className="mt-3 text-xs text-tenue">
            Fuente automática: Open-Meteo, en la ubicación aproximada de la cabecera de cada finca. Un valor cargado a mano prevalece sobre el automático ese día.
          </p>
        </>
      )}
    </>
  )
}
