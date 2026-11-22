// Piezas de interfaz reutilizables.
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icono from './Icono'

const VARIANTES = {
  primario: 'bg-cana text-white hover:bg-cana-oscuro border-cana',
  secundario: 'bg-superficie text-tinta border-linea-fuerte hover:bg-cana-claro',
  peligro: 'bg-critico text-white border-critico hover:bg-critico-texto',
  lluvia: 'bg-lluvia text-white border-lluvia hover:bg-lluvia-oscuro',
  fantasma: 'bg-transparent text-tinta-2 border-transparent hover:bg-cana-claro hover:text-tinta',
}

const base =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55'

// Une clases: si `extra` trae alto mínimo, relleno horizontal, ancho o tamaño de letra, reemplaza al de la base
const GRUPOS = [/^min-h-/, /^px-/, /^w-/, /^text-(xs|sm|base|lg|\d?xl)$/]
function unir(...partes) {
  const [b, v, extra = ''] = partes
  const propias = extra.split(/\s+/).filter((c) => c && !c.includes(':'))
  const pisadas = GRUPOS.filter((g) => propias.some((c) => g.test(c)))
  return [...`${b} ${v}`.split(/\s+/).filter((c) => !pisadas.some((g) => g.test(c))), extra].join(' ')
}

export function Boton({ variante = 'primario', cargando = false, icono, children, className = '', ...props }) {
  return (
    <button
      type="button"
      {...props}
      disabled={props.disabled || cargando}
      aria-busy={cargando || undefined}
      className={unir(base, VARIANTES[variante], className)}
    >
      {cargando ? <Girador /> : icono && <Icono nombre={icono} className="h-4.5 w-4.5" />}
      {children}
    </button>
  )
}

export function BotonLink({ variante = 'secundario', icono, children, className = '', ...props }) {
  return (
    <Link {...props} className={unir(base, VARIANTES[variante], className)}>
      {icono && <Icono nombre={icono} className="h-4.5 w-4.5" />}
      {children}
    </Link>
  )
}

export function Girador({ className = 'h-4 w-4' }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" fill="none" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  )
}

// Campo de formulario con etiqueta, ayuda y error accesibles
export function Campo({ etiqueta, error, ayuda, requerido, children, className = '' }) {
  const id = useId()
  const idAyuda = `${id}-ayuda`
  const idError = `${id}-error`
  const hijo =
    typeof children === 'function'
      ? children({
          id,
          'aria-invalid': error ? 'true' : undefined,
          'aria-describedby': [ayuda && idAyuda, error && idError].filter(Boolean).join(' ') || undefined,
          'aria-required': requerido || undefined,
        })
      : children
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold text-tinta">
        {etiqueta}
        {requerido && <span className="text-critico-texto"> *</span>}
      </label>
      {hijo}
      {ayuda && !error && (
        <p id={idAyuda} className="text-xs text-tenue">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} className="text-xs font-semibold text-critico-texto">
          {error}
        </p>
      )}
    </div>
  )
}

export function Encabezado({ titulo, descripcion, acciones, volver, codigo }) {
  return (
    <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {volver && (
          <Link to={volver.a} className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-cana hover:underline">
            <Icono nombre="atras" className="h-4 w-4" />
            {volver.texto}
          </Link>
        )}
        <h1 className="text-2xl font-semibold text-tinta md:text-3xl" title={codigo ? `Pantalla ${codigo}` : undefined}>
          {titulo}
        </h1>
        {descripcion && <p className="mt-1 max-w-3xl text-sm text-tinta-2">{descripcion}</p>}
      </div>
      {acciones && <div className="no-imprimir flex flex-wrap gap-2">{acciones}</div>}
    </header>
  )
}

export function Seccion({ titulo, acciones, children, className = '', sinMargen = false, descripcion }) {
  return (
    <section className={`rounded-lg border border-linea bg-superficie ${className}`}>
      {(titulo || acciones) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-linea px-4 py-3 md:px-5">
          <div>
            {titulo && <h2 className="text-lg font-semibold">{titulo}</h2>}
            {descripcion && <p className="text-xs text-tenue">{descripcion}</p>}
          </div>
          {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
        </div>
      )}
      <div className={sinMargen ? '' : 'p-4 md:p-5'}>{children}</div>
    </section>
  )
}

const TONOS = {
  neutro: 'bg-papel text-tinta-2 border-linea',
  cana: 'bg-cana-claro text-cana-oscuro border-cana/30',
  lluvia: 'bg-lluvia-claro text-lluvia-oscuro border-lluvia/30',
  bien: 'bg-bien-claro text-bien-texto border-bien/30',
  atencion: 'bg-atencion-claro text-atencion-texto border-atencion/50',
  critico: 'bg-critico-claro text-critico-texto border-critico/30',
}

export function Insignia({ tono = 'neutro', children, icono, className = '', title }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded border px-1.5 py-0.5 text-xs font-semibold ${TONOS[tono]} ${className}`}
    >
      {icono}
      {children}
    </span>
  )
}

export function Cargando({ texto = 'Cargando…' }) {
  return (
    <div className="flex items-center gap-3 py-10 text-tinta-2" role="status">
      <Girador className="h-5 w-5 text-cana" />
      <span>{texto}</span>
    </div>
  )
}

export function ErrorCarga({ error, alReintentar }) {
  return (
    <div role="alert" className="rounded-lg border border-critico/30 bg-critico-claro p-4 text-sm text-critico-texto">
      <p className="font-semibold">{error?.message || 'No se pudieron cargar los datos.'}</p>
      {alReintentar && (
        <button type="button" onClick={() => alReintentar()} className="mt-2 font-semibold underline">
          Reintentar
        </button>
      )}
    </div>
  )
}

export function Vacio({ titulo, children, accion }) {
  return (
    <div className="rounded-lg border border-dashed border-linea-fuerte px-4 py-8 text-center">
      <p className="font-semibold text-tinta">{titulo}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-sm text-tinta-2">{children}</p>}
      {accion && <div className="mt-4">{accion}</div>}
    </div>
  )
}

export function Aviso({ tono = 'info', titulo, children, className = '' }) {
  const estilos = {
    info: 'border-lluvia/30 bg-lluvia-claro text-lluvia-oscuro',
    alerta: 'border-atencion/50 bg-atencion-claro text-atencion-texto',
    critico: 'border-critico/30 bg-critico-claro text-critico-texto',
    ok: 'border-bien/30 bg-bien-claro text-bien-texto',
  }
  return (
    <div className={`rounded-md border px-4 py-3 text-sm ${estilos[tono]} ${className}`} role={tono === 'critico' ? 'alert' : undefined}>
      {titulo && <p className="font-semibold">{titulo}</p>}
      {children && <div className={titulo ? 'mt-0.5' : ''}>{children}</div>}
    </div>
  )
}

export function Dato({ etiqueta, children, className = '' }) {
  return (
    <div className={className}>
      <dt className="text-xs text-tenue">{etiqueta}</dt>
      <dd className="mt-0.5 font-semibold text-tinta">{children ?? '—'}</dd>
    </div>
  )
}

export function Dialogo({ abierto, titulo, children, alCerrar, acciones }) {
  const ref = useRef(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (abierto && !d.open) d.showModal()
    if (!abierto && d.open) d.close()
  }, [abierto])
  return (
    <dialog
      ref={ref}
      onClose={alCerrar}
      className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-lg border border-linea bg-superficie p-0 text-tinta shadow-xl backdrop:bg-monte/50"
    >
      <div className="border-b border-linea px-5 py-4">
        <h2 className="text-lg font-semibold">{titulo}</h2>
      </div>
      <div className="px-5 py-4 text-sm">{children}</div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-linea px-5 py-3">{acciones}</div>
    </dialog>
  )
}

function paginasVisibles(actual, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const salida = [1]
  const desde = Math.max(2, actual - 1)
  const hasta = Math.min(total - 1, actual + 1)
  if (desde > 2) salida.push('…-izq')
  for (let p = desde; p <= hasta; p += 1) salida.push(p)
  if (hasta < total - 1) salida.push('…-der')
  salida.push(total)
  return salida
}

// Tabla que en el celular se muestra como lista de fichas. Columnas: {clave, titulo, render, alinear, ordenable, oculta}
export function Tabla({ columnas, filas, claveFila = 'id', vacio, alTocarFila, resumenMovil, ordenInicial, etiqueta, porPagina = 10 }) {
  const [orden, setOrden] = useState(ordenInicial || null)
  const [pagina, setPagina] = useState(1)
  const ordenadas = useMemo(() => {
    if (!orden) return filas
    const col = columnas.find((c) => c.clave === orden.clave)
    const valor = col?.valorOrden || ((f) => f[orden.clave])
    return [...filas].sort((a, b) => {
      const va = valor(a)
      const vb = valor(b)
      if (va === vb) return 0
      if (va === null || va === undefined) return 1
      if (vb === null || vb === undefined) return -1
      const r = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es')
      return orden.asc ? r : -r
    })
  }, [filas, orden, columnas])

  useEffect(() => {
    setPagina(1)
  }, [filas.length, orden])

  if (!filas.length) return vacio || <Vacio titulo="No hay datos para mostrar." />

  const tamPagina = Math.max(1, porPagina)
  const totalPaginas = Math.max(1, Math.ceil(ordenadas.length / tamPagina))
  const paginaActual = Math.min(pagina, totalPaginas)
  const inicio = (paginaActual - 1) * tamPagina
  const visibles = ordenadas.slice(inicio, inicio + tamPagina)

  const alinear = (c) => (c.alinear === 'derecha' ? 'text-right' : 'text-left')
  const clasePag =
    'inline-flex min-h-9 min-w-9 items-center justify-center rounded-md border px-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45'
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm" aria-label={etiqueta}>
          <thead>
            <tr className="border-b border-linea-fuerte text-xs text-tenue">
              {columnas.map((c) => (
                <th key={c.clave} scope="col" className={`px-3 py-2 font-semibold ${alinear(c)}`}>
                  {c.ordenable ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 hover:text-tinta"
                      onClick={() => setOrden((o) => ({ clave: c.clave, asc: o?.clave === c.clave ? !o.asc : true }))}
                      aria-sort={orden?.clave === c.clave ? (orden.asc ? 'ascending' : 'descending') : 'none'}
                    >
                      {c.titulo}
                      <span aria-hidden="true">{orden?.clave === c.clave ? (orden.asc ? '▲' : '▼') : '↕'}</span>
                    </button>
                  ) : (
                    c.titulo
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((f) => (
              <tr
                key={f[claveFila]}
                className={`border-b border-linea last:border-0 ${alTocarFila ? 'cursor-pointer hover:bg-cana-claro/60' : ''}`}
                onClick={alTocarFila ? () => alTocarFila(f) : undefined}
              >
                {columnas.map((c) => (
                  <td key={c.clave} className={`px-3 py-2.5 align-top ${alinear(c)} ${c.alinear === 'derecha' ? 'whitespace-nowrap' : ''}`}>
                    {c.render ? c.render(f) : (f[c.clave] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-col divide-y divide-linea md:hidden" aria-label={etiqueta}>
        {visibles.map((f) => (
          <li key={f[claveFila]}>
            {resumenMovil ? (
              resumenMovil(f)
            ) : (
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 py-3">
                {columnas
                  .filter((c) => !c.ocultaMovil)
                  .map((c) => (
                    <div key={c.clave}>
                      <dt className="text-xs text-tenue">{c.titulo}</dt>
                      <dd className="text-sm">{c.render ? c.render(f) : (f[c.clave] ?? '—')}</dd>
                    </div>
                  ))}
              </dl>
            )}
          </li>
        ))}
      </ul>
      {totalPaginas > 1 && (
        <nav aria-label="Paginación" className="no-imprimir mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-linea pt-3 text-xs text-tinta-2">
          <span>
            Mostrando {inicio + 1}–{Math.min(inicio + tamPagina, ordenadas.length)} de {ordenadas.length}
          </span>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={paginaActual === 1}
              className={`${clasePag} border-linea-fuerte bg-superficie text-tinta hover:bg-cana-claro`}
            >
              Anterior
            </button>
            {paginasVisibles(paginaActual, totalPaginas).map((item) =>
              typeof item === 'string' ? (
                <span key={item} className="px-1.5 text-tenue" aria-hidden="true">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPagina(item)}
                  aria-current={item === paginaActual ? 'page' : undefined}
                  aria-label={`Página ${item}`}
                  className={`${clasePag} ${
                    item === paginaActual
                      ? 'border-cana bg-cana text-white'
                      : 'border-linea-fuerte bg-superficie text-tinta hover:bg-cana-claro'
                  }`}
                >
                  {item}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaActual === totalPaginas}
              className={`${clasePag} border-linea-fuerte bg-superficie text-tinta hover:bg-cana-claro`}
            >
              Siguiente
            </button>
          </div>
        </nav>
      )}
    </>
  )
}

export const claseEntrada = 'campo-entrada'
