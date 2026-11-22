// T19 – Parámetros (CU03, solo lectura en el prototipo)
import { useApi } from '../../hooks/useApi'
import { Aviso, Cargando, Encabezado, ErrorCarga, Insignia, Seccion, Tabla } from '../../components/ui'
import { fecha, num } from '../../utils/formato'

function valor(p) {
  if (Array.isArray(p.valor)) return `${p.valor[0]} a ${p.valor[1]} ${p.unidad}`
  const n = Number(p.valor)
  return `${num(n, Number.isInteger(n) ? 0 : 1)} ${p.unidad}`
}

export default function Parametros() {
  const { datos, cargando, error, recargar } = useApi('/parametros')
  return (
    <>
      <Encabezado
        codigo="T19"
        titulo="Parámetros"
        descripcion="Valores que usa el sistema para el riesgo, el ranking, las alertas y los costos. En el prototipo se consultan; no se modifican."
      />
      {cargando && !datos && <Cargando />}
      {error && <ErrorCarga error={error} alReintentar={recargar} />}
      {datos && (
        <>
          <dl className="mb-6 flex flex-wrap gap-x-10 gap-y-2 text-sm">
            <div>
              <dt className="text-tenue">Campaña activa</dt>
              <dd className="font-semibold">{datos.campania.nombre}</dd>
            </div>
            <div>
              <dt className="text-tenue">Inicio</dt>
              <dd className="font-semibold">{fecha(datos.campania.fecha_inicio)}</dd>
            </div>
            <div>
              <dt className="text-tenue">Plan</dt>
              <dd className="font-semibold">{num(datos.campania.toneladas_plan, 0)} t</dd>
            </div>
          </dl>
          <Aviso tono="alerta" className="mb-6">
            Los marcados “A confirmar” son valores de prueba o propuestas pendientes de validar con el ingenio.
          </Aviso>
          <Seccion sinMargen>
            <div className="p-4 md:p-0">
              <Tabla
                etiqueta="Parámetros"
                claveFila="clave"
                columnas={[
                  { clave: 'descripcion', titulo: 'Parámetro', render: (p) => <span className="font-semibold">{p.descripcion}</span> },
                  { clave: 'valor', titulo: 'Valor', render: valor },
                  { clave: 'estado', titulo: 'Estado', render: (p) => <Insignia tono={p.estado === 'Confirmado' ? 'bien' : 'atencion'}>{p.estado}</Insignia> },
                  { clave: 'usado_en', titulo: 'Se usa en' },
                  { clave: 'clave', titulo: 'Clave', ocultaMovil: true, render: (p) => <code className="text-xs text-tinta-2">{p.clave}</code> },
                ]}
                filas={datos.parametros}
              />
            </div>
          </Seccion>
        </>
      )}
    </>
  )
}
