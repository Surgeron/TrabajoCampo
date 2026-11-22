// T12 – Cargar pronóstico manual (CU11, alternativa): prevalece sobre el automático para ese día.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { useApi } from '../../hooks/useApi'
import { useAvisos } from '../../context/AvisosContext'
import { Boton, BotonLink, Campo, Encabezado, Seccion } from '../../components/ui'
import { hoyISO, sumarDias } from '../../utils/formato'
import { reglas, validar } from '../../utils/validacion'

const MAX_DIAS = 15

export default function PronosticoManual() {
  const navegar = useNavigate()
  const { avisar } = useAvisos()
  const fincas = useApi('/fincas')
  const hoy = hoyISO()
  const hasta = sumarDias(hoy, MAX_DIAS)
  const [valores, setValores] = useState({ id_finca: '', fecha: hoy, prob_lluvia_pct: '', mm_previstos: '' })
  const [errores, setErrores] = useState({})
  const [enviando, setEnviando] = useState(false)

  const esquema = {
    id_finca: [reglas.requerido('Elegí la finca.')],
    fecha: [reglas.requerido(), reglas.fechaDesde(hoy, 'Debe ser de hoy en adelante.'), reglas.fechaHasta(hasta, `Hasta ${MAX_DIAS} días adelante.`)],
    prob_lluvia_pct: [reglas.requerido(), reglas.numero(), reglas.minimo(0), reglas.maximo(100, 'La probabilidad va de 0 a 100 %.')],
    mm_previstos: [reglas.requerido(), reglas.numero(), reglas.minimo(0, 'No puede ser negativo.'), reglas.maximo(500)],
  }

  const poner = (campo) => (e) => {
    const v = { ...valores, [campo]: e.target.value }
    setValores(v)
    if (errores[campo]) setErrores(validar(v, esquema))
  }

  const enviar = async (e) => {
    e.preventDefault()
    const errs = validar(valores, esquema)
    setErrores(errs)
    if (Object.keys(errs).length) return
    setEnviando(true)
    try {
      const r = await api.put('/pronosticos', {
        ...valores,
        prob_lluvia_pct: Number(valores.prob_lluvia_pct),
        mm_previstos: Number(valores.mm_previstos),
      })
      avisar(`Pronóstico manual guardado para ${r.finca}.${r.alertas.length ? ' Se avisó a Fábrica.' : ''}`)
      navegar('/tecnico/pronostico')
    } catch (err) {
      setErrores(err.campos || {})
      if (!Object.keys(err.campos || {}).length) avisar(err.message, 'error', 8000)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <Encabezado
        codigo="T12"
        volver={{ a: '/tecnico/pronostico', texto: 'Pronóstico' }}
        titulo="Cargar pronóstico a mano"
        descripcion="Queda con fuente “Manual” y tu usuario; ese día prevalece sobre la consulta automática."
      />
      <form onSubmit={enviar} noValidate className="max-w-2xl">
        <Seccion>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Finca" requerido error={errores.id_finca}>
              {(a) => (
                <select {...a} className="campo-entrada" value={valores.id_finca} onChange={poner('id_finca')}>
                  <option value="">Elegí una finca</option>
                  {(fincas.datos || []).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nombre}
                    </option>
                  ))}
                </select>
              )}
            </Campo>
            <Campo etiqueta="Día" requerido error={errores.fecha}>
              {(a) => <input {...a} type="date" min={hoy} max={hasta} className="campo-entrada" value={valores.fecha} onChange={poner('fecha')} />}
            </Campo>
            <Campo etiqueta="Probabilidad de lluvia (%)" requerido error={errores.prob_lluvia_pct} ayuda="Con 70 % o más se alerta a Fábrica si hay cosecha en esa finca">
              {(a) => (
                <input {...a} type="number" min="0" max="100" step="1" inputMode="numeric" className="campo-entrada" value={valores.prob_lluvia_pct} onChange={poner('prob_lluvia_pct')} onBlur={() => setErrores(validar(valores, esquema))} />
              )}
            </Campo>
            <Campo etiqueta="Milímetros previstos" requerido error={errores.mm_previstos}>
              {(a) => (
                <input {...a} type="number" min="0" step="0.1" inputMode="decimal" className="campo-entrada" value={valores.mm_previstos} onChange={poner('mm_previstos')} onBlur={() => setErrores(validar(valores, esquema))} />
              )}
            </Campo>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Boton type="submit" cargando={enviando} icono="check">
              Guardar pronóstico
            </Boton>
            <BotonLink to="/tecnico/pronostico">Cancelar</BotonLink>
          </div>
        </Seccion>
      </form>
    </>
  )
}
