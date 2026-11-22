// Preferencia de tema claro/oscuro persistida en el navegador.
import { useCallback, useEffect, useState } from 'react'

const CLAVE_TEMA = 'nexozafra_tema'
const EVENTO_TEMA = 'cambio-tema'

function leerOscuro() {
  try {
    return localStorage.getItem(CLAVE_TEMA) === 'oscuro'
  } catch {
    return false
  }
}

export function aplicarTemaGuardado() {
  const oscuro = leerOscuro()
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', oscuro)
  }
  return oscuro
}

if (typeof document !== 'undefined') {
  aplicarTemaGuardado()
}

export function useTema() {
  const [oscuro, setOscuro] = useState(() => aplicarTemaGuardado())

  useEffect(() => {
    const alCambiar = () => setOscuro(leerOscuro())
    window.addEventListener(EVENTO_TEMA, alCambiar)
    window.addEventListener('storage', alCambiar)
    return () => {
      window.removeEventListener(EVENTO_TEMA, alCambiar)
      window.removeEventListener('storage', alCambiar)
    }
  }, [])

  const alternarTema = useCallback(() => {
    const siguiente = !leerOscuro()
    try {
      localStorage.setItem(CLAVE_TEMA, siguiente ? 'oscuro' : 'claro')
    } catch {
      // ignora errores en almacenamiento privado
    }
    document.documentElement.classList.toggle('dark', siguiente)
    window.dispatchEvent(new Event(EVENTO_TEMA))
  }, [])

  return { oscuro, alternarTema }
}
