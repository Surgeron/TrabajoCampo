// J01 – Inicio del Jefe de lote
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useAvisos } from '../../context/AvisosContext'
import { useApi } from '../../hooks/useApi'
import { enviarPendientes, pendientes } from '../../services/colaSinConexion'
import Icono from '../../components/Icono'
import { Aviso, Encabezado, Seccion } from '../../components/ui'
import { InsigniaPiso } from '../../components/estados'
import { fecha, fechaHora, num } from '../../utils/formato'

function AccionGrande({ a, icono, titulo, texto }) {
  return (
    <Link to={a} className="flex min-h-28 items-center gap-4 rounded-lg border-2 border-linea bg-superficie p-5 hover:border-cana focus-visible:border-cana">
      <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-cana text-white">
        <Icono nombre={icono} className="h-7 w-7" />
      </span>
      <span>
        <span className="font-display block text-xl font-semibold">{titulo}</span>
        <span className="text-sm text-tinta-2">{texto}</span>
      </span>
    </Link>
  )
}

export default function InicioJefe() {
  const { perfil } = useAuth()
  const { avisar } = useAvisos()
  const lecturas = useApi('/lecturas', { mias: true })
  const estados = useApi('/estados-piso', { mias: true })
  const [cola, setCola] = useState(pendientes())
  const recargarLecturas = lecturas.recargar

  useEffect(() => {
    const actualizar = () => setCola(pendientes())
    const alVolver = async () => {
      const { enviadas } = await enviarPendientes()
      if (enviadas) {
        avisar(`Se enviaron ${enviadas} lectura(s) guardadas sin señal.`)
        recargarLecturas(true)
      }
    }
    window.addEventListener('cola-lecturas', actualizar)
    window.addEventListener('online', alVolver)
    alVolver()
    return () => {
      window.removeEventListener('cola-lecturas', actualizar)
      window.removeEventListener('online', alVolver)
    }
  }, [avisar, recargarLecturas])

  return (
    <>
      <Encabezado codigo="J01" titulo={`Hola, ${perfil.nombre}`} descripcion="¿Qué querés cargar?" />
      {cola.length > 0 && (
        <Aviso tono="alerta" titulo={`${cola.length} lectura(s) guardadas en este celular`} className="mb-6">
          Se envían solas al volver la conexión. Las que choquen con otra lectura aparecen en{' '}
          <Link to="/jefe/registros" className="font-semibold underline">
            Mis registros
          </Link>
          .
        </Aviso>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <AccionGrande a="/jefe/lectura" icono="lluvia" titulo="Lectura de pluviómetro" texto="Milímetros de la lluvia de hoy" />
        <AccionGrande a="/jefe/estado-piso" icono="piso" titulo="Estado de piso" texto="Si se puede entrar a cosechar" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Seccion titulo="Mis últimas lecturas">
          {(lecturas.datos || []).length ? (
            <ul className="divide-y divide-linea">
              {lecturas.datos.slice(0, 5).map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span>
                    <span className="font-semibold">{l.pluviometro}</span>
                    <span className="block text-xs text-tenue">{fecha(l.fecha)}</span>
                  </span>
                  <span className="cifra text-xl font-semibold">{num(l.mm, 1)} mm</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-tinta-2">Todavía no cargaste lecturas.</p>
          )}
        </Seccion>
        <Seccion titulo="Mis últimos estados de piso">
          {(estados.datos || []).length ? (
            <ul className="divide-y divide-linea">
              {estados.datos.slice(0, 5).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span>
                    <span className="font-semibold">{e.lote}</span> · {e.finca}
                    <span className="block text-xs text-tenue">{fechaHora(e.fecha_hora_desde)}</span>
                  </span>
                  <InsigniaPiso estado={e.estado} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-tinta-2">Todavía no informaste estados de piso.</p>
          )}
        </Seccion>
      </div>
    </>
  )
}
