// J02 – Registrar lectura de pluviómetro (CU08). Sin señal, queda guardada en el celular.
import { useState } from 'react'
import { api } from '../../services/api'
import { encolar } from '../../services/colaSinConexion'
import { useApi } from '../../hooks/useApi'
import { useAvisos } from '../../context/AvisosContext'
import { Aviso, Boton, Campo, Cargando, Dialogo, Encabezado, ErrorCarga, Seccion } from '../../components/ui'
import { fecha, hoyISO, num } from '../../utils/formato'
import { reglas, validar } from '../../utils/validacion'

const esquema = {
  id_pluviometro: [reglas.requerido('Elegí el pluviómetro.')],
  fecha: [reglas.requerido(), reglas.fechaNoFutura()],
  mm: [reglas.requerido('Ingresá los milímetros.'), reglas.numero(), reglas.minimo(0, 'Debe ser un número mayor o igual a cero.'), reglas.maximo(500, 'Revisá el valor: máximo 500 mm.')],
}

export default function Lectura() {
  const { avisar } = useAvisos()
  const pluvios = useApi('/pluviometros')
  const [valores, setValores] = useState({ id_pluviometro: '', fecha: hoyISO(), mm: '' })
  const [errores, setErrores] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [conflicto, setConflicto] = useState(null)
  const [guardada, setGuardada] = useState(null)

  const poner = (campo, valor) => {
    const v = { ...valores, [campo]: valor }
    setValores(v)
    if (errores[campo]) setErrores(validar(v, esquema))
  }

  const nombrePluvio = (id) => pluvios.datos?.find((p) => p.id === id)?.nombre || id

  const enviar = async (e) => {
    e.preventDefault()
    const errs = validar(valores, esquema)
    setErrores(errs)
    if (Object.keys(errs).length) return
    const lectura = { ...valores, mm: Number(valores.mm) }
    setEnviando(true)
    setGuardada(null)
    try {
      const r = await api.post('/lecturas', lectura)
      setGuardada({ texto: `Lectura guardada: ${num(r.mm, 1)} mm en ${r.pluviometro}. Se recalculó el riesgo de ${r.lotes_recalculados} lotes.`, tono: 'ok' })
      avisar('Lectura registrada.')
      setValores({ ...valores, mm: '' })
    } catch (err) {
      if (err.sinConexion) {
        encolar({ ...lectura, pluviometro: nombrePluvio(lectura.id_pluviometro) })
        setGuardada({ texto: 'Sin señal: la lectura quedó guardada en este celular y se envía sola al volver la conexión.', tono: 'alerta' })
        setValores({ ...valores, mm: '' })
      } else if (err.status === 409 && err.datos?.lectura) {
        setConflicto({ existente: err.datos.lectura, nueva: lectura, mensaje: err.message })
      } else {
        setErrores(err.campos || {})
        if (!Object.keys(err.campos || {}).length) avisar(err.message, 'error', 8000)
      }
    } finally {
      setEnviando(false)
    }
  }

  const corregir = async () => {
    setEnviando(true)
    try {
      await api.put(`/lecturas/${conflicto.existente.id}`, { mm: conflicto.nueva.mm })
      setGuardada({ texto: `Lectura corregida: de ${num(conflicto.existente.mm, 1)} a ${num(conflicto.nueva.mm, 1)} mm. Queda registrado que la corregiste vos.`, tono: 'ok' })
      avisar('Lectura corregida.')
      setConflicto(null)
      setValores({ ...valores, mm: '' })
    } catch (err) {
      avisar(err.message, 'error', 8000)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <Encabezado codigo="J02" titulo="Lectura de pluviómetro" descripcion="A la mañana, después de llover: elegí el pluviómetro, confirmá la fecha y cargá los milímetros." />
      {pluvios.cargando && <Cargando texto="Cargando pluviómetros…" />}
      {pluvios.error && <ErrorCarga error={pluvios.error} alReintentar={pluvios.recargar} />}
      {pluvios.datos && (
        <form onSubmit={enviar} noValidate className="flex max-w-xl flex-col gap-6">
          <Seccion>
            <div className="flex flex-col gap-4">
              <Campo etiqueta="Pluviómetro" requerido error={errores.id_pluviometro}>
                {(a) => (
                  <select {...a} className="campo-entrada min-h-12 text-base" value={valores.id_pluviometro} onChange={(e) => poner('id_pluviometro', e.target.value)}>
                    <option value="">Elegí un pluviómetro</option>
                    {pluvios.datos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                )}
              </Campo>
              <Campo etiqueta="Fecha de la lluvia" requerido error={errores.fecha}>
                {(a) => <input {...a} type="date" max={hoyISO()} className="campo-entrada min-h-12 text-base" value={valores.fecha} onChange={(e) => poner('fecha', e.target.value)} />}
              </Campo>
              <Campo etiqueta="Milímetros" requerido error={errores.mm}>
                {(a) => (
                  <input
                    {...a}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="500"
                    step="0.1"
                    className="campo-entrada cifra min-h-14 text-3xl"
                    value={valores.mm}
                    onChange={(e) => poner('mm', e.target.value)}
                    onBlur={() => setErrores(validar(valores, esquema))}
                  />
                )}
              </Campo>
            </div>
          </Seccion>
          {guardada && <Aviso tono={guardada.tono}>{guardada.texto}</Aviso>}
          <Boton type="submit" cargando={enviando} icono="check" className="min-h-14 w-full text-base sm:w-auto">
            Guardar lectura
          </Boton>
        </form>
      )}
      <Dialogo
        abierto={Boolean(conflicto)}
        titulo="Ya hay una lectura para ese día"
        alCerrar={() => setConflicto(null)}
        acciones={
          <>
            <Boton variante="secundario" onClick={() => setConflicto(null)}>
              Dejar la anterior
            </Boton>
            <Boton onClick={corregir} cargando={enviando}>
              Corregir a {conflicto ? num(conflicto.nueva.mm, 1) : ''} mm
            </Boton>
          </>
        }
      >
        {conflicto && (
          <p>
            {nombrePluvio(conflicto.existente.id_pluviometro)} ya tiene {num(conflicto.existente.mm, 1)} mm el {fecha(conflicto.existente.fecha)}
            {conflicto.existente.usuario_nombre ? `, cargados por ${conflicto.existente.usuario_nombre}` : ''}. ¿Querés corregirla? Queda registrado
            quién la corrigió.
          </p>
        )}
      </Dialogo>
    </>
  )
}
