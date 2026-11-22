// F04 – Paradas de fábrica (CU19): duración, costo estimado y alerta previa.
import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { BotonLink, Campo, Cargando, Encabezado, ErrorCarga, Insignia, Seccion, Tabla } from '../../components/ui'
import { fechaHora, hoyISO, horasTexto, num, usd } from '../../utils/formato'

const CAUSAS = ['Falta de caña por lluvia', 'Falta de caña por lotes lejanos o corte lento', 'Rotura mecánica', 'Otra']

export default function Paradas() {
  const [filtros, setFiltros] = useState({ desde: '', hasta: '', causa: '' })
  const error = filtros.desde && filtros.hasta && filtros.desde > filtros.hasta ? 'La fecha desde no puede ser posterior a la fecha hasta.' : null
  const { datos, cargando, error: errorCarga, recargar } = useApi(error ? null : '/paradas', filtros)
  const abierta = datos?.paradas.find((p) => p.abierta)
  const cambiar = (k) => (e) => setFiltros((f) => ({ ...f, [k]: e.target.value }))

  return (
    <>
      <Encabezado
        codigo="F04"
        titulo="Paradas de fábrica"
        descripcion="Cada parada con su costo estimado en tres escenarios: 1.000, 1.563 y 2.250 USD por hora."
        acciones={
          abierta ? (
            <BotonLink to={`/fabrica/paradas/${abierta.id}/cerrar`} variante="primario">
              Registrar reanudación
            </BotonLink>
          ) : (
            <BotonLink to="/fabrica/paradas/nueva" variante="peligro" icono="parada">
              Registrar parada
            </BotonLink>
          )
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3 lg:max-w-3xl">
        <Campo etiqueta="Desde" error={error}>
          {(a) => <input {...a} type="date" max={hoyISO()} className="campo-entrada" value={filtros.desde} onChange={cambiar('desde')} />}
        </Campo>
        <Campo etiqueta="Hasta">
          {(a) => <input {...a} type="date" max={hoyISO()} className="campo-entrada" value={filtros.hasta} onChange={cambiar('hasta')} />}
        </Campo>
        <Campo etiqueta="Causa">
          {(a) => (
            <select {...a} className="campo-entrada" value={filtros.causa} onChange={cambiar('causa')}>
              <option value="">Todas</option>
              {CAUSAS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          )}
        </Campo>
      </div>
      {cargando && !datos && <Cargando />}
      {errorCarga && <ErrorCarga error={errorCarga} alReintentar={recargar} />}
      {datos && (
        <>
          <dl className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-linea bg-superficie p-4">
              <dt className="text-sm text-tinta-2">Horas de parada</dt>
              <dd className="cifra mt-1 text-3xl font-semibold">{num(datos.total_horas, 1)} h</dd>
            </div>
            <div className="rounded-lg border border-linea bg-superficie p-4">
              <dt className="text-sm text-tinta-2">Costo estimado (central)</dt>
              <dd className="cifra mt-1 text-3xl font-semibold">{usd(datos.costos_total_usd.central)}</dd>
            </div>
            <div className="rounded-lg border border-linea bg-superficie p-4">
              <dt className="text-sm text-tinta-2">Rango de costo</dt>
              <dd className="cifra mt-1 text-xl font-semibold">
                {usd(datos.costos_total_usd.bajo)} a {usd(datos.costos_total_usd.alto)}
              </dd>
            </div>
          </dl>
          <Seccion titulo={`${datos.paradas.length} paradas`}>
            <Tabla
              etiqueta="Paradas de fábrica"
              columnas={[
                { clave: 'fecha_hora_inicio', titulo: 'Inicio', ordenable: true, render: (p) => fechaHora(p.fecha_hora_inicio) },
                {
                  clave: 'fecha_hora_fin',
                  titulo: 'Fin',
                  render: (p) =>
                    p.abierta ? (
                      <BotonLink to={`/fabrica/paradas/${p.id}/cerrar`} variante="fantasma" className="min-h-8 px-2">
                        Sigue parada: cerrar
                      </BotonLink>
                    ) : (
                      fechaHora(p.fecha_hora_fin)
                    ),
                },
                { clave: 'causa', titulo: 'Causa', ordenable: true },
                { clave: 'duracion_h', titulo: 'Duración', alinear: 'derecha', ordenable: true, render: (p) => horasTexto(p.duracion_h) },
                { clave: 'costo', titulo: 'Costo central', alinear: 'derecha', valorOrden: (p) => p.costos_usd.central, ordenable: true, render: (p) => usd(p.costos_usd.central) },
                {
                  clave: 'alerta',
                  titulo: 'Alerta previa',
                  render: (p) =>
                    p.alerta_previa ? (
                      p.alerta_previa.hubo_alerta ? (
                        <Insignia tono="bien">Sí, {num(p.alerta_previa.horas_anticipacion, 0)} h antes</Insignia>
                      ) : (
                        <Insignia tono="atencion">No hubo</Insignia>
                      )
                    ) : (
                      '—'
                    ),
                },
                { clave: 'observacion', titulo: 'Observación', ocultaMovil: true },
              ]}
              filas={datos.paradas}
              vacio={<p className="text-sm text-tinta-2">No hay paradas registradas en ese rango.</p>}
            />
          </Seccion>
        </>
      )}
    </>
  )
}
