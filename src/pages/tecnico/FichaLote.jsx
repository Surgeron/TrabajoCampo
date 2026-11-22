// T03 – Ficha de lote (CU04): datos de la planilla, campaña, riesgo e historial.
import { Link, useParams } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { BotonLink, Cargando, Dato, Encabezado, ErrorCarga, Insignia, Seccion, Tabla } from '../../components/ui'
import { InsigniaPiso, InsigniaRiesgo, InsigniaZona } from '../../components/estados'
import { fecha, fechaHora, num, textoDrenaje } from '../../utils/formato'

export default function FichaLote() {
  const { id } = useParams()
  const { datos, cargando, error, recargar } = useApi(`/lotes/${id}`)
  if (cargando && !datos) return <Cargando texto="Cargando la ficha…" />
  if (error) return <ErrorCarga error={error} alReintentar={recargar} />
  const { lote: l, brix, estados_piso: estados, periodos_sin_piso: periodos, cosechas, lecturas_recientes: lecturas } = datos
  const r = l.riesgo
  return (
    <>
      <Encabezado
        codigo="T03"
        volver={{ a: '/tecnico/lotes', texto: 'Fincas y lotes' }}
        titulo={l.nombre}
        descripcion={`${l.finca} · lote ${l.nro_lote} · ID ${l.id_unico}`}
        acciones={
          <>
            <BotonLink to={`/tecnico/lotes/${l.id_unico}/editar`} icono="editar" variante="primario">
              Editar
            </BotonLink>
            <BotonLink to={`/tecnico/estado-piso?lote=${l.id_unico}`} icono="piso">
              Estado de piso
            </BotonLink>
            <BotonLink to={`/tecnico/brix?lote=${l.id_unico}`} icono="brix">
              Brix
            </BotonLink>
            <BotonLink to={`/tecnico/cosecha?lote=${l.id_unico}`} icono="cosecha">
              Cosecha
            </BotonLink>
          </>
        }
      />
      <div className="mb-6 flex flex-wrap gap-2">
        <Insignia tono={l.estado_lote === 'En producción' ? 'cana' : 'neutro'}>{l.estado_lote}</Insignia>
        <InsigniaZona zona={l.zona} madurez={l.madurez} />
        <InsigniaPiso estado={l.estado_piso} />
        <InsigniaRiesgo nivel={r?.nivel} justificacion={r?.justificacion} />
        {l.en_reserva && <Insignia>Lote de reserva</Insignia>}
        {l.terminado && <Insignia tono="bien">Cosecha terminada</Insignia>}
        {l.en_cosecha && <Insignia tono="cana">En cosecha</Insignia>}
        {l.datos_incompletos && <Insignia tono="atencion">Datos incompletos: falta el drenaje</Insignia>}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Seccion titulo="Datos del lote" descripcion="Planilla ZAFRA 2025">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Dato etiqueta="Área bruta">{num(l.area_bruta_ha, 2)} ha</Dato>
            <Dato etiqueta="Área neta">{l.area_neta_ha != null ? `${num(l.area_neta_ha, 2)} ha` : '—'}</Dato>
            <Dato etiqueta="Distancia al ingenio">{l.dist_ingenio_km != null ? `${num(l.dist_ingenio_km, 0)} km` : 'Sin dato'}</Dato>
            <Dato etiqueta="Tipo de cultivo">{l.tipo_cultivo}{l.certificacion ? ` (${l.certificacion})` : ''}</Dato>
            <Dato etiqueta="ID OIA">{l.id_oia}</Dato>
            <Dato etiqueta="Surcos">{l.surcos != null ? num(l.surcos, 0) : '—'}</Dato>
            <Dato etiqueta="Drenaje">
              {textoDrenaje(l.drenaje)}
              {l.drenaje_dato_prueba && <span className="block text-xs font-normal text-tenue">valor de prueba</span>}
            </Dato>
            <Dato etiqueta="Pluviómetro">{l.pluviometro}</Dato>
            <Dato etiqueta="Ubicación">{l.ubicacion_aproximada ? 'Aproximada' : l.latitud ? 'Cargada' : 'Pendiente'}</Dato>
          </dl>
        </Seccion>
        <Seccion titulo="Campaña" descripcion={datos.campania.nombre}>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Dato etiqueta="Variedad">{l.variedad}</Dato>
            <Dato etiqueta="Año de plantación">{l.anio_plantacion}</Dato>
            <Dato etiqueta="Cantidad de cortes">{l.cantidad_cortes}</Dato>
            <Dato etiqueta="Último Brix">{l.brix != null ? `${num(l.brix, 2)} °Bx (${fecha(l.fecha_brix)})` : 'Sin medición'}</Dato>
            <Dato etiqueta="Toneladas cosechadas">{l.toneladas_cosechadas ? `${num(l.toneladas_cosechadas, 1)} t` : '—'}</Dato>
            <Dato etiqueta="Observaciones" className="col-span-2 sm:col-span-3">{l.observaciones}</Dato>
          </dl>
        </Seccion>
      </div>

      {r && (
        <Seccion titulo="Riesgo de quedar sin piso" className="mt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-8">
            <InsigniaRiesgo nivel={r.nivel} />
            <p className="flex-1 text-sm">{r.justificacion}</p>
            <dl className="grid grid-cols-2 gap-4 text-sm sm:min-w-72">
              <Dato etiqueta="Lluvia acumulada">{num(r.lluvia_acumulada_mm, 0)} mm</Dato>
              <Dato etiqueta="Días sin piso si llueve">
                {r.dias_sin_piso_estimados != null ? num(r.dias_sin_piso_estimados, 1) : '—'}
                <span className="block text-xs font-normal text-tenue">{r.origen_estimacion}</span>
              </Dato>
            </dl>
          </div>
        </Seccion>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Seccion titulo="Mediciones de Brix">
          <Tabla
            etiqueta="Mediciones de Brix"
            columnas={[
              { clave: 'fecha', titulo: 'Fecha', render: (b) => fecha(b.fecha) },
              { clave: 'valor_brix', titulo: '°Bx', alinear: 'derecha', render: (b) => num(b.valor_brix, 2) },
              { clave: 'origen', titulo: 'Origen' },
              { clave: 'usuario_nombre', titulo: 'Cargó' },
            ]}
            filas={brix}
            vacio={<p className="text-sm text-tinta-2">Sin mediciones en esta campaña.</p>}
          />
        </Seccion>
        <Seccion titulo="Períodos sin piso">
          <Tabla
            etiqueta="Períodos sin piso"
            claveFila="desde"
            columnas={[
              { clave: 'desde', titulo: 'Desde', render: (p) => fechaHora(p.desde) },
              { clave: 'hasta', titulo: 'Hasta', render: (p) => (p.abierto ? 'Sigue sin piso' : fechaHora(p.hasta)) },
              { clave: 'dias', titulo: 'Días', alinear: 'derecha', render: (p) => num(p.dias, 1) },
            ]}
            filas={periodos}
            vacio={<p className="text-sm text-tinta-2">Sin períodos registrados. Se usa el valor experto de su tipo de drenaje.</p>}
          />
        </Seccion>
        <Seccion titulo="Historial de estado de piso">
          <Tabla
            etiqueta="Historial de estado de piso"
            columnas={[
              { clave: 'fecha_hora_desde', titulo: 'Desde', render: (e) => fechaHora(e.fecha_hora_desde) },
              { clave: 'estado', titulo: 'Estado', render: (e) => <InsigniaPiso estado={e.estado} /> },
              { clave: 'observacion', titulo: 'Observación' },
              { clave: 'usuario_nombre', titulo: 'Informó' },
            ]}
            filas={estados}
            vacio={<p className="text-sm text-tinta-2">Sin registros: el lote se toma como habilitado.</p>}
          />
        </Seccion>
        <Seccion titulo="Cosecha">
          <Tabla
            etiqueta="Registros de cosecha"
            columnas={[
              { clave: 'fecha', titulo: 'Fecha', render: (c) => fecha(c.fecha) },
              { clave: 'toneladas', titulo: 'Toneladas', alinear: 'derecha', render: (c) => (c.toneladas ? num(c.toneladas, 1) : '—') },
              { clave: 'lote_terminado', titulo: 'Terminado', render: (c) => (c.lote_terminado ? 'Sí' : 'No') },
            ]}
            filas={cosechas}
            vacio={<p className="text-sm text-tinta-2">Sin cosecha registrada.</p>}
          />
        </Seccion>
      </div>
      {lecturas.length > 0 && (
        <Seccion titulo={`Últimas lecturas de ${l.pluviometro}`} className="mt-6">
          <ul className="flex flex-wrap gap-2 text-sm">
            {lecturas.map((x) => (
              <li key={x.id} className="rounded border border-linea px-2 py-1">
                {fecha(x.fecha)}: <strong>{num(x.mm, 1)} mm</strong>
              </li>
            ))}
          </ul>
        </Seccion>
      )}
      <p className="mt-6 text-sm">
        <Link to="/tecnico/ranking" className="font-semibold text-cana hover:underline">
          Volver al ranking
        </Link>
      </p>
    </>
  )
}
