// CU01 – Iniciar sesión con Firebase Auth; el rol se pide al back end (/api/me).
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { api } from '../services/api'

const AuthContext = createContext(null)

const ERRORES_FIREBASE = {
  'auth/invalid-credential': 'El correo o la contraseña no coinciden.',
  'auth/wrong-password': 'El correo o la contraseña no coinciden.',
  'auth/user-not-found': 'El correo o la contraseña no coinciden.',
  'auth/invalid-email': 'El correo no tiene un formato válido.',
  'auth/user-disabled': 'Tu usuario está desactivado.',
  'auth/too-many-requests': 'Demasiados intentos. Esperá unos minutos y volvé a probar.',
  'auth/network-request-failed': 'No hay conexión. Revisá tu conexión a internet.',
}

export function AuthProvider({ children }) {
  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const cargarPerfil = useCallback(async () => {
    try {
      const yo = await api.get('/me')
      setPerfil(yo)
      setError(null)
      return yo
    } catch (e) {
      setPerfil(null)
      setError(e.message)
      if (e.status === 401 || e.status === 403) await signOut(auth)
      throw e
    }
  }, [])

  useEffect(
    () =>
      onAuthStateChanged(auth, async (usuario) => {
        if (!usuario) {
          setPerfil(null)
          setCargando(false)
          return
        }
        setCargando(true)
        try {
          await cargarPerfil()
        } catch {
          // el mensaje queda en `error`
        } finally {
          setCargando(false)
        }
      }),
    [cargarPerfil],
  )

  const iniciarSesion = useCallback(async (email, clave) => {
    setError(null)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), clave)
    } catch (e) {
      const mensaje = ERRORES_FIREBASE[e.code] || 'No se pudo iniciar sesión. Intentá de nuevo.'
      setError(mensaje)
      throw new Error(mensaje)
    }
  }, [])

  const cerrarSesion = useCallback(async () => {
    await signOut(auth)
    setPerfil(null)
  }, [])

  const valor = useMemo(
    () => ({ perfil, cargando, error, iniciarSesion, cerrarSesion }),
    [perfil, cargando, error, iniciarSesion, cerrarSesion],
  )
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
