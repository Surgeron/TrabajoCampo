// B03 – Historial del patio (CU17)
import { useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { Campo, Cargando, Encabezado, ErrorCarga, Insignia, Seccion, Tabla } from '../../components/ui'
import { fechaHora, hoyISO, horasTexto, num, sumarDias } from '../../utils/formato'

export default function HistorialPatio() {
  const [rango, setRango] = useState({ desde: sumarDias(hoyISO(), -6), hasta: hoyISO() })
  const error = rango.desde && rango.hasta && rango.desde > rango.hasta ? 'La fecha desde no puede ser posterior a la fecha hasta.' : null
  const { datos, cargando, error: errorCarga, recargar } = useApi(error ? null : '/patio', rango)
  const param = useApi('/parametros')
  const minimo = param.datos?.parametros?.find((x) => x.clave === 'carros_minimos_patio')?.valor ?? 30
  return (
    <>
      <Encabezado codigo="B03" titulo="Historial del patio" descripcion="Registros de carros en patio con las toneladas y horas de molienda que cubrían." />
      <div className="mb-4 grid max-w-xl grid-cols-2 gap-3">
        <Campo etiqueta="Desde" error={error}>
          {(a) => <input {...a} type="date" max={hoyISO()} className="campo-entrada" value={rango.desde} onChange={(e) => setRango((r) => ({ ...r, desde: e.target.value }))} />}
        </Campo>
        <Campo etiqueta="Hasta">
          {(a) => <input {...a} type="date" max={hoyISO()} className="campo-entrada" value={rango.hasta} onChange={(e) => setRango((r) => ({ ...r, hasta: e.target.value }))} />}
        </Campo>
      </div>
      {cargando && !datos && <Cargando />}
      {errorCarga && <ErrorCarga error={errorCarga} alReintentar={recargar} />}
      {datos && (
        <Seccion titulo={`${datos.length} registros`}>
          <Tabla
            etiqueta="Historial del patio"
            columnas={[
              { clave: 'fecha_hora', titulo: 'Fecha y hora', ordenable: true, render: (r) => fechaHora(r.fecha_hora) },
              { clave: 'cantidad_carros', titulo: 'Carros', alinear: 'derecha', ordenable: true, render: (r) => <span className="cifra text-lg font-semibold">{r.cantidad_carros}</span> },
              { clave: 'condicion', titulo: 'Condición' },
              { clave: 't_netas', titulo: 't netas', alinear: 'derecha', render: (r) => num(r.t_netas, 0) },
              { clave: 'horas_cobertura', titulo: 'Molienda', alinear: 'derecha', render: (r) => horasTexto(r.horas_cobertura) },
              { clave: 'estado', titulo: '', render: (r) => (r.cantidad_carros < minimo ? <Insignia tono="critico" icono={<span aria-hidden="true">▲</span>}>Colchón bajo</Insignia> : null) },
              { clave: 'usuario_nombre', titulo: 'Cargó', ocultaMovil: true },
            ]}
            filas={datos}
            vacio={<p className="text-sm text-tinta-2">No hay registros en ese rango.</p>}
          />
        </Seccion>
      )}
    </>
  )
}
