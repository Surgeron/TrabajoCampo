// Gráficos del panel gerencial (CU20) con Recharts.
// Colores categóricos en orden fijo (validados para daltonismo): azul, naranja, aqua, amarillo, magenta.
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fechaCorta, fechaHora, num } from '../utils/formato'

export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4']
const TINTA_TENUE = 'var(--color-tenue)'
const GRILLA = 'var(--color-linea)'
const BASE = 'var(--color-linea-fuerte)'
const SUPERFICIE = 'var(--color-superficie)'
const CRITICO = 'var(--color-critico)'

const ejes = {
  tick: { fill: TINTA_TENUE, fontSize: 12 },
  axisLine: { stroke: BASE },
  tickLine: false,
}

function CajaTooltip({ active, payload, label, formatoEtiqueta, formatoValor }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-linea bg-superficie px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold text-tinta">{formatoEtiqueta ? formatoEtiqueta(label, payload) : label}</p>
      {payload
        .filter((p) => p.value !== null && p.value !== undefined && p.dataKey !== 'marcaAlerta')
        .map((p) => (
          <p key={p.dataKey} className="flex items-center gap-2 text-tinta-2">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: p.color || p.fill }} />
            {p.name}: <span className="font-semibold text-tinta">{formatoValor ? formatoValor(p.value, p) : p.value}</span>
          </p>
        ))}
    </div>
  )
}

function Leyenda(props) {
  const { payload } = props
  return (
    <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-tinta-2">
      {payload.map((p) => (
        <li key={p.value} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
          {p.value}
        </li>
      ))}
    </ul>
  )
}

export function Figura({ titulo, descripcion, children, alto = 260, vacio }) {
  return (
    <figure data-grafico={titulo} className="rounded-lg border border-linea bg-superficie p-4">
      <figcaption className="mb-3">
        <p className="font-display text-base font-semibold">{titulo}</p>
        {descripcion && <p className="text-xs text-tenue">{descripcion}</p>}
      </figcaption>
      {vacio ? (
        <p className="grid place-items-center text-sm text-tenue" style={{ height: alto }}>
          {vacio}
        </p>
      ) : (
        <div style={{ height: alto }}>
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      )}
    </figure>
  )
}

// 1. Horas de parada por falta de caña, por semana y causa (barras apiladas)
export function GraficoParadas({ datos }) {
  const vacio = !datos.some((d) => d.lluvia || d.lejania)
  return (
    <Figura titulo="Horas de parada por falta de caña" descripcion="Por semana y causa" vacio={vacio && 'Sin paradas por falta de caña en el rango.'}>
      <BarChart data={datos} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barCategoryGap="25%">
        <CartesianGrid vertical={false} stroke={GRILLA} />
        <XAxis dataKey="semana" {...ejes} interval="preserveStartEnd" />
        <YAxis {...ejes} axisLine={false} unit=" h" width={56} />
        <Tooltip content={<CajaTooltip formatoEtiqueta={(l) => `Semana del ${l}`} formatoValor={(v) => `${num(v, 1)} h`} />} cursor={{ fill: 'var(--color-cana-claro)', opacity: 0.6 }} />
        <Legend content={<Leyenda />} />
        <Bar dataKey="lluvia" name="Lluvia" stackId="p" fill={SERIES[0]} stroke={SUPERFICIE} strokeWidth={2} maxBarSize={24} />
        <Bar dataKey="lejania" name="Lotes lejanos o corte lento" stackId="p" fill={SERIES[1]} stroke={SUPERFICIE} strokeWidth={2} radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </Figura>
  )
}

// 3. Disponibilidad de fábrica por semana (línea)
export function GraficoDisponibilidad({ datos, total }) {
  return (
    <Figura titulo="Disponibilidad de fábrica" descripcion={`Porcentaje del tiempo moliendo, por semana. En el rango: ${num(total, 1)} %`} vacio={!datos.length && 'Sin datos en el rango.'}>
      <LineChart data={datos} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRILLA} />
        <XAxis dataKey="semana" {...ejes} interval="preserveStartEnd" />
        <YAxis {...ejes} axisLine={false} domain={[0, 100]} unit=" %" width={56} />
        <Tooltip content={<CajaTooltip formatoEtiqueta={(l) => `Semana del ${l}`} formatoValor={(v) => `${num(v, 1)} %`} />} />
        <Line type="linear" dataKey="pct" name="Disponibilidad" stroke={SERIES[0]} strokeWidth={2} dot={{ r: 4, fill: SERIES[0], stroke: SUPERFICIE, strokeWidth: 2 }} activeDot={{ r: 5 }} />
      </LineChart>
    </Figura>
  )
}

// 4. Cobertura de patio en horas de molienda, con la línea del umbral (2,7 h = 30 carros)
export function GraficoCobertura({ cobertura }) {
  const datos = cobertura.puntos.map((p) => ({ ...p, etiqueta: fechaHora(p.fecha_hora) }))
  const desc = cobertura.pct_tiempo_bajo_umbral != null ? `Tiempo con menos de 30 carros: ${num(cobertura.pct_tiempo_bajo_umbral, 1)} %` : 'Horas de molienda aseguradas por los carros en patio'
  return (
    <Figura titulo="Cobertura de patio" descripcion={desc} vacio={!datos.length && 'Báscula no registró carros en el rango.'}>
      <LineChart data={datos} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRILLA} />
        <XAxis dataKey="etiqueta" {...ejes} tickFormatter={(v) => v.slice(0, 5)} interval="preserveStartEnd" minTickGap={24} />
        <YAxis {...ejes} axisLine={false} unit=" h" width={56} />
        <Tooltip content={<CajaTooltip formatoValor={(v, p) => (p.dataKey === 'horas_cobertura' ? `${num(v, 2)} h (${p.payload.cantidad_carros} carros)` : v)} />} />
        <ReferenceLine y={cobertura.umbral_h} stroke={CRITICO} strokeWidth={1.5} label={{ value: `Umbral ${num(cobertura.umbral_h, 1)} h`, position: 'insideTopRight', fill: 'var(--color-critico-texto)', fontSize: 12 }} />
        <Line type="stepAfter" dataKey="horas_cobertura" name="Horas aseguradas" stroke={SERIES[0]} strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
      </LineChart>
    </Figura>
  )
}

// 5. Avance de cosecha por zona (barras horizontales: hectáreas y toneladas netas)
export function GraficoAvance({ datos }) {
  return (
    <Figura titulo="Avance de cosecha por zona" descripcion="Hectáreas netas terminadas y toneladas netas cosechadas por zona; estrategia lejana → media → cercana" alto={260}>
      <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 48, left: 8, bottom: 0 }}>
        <CartesianGrid horizontal={false} stroke={GRILLA} />
        <XAxis type="number" domain={[0, 100]} {...ejes} unit=" %" />
        <YAxis type="category" dataKey="zona" {...ejes} width={64} />
        <Tooltip
          content={
            <CajaTooltip
              formatoValor={(v, p) =>
                p.dataKey === 'pct_t'
                  ? `${num(v, 1)} % (${num(p.payload.t_cosechadas, 0)} de ${num(p.payload.t_total, 0)} t)`
                  : `${num(v, 1)} % (${num(p.payload.ha_terminadas, 0)} de ${num(p.payload.ha_total, 0)} ha)`
              }
            />
          }
          cursor={{ fill: 'var(--color-cana-claro)', opacity: 0.6 }}
        />
        <Legend content={<Leyenda />} />
        <Bar dataKey="pct" name="Hectáreas cosechadas" fill={SERIES[0]} radius={[0, 4, 4, 0]} maxBarSize={18} background={{ fill: 'var(--color-lluvia-claro)', radius: 4 }}>
          <LabelList dataKey="pct" position="right" formatter={(v) => `${num(v, 1)} %`} fill="var(--color-tinta-2)" fontSize={12} />
        </Bar>
        <Bar dataKey="pct_t" name="Toneladas netas cosechadas" fill={SERIES[2]} radius={[0, 4, 4, 0]} maxBarSize={18} background={{ fill: 'var(--color-cana-claro)', radius: 4 }}>
          <LabelList dataKey="pct_t" position="right" formatter={(v) => `${num(v, 1)} %`} fill="var(--color-tinta-2)" fontSize={12} />
        </Bar>
      </BarChart>
    </Figura>
  )
}

// 7. Hectáreas sin piso por día, apiladas por tipo de drenaje
export function GraficoSinPiso({ datos }) {
  const vacio = !datos.some((d) => d.bien || d.medio || d.imperfecto || d.sin_dato)
  return (
    <Figura titulo="Hectáreas sin piso" descripcion="Hectáreas netas inhabilitadas por día, según el drenaje" vacio={vacio && 'Ningún lote quedó sin piso en el rango.'}>
      <AreaChart data={datos} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRILLA} />
        <XAxis dataKey="fecha" {...ejes} tickFormatter={fechaCorta} interval="preserveStartEnd" minTickGap={24} />
        <YAxis {...ejes} axisLine={false} unit=" ha" width={64} />
        <Tooltip content={<CajaTooltip formatoEtiqueta={(l) => fechaCorta(l)} formatoValor={(v) => `${num(v, 0)} ha`} />} />
        <Legend content={<Leyenda />} />
        <Area type="stepAfter" dataKey="imperfecto" name="Imperfectamente drenado" stackId="s" stroke={SERIES[0]} strokeWidth={2} fill={SERIES[0]} fillOpacity={0.12} />
        <Area type="stepAfter" dataKey="medio" name="Medianamente drenado" stackId="s" stroke={SERIES[1]} strokeWidth={2} fill={SERIES[1]} fillOpacity={0.12} />
        <Area type="stepAfter" dataKey="bien" name="Bien drenado" stackId="s" stroke={SERIES[2]} strokeWidth={2} fill={SERIES[2]} fillOpacity={0.12} />
      </AreaChart>
    </Figura>
  )
}

// 8. Lluvia por finca y día, con los días con alerta marcados
export function GraficoLluvia({ lluvia, finca, alCambiarFinca }) {
  const datos = lluvia.dias.map((d) => ({
    fecha: d.fecha,
    mm: d[finca] ?? 0,
    marcaAlerta: d.alertas.includes(finca) ? Math.max(d[finca] ?? 0, 1) : null,
  }))
  const hayDatos = datos.some((d) => d.mm || d.marcaAlerta)
  return (
    <figure data-grafico={`Lluvia en ${finca}`} className="rounded-lg border border-linea bg-superficie p-4">
      <figcaption className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-base font-semibold">Lluvia por finca</p>
          <p className="text-xs text-tenue">Milímetros por día (promedio de sus pluviómetros) y días con alerta</p>
        </div>
        <label className="text-xs text-tinta-2">
          <span className="sr-only">Finca</span>
          <select className="campo-entrada min-h-9 py-1 text-sm" value={finca} onChange={(e) => alCambiarFinca(e.target.value)}>
            {lluvia.fincas.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
      </figcaption>
      {hayDatos ? (
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={datos} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={GRILLA} />
              <XAxis dataKey="fecha" {...ejes} tickFormatter={fechaCorta} interval="preserveStartEnd" minTickGap={24} />
              <YAxis {...ejes} axisLine={false} unit=" mm" width={64} />
              <Tooltip
                content={
                  <CajaTooltip
                    formatoEtiqueta={(l, p) => `${fechaCorta(l)}${p.some((x) => x.payload.marcaAlerta) ? ' · con alerta' : ''}`}
                    formatoValor={(v) => `${num(v, 1)} mm`}
                  />
                }
                cursor={{ fill: 'var(--color-cana-claro)', opacity: 0.6 }}
              />
              <Legend content={<Leyenda />} />
              <Bar dataKey="mm" name="Lluvia registrada" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={24} />
              <Scatter dataKey="marcaAlerta" name="Día con alerta de lluvia" fill={CRITICO} shape="triangle" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="grid h-[260px] place-items-center text-sm text-tenue">Sin lluvia registrada ni alertas en {finca}.</p>
      )}
    </figure>
  )
}
