// F03 – Detalle de alerta (CU18)
import { useParams } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import TarjetaAlerta from '../../components/TarjetaAlerta'
import { Boton, Cargando, Encabezado, ErrorCarga, Seccion, Tabla } from '../../components/ui'
import { fechaHora, num, textoDrenaje } from '../../utils/formato'
import { useMarcarVista } from '../../hooks/useMarcarVista'

const columnas = [
  { clave: 'nombre', titulo: 'Lote', render: (l) => <span className="font-semibold">{l.nombre}</span> },
  { clave: 'finca', titulo: 'Finca' },
  { clave: 'zona', titulo: 'Zona', render: (l) => l.zona || 'Sin zona' },
  { clave: 'drenaje', titulo: 'Drenaje', render: (l) => textoDrenaje(l.drenaje) },
  { clave: 'area_neta_ha', titulo: 'Ha netas', alinear: 'derecha', render: (l) => num(l.area_neta_ha, 1) },
]

export default function DetalleAlerta() {
  const { id } = useParams()
  const { datos, cargando, error, recargar } = useApi(`/alertas/${id}`)
  const { marcar, enCurso } = useMarcarVista(() => recargar(true))
  if (cargando && !datos) return <Cargando />
  if (error) return <ErrorCarga error={error} alReintentar={recargar} />
  const lluvia = datos.tipo === 'Lluvia'
  return (
    <>
      <Encabezado
        codigo="F03"
        volver={{ a: '/fabrica/alertas', texto: 'Alertas' }}
        titulo={lluvia ? `Alerta de lluvia en ${datos.finca}` : 'Alerta de colchón bajo'}
        acciones={
          !datos.vista && (
            <Boton icono="ojo" onClick={() => marcar(datos)} cargando={enCurso === datos.id}>
              Marcar como vista
            </Boton>
          )
        }
      />
      <div className="flex flex-col gap-6">
        <TarjetaAlerta alerta={datos} />
        {datos.vista && <p className="text-sm text-tinta-2">Vista el {fechaHora(datos.fecha_hora_vista)}.</p>}
        {datos.fecha_hora_actualizacion && <p className="text-sm text-tinta-2">Actualizada el {fechaHora(datos.fecha_hora_actualizacion)} con el último pronóstico.</p>}
        {!lluvia && datos.fecha_hora_cierre && <p className="text-sm text-tinta-2">Se cerró el {fechaHora(datos.fecha_hora_cierre)}, cuando el patio volvió a 30 carros o más.</p>}
        {lluvia && (
          <div className="grid gap-6 xl:grid-cols-3">
            <Seccion titulo="Lotes en cosecha en la finca">
              <Tabla etiqueta="Lotes en cosecha" claveFila="id_unico" columnas={columnas} filas={datos.detalle_lotes_en_cosecha} vacio={<p className="text-sm text-tinta-2">Ninguno.</p>} />
            </Seccion>
            <Seccion titulo="Lotes de reserva disponibles">
              <Tabla etiqueta="Lotes de reserva" claveFila="id_unico" columnas={columnas} filas={datos.detalle_lotes_reserva} vacio={<p className="text-sm text-tinta-2">No había lotes de reserva marcados.</p>} />
            </Seccion>
            <Seccion titulo="Mal drenados maduros para adelantar">
              <Tabla etiqueta="Lotes para adelantar" claveFila="id_unico" columnas={columnas} filas={datos.detalle_lotes_adelantar} vacio={<p className="text-sm text-tinta-2">Ninguno.</p>} />
            </Seccion>
          </div>
        )}
        <p className="text-sm text-tinta-2">Una falsa alarma no tiene consecuencias graves: el aviso sirve para programar mantenimiento en calderas o equipos.</p>
      </div>
    </>
  )
}
