// T18 / F09 – Vista de informe (CU20): filtros, tabla, resumen y exportación a PDF o Excel.
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { useAvisos } from '../../context/AvisosContext'
import { BASE_ROL } from '../../config/navegacion'
import { exportarExcel, exportarPdf } from '../../services/exportar'
import { Aviso, Boton, Campo, Cargando, Encabezado, ErrorCarga, Seccion, Tabla, Vacio } from '../../components/ui'
import { fecha, fechaHora, hoyISO, num } from '../../utils/formato'

function celda(fila, col) {
  const v = fila[col.clave]
  if (v === null || v === undefined || v === '') return '—'
  if (col.tipo === 'fecha') return fecha(v)
  if (col.tipo === 'fecha_hora') return fechaHora(v)
  if (col.tipo === 'numero') return num(v, Number.isInteger(Number(v)) ? 0 : 1)
  return v
}

function Matriz({ m }) {
  const celdaM = (valor, texto) => (
    <td className="border border-linea px-4 py-3 text-center">
      <span className="cifra block text-2xl font-semibold">{valor}</span>
      <span className="text-xs text-tenue">{texto}</span>
    </td>
  )
  return (
    <table className="text-sm">
      <caption className="mb-2 text-left font-semibold">Días por finca: alerta contra lluvia registrada</caption>
      <thead>
        <tr>
          <td />
          <th scope="col" className="px-4 py-2 text-xs text-tenue">Llovió</th>
          <th scope="col" className="px-4 py-2 text-xs text-tenue">No llovió</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row" className="pr-3 text-right text-xs text-tenue">Con alerta</th>
          {celdaM(m.alerta_llovio, 'acierto')}
          {celdaM(m.alerta_no_llovio, 'falsa alarma')}
        </tr>
        <tr>
          <th scope="row" className="pr-3 text-right text-xs text-tenue">Sin alerta</th>
          {celdaM(m.sin_alerta_llovio, 'sin aviso')}
          {celdaM(m.sin_alerta_no_llovio, 'correcto')}
        </tr>
      </tbody>
    </table>
  )
}

export default function VistaInforme() {
  const { tipo } = useParams()
  const { perfil } = useAuth()
  const { avisar } = useAvisos()
  const fincas = useApi('/fincas')
  const [filtros, setFiltros] = useState({ desde: '', hasta: '', id_finca: '', zona: '', tipo_cultivo: '' })
  const [aplicados, setAplicados] = useState(filtros)
  const [errorFiltro, setErrorFiltro] = useState(null)
  const [exportando, setExportando] = useState(null)
  const { datos, cargando, error, recargar } = useApi(`/informes/${tipo}`, aplicados)
  const base = BASE_ROL[perfil.rol]

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

  const exportar = async (formato) => {
    if (!datos || datos.sin_datos) {
      avisar('No hay datos para los filtros elegidos: no se genera el archivo.', 'alerta')
      return
    }
    setExportando(formato)
    try {
      const args = {
        titulo: datos.titulo,
        subtitulo: `Del ${fecha(datos.filtros.desde)} al ${fecha(datos.filtros.hasta)} · generado el ${fechaHora(datos.generado)}`,
        columnas: datos.columnas,
        filas: datos.filas,
        resumen: datos.resumen,
      }
      await (formato === 'pdf' ? exportarPdf(args) : exportarExcel(args))
      avisar(`Informe exportado a ${formato === 'pdf' ? 'PDF' : 'Excel'}.`)
    } catch {
      avisar('No se pudo exportar el informe.', 'error')
    } finally {
      setExportando(null)
    }
  }

  const usaLotes = ['sin-piso', 'avance'].includes(tipo)
  return (
    <>
      <Encabezado
        codigo={perfil.rol === 'fabrica' ? 'F09' : 'T18'}
        volver={{ a: `${base}/informes`, texto: 'Informes' }}
        titulo={datos?.titulo || 'Informe'}
        acciones={
          <>
            <Boton variante="secundario" icono="descargar" onClick={() => exportar('pdf')} cargando={exportando === 'pdf'} disabled={!datos || datos.sin_datos}>
              PDF
            </Boton>
            <Boton variante="secundario" icono="descargar" onClick={() => exportar('xlsx')} cargando={exportando === 'xlsx'} disabled={!datos || datos.sin_datos}>
              Excel
            </Boton>
          </>
        }
      />
      <form onSubmit={aplicar} noValidate className="no-imprimir mb-6 grid items-end gap-3 rounded-lg border border-linea bg-superficie p-4 sm:grid-cols-2 lg:grid-cols-6">
        <Campo etiqueta="Desde" error={errorFiltro}>
          {(a) => <input {...a} type="date" max={hoyISO()} className="campo-entrada" value={filtros.desde} onChange={cambiar('desde')} />}
        </Campo>
        <Campo etiqueta="Hasta">
          {(a) => <input {...a} type="date" max={hoyISO()} className="campo-entrada" value={filtros.hasta} onChange={cambiar('hasta')} />}
        </Campo>
        {tipo !== 'paradas' && tipo !== 'patio' && (
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
        )}
        {usaLotes && (
          <>
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
          </>
        )}
        <Boton type="submit" cargando={cargando && !!datos}>
          Aplicar filtros
        </Boton>
      </form>
      {cargando && !datos && <Cargando texto="Armando el informe…" />}
      {error && <ErrorCarga error={error} alReintentar={recargar} />}
      {datos && (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-tinta-2">
            Del {fecha(datos.filtros.desde)} al {fecha(datos.filtros.hasta)}.
          </p>
          {datos.sin_datos ? (
            <Vacio titulo="No hay datos para los filtros elegidos.">Probá con otro rango de fechas o sin filtrar por finca. Mientras no haya datos no se genera el archivo.</Vacio>
          ) : (
            <>
              {datos.resumen.length > 0 && (
                <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {datos.resumen.map((r) => (
                    <div key={r.etiqueta} className="rounded-lg border border-linea bg-superficie p-3">
                      <dt className="text-xs text-tenue">{r.etiqueta}</dt>
                      <dd className="cifra mt-1 text-xl font-semibold">{r.valor}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {datos.matriz && (
                <Seccion titulo="Acierto de las alertas">
                  <Matriz m={datos.matriz} />
                </Seccion>
              )}
              <Seccion titulo={`${datos.filas.length} registros`}>
                <Tabla
                  etiqueta={datos.titulo}
                  claveFila="__i"
                  columnas={datos.columnas.map((c) => ({ ...c, ordenable: true, alinear: c.tipo === 'numero' ? 'derecha' : undefined, render: (f) => celda(f, c) }))}
                  filas={datos.filas.map((f, i) => ({ ...f, __i: i }))}
                />
              </Seccion>
            </>
          )}
          {tipo === 'lluvias' && <Aviso tono="info">La lluvia por finca es el promedio de sus pluviómetros; un pluviómetro sin lectura ese día cuenta como 0 mm.</Aviso>}
        </div>
      )}
    </>
  )
}
