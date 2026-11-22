// T10 – Registrar cosecha realizada (CU16)
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../services/api'
import { useApi } from '../../hooks/useApi'
import { useAvisos } from '../../context/AvisosContext'
import BuscadorLote from '../../components/BuscadorLote'
import { Aviso, Boton, Campo, Encabezado, Seccion, Tabla } from '../../components/ui'
import { fecha, hoyISO, num } from '../../utils/formato'
import { reglas, validar } from '../../utils/validacion'

function calcularResumenLote(lote, cosechas, rendimientoDefault) {
  if (!lote) return null
  const area = lote.area_neta_ha ?? lote.area_bruta_ha
  const estimadas =
    lote.toneladas_estimadas != null
      ? Number(lote.toneladas_estimadas)
      : area != null
        ? Number((Number(area) * rendimientoDefault).toFixed(1))
        : null
  const cosechadas =
    lote.toneladas_cosechadas != null
      ? Number(lote.toneladas_cosechadas)
      : Number(
          (cosechas || [])
            .filter((c) => c.id_unico === lote.id_unico)
            .reduce((acc, c) => acc + Number(c.toneladas || 0), 0)
            .toFixed(1),
        )
  const restantes =
    lote.toneladas_restantes != null
      ? Number(lote.toneladas_restantes)
      : estimadas != null
        ? Math.max(0, Number((estimadas - cosechadas).toFixed(1)))
        : null
  return { estimadas, cosechadas, restantes }
}

export default function Cosecha() {
  const [params] = useSearchParams()
  const { avisar } = useAvisos()
  const parametros = useApi('/parametros')
  const recientes = useApi('/cosechas')
  const inicioCampania = parametros.datos?.campania?.fecha_inicio
  const rendimientoDefault =
    Number(parametros.datos?.parametros?.find((p) => p.clave === 'rendimiento_estimado_tha')?.valor) || 75
  const [valores, setValores] = useState({ id_unico: params.get('lote') || '', fecha: hoyISO(), toneladas: '', lote_terminado: false })
  const [loteSeleccionado, setLoteSeleccionado] = useState(null)
  const [recargaLotes, setRecargaLotes] = useState(0)
  const [errores, setErrores] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [confirmar, setConfirmar] = useState(false)
  const [resultado, setResultado] = useState(null)

  const esquema = {
    id_unico: [reglas.requerido('Elegí el lote.')],
    fecha: [reglas.requerido(), reglas.fechaNoFutura(), reglas.fechaDesde(inicioCampania, `La campaña empezó el ${fecha(inicioCampania)}.`)],
    toneladas: [reglas.numero(), reglas.mayorQue(0, 'Las toneladas deben ser mayores a cero.'), reglas.maximo(100000)],
  }

  const resumenLote = useMemo(
    () => calcularResumenLote(loteSeleccionado, recientes.datos, rendimientoDefault),
    [loteSeleccionado, recientes.datos, rendimientoDefault],
  )

  const poner = (campo, valor) => {
    const v = { ...valores, [campo]: valor }
    setValores(v)
    if (errores[campo]) setErrores(validar(v, esquema))
  }

  const cambiarLote = (id, lote) => {
    setLoteSeleccionado(lote || null)
    const v = { ...valores, id_unico: id }
    if (v.lote_terminado) {
      const res = calcularResumenLote(lote, recientes.datos, rendimientoDefault)
      if (res?.restantes > 0) v.toneladas = String(res.restantes)
    }
    setValores(v)
    if (errores.id_unico || errores.toneladas) setErrores(validar(v, esquema))
  }

  const cambiarTerminado = (marcado) => {
    const v = { ...valores, lote_terminado: marcado }
    if (marcado && resumenLote?.restantes > 0) {
      v.toneladas = String(resumenLote.restantes)
    }
    setValores(v)
    if (errores.toneladas) setErrores(validar(v, esquema))
  }

  const enviar = async (e) => {
    e?.preventDefault()
    const errs = validar(valores, esquema)
    setErrores(errs)
    if (Object.keys(errs).length) return
    if (valores.lote_terminado && !confirmar) {
      setConfirmar(true)
      return
    }
    setEnviando(true)
    setResultado(null)
    try {
      const r = await api.post('/cosechas', {
        id_unico: valores.id_unico,
        fecha: valores.fecha,
        toneladas: valores.toneladas === '' ? null : Number(valores.toneladas),
        lote_terminado: valores.lote_terminado,
      })
      setResultado(r)
      avisar('Cosecha registrada.')
      r.avisos_reserva?.forEach((a) => avisar(a, 'alerta', 9000))
      const termino = valores.lote_terminado
      setValores({ ...valores, id_unico: termino ? '' : valores.id_unico, toneladas: '', lote_terminado: false })
      if (termino) setLoteSeleccionado(null)
      setConfirmar(false)
      recientes.recargar(true)
      setRecargaLotes((n) => n + 1)
    } catch (err) {
      setErrores(err.campos || {})
      if (!Object.keys(err.campos || {}).length) avisar(err.message, 'error', 8000)
      setConfirmar(false)
    } finally {
      setEnviando(false)
    }
  }

  const ayudaToneladas = resumenLote?.estimadas != null
    ? `Estimado: ${num(resumenLote.estimadas, 1)} t · Cosechado: ${num(resumenLote.cosechadas, 1)} t · Restante: ${num(resumenLote.restantes, 1)} t`
    : 'Opcional'

  return (
    <>
      <Encabezado codigo="T10" titulo="Cosecha realizada" descripcion="Registrá en qué lotes se está cosechando. Un lote terminado sale del ranking y de la reserva." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <form onSubmit={enviar} noValidate className="flex flex-col gap-6">
          <Seccion titulo="Lote">
            <BuscadorLote
              valor={valores.id_unico}
              alCambiar={cambiarLote}
              alElegirLote={setLoteSeleccionado}
              recargarKey={recargaLotes}
              error={errores.id_unico}
              filtroLote={(l) => l.estado_lote === 'En producción' && !l.terminado}
              ayuda="Solo lotes en producción y sin terminar"
            />
          </Seccion>
          <Seccion titulo="Registro del día">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Fecha" requerido error={errores.fecha}>
                {(a) => <input {...a} type="date" min={inicioCampania} max={hoyISO()} className="campo-entrada" value={valores.fecha} onChange={(e) => poner('fecha', e.target.value)} />}
              </Campo>
              <Campo etiqueta="Toneladas cosechadas" error={errores.toneladas} ayuda={ayudaToneladas}>
                {(a) => (
                  <input
                    {...a}
                    type="number"
                    min="0"
                    step="0.1"
                    inputMode="decimal"
                    className="campo-entrada"
                    value={valores.toneladas}
                    onChange={(e) => poner('toneladas', e.target.value)}
                    onBlur={() => setErrores(validar(valores, esquema))}
                  />
                )}
              </Campo>
              <label className="flex min-h-11 items-center gap-3 sm:col-span-2">
                <input type="checkbox" className="h-5 w-5 accent-cana" checked={valores.lote_terminado} onChange={(e) => cambiarTerminado(e.target.checked)} />
                <span className="text-sm font-semibold">El lote quedó terminado</span>
              </label>
            </div>
          </Seccion>
          {confirmar && (
            <Aviso tono="alerta" titulo="¿Confirmás que el lote quedó terminado?">
              <p>Sale del ranking y de la reserva, y no se le puede registrar más cosecha.</p>
              <div className="mt-3 flex gap-2">
                <Boton onClick={() => enviar()} cargando={enviando}>
                  Sí, terminar lote
                </Boton>
                <Boton variante="secundario" onClick={() => setConfirmar(false)}>
                  Volver
                </Boton>
              </div>
            </Aviso>
          )}
          {resultado && (
            <Aviso tono="ok" titulo={resultado.mensaje}>
              <Link to={`/tecnico/lotes/${resultado.id_unico}`} className="font-semibold underline">
                Ver la ficha del lote
              </Link>
            </Aviso>
          )}
          {!confirmar && (
            <div>
              <Boton type="submit" cargando={enviando} icono="check">
                Registrar cosecha
              </Boton>
            </div>
          )}
        </form>
        <Seccion titulo="Últimos registros">
          <Tabla
            etiqueta="Últimos registros de cosecha"
            columnas={[
              { clave: 'fecha', titulo: 'Fecha', render: (c) => fecha(c.fecha) },
              { clave: 'lote', titulo: 'Lote', render: (c) => <Link className="font-semibold hover:underline" to={`/tecnico/lotes/${c.id_unico}`}>{c.lote}</Link> },
              { clave: 'finca', titulo: 'Finca' },
              { clave: 'toneladas', titulo: 't', alinear: 'derecha', render: (c) => (c.toneladas ? num(c.toneladas, 1) : '—') },
              { clave: 'lote_terminado', titulo: 'Estado', render: (c) => (c.lote_terminado ? 'Terminado' : 'En cosecha') },
            ]}
            filas={(recientes.datos || []).slice(0, 15)}
            vacio={<p className="text-sm text-tinta-2">Todavía no hay cosecha registrada.</p>}
          />
        </Seccion>
      </div>
    </>
  )
}
