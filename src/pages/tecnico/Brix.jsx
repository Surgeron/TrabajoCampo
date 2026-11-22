// T09 – Registrar medición de Brix (CU10)
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../services/api'
import { useAvisos } from '../../context/AvisosContext'
import BuscadorLote from '../../components/BuscadorLote'
import { Aviso, Boton, Campo, Encabezado, Seccion } from '../../components/ui'
import { hoyISO } from '../../utils/formato'
import { reglas, validar } from '../../utils/validacion'

const esquema = {
  id_unico: [reglas.requerido('Elegí el lote.')],
  fecha: [reglas.requerido(), reglas.fechaNoFutura()],
  valor_brix: [reglas.requerido('Ingresá el Brix.'), reglas.numero(), reglas.mayorQue(0, 'El Brix debe ser un número positivo.'), reglas.maximo(30, 'Revisá el valor: más de 30 °Bx no es posible.')],
  origen: [reglas.requerido('Elegí el origen.')],
}

export default function Brix() {
  const [params] = useSearchParams()
  const { avisar } = useAvisos()
  const inicial = { id_unico: params.get('lote') || '', fecha: hoyISO(), valor_brix: '', origen: 'Muestreo en campo' }
  const [valores, setValores] = useState(inicial)
  const [errores, setErrores] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState(null)

  const poner = (campo, valor) => {
    const v = { ...valores, [campo]: valor }
    setValores(v)
    if (errores[campo]) setErrores(validar(v, esquema))
  }

  const enviar = async (e) => {
    e.preventDefault()
    const errs = validar(valores, esquema)
    setErrores(errs)
    if (Object.keys(errs).length) return
    setEnviando(true)
    setResultado(null)
    try {
      const r = await api.post('/brix', { ...valores, valor_brix: Number(valores.valor_brix) })
      setResultado(r)
      avisar('Medición de Brix registrada.')
      r.avisos_reserva?.forEach((a) => avisar(a, 'alerta', 9000))
      setValores({ ...valores, valor_brix: '' })
    } catch (err) {
      setErrores(err.campos || {})
      if (!Object.keys(err.campos || {}).length) avisar(err.message, 'error', 8000)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <Encabezado codigo="T09" titulo="Medición de Brix" descripcion="Con 8 °Bx o más el lote queda habilitado por madurez; por debajo no entra al ranking." />
      <form onSubmit={enviar} noValidate className="flex max-w-3xl flex-col gap-6">
        <Seccion titulo="Lote">
          <BuscadorLote valor={valores.id_unico} alCambiar={(v) => poner('id_unico', v)} error={errores.id_unico} />
        </Seccion>
        <Seccion titulo="Medición">
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo etiqueta="Fecha" requerido error={errores.fecha}>
              {(a) => <input {...a} type="date" max={hoyISO()} className="campo-entrada" value={valores.fecha} onChange={(e) => poner('fecha', e.target.value)} />}
            </Campo>
            <Campo etiqueta="Brix (°Bx)" requerido error={errores.valor_brix}>
              {(a) => (
                <input
                  {...a}
                  type="number"
                  step="0.01"
                  min="0"
                  max="30"
                  inputMode="decimal"
                  className="campo-entrada cifra text-xl"
                  value={valores.valor_brix}
                  onChange={(e) => poner('valor_brix', e.target.value)}
                  onBlur={() => setErrores(validar(valores, esquema))}
                />
              )}
            </Campo>
            <Campo etiqueta="Origen" requerido error={errores.origen}>
              {(a) => (
                <select {...a} className="campo-entrada" value={valores.origen} onChange={(e) => poner('origen', e.target.value)}>
                  <option>Muestreo en campo</option>
                  <option>Laboratorio</option>
                  <option>Imagen satelital</option>
                </select>
              )}
            </Campo>
          </div>
        </Seccion>
        {resultado && (
          <Aviso tono={resultado.habilitado_por_madurez ? 'ok' : 'alerta'} titulo={resultado.mensaje}>
            <Link to={`/tecnico/lotes/${resultado.id_unico}`} className="font-semibold underline">
              Ver la ficha del lote
            </Link>
          </Aviso>
        )}
        <div>
          <Boton type="submit" cargando={enviando} icono="check">
            Registrar medición
          </Boton>
        </div>
      </form>
    </>
  )
}
