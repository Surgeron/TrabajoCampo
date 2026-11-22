// T08 / J03 – Registrar estado de piso (CU09). Misma pantalla para el Equipo técnico y el Jefe de lote.
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../services/api'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { useAvisos } from '../../context/AvisosContext'
import BuscadorLote from '../../components/BuscadorLote'
import { InsigniaPiso } from '../../components/estados'
import { Aviso, Boton, Campo, Encabezado, Seccion, Tabla } from '../../components/ui'
import { fechaHora } from '../../utils/formato'
import { reglas, validar } from '../../utils/validacion'

const OPCIONES = [
  { valor: 'Habilitado', texto: 'Se puede entrar a cosechar', clase: 'peer-checked:border-bien peer-checked:bg-bien-claro', simbolo: '●', color: 'text-bien-texto' },
  { valor: 'Con restricciones', texto: 'Se puede entrar con cuidado', clase: 'peer-checked:border-atencion peer-checked:bg-atencion-claro', simbolo: '◐', color: 'text-atencion-texto' },
  { valor: 'Inhabilitado', texto: 'Sin piso: no se puede entrar', clase: 'peer-checked:border-critico peer-checked:bg-critico-claro', simbolo: '✕', color: 'text-critico-texto' },
]

const esquema = {
  id_unico: [reglas.requerido('Elegí el lote.')],
  estado: [reglas.requerido('Elegí el estado.')],
  observacion: [reglas.largoMax(300)],
}

export default function EstadoPiso() {
  const [params] = useSearchParams()
  const { perfil } = useAuth()
  const { avisar } = useAvisos()
  const recientes = useApi('/estados-piso', { mias: perfil.rol === 'jefe_lote' })
  const [valores, setValores] = useState({ id_unico: params.get('lote') || '', estado: '', observacion: '' })
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
      const r = await api.post('/estados-piso', { ...valores, observacion: valores.observacion || null })
      setResultado(r)
      avisar(`Estado de piso registrado: ${r.lote} ${r.estado.toLowerCase()}.`)
      r.avisos_reserva?.forEach((a) => avisar(a, 'alerta', 9000))
      setValores({ id_unico: '', estado: '', observacion: '' })
      recientes.recargar(true)
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
        codigo={perfil.rol === 'jefe_lote' ? 'J03' : 'T08'}
        titulo="Estado de piso"
        descripcion="Informá si se puede entrar a cosechar. Un lote inhabilitado sale del ranking hasta que se habilite."
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <form onSubmit={enviar} noValidate className="flex flex-col gap-6">
          <Seccion titulo="Lote">
            <BuscadorLote valor={valores.id_unico} alCambiar={(v) => poner('id_unico', v)} error={errores.id_unico} />
          </Seccion>
          <Seccion titulo="Estado">
            <fieldset>
              <legend className="sr-only">Estado de piso</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {OPCIONES.map((o) => (
                  <label key={o.valor} className="relative cursor-pointer">
                    <input
                      type="radio"
                      name="estado"
                      value={o.valor}
                      checked={valores.estado === o.valor}
                      onChange={() => poner('estado', o.valor)}
                      className="peer sr-only"
                    />
                    <span className={`flex min-h-24 flex-col justify-center rounded-lg border-2 border-linea bg-superficie p-4 peer-focus-visible:outline-3 peer-focus-visible:outline-lluvia ${o.clase}`}>
                      <span className={`font-display text-lg font-semibold ${o.color}`}>
                        <span aria-hidden="true">{o.simbolo} </span>
                        {o.valor}
                      </span>
                      <span className="text-sm text-tinta-2">{o.texto}</span>
                    </span>
                  </label>
                ))}
              </div>
              {errores.estado && <p className="mt-2 text-xs font-semibold text-critico-texto">{errores.estado}</p>}
            </fieldset>
            <Campo etiqueta="Observación" error={errores.observacion} ayuda="Por ejemplo: aguada en la cabecera, surgente" className="mt-4">
              {(a) => <textarea {...a} rows={2} maxLength={300} className="campo-entrada" value={valores.observacion} onChange={(e) => poner('observacion', e.target.value)} />}
            </Campo>
          </Seccion>
          {resultado?.mensaje && <Aviso tono={resultado.estado === 'Inhabilitado' ? 'alerta' : 'ok'}>{resultado.mensaje}</Aviso>}
          <div>
            <Boton type="submit" cargando={enviando} icono="check">
              Registrar estado
            </Boton>
          </div>
        </form>
        <Seccion titulo={perfil.rol === 'jefe_lote' ? 'Mis últimos registros' : 'Últimos registros'}>
          <Tabla
            etiqueta="Últimos estados de piso"
            columnas={[
              { clave: 'fecha_hora_desde', titulo: 'Fecha', render: (e) => fechaHora(e.fecha_hora_desde) },
              { clave: 'lote', titulo: 'Lote', render: (e) => `${e.lote} · ${e.finca}` },
              { clave: 'estado', titulo: 'Estado', render: (e) => <InsigniaPiso estado={e.estado} /> },
            ]}
            filas={(recientes.datos || []).slice(0, 12)}
            vacio={<p className="text-sm text-tinta-2">Todavía no hay registros.</p>}
          />
        </Seccion>
      </div>
    </>
  )
}
