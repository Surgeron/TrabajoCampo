// T15 – Resultado de la simulación (CU23): comparación con la situación real.
import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Aviso, BotonLink, Encabezado, Insignia, Seccion, Tabla, Vacio } from '../../components/ui'
import { InsigniaRiesgo } from '../../components/estados'
import MapaLotes, { Leyenda } from '../../components/MapaLotes'
import { num } from '../../utils/formato'
import { CLAVE_SIMULACION } from './Simulador'

function Cifra({ etiqueta, real, simulado, unidad = '', decimales = 0 }) {
  const dif = simulado - real
  return (
    <div className="rounded-lg border border-linea bg-superficie p-4">
      <p className="text-sm text-tinta-2">{etiqueta}</p>
      <p className="cifra mt-1 text-3xl font-semibold">
        {num(simulado, decimales)}
        {unidad && <span className="text-base font-normal text-tenue"> {unidad}</span>}
      </p>
      <p className="text-xs text-tenue">
        Real: {num(real, decimales)} {unidad} · {dif === 0 ? 'sin cambio' : `${dif > 0 ? '+' : ''}${num(dif, decimales)}`}
      </p>
    </div>
  )
}

const TONO_CAMBIO = { Sube: 'bien', Baja: 'atencion', Igual: 'neutro', 'Sale del ranking': 'critico', 'Entra al ranking': 'lluvia' }

export default function ResultadoSimulacion() {
  const { state } = useLocation()
  const [soloCambios, setSoloCambios] = useState(true)
  const r = useMemo(() => {
    if (state) return state
    try {
      return JSON.parse(sessionStorage.getItem(CLAVE_SIMULACION) || 'null')
    } catch {
      return null
    }
  }, [state])

  if (!r) {
    return (
      <Vacio titulo="No hay una simulación para mostrar." accion={<BotonLink to="/tecnico/simulador" variante="primario">Simular un escenario</BotonLink>}>
        Elegí los supuestos y simulá.
      </Vacio>
    )
  }
  const s = r.resumen
  const movimientos = soloCambios ? r.movimientos.filter((m) => m.cambio !== 'Igual') : r.movimientos
  const supuestos = [
    ...r.supuestos.lluvias.map((l) => `${num(l.mm, 0)} mm en ${l.finca}`),
    ...(r.supuestos.pedido_organico ? ['pedido orgánico'] : []),
  ].join(' + ')
  const sinPiso = new Set(r.quedarian_sin_piso.map((l) => l.id_unico))
  const mapa = r.mapa.map((l) => ({ ...l, estado_piso: l.sin_piso_simulado ? 'Inhabilitado' : l.estado_piso }))

  return (
    <>
      <Encabezado
        codigo="T15"
        volver={{ a: '/tecnico/simulador', texto: 'Cambiar los supuestos' }}
        titulo="Resultado de la simulación"
        descripcion={`Supuestos: ${supuestos}.`}
        acciones={<BotonLink to="/tecnico/ranking">Volver al ranking real</BotonLink>}
      />
      <Aviso tono="info" className="mb-6">{r.nota}</Aviso>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Cifra etiqueta="Lotes en el ranking" real={s.lotes_ranking_real} simulado={s.lotes_ranking_simulado} />
        <div className="rounded-lg border border-linea bg-superficie p-4">
          <p className="text-sm text-tinta-2">Quedarían sin piso</p>
          <p className="cifra mt-1 text-3xl font-semibold text-critico-texto">{s.lotes_sin_piso}</p>
          <p className="text-xs text-tenue">{num(s.ha_sin_piso, 0)} ha netas</p>
        </div>
        <div className="rounded-lg border border-linea bg-superficie p-4">
          <p className="text-sm text-tinta-2">Pasan a riesgo alto</p>
          <p className="cifra mt-1 text-3xl font-semibold">{s.lotes_a_riesgo_alto}</p>
          <p className="text-xs text-tenue">conviene adelantar su corte</p>
        </div>
        <Cifra etiqueta="Reserva disponible" real={s.ha_reserva_real} simulado={s.ha_reserva_simulada} unidad="ha" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Seccion titulo="Quedarían sin piso">
          <Tabla
            etiqueta="Lotes que quedarían sin piso"
            claveFila="id_unico"
            columnas={[
              { clave: 'nombre', titulo: 'Lote', render: (l) => <Link className="font-semibold hover:underline" to={`/tecnico/lotes/${l.id_unico}`}>{l.nombre}</Link> },
              { clave: 'finca', titulo: 'Finca' },
              { clave: 'drenaje_nombre', titulo: 'Drenaje' },
              { clave: 'lluvia_total_mm', titulo: 'Lluvia total', alinear: 'derecha', render: (l) => `${num(l.lluvia_total_mm, 0)} mm` },
              { clave: 'dias', titulo: 'Días sin piso', alinear: 'derecha' },
            ]}
            filas={r.quedarian_sin_piso}
            vacio={<p className="text-sm text-tinta-2">Ningún lote perdería el piso con estos supuestos.</p>}
          />
        </Seccion>
        <Seccion titulo="Pasan a riesgo alto">
          <Tabla
            etiqueta="Lotes que pasan a riesgo alto"
            claveFila="id_unico"
            columnas={[
              { clave: 'nombre', titulo: 'Lote', render: (l) => <Link className="font-semibold hover:underline" to={`/tecnico/lotes/${l.id_unico}`}>{l.nombre}</Link> },
              { clave: 'finca', titulo: 'Finca' },
              { clave: 'brix', titulo: 'Brix', alinear: 'derecha', render: (l) => num(l.brix, 1) },
              { clave: 'riesgo_justificacion', titulo: 'Motivo' },
            ]}
            filas={r.pasan_a_riesgo_alto}
            vacio={<p className="text-sm text-tinta-2">Ningún lote cambia a riesgo alto.</p>}
          />
        </Seccion>
      </div>

      <Seccion
        titulo="Cambios en el ranking"
        className="mt-6"
        acciones={
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-cana" checked={soloCambios} onChange={(e) => setSoloCambios(e.target.checked)} />
            Solo los que cambian
          </label>
        }
      >
        <Tabla
          etiqueta="Comparación del ranking real y simulado"
          claveFila="id_unico"
          columnas={[
            { clave: 'posicion_simulada', titulo: 'Simulado', alinear: 'derecha', render: (m) => <span className="cifra text-lg font-semibold">{m.posicion_simulada ?? '—'}</span> },
            { clave: 'posicion_real', titulo: 'Real', alinear: 'derecha', render: (m) => m.posicion_real ?? '—' },
            { clave: 'cambio', titulo: 'Cambio', render: (m) => <Insignia tono={TONO_CAMBIO[m.cambio]}>{m.cambio}{m.delta ? ` ${Math.abs(m.delta)}` : ''}</Insignia> },
            { clave: 'nombre', titulo: 'Lote', render: (m) => <span className="font-semibold">{m.nombre}</span> },
            { clave: 'finca', titulo: 'Finca' },
            { clave: 'zona', titulo: 'Zona' },
            { clave: 'riesgo_simulado', titulo: 'Riesgo simulado', render: (m) => (m.riesgo_simulado ? <InsigniaRiesgo nivel={m.riesgo_simulado} /> : m.motivo || '—') },
          ]}
          filas={movimientos}
          vacio={<p className="text-sm text-tinta-2">El orden no cambia.</p>}
        />
      </Seccion>

      <Seccion titulo="Mapa simulado" descripcion="Estado de piso con los supuestos aplicados" className="mt-6">
        <MapaLotes lotes={mapa} modo="piso" alto="h-[55vh]" resaltar={sinPiso} />
        <div className="mt-3">
          <Leyenda modo="piso" />
        </div>
      </Seccion>
    </>
  )
}
