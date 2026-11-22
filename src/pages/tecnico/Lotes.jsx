// T06 – Fincas y lotes (CU04): listado con filtros por finca, tipo de cultivo, zona, drenaje y estado.
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { Campo, Cargando, Encabezado, ErrorCarga, Insignia, Seccion, Tabla, Vacio } from '../../components/ui'
import { InsigniaPiso, InsigniaRiesgo, InsigniaZona } from '../../components/estados'
import { num } from '../../utils/formato'

const VACIO = { id_finca: '', tipo_cultivo: '', zona: '', drenaje: '', estado_lote: '', texto: '' }

export default function Lotes() {
  const navegar = useNavigate()
  const [filtros, setFiltros] = useState(VACIO)
  const fincas = useApi('/fincas')
  const { datos, cargando, error, recargar } = useApi('/lotes')

  const filas = useMemo(() => {
    const t = filtros.texto.trim().toLowerCase()
    return (datos || []).filter(
      (l) =>
        (!filtros.id_finca || l.id_finca === filtros.id_finca) &&
        (!filtros.tipo_cultivo || l.tipo_cultivo === filtros.tipo_cultivo) &&
        (!filtros.zona || (filtros.zona === 'Sin zona' ? !l.zona : l.zona === filtros.zona)) &&
        (!filtros.drenaje || (filtros.drenaje === 'sin_dato' ? !l.drenaje : l.drenaje === filtros.drenaje)) &&
        (!filtros.estado_lote || l.estado_lote === filtros.estado_lote) &&
        (!t || `${l.nombre} ${l.nro_lote} ${l.id_unico}`.toLowerCase().includes(t)),
    )
  }, [datos, filtros])

  const cambiar = (k) => (e) => setFiltros((f) => ({ ...f, [k]: e.target.value }))
  const totalNeta = filas.reduce((s, l) => s + (l.estado_lote === 'En producción' ? l.area_neta_ha || 0 : 0), 0)

  return (
    <>
      <Encabezado
        codigo="T06"
        titulo="Fincas y lotes"
        descripcion="Datos de la planilla ZAFRA 2025 y de la campaña activa. La zona y su madurez salen de los km al ingenio."
      />
      {fincas.datos && (
        <ul className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {fincas.datos.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onClick={() => setFiltros((x) => ({ ...x, id_finca: x.id_finca === f.id ? '' : f.id }))}
                aria-pressed={filtros.id_finca === f.id}
                className={`h-full w-full rounded-lg border p-3 text-left transition-colors ${
                  filtros.id_finca === f.id ? 'border-cana bg-cana-claro' : 'border-linea bg-superficie hover:border-cana/50'
                }`}
              >
                <p className="font-display font-semibold">{f.nombre}</p>
                <p className="text-xs text-tenue">Finca {f.id}</p>
                <p className="mt-2 text-sm">
                  <span className="cifra text-xl font-semibold">{f.lotes_en_produccion}</span>
                  <span className="text-tinta-2"> de {f.cantidad_lotes} lotes en producción</span>
                </p>
                <p className="text-xs text-tinta-2">{num(f.area_neta_ha, 0)} ha netas · {f.pluviometros} pluviómetros</p>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Seccion
        titulo={`${filas.length} lotes`}
        descripcion={`${num(totalNeta, 0)} ha netas en producción con estos filtros`}
        acciones={
          <button type="button" className="text-sm font-semibold text-cana hover:underline" onClick={() => setFiltros(VACIO)}>
            Limpiar filtros
          </button>
        }
      >
        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Campo etiqueta="Buscar" className="lg:col-span-2">
            {(a) => (
              <input {...a} type="search" className="campo-entrada" value={filtros.texto} onChange={cambiar('texto')} maxLength={60} placeholder="Nombre, número o ID" />
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
          <Campo etiqueta="Zona">
            {(a) => (
              <select {...a} className="campo-entrada" value={filtros.zona} onChange={cambiar('zona')}>
                <option value="">Todas</option>
                <option>Lejana</option>
                <option>Media</option>
                <option>Cercana</option>
                <option>Sin zona</option>
              </select>
            )}
          </Campo>
          <Campo etiqueta="Drenaje">
            {(a) => (
              <select {...a} className="campo-entrada" value={filtros.drenaje} onChange={cambiar('drenaje')}>
                <option value="">Todos</option>
                <option value="bien">Bien drenado</option>
                <option value="medio">Medianamente drenado</option>
                <option value="imperfecto">Imperfectamente drenado</option>
                <option value="sin_dato">Sin dato</option>
              </select>
            )}
          </Campo>
          <Campo etiqueta="Estado">
            {(a) => (
              <select {...a} className="campo-entrada" value={filtros.estado_lote} onChange={cambiar('estado_lote')}>
                <option value="">Todos</option>
                <option>En producción</option>
                <option>En preparación</option>
              </select>
            )}
          </Campo>
        </div>
        {cargando && !datos && <Cargando texto="Cargando lotes…" />}
        {error && <ErrorCarga error={error} alReintentar={recargar} />}
        {datos && (
          <Tabla
            etiqueta="Lotes"
            claveFila="id_unico"
            alTocarFila={(l) => navegar(`/tecnico/lotes/${l.id_unico}`)}
            vacio={<Vacio titulo="Ningún lote coincide con los filtros.">Probá con menos filtros.</Vacio>}
            columnas={[
              { clave: 'nombre', titulo: 'Lote', ordenable: true, render: (l) => <span className="font-semibold">{l.nombre}</span> },
              { clave: 'nro_lote', titulo: 'Nro.', ordenable: true },
              { clave: 'finca', titulo: 'Finca', ordenable: true },
              { clave: 'zona', titulo: 'Zona', ordenable: true, render: (l) => <InsigniaZona zona={l.zona} /> },
              { clave: 'area_neta_ha', titulo: 'Ha netas', alinear: 'derecha', ordenable: true, render: (l) => num(l.area_neta_ha, 1) },
              { clave: 'drenaje_nombre', titulo: 'Drenaje', ordenable: true, render: (l) => l.drenaje_nombre || <Insignia tono="atencion">Sin dato</Insignia> },
              { clave: 'variedad', titulo: 'Variedad', ordenable: true, ocultaMovil: true, render: (l) => l.variedad || <span className="text-tenue">{l.estado_lote}</span> },
              { clave: 'brix', titulo: 'Brix', alinear: 'derecha', ordenable: true, render: (l) => num(l.brix, 1) },
              { clave: 'estado_piso', titulo: 'Piso', render: (l) => <InsigniaPiso estado={l.estado_piso} /> },
              { clave: 'riesgo', titulo: 'Riesgo', render: (l) => <InsigniaRiesgo nivel={l.riesgo} justificacion={l.riesgo_justificacion} /> },
            ]}
            filas={filas}
          />
        )}
      </Seccion>
    </>
  )
}
