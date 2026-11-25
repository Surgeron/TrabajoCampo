// T16 / F07 – Panel gerencial (CU20): 4 tarjetas con KPI y 6 gráficos.
import { useEffect, useRef, useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { useAvisos } from '../../context/AvisosContext'
import { exportarPanelPdf } from '../../services/exportar'
import { Boton, Campo, Cargando, Encabezado, ErrorCarga } from '../../components/ui'
import { GraficoAvance, GraficoCobertura, GraficoDisponibilidad, GraficoLluvia, GraficoParadas, GraficoSinPiso } from '../../components/Graficos'
import { fecha, hoyISO, num } from '../../utils/formato'

// Si sube, ¿es bueno? Define el sentido de la variación de cada tarjeta.
const SUBIR_ES_BUENO = { 1: false, 2: false, 5: true, 6: false }

function valorTarjeta(t) {
  if (t.unidad === 'USD') return `${num(t.valor, 0)} USD`
  if (t.unidad === 'h') return `${num(t.valor, 1)} h`
  if (t.unidad === 'ha') return `${num(t.valor, 0)} ha`
  return `${num(t.valor, 1)} %`
}

function formatoToneladas(v) {
  const n = Number(v || 0)
  return `${num(n, Number.isInteger(n) ? 0 : 1)} t`
}

function tarjetasToneladas(datos) {
  const tc = datos?.toneladas_cosechadas || {}
  return [
    { titulo: 'Toneladas cosechadas (total)', valor: tc.total || 0 },
    { titulo: 'Toneladas cosechadas (convencional)', valor: tc.convencional || 0 },
    { titulo: 'Toneladas cosechadas (orgánico)', valor: tc.organico || 0 },
  ]
}

function Variacion({ t }) {
  if (t.variacion === null || t.variacion === undefined) return <p className="text-xs text-tenue">Sin comparación semanal</p>
  if (t.variacion === 0) return <p className="text-xs text-tenue">Igual que la semana anterior</p>
  const sube = t.variacion > 0
  const bueno = sube === SUBIR_ES_BUENO[t.id]
  const valor = t.unidad === 'USD' ? `${num(Math.abs(t.variacion), 0)} USD` : `${num(Math.abs(t.variacion), 1)}${t.unidad === 'h' ? ' h' : ' puntos'}`
  return (
    <p className={`text-xs font-semibold ${bueno ? 'text-bien-texto' : 'text-critico-texto'}`}>
      <span aria-hidden="true">{sube ? '▲' : '▼'} </span>
      {sube ? 'Subió' : 'Bajó'} {valor} contra la semana anterior
    </p>
  )
}

export default function Panel() {
  const { perfil } = useAuth()
  const { avisar } = useAvisos()
  const fincas = useApi('/fincas')
  const [filtros, setFiltros] = useState({ desde: '', hasta: '', id_finca: '', zona: '', tipo_cultivo: '' })
  const [aplicados, setAplicados] = useState(filtros)
  const [errorFiltro, setErrorFiltro] = useState(null)
  const { datos, cargando, error, recargar } = useApi('/panel', aplicados)
  const [fincaLluvia, setFincaLluvia] = useState('')
  const [exportando, setExportando] = useState(false)
  const contenedor = useRef(null)

  useEffect(() => {
    if (!datos) return
    const nombres = datos.graficos.lluvia.fincas
    if (!nombres.includes(fincaLluvia)) setFincaLluvia(nombres[0] || '')
  }, [datos, fincaLluvia])

  const cambiar = (k) => (e) => setFiltros((f) => ({ ...f, [k]: e.target.value }))
  const aplicar = (e) => {
    e.preventDefault()
    if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
      setErrorFiltro('La fecha desde no puede ser posterior a la fecha hasta.')
      return
    }
    setErrorFiltro(null)
    setAplicados(filtros)
  }

  const exportar = async () => {
    setExportando(true)
    try {
      await exportarPanelPdf({
        titulo: 'Panel gerencial',
        subtitulo: `${datos.campania.nombre} · del ${fecha(datos.filtros.desde)} al ${fecha(datos.filtros.hasta)}`,
        tarjetas: [
          ...datos.tarjetas.map((t) => ({ titulo: t.titulo, valorTexto: valorTarjeta(t), detalle: t.detalle })),
          ...tarjetasToneladas(datos).map((t) => ({ titulo: t.titulo, valorTexto: formatoToneladas(t.valor), detalle: 'Acumulado del rango filtrado' })),
        ],
        contenedor: contenedor.current,
      })
      avisar('Panel exportado a PDF.')
    } catch {
      avisar('No se pudo exportar el panel.', 'error')
    } finally {
      setExportando(false)
    }
  }

  return (
    <>
      <Encabezado
        codigo={perfil.rol === 'fabrica' ? 'F07' : 'T16'}
        titulo="Panel gerencial"
        descripcion="Cuánto cuesta la falta de caña, cuán cerca está la fábrica de parar y cuánta caña está en riesgo por la lluvia."
        acciones={
          <Boton variante="secundario" icono="descargar" onClick={exportar} cargando={exportando} disabled={!datos}>
            Exportar a PDF
          </Boton>
        }
      />
      <form onSubmit={aplicar} noValidate className="no-imprimir mb-6 grid items-end gap-3 rounded-lg border border-linea bg-superficie p-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
        <Campo etiqueta="Campaña">
          {(a) => (
            <select {...a} className="campo-entrada" disabled>
              <option>{datos?.campania?.nombre || 'Campaña activa'}</option>
            </select>
          )}
        </Campo>
        <Campo etiqueta="Desde" error={errorFiltro}>
          {(a) => <input {...a} type="date" className="campo-entrada" value={filtros.desde} max={hoyISO()} onChange={cambiar('desde')} />}
        </Campo>
        <Campo etiqueta="Hasta">
          {(a) => <input {...a} type="date" className="campo-entrada" value={filtros.hasta} max={hoyISO()} onChange={cambiar('hasta')} />}
        </Campo>
        <Campo etiqueta="Finca">
          {(a) => (
            <select {...a} className="campo-entrada" value={filtros.id_finca} onChange={cambiar('id_finca')}>
              <option value="">Todas</option>
              {(fincas.datos || []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nombre}
                </option>
              ))}
            </select>
          )}
        </Campo>
        <Campo etiqueta="Zona">
          {(a) => (
            <select {...a} className="campo-entrada" value={filtros.zona} onChange={cambiar('zona')}>
              <option value="">Todas</option>
              <option>Lejana</option>
              <option>Media</option>
              <option>Cercana</option>
            </select>
          )}
        </Campo>
        <Campo etiqueta="Tipo de cultivo">
          {(a) => (
            <select {...a} className="campo-entrada" value={filtros.tipo_cultivo} onChange={cambiar('tipo_cultivo')}>
              <option value="">Todos</option>
              <option>Convencional</option>
              <option>Orgánico</option>
            </select>
          )}
        </Campo>
        <Boton type="submit" cargando={cargando && !!datos}>
          Aplicar filtros
        </Boton>
      </form>
      {cargando && !datos && <Cargando texto="Calculando indicadores…" />}
      {error && <ErrorCarga error={error} alReintentar={recargar} />}
      {datos && (
        <div ref={contenedor}>
          <p className="mb-3 text-sm text-tinta-2">
            Del {fecha(datos.filtros.desde)} al {fecha(datos.filtros.hasta)}. La finca filtra avance, riesgo, hectáreas sin piso y lluvia; la zona y el tipo de cultivo filtran avance, riesgo y hectáreas sin piso;
            las paradas y el patio son de toda la fábrica.
          </p>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {datos.tarjetas.map((t) => (
              <article key={t.id} className="rounded-lg border border-linea bg-superficie p-4">
                <h2 className="font-sans text-sm font-semibold text-tinta-2">{t.titulo}</h2>
                <p className="cifra mt-2 text-4xl font-semibold tv:text-5xl">{valorTarjeta(t)}</p>
                <p className="mt-1 text-xs text-tinta-2">{t.detalle}</p>
                <div className="mt-2">
                  <Variacion t={t} />
                </div>
              </article>
            ))}
          </div>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            {tarjetasToneladas(datos).map((t) => (
              <article key={t.titulo} className="rounded-lg border border-linea bg-superficie p-4">
                <h2 className="font-sans text-sm font-semibold text-tinta-2">{t.titulo}</h2>
                <p className="cifra mt-2 text-3xl font-semibold tv:text-4xl">{formatoToneladas(t.valor)}</p>
              </article>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <GraficoParadas datos={datos.graficos.paradas_semana} />
            <GraficoDisponibilidad datos={datos.graficos.disponibilidad} total={datos.graficos.disponibilidad_pct} />
            <GraficoCobertura cobertura={datos.graficos.cobertura} />
            <GraficoAvance datos={datos.graficos.avance_zona} />
            <GraficoSinPiso datos={datos.graficos.sin_piso} />
            {fincaLluvia && <GraficoLluvia lluvia={datos.graficos.lluvia} finca={fincaLluvia} alCambiarFinca={setFincaLluvia} />}
          </div>
          <p className="mt-4 text-xs text-tenue">
            Costo por hora de parada: {num(datos.costos_hora.bajo, 0)} / {num(datos.costos_hora.central, 0)} / {num(datos.costos_hora.alto, 0)} USD
            (escenarios bajo, central y alto). El detalle de cada indicador está en Informes.
          </p>
        </div>
      )}
    </>
  )
}
