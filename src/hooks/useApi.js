import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../services/api'

// Carga datos de una ruta GET con estados de carga y error. `params` se compara por contenido.
export function useApi(ruta, params) {
  const [estado, setEstado] = useState({ datos: null, error: null, cargando: Boolean(ruta) })
  const clave = JSON.stringify(params || {})
  const control = useRef(null)

  const cargar = useCallback(
    async (silencioso = false) => {
      if (!ruta) return
      control.current?.abort()
      const c = new AbortController()
      control.current = c
      if (!silencioso) setEstado((e) => ({ ...e, cargando: true, error: null }))
      try {
        const datos = await api.get(ruta, JSON.parse(clave), c.signal)
        if (!c.signal.aborted) setEstado({ datos, error: null, cargando: false })
      } catch (error) {
        if (error.name === 'AbortError') return
        setEstado((e) => ({ ...e, error, cargando: false }))
      }
    },
    [ruta, clave],
  )

  useEffect(() => {
    cargar()
    return () => control.current?.abort()
  }, [cargar])

  return { ...estado, recargar: cargar }
}
