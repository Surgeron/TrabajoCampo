// T17 / F08 – Informes (CU20): cada rol ve los suyos.
import { Link } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { BASE_ROL } from '../../config/navegacion'
import { Cargando, Encabezado, ErrorCarga } from '../../components/ui'
import Icono from '../../components/Icono'

const DESCRIPCION = {
  'sin-piso': 'Períodos sin piso por lote, con su drenaje y los días que duró cada uno.',
  lluvias: 'Lecturas de cada pluviómetro y lluvia acumulada por finca.',
  paradas: 'Cada parada con su causa, duración, costo estimado y si hubo alerta previa.',
  avance: 'Hectáreas terminadas por zona y estado de cada lote en producción.',
  patio: 'Registros de carros en patio, toneladas netas y horas de cobertura.',
  alertas: 'Alertas de lluvia contra la lluvia registrada: cuántas acertaron.',
}

export default function Informes() {
  const { perfil } = useAuth()
  const { datos, cargando, error, recargar } = useApi('/informes')
  const base = BASE_ROL[perfil.rol]
  return (
    <>
      <Encabezado codigo={perfil.rol === 'fabrica' ? 'F08' : 'T17'} titulo="Informes" descripcion="Elegí un informe para filtrarlo y exportarlo a PDF o Excel." />
      {cargando && <Cargando />}
      {error && <ErrorCarga error={error} alReintentar={recargar} />}
      {datos && (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {datos.map((i) => (
            <li key={i.tipo}>
              <Link
                to={`${base}/informes/${i.tipo}`}
                className="flex h-full items-start gap-3 rounded-lg border border-linea bg-superficie p-4 hover:border-cana focus-visible:border-cana"
              >
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-cana-claro text-cana-oscuro">
                  <Icono nombre="informe" />
                </span>
                <span>
                  <span className="font-display text-lg font-semibold">{i.titulo}</span>
                  <span className="mt-1 block text-sm text-tinta-2">{DESCRIPCION[i.tipo]}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
