// Escucha en tiempo real (Firestore onSnapshot) los cambios de alertas y de registros de patio.
// Si las reglas de Firestore no permiten la lectura, cae a una consulta periódica.
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../firebase'

const RESPALDO_MS = 60000

export function escucharColeccion(nombre, alCambiar, { campoOrden = 'fecha_hora', cantidad = 20 } = {}) {
  let intervalo = null
  let primera = true
  const respaldo = () => {
    if (!intervalo) intervalo = setInterval(() => alCambiar([]), RESPALDO_MS)
  }
  let cancelar = () => {}
  try {
    const q = query(collection(db, nombre), orderBy(campoOrden, 'desc'), limit(cantidad))
    cancelar = onSnapshot(
      q,
      (snap) => {
        // La primera respuesta trae el estado actual: no es un cambio
        if (primera) {
          primera = false
          return
        }
        alCambiar(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      },
      () => respaldo(),
    )
  } catch {
    respaldo()
  }
  return () => {
    cancelar()
    if (intervalo) clearInterval(intervalo)
  }
}
