// T07 – Editar lote (CU04): completar o corregir lo que la planilla no trae.
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { api } from '../../services/api'
import { useAvisos } from '../../context/AvisosContext'
import { Aviso, Boton, BotonLink, Campo, Cargando, Encabezado, ErrorCarga, Seccion } from '../../components/ui'
import { reglas, validar } from '../../utils/validacion'

const esquema = (anioCampania) => ({
  nombre: [reglas.requerido(), reglas.largoMax(80)],
  nro_lote: [reglas.requerido(), reglas.largoMax(20)],
  area_bruta_ha: [reglas.requerido(), reglas.numero(), reglas.mayorQue(0, 'Debe ser mayor a cero.'), reglas.maximo(5000)],
  area_neta_ha: [
    reglas.numero(),
    reglas.minimo(0),
    (v, t) => (v !== '' && t.area_bruta_ha !== '' && Number(v) > Number(t.area_bruta_ha) ? 'El área neta no puede superar al área bruta.' : null),
  ],
  dist_ingenio_km: [reglas.numero(), reglas.minimo(0), reglas.maximo(100)],
  certificacion: [(v, t) => (t.tipo_cultivo === 'Orgánico' && !v ? 'Un lote orgánico necesita su certificación.' : null)],
  variedad: [reglas.largoMax(60), (v, t) => (t.estado_lote === 'En producción' && !String(v || '').trim() ? 'Un lote en producción necesita su variedad.' : null)],
  anio_plantacion: [reglas.entero(), reglas.minimo(1950), reglas.maximo(anioCampania, `No puede ser posterior a ${anioCampania}.`)],
  cantidad_cortes: [reglas.entero(), reglas.minimo(0), reglas.maximo(30)],
  observaciones: [reglas.largoMax(500)],
})

const CAMPOS = ['nombre', 'nro_lote', 'tipo_cultivo', 'certificacion', 'area_bruta_ha', 'area_neta_ha', 'dist_ingenio_km', 'drenaje', 'id_pluviometro', 'variedad', 'anio_plantacion', 'cantidad_cortes', 'estado_lote', 'observaciones']
const NUMERICOS = ['area_bruta_ha', 'area_neta_ha', 'dist_ingenio_km', 'anio_plantacion', 'cantidad_cortes']

export default function EditarLote() {
  const { id } = useParams()
  const navegar = useNavigate()
  const { avisar } = useAvisos()
  const ficha = useApi(`/lotes/${id}`)
  const pluvios = useApi('/pluviometros')
  const [valores, setValores] = useState(null)
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState(null)

  useEffect(() => {
    if (!ficha.datos || valores) return
    const l = ficha.datos.lote
    setValores(Object.fromEntries(CAMPOS.map((c) => [c, l[c] ?? ''])))
  }, [ficha.datos, valores])

  if (ficha.cargando && !ficha.datos) return <Cargando texto="Cargando el lote…" />
  if (ficha.error) return <ErrorCarga error={ficha.error} alReintentar={ficha.recargar} />
  if (!valores) return null
  const l = ficha.datos.lote
  const anio = ficha.datos.campania.anio || new Date().getFullYear()
  const reglasLote = esquema(anio)

  const cambiar = (campo) => (e) => {
    const v = { ...valores, [campo]: e.target.value }
    if (campo === 'tipo_cultivo' && e.target.value === 'Convencional') v.certificacion = ''
    setValores(v)
    if (errores[campo] || campo === 'area_bruta_ha') setErrores(validar(v, reglasLote))
  }
  const alSalir = () => setErrores(validar(valores, reglasLote))

  const guardar = async (e) => {
    e.preventDefault()
    const errs = validar(valores, reglasLote)
    setErrores(errs)
    setErrorGeneral(null)
    if (Object.keys(errs).length) return
    const cambios = {}
    CAMPOS.forEach((c) => {
      let v = valores[c]
      if (NUMERICOS.includes(c)) v = v === '' ? null : Number(v)
      else if (v === '') v = null
      const original = l[c] ?? null
      if (v !== original) cambios[c] = v
    })
    if (!Object.keys(cambios).length) {
      avisar('No hay cambios para guardar.', 'info')
      return
    }
    setGuardando(true)
    try {
      await api.put(`/lotes/${id}`, cambios)
      avisar('Lote actualizado.')
      navegar(`/tecnico/lotes/${id}`)
    } catch (err) {
      setErrores(err.campos || {})
      setErrorGeneral(err.message)
    } finally {
      setGuardando(false)
    }
  }

  const entrada = (campo, props = {}) => (a) => (
    <input {...a} className="campo-entrada" value={valores[campo]} onChange={cambiar(campo)} onBlur={alSalir} {...props} />
  )

  return (
    <>
      <Encabezado codigo="T07" volver={{ a: `/tecnico/lotes/${id}`, texto: 'Ficha del lote' }} titulo={`Editar ${l.nombre}`} descripcion={`${l.finca} · ID ${l.id_unico}`} />
      <form onSubmit={guardar} noValidate className="flex flex-col gap-6">
        <Seccion titulo="Datos del lote">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Campo etiqueta="Nombre" requerido error={errores.nombre}>{entrada('nombre', { maxLength: 80 })}</Campo>
            <Campo etiqueta="Número de lote" requerido error={errores.nro_lote} ayuda="Único dentro de la finca">{entrada('nro_lote', { maxLength: 20 })}</Campo>
            <Campo etiqueta="Tipo de cultivo" requerido>
              {(a) => (
                <select {...a} className="campo-entrada" value={valores.tipo_cultivo} onChange={cambiar('tipo_cultivo')}>
                  <option>Convencional</option>
                  <option>Orgánico</option>
                </select>
              )}
            </Campo>
            <Campo etiqueta="Certificación" error={errores.certificacion} requerido={valores.tipo_cultivo === 'Orgánico'}>
              {(a) => (
                <select {...a} className="campo-entrada" value={valores.certificacion} onChange={cambiar('certificacion')} onBlur={alSalir} disabled={valores.tipo_cultivo !== 'Orgánico'}>
                  <option value="">Sin certificación</option>
                  <option>Orgánico Full</option>
                  <option>Orgánico NOP</option>
                </select>
              )}
            </Campo>
            <Campo etiqueta="Área bruta (ha)" requerido error={errores.area_bruta_ha}>{entrada('area_bruta_ha', { type: 'number', step: '0.01', min: 0, inputMode: 'decimal' })}</Campo>
            <Campo etiqueta="Área neta (ha)" error={errores.area_neta_ha} ayuda="No puede superar al área bruta">{entrada('area_neta_ha', { type: 'number', step: '0.01', min: 0, inputMode: 'decimal' })}</Campo>
            <Campo etiqueta="Distancia al ingenio (km)" error={errores.dist_ingenio_km} ayuda="Define la zona: 1–6 cercana, 7–12 media, 13–19 lejana">
              {entrada('dist_ingenio_km', { type: 'number', step: '1', min: 0, inputMode: 'decimal' })}
            </Campo>
            <Campo etiqueta="Tipo de drenaje" error={errores.drenaje} ayuda={!valores.drenaje ? 'Sin drenaje el lote queda con datos incompletos' : undefined}>
              {(a) => (
                <select {...a} className="campo-entrada" value={valores.drenaje} onChange={cambiar('drenaje')}>
                  <option value="">Sin dato</option>
                  <option value="bien">Bien drenado</option>
                  <option value="medio">Medianamente drenado</option>
                  <option value="imperfecto">Imperfectamente drenado</option>
                </select>
              )}
            </Campo>
            <Campo etiqueta="Pluviómetro de referencia" error={errores.id_pluviometro}>
              {(a) => (
                <select {...a} className="campo-entrada" value={valores.id_pluviometro} onChange={cambiar('id_pluviometro')}>
                  <option value="">Sin pluviómetro</option>
                  {(pluvios.datos || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              )}
            </Campo>
          </div>
        </Seccion>
        <Seccion titulo="Datos de la campaña" descripcion={ficha.datos.campania.nombre}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Campo etiqueta="Estado" requerido>
              {(a) => (
                <select {...a} className="campo-entrada" value={valores.estado_lote} onChange={cambiar('estado_lote')} onBlur={alSalir}>
                  <option>En producción</option>
                  <option>En preparación</option>
                </select>
              )}
            </Campo>
            <Campo etiqueta="Variedad" error={errores.variedad} requerido={valores.estado_lote === 'En producción'}>{entrada('variedad', { maxLength: 60, placeholder: 'Ej.: LCP 85-384' })}</Campo>
            <Campo etiqueta="Año de plantación" error={errores.anio_plantacion}>{entrada('anio_plantacion', { type: 'number', step: '1', min: 1950, max: anio, inputMode: 'numeric' })}</Campo>
            <Campo etiqueta="Cantidad de cortes" error={errores.cantidad_cortes}>{entrada('cantidad_cortes', { type: 'number', step: '1', min: 0, max: 30, inputMode: 'numeric' })}</Campo>
            <Campo etiqueta="Observaciones" error={errores.observaciones} className="sm:col-span-2 lg:col-span-4">
              {(a) => <textarea {...a} rows={3} className="campo-entrada" value={valores.observaciones} onChange={cambiar('observaciones')} onBlur={alSalir} maxLength={500} />}
            </Campo>
          </div>
        </Seccion>
        {errorGeneral && <Aviso tono="critico">{errorGeneral}</Aviso>}
        <div className="flex flex-wrap gap-2">
          <Boton type="submit" cargando={guardando} icono="check">
            Guardar cambios
          </Boton>
          <BotonLink to={`/tecnico/lotes/${id}`}>Cancelar</BotonLink>
        </div>
      </form>
    </>
  )
}
