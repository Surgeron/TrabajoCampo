// CU18: Fábrica marca una alerta como vista.
import { useState } from 'react'
import { useAvisos } from '../context/AvisosContext'
import { api } from '../services/api'

export function useMarcarVista(alTerminar) {
  const { avisar } = useAvisos()
  const [enCurso, setEnCurso] = useState(null)
  const marcar = async (alerta) => {
    setEnCurso(alerta.id)
    try {
      await api.put(`/alertas/${alerta.id}/vista`)
      avisar('Alerta marcada como vista.')
      alTerminar?.()
    } catch (e) {
      avisar(e.message, 'error')
    } finally {
      setEnCurso(null)
    }
  }
  return { marcar, enCurso }
}
