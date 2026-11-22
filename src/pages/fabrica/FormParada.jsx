// F05 – Registrar parada o su reanudación (CU19)
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../services/api'
import { useApi } from '../../hooks/useApi'
import { useAvisos } from '../../context/AvisosContext'
import { Aviso, Boton, BotonLink, Campo, Cargando, Encabezado, ErrorCarga, Seccion } from '../../components/ui'
import { ahoraLocal, fechaHora, horasTexto, num, usd } from '../../utils/formato'
import { reglas, validar } from '../../utils/validacion'

const CAUSAS = ['Falta de caña por lluvia', 'Falta de caña por lotes lejanos o corte lento', 'Rotura mecánica', 'Otra']

function horasEntre(a, b) {
  return (new Date(b) - new Date(a)) / 3600000
}

export default function FormParada() {
  const { id } = useParams()
  const cerrando = Boolean(id)
  const navegar = useNavigate()
  const { avisar } = useAvisos()
  const existente = useApi(cerrando ? `/paradas/${id}` : null)
  const param = useApi('/parametros')
  const valorParam = (clave) => param.datos?.parametros?.find((x) => x.clave === clave)?.valor
  const COSTOS = { bajo: valorParam('costo_hora_parada_bajo'), central: valorParam('costo_hora_parada_central'), alto: valorParam('costo_hora_parada_alto') }
  const ahora = ahoraLocal()
  const [valores, setValores] = useState({ fecha_hora_inicio: ahora, fecha_hora_fin: cerrando ? ahora : '', causa: '', observacion: '', pasada: false })
  const [errores, setErrores] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState(null)

  const inicio = cerrando ? existente.datos?.fecha_hora_inicio?.slice(0, 16) : valores.fecha_hora_inicio
  const esquema = useMemo(
    () =>
      cerrando
        ? {
            fecha_hora_fin: [reglas.requerido('Ingresá la fecha y hora de fin.'), (v) => (v > ahoraLocal() ? 'No puede ser futura.' : null), (v) => (inicio && v <= inicio ? 'El fin debe ser posterior al inicio.' : null)],
          }
        : {
            fecha_hora_inicio: [reglas.requerido('Ingresá la fecha y hora de inicio.'), (v) => (v > ahoraLocal() ? 'El inicio no puede ser futuro.' : null)],
            causa: [reglas.requerido('Elegí la causa.')],
            observacion: [reglas.largoMax(500)],
            fecha_hora_fin: [
              (v, t) => (t.pasada && !v ? 'Ingresá el fin de la parada pasada.' : null),
              (v) => (v && v > ahoraLocal() ? 'No puede ser futuro.' : null),
              (v, t) => (v && v <= t.fecha_hora_inicio ? 'El fin debe ser posterior al inicio.' : null),
            ],
          },
    [cerrando, inicio],
  )

  const poner = (campo, valor) => {
    const v = { ...valores, [campo]: valor }
    setValores(v)
    if (errores[campo]) setErrores(validar(v, esquema))
  }

  const fin = cerrando || valores.pasada ? valores.fecha_hora_fin : null
  const duracion = inicio && fin && fin > inicio ? horasEntre(inicio, fin) : null

  const enviar = async (e) => {
    e.preventDefault()
    const errs = validar(valores, esquema)
    setErrores(errs)
    setErrorGeneral(null)
    if (Object.keys(errs).length) return
    setEnviando(true)
    try {
      if (cerrando) {
        const r = await api.put(`/paradas/${id}/cerrar`, { fecha_hora_fin: valores.fecha_hora_fin })
        avisar(`Reanudación registrada: ${horasTexto(r.duracion_h)} de parada, ${usd(r.costos_usd.central)} estimados.`)
      } else {
        await api.post('/paradas', {
          fecha_hora_inicio: valores.fecha_hora_inicio,
          fecha_hora_fin: valores.pasada ? valores.fecha_hora_fin : null,
          causa: valores.causa,
          observacion: valores.observacion || null,
        })
        avisar('Parada registrada.')
      }
      navegar('/fabrica/paradas')
    } catch (err) {
      setErrores(err.campos || {})
      setErrorGeneral(err.message)
    } finally {
      setEnviando(false)
    }
  }

  if (cerrando && existente.cargando) return <Cargando />
  if (cerrando && existente.error) return <ErrorCarga error={existente.error} alReintentar={existente.recargar} />
  const p = existente.datos

  return (
    <>
      <Encabezado
        codigo="F05"
        volver={{ a: '/fabrica/paradas', texto: 'Paradas' }}
        titulo={cerrando ? 'Registrar reanudación' : 'Registrar parada'}
        descripcion={cerrando ? 'Al reanudar la molienda, registrá la fecha y hora de fin.' : 'Registrá el inicio y la causa. Si es una parada pasada, cargá también el fin.'}
      />
      <form onSubmit={enviar} noValidate className="flex max-w-3xl flex-col gap-6">
        {cerrando && p && (
          <Seccion titulo="Parada en curso">
            <p className="text-sm">
              Desde <strong>{fechaHora(p.fecha_hora_inicio)}</strong> · {p.causa}
            </p>
            {p.patio && (
              <p className="mt-2 text-sm font-semibold">
                En patio: {p.patio.ultimo ? `${p.patio.ultimo.cantidad_carros} carros` : 'sin registros'}. Faltan {p.patio.carros_faltantes} para llegar a{' '}
                {p.patio.carros_minimos} y reanudar sin volver a parar enseguida.
              </p>
            )}
            {p.alerta_previa && (
              <p className="mt-2 text-sm">
                {p.alerta_previa.hubo_alerta
                  ? `Hubo alerta de lluvia previa, ${num(p.alerta_previa.horas_anticipacion, 0)} h antes (${p.alerta_previa.alerta.finca}, ${num(p.alerta_previa.alerta.prob_lluvia_pct, 0)} %).`
                  : 'No hubo alerta de lluvia de 70 % o más en las 72 horas previas.'}
              </p>
            )}
          </Seccion>
        )}
        <Seccion>
          <div className="grid gap-4 sm:grid-cols-2">
            {!cerrando && (
              <>
                <Campo etiqueta="Inicio" requerido error={errores.fecha_hora_inicio}>
                  {(a) => <input {...a} type="datetime-local" max={ahora} className="campo-entrada" value={valores.fecha_hora_inicio} onChange={(e) => poner('fecha_hora_inicio', e.target.value)} />}
                </Campo>
                <Campo etiqueta="Causa" requerido error={errores.causa}>
                  {(a) => (
                    <select {...a} className="campo-entrada" value={valores.causa} onChange={(e) => poner('causa', e.target.value)}>
                      <option value="">Elegí la causa</option>
                      {CAUSAS.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  )}
                </Campo>
                <label className="flex min-h-11 items-center gap-3 sm:col-span-2">
                  <input type="checkbox" className="h-5 w-5 accent-cana" checked={valores.pasada} onChange={(e) => poner('pasada', e.target.checked)} />
                  <span className="text-sm font-semibold">Es una parada pasada: cargo inicio y fin juntos</span>
                </label>
              </>
            )}
            {(cerrando || valores.pasada) && (
              <Campo etiqueta="Fin (reanudación)" requerido error={errores.fecha_hora_fin}>
                {(a) => <input {...a} type="datetime-local" min={inicio} max={ahora} className="campo-entrada" value={valores.fecha_hora_fin} onChange={(e) => poner('fecha_hora_fin', e.target.value)} />}
              </Campo>
            )}
            {!cerrando && (
              <Campo etiqueta="Observación" error={errores.observacion} className="sm:col-span-2">
                {(a) => <textarea {...a} rows={3} maxLength={500} className="campo-entrada" value={valores.observacion} onChange={(e) => poner('observacion', e.target.value)} />}
              </Campo>
            )}
          </div>
          {duracion !== null && COSTOS.central && (
            <p className="mt-4 text-sm">
              Duración: <strong>{horasTexto(duracion)}</strong> · costo estimado <strong>{usd(Math.round(duracion * COSTOS.central))}</strong> (de{' '}
              {usd(Math.round(duracion * COSTOS.bajo))} a {usd(Math.round(duracion * COSTOS.alto))}). El valor definitivo lo calcula el sistema con los parámetros vigentes.
            </p>
          )}
        </Seccion>
        {errorGeneral && <Aviso tono="critico">{errorGeneral}</Aviso>}
        <div className="flex flex-wrap gap-2">
          <Boton type="submit" cargando={enviando} variante={cerrando ? 'primario' : 'peligro'} icono="check">
            {cerrando ? 'Registrar reanudación' : 'Registrar parada'}
          </Boton>
          <BotonLink to="/fabrica/paradas">Cancelar</BotonLink>
        </div>
      </form>
    </>
  )
}
