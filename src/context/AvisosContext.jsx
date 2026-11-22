// Mensajes breves de confirmación o error (toasts), anunciados a lectores de pantalla.
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const AvisosContext = createContext(null)
let siguienteId = 1

export function AvisosProvider({ children }) {
  const [avisos, setAvisos] = useState([])

  const quitar = useCallback((id) => setAvisos((l) => l.filter((a) => a.id !== id)), [])

  const avisar = useCallback(
    (texto, tipo = 'ok', duracion = 5000) => {
      const id = siguienteId++
      setAvisos((l) => [...l.slice(-3), { id, texto, tipo }])
      if (duracion) setTimeout(() => quitar(id), duracion)
    },
    [quitar],
  )

  const valor = useMemo(() => ({ avisar }), [avisar])
  const estilos = {
    ok: 'border-l-cana',
    error: 'border-l-critico',
    info: 'border-l-lluvia',
    alerta: 'border-l-atencion',
  }
  return (
    <AvisosContext.Provider value={valor}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-3 bottom-20 z-[1100] flex flex-col items-end gap-2 lg:bottom-6 lg:right-6 lg:left-auto"
        aria-live="polite"
        role="status"
      >
        {avisos.map((a) => (
          <div
            key={a.id}
            className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-md border border-linea border-l-4 bg-superficie px-4 py-3 text-sm shadow-lg ${estilos[a.tipo] || estilos.ok}`}
          >
            <p className="flex-1">{a.texto}</p>
            <button
              type="button"
              onClick={() => quitar(a.id)}
              className="text-tenue hover:text-tinta"
              aria-label="Cerrar aviso"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </AvisosContext.Provider>
  )
}

// eslint-disable-next-line react/only-export-components
export function useAvisos() {
  return useContext(AvisosContext)
}
