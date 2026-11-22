// Estructura de la aplicación: barra lateral (computadora y TV), barra superior y barra inferior (celular).
import { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BASE_ROL, MENU } from '../config/navegacion'
import { useNavegacionTV } from '../hooks/useNavegacionTV'
import { useTema } from '../hooks/useTema'
import { enviarPendientes } from '../services/colaSinConexion'
import Icono from './Icono'
import { Cargando } from './ui'

function Marca({ compacta = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="h-8 w-8 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill="#1c4a33" />
        <path d="M11 27V9M16 27V5M21 27V11" stroke="#b9d24a" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M11 15l-4-3M16 12l4-3M21 18l4-3M16 20l-4-3" stroke="#e6eee8" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      {!compacta && (
        <div className="leading-tight">
          <p className="font-display text-base font-semibold text-white">Ingenio La Esperanza</p>
          <p className="text-xs text-monte-texto/75">Priorización de cosecha</p>
        </div>
      )}
    </div>
  )
}

function EnlaceMenu({ item, alNavegar }) {
  return (
    <NavLink
      to={item.a}
      end={item.fin}
      onClick={alNavegar}
      className={({ isActive }) =>
        `group flex min-h-10 items-center gap-3 rounded-md border-l-4 px-3 text-sm font-medium transition-colors tv:min-h-11 ${
          isActive
            ? 'border-cogollo bg-monte-2 text-white'
            : 'border-transparent text-monte-texto/85 hover:bg-monte-2/70 hover:text-white'
        }`
      }
    >
      <Icono nombre={item.icono} className="h-5 w-5 shrink-0" />
      <span>{item.texto}</span>
    </NavLink>
  )
}

function Menu({ items, alNavegar }) {
  return (
    <nav aria-label="Menú principal" className="flex flex-col gap-0.5">
      {items.map((item, i) =>
        item.grupo ? (
          <p key={`g${i}`} className="mt-3 mb-1 px-3 text-xs font-semibold text-monte-texto/55">
            {item.grupo}
          </p>
        ) : (
          <EnlaceMenu key={item.a} item={item} alNavegar={alNavegar} />
        ),
      )}
    </nav>
  )
}

function Usuario({ perfil, alSalir, oscuro, alAlternarTema }) {
  return (
    <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
      <button
        type="button"
        onClick={alAlternarTema}
        className="flex min-h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-xs font-medium text-monte-texto/85 transition-colors hover:bg-monte-2 hover:text-white"
      >
        <Icono nombre={oscuro ? 'sol' : 'luna'} className="h-4 w-4 shrink-0" />
        <span>{oscuro ? 'Modo claro' : 'Modo oscuro'}</span>
      </button>
      <div className="flex items-center gap-2 pt-1">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">
            {perfil.nombre} {perfil.apellido}
          </p>
          <p className="truncate text-xs text-monte-texto/70">{perfil.rol_nombre}</p>
        </div>
        <button
          type="button"
          onClick={alSalir}
          title="Cerrar sesión"
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-sm text-monte-texto/85 hover:bg-monte-2 hover:text-white"
        >
          <Icono nombre="salir" />
          <span className="sr-only lg:not-sr-only lg:text-xs">Salir</span>
        </button>
      </div>
    </div>
  )
}

function SinConexion() {
  const [enLinea, setEnLinea] = useState(navigator.onLine)
  useEffect(() => {
    const a = () => setEnLinea(true)
    const b = () => setEnLinea(false)
    window.addEventListener('online', a)
    window.addEventListener('offline', b)
    return () => {
      window.removeEventListener('online', a)
      window.removeEventListener('offline', b)
    }
  }, [])
  if (enLinea) return null
  return (
    <div className="bg-atencion px-4 py-1.5 text-center text-sm font-semibold text-tinta" role="status">
      Sin conexión: lo que cargues se guarda en este dispositivo cuando sea posible.
    </div>
  )
}

export default function Layout() {
  const { perfil, cerrarSesion } = useAuth()
  const { oscuro, alternarTema } = useTema()
  const [abierto, setAbierto] = useState(false)
  const { pathname } = useLocation()
  useNavegacionTV()
  useEffect(() => setAbierto(false), [pathname])
  // CU08: al volver la conexión se envían las lecturas guardadas en el celular
  useEffect(() => {
    if (perfil.rol !== 'jefe_lote') return undefined
    const alVolver = () => enviarPendientes()
    window.addEventListener('online', alVolver)
    return () => window.removeEventListener('online', alVolver)
  }, [perfil.rol])

  const items = MENU[perfil.rol] || []
  const principales = items.filter((i) => i.principal)

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr] tv:grid-cols-[18rem_1fr]">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[2000] focus:rounded focus:bg-superficie focus:px-3 focus:py-2 focus:text-tinta">
        Saltar al contenido
      </a>
      {/* Barra lateral */}
      <aside className="no-imprimir sticky top-0 hidden h-dvh flex-col gap-4 overflow-y-auto bg-monte px-3 py-4 lg:flex">
        <div className="px-2">
          <Marca />
        </div>
        <div className="flex-1">
          <Menu items={items} />
        </div>
        <div className="px-2">
          <Usuario perfil={perfil} alSalir={cerrarSesion} oscuro={oscuro} alAlternarTema={alternarTema} />
        </div>
      </aside>

      {/* Barra superior del celular */}
      <div className="no-imprimir sticky top-0 z-[1000] flex items-center justify-between bg-monte px-4 py-2.5 lg:hidden">
        <Marca />
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={alternarTema}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-white hover:bg-monte-2"
            aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            title={oscuro ? 'Modo claro' : 'Modo oscuro'}
          >
            <Icono nombre={oscuro ? 'sol' : 'luna'} className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-white hover:bg-monte-2"
            aria-label="Abrir menú"
            aria-expanded={abierto}
          >
            <Icono nombre="menu" className="h-6 w-6" />
          </button>
        </div>
      </div>

      {abierto && (
        <div className="fixed inset-0 z-[1200] lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button type="button" className="absolute inset-0 bg-monte/60" aria-label="Cerrar menú" onClick={() => setAbierto(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[min(20rem,85%)] flex-col gap-5 overflow-y-auto bg-monte px-3 py-4">
            <div className="flex items-center justify-between px-2">
              <Marca compacta />
              <button
                type="button"
                onClick={() => setAbierto(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md text-white hover:bg-monte-2"
                aria-label="Cerrar menú"
              >
                <Icono nombre="cerrar" className="h-6 w-6" />
              </button>
            </div>
            <div className="flex-1">
              <Menu items={items} alNavegar={() => setAbierto(false)} />
            </div>
            <div className="px-2">
              <Usuario perfil={perfil} alSalir={cerrarSesion} oscuro={oscuro} alAlternarTema={alternarTema} />
            </div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <SinConexion />
        <main id="contenido" className="mx-auto w-full max-w-[90rem] flex-1 px-4 pt-5 pb-28 md:px-8 md:pt-8 lg:pb-12 tv:max-w-none tv:px-12">
          <Outlet />
        </main>
      </div>

      {/* Barra inferior del celular con las acciones principales del rol */}
      <nav aria-label="Accesos rápidos" className="no-imprimir fixed inset-x-0 bottom-0 z-[1000] border-t border-linea bg-superficie pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${principales.length}, minmax(0, 1fr))` }}>
          {principales.map((item) => (
            <li key={item.a}>
              <NavLink
                to={item.a}
                end={item.fin}
                className={({ isActive }) =>
                  `flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-semibold ${
                    isActive ? 'text-cana' : 'text-tenue'
                  }`
                }
              >
                <Icono nombre={item.icono} className="h-5.5 w-5.5" />
                {item.corto || item.texto}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

export function RutaProtegida({ rol, children }) {
  const { perfil, cargando } = useAuth()
  if (cargando) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Cargando texto="Verificando la sesión…" />
      </div>
    )
  }
  if (!perfil) return <Navigate to="/login" replace />
  if (rol && perfil.rol !== rol) return <Navigate to={BASE_ROL[perfil.rol] || '/login'} replace />
  return children
}
