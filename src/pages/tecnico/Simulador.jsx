// T14 – Simular escenario (CU23, incluye CU13). No modifica los datos reales.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { useApi } from '../../hooks/useApi'
import { useAvisos } from '../../context/AvisosContext'
import { Aviso, Boton, Campo, Encabezado, Seccion } from '../../components/ui'

export const CLAVE_SIMULACION = 'ultima_simulacion_v2'

export default function Simulador() {
  const navegar = useNavigate()
  const { avisar } = useAvisos()
  const fincas = useApi('/fincas')
  const [lluvias, setLluvias] = useState([{ id_finca: '', mm: '' }])
  const [organico, setOrganico] = useState(false)
  const [errores, setErrores] = useState({})
  const [enviando, setEnviando] = useState(false)

  const validarTodo = () => {
    const errs = {}
    const usadas = new Set()
    lluvias.forEach((l, i) => {
      const vacia = !l.id_finca && l.mm === ''
      if (vacia) return
      if (!l.id_finca) errs[`f${i}`] = 'Elegí la finca.'
      else if (usadas.has(l.id_finca)) errs[`f${i}`] = 'La finca ya está en otro supuesto.'
      usadas.add(l.id_finca)
      if (l.mm === '' || Number.isNaN(Number(l.mm))) errs[`m${i}`] = 'Ingresá los milímetros.'
      else if (Number(l.mm) <= 0) errs[`m${i}`] = 'Debe ser mayor a cero.'
      else if (Number(l.mm) > 500) errs[`m${i}`] = 'Máximo 500 mm.'
    })
    const validas = lluvias.filter((l) => l.id_finca || l.mm !== '')
    if (!validas.length && !organico) errs.general = 'Elegí al menos un supuesto: lluvia en una finca o pedido orgánico.'
    return errs
  }

  const cambiar = (i, campo, valor) => setLluvias((l) => l.map((x, j) => (j === i ? { ...x, [campo]: valor } : x)))

  const simular = async (e) => {
    e.preventDefault()
    const errs = validarTodo()
    setErrores(errs)
    if (Object.keys(errs).length) return
    setEnviando(true)
    try {
      const r = await api.post('/simulaciones', {
        lluvias: lluvias.filter((l) => l.id_finca).map((l) => ({ id_finca: l.id_finca, mm: Number(l.mm) })),
        pedido_organico: organico,
      })
      try {
        sessionStorage.setItem(CLAVE_SIMULACION, JSON.stringify(r))
      } catch {
        // sin almacenamiento: el resultado viaja igual en la navegación
      }
      navegar('/tecnico/simulador/resultado', { state: r })
    } catch (err) {
      avisar(err.message, 'error', 8000)
    } finally {
      setEnviando(false)
    }
  }

  const fincasLista = fincas.datos || []
  return (
    <>
      <Encabezado
        codigo="T14"
        titulo="Simular escenario"
        descripcion="Probá qué pasaría con el ranking, el riesgo y la reserva. Se calcula sobre una copia en memoria: no cambia los datos ni se guarda."
      />
      <form onSubmit={simular} noValidate className="flex max-w-3xl flex-col gap-6">
        <Seccion titulo="¿Qué pasa si llueve?" descripcion="Milímetros que caerían en cada finca">
          <div className="flex flex-col gap-4">
            {lluvias.map((l, i) => (
              <div key={i} className="grid items-start gap-3 sm:grid-cols-[1fr_10rem_auto]">
                <Campo etiqueta="Finca" error={errores[`f${i}`]}>
                  {(a) => (
                    <select {...a} className="campo-entrada" value={l.id_finca} onChange={(e) => cambiar(i, 'id_finca', e.target.value)}>
                      <option value="">Elegí una finca</option>
                      {fincasLista.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.nombre}
                        </option>
                      ))}
                    </select>
                  )}
                </Campo>
                <Campo etiqueta="Lluvia (mm)" error={errores[`m${i}`]}>
                  {(a) => <input {...a} type="number" min="1" max="500" step="1" inputMode="decimal" className="campo-entrada" value={l.mm} onChange={(e) => cambiar(i, 'mm', e.target.value)} />}
                </Campo>
                {lluvias.length > 1 && (
                  <Boton variante="fantasma" className="sm:mt-7" onClick={() => setLluvias((x) => x.filter((_, j) => j !== i))} aria-label={`Quitar supuesto ${i + 1}`}>
                    Quitar
                  </Boton>
                )}
              </div>
            ))}
            {lluvias.length < 5 && (
              <div>
                <Boton variante="secundario" icono="mas" onClick={() => setLluvias((x) => [...x, { id_finca: '', mm: '' }])}>
                  Agregar otra finca
                </Boton>
              </div>
            )}
          </div>
        </Seccion>
        <Seccion titulo="¿Qué pasa si entra un pedido orgánico?">
          <label className="flex min-h-11 items-start gap-3">
            <input type="checkbox" className="mt-0.5 h-5 w-5 accent-cana" checked={organico} onChange={(e) => setOrganico(e.target.checked)} />
            <span className="text-sm">
              <span className="font-semibold">Simular un pedido orgánico</span>
              <span className="block text-tinta-2">Los lotes orgánicos habilitados pasan primero, aunque no sea su zona de madurez.</span>
            </span>
          </label>
        </Seccion>
        {errores.general && <Aviso tono="critico">{errores.general}</Aviso>}
        <Aviso tono="info">
          Para traducir los milímetros a días sin piso se usa una tabla de prueba por tipo de drenaje (ver Parámetros), pendiente de confirmar con el ingenio.
        </Aviso>
        <div>
          <Boton type="submit" cargando={enviando} icono="simular">
            Simular
          </Boton>
        </div>
      </form>
    </>
  )
}
