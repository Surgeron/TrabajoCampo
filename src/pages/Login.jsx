// P01 – Iniciar sesión (CU01)
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { BASE_ROL } from '../config/navegacion'
import { useTema } from '../hooks/useTema'
import Icono from '../components/Icono'
import { Aviso, Boton, Campo } from '../components/ui'
import { reglas, validar } from '../utils/validacion'

const PERFILES_RAPIDOS = [
  { rol: 'Equipo técnico agrícola', email: 'tecnico@nexozafra.test', clave: '123456' },
  { rol: 'Jefe de lote', email: 'jefe.lote@nexozafra.test', clave: '123456' },
  { rol: 'Personal de báscula', email: 'bascula@nexozafra.test', clave: '123456' },
  { rol: 'Fábrica', email: 'fabrica@nexozafra.test', clave: '123456' },
]

// Surcos de caña dibujados: la identidad de la pantalla de ingreso
function Canaveral() {
  const tallos = Array.from({ length: 22 }, (_, i) => i)
  return (
    <svg viewBox="0 0 440 300" className="h-auto w-full" aria-hidden="true">
      {tallos.map((i) => {
        const x = 12 + i * 19.5
        const alto = 150 + ((i * 37) % 90)
        return (
          <g key={i} stroke="#DC2B4A" strokeLinecap="round" opacity={0.4 + ((i * 13) % 10) / 20}>
            <path d={`M${x} 300 V${300 - alto}`} strokeWidth="3" />
            <path d={`M${x} ${300 - alto * 0.55} l${i % 2 ? 14 : -14} -16`} strokeWidth="2" stroke="#F3E7E9" />
            <path d={`M${x} ${300 - alto * 0.8} l${i % 2 ? -12 : 12} -14`} strokeWidth="2" stroke="#F3E7E9" />
          </g>
        )
      })}
      {Array.from({ length: 16 }, (_, i) => (
        <path
          key={`l${i}`}
          d={`M${30 + i * 27} ${20 + ((i * 41) % 60)} l-6 16`}
          stroke="#F59E0B"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.7"
        />
      ))}
    </svg>
  )
}

export default function Login() {
  const { perfil, iniciarSesion, error, cargando } = useAuth()
  const { oscuro, alternarTema } = useTema()
  const [valores, setValores] = useState({ email: '', clave: '' })
  const [errores, setErrores] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [rapidoAbierto, setRapidoAbierto] = useState(false)

  if (perfil) return <Navigate to={BASE_ROL[perfil.rol]} replace />

  const completarPerfil = (p) => {
    setValores({ email: p.email, clave: p.clave })
    setErrores({})
    setRapidoAbierto(false)
  }

  const esquema = {
    email: [reglas.requerido('Ingresá tu correo.'), reglas.email()],
    clave: [reglas.requerido('Ingresá tu contraseña.')],
  }

  const cambiar = (campo) => (e) => {
    const v = { ...valores, [campo]: e.target.value }
    setValores(v)
    if (errores[campo]) setErrores(validar(v, esquema))
  }

  const enviar = async (e) => {
    e.preventDefault()
    const errs = validar(valores, esquema)
    setErrores(errs)
    if (Object.keys(errs).length) return
    setEnviando(true)
    try {
      await iniciarSesion(valores.email, valores.clave)
    } catch {
      // el mensaje lo muestra el contexto
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-monte p-12 text-monte-texto lg:flex">
        <div>
          <p className="font-display text-lg text-cogollo">Ingenio La Esperanza · Jujuy</p>
          <h1 className="mt-6 max-w-lg text-5xl leading-[1.05] font-semibold text-white">
            Qué lote cosechar primero, antes de que llueva.
          </h1>
          <p className="mt-5 max-w-md text-base text-monte-texto/80">
            Ranking de cosecha por zona, madurez y drenaje, alertas de lluvia para Fábrica y el colchón de caña en patio, en
            un solo lugar.
          </p>
        </div>
        <div className="-mx-12 -mb-12">
          <Canaveral />
        </div>
      </div>

      <div className="relative flex flex-col justify-center px-5 py-10 sm:px-10">
        <button
          type="button"
          onClick={alternarTema}
          aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          title={oscuro ? 'Modo claro' : 'Modo oscuro'}
          className="absolute top-4 right-4 inline-flex min-h-10 items-center gap-1.5 rounded-md border border-linea-fuerte bg-superficie px-3 text-xs font-semibold text-tinta-2 transition-colors hover:bg-cana-claro hover:text-tinta"
        >
          <Icono nombre={oscuro ? 'sol' : 'luna'} className="h-4 w-4" />
          <span>{oscuro ? 'Claro' : 'Oscuro'}</span>
        </button>
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <p className="font-display text-sm text-cana">Ingenio La Esperanza</p>
            <p className="font-display text-2xl font-semibold">Priorización de cosecha</p>
          </div>
          <h2 className="text-2xl font-semibold">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-tinta-2">Usá el correo y la contraseña que te dio el equipo.</p>

          <form className="mt-6 flex flex-col gap-4" onSubmit={enviar} noValidate>
            <Campo etiqueta="Correo" requerido error={errores.email}>
              {(a) => (
                <input
                  {...a}
                  type="email"
                  autoComplete="username"
                  inputMode="email"
                  className="campo-entrada"
                  value={valores.email}
                  onChange={cambiar('email')}
                  onBlur={() => setErrores(validar(valores, esquema))}
                  maxLength={120}
                />
              )}
            </Campo>
            <Campo etiqueta="Contraseña" requerido error={errores.clave}>
              {(a) => (
                <input
                  {...a}
                  type="password"
                  autoComplete="current-password"
                  className="campo-entrada"
                  value={valores.clave}
                  onChange={cambiar('clave')}
                  maxLength={120}
                />
              )}
            </Campo>
            {error && !enviando && <Aviso tono="critico">{error}</Aviso>}
            <Boton type="submit" cargando={enviando || cargando} className="mt-2 w-full">
              Ingresar
            </Boton>
          </form>

          <div className="mt-4 border-t border-linea pt-4">
            <Boton
              variante="secundario"
              icono="usuario"
              className="w-full"
              aria-expanded={rapidoAbierto}
              onClick={() => setRapidoAbierto((a) => !a)}
            >
              Inicio de sesión rápido
            </Boton>
            {rapidoAbierto && (
              <div className="mt-2 grid gap-1.5 rounded-md border border-linea bg-superficie p-2">
                {PERFILES_RAPIDOS.map((p) => (
                  <button
                    key={p.email}
                    type="button"
                    onClick={() => completarPerfil(p)}
                    className="flex items-center justify-between rounded px-2.5 py-2 text-left text-xs transition-colors hover:bg-cana-claro"
                  >
                    <span className="font-semibold text-tinta">{p.rol}</span>
                    <span className="text-tenue">{p.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
