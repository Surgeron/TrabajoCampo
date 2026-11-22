// T13 / F06 – Monitorear abastecimiento de patio (CU22, extiende CU18). Se actualiza solo con cada registro de Báscula.
import { useEffect } from 'react'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { escucharColeccion } from '../../services/tiempoReal'
import Colchon from '../../components/Colchon'
import TarjetaAlerta from '../../components/TarjetaAlerta'
import { Cargando, Encabezado, ErrorCarga, Seccion, Tabla, Vacio } from '../../components/ui'
import { InsigniaZona } from '../../components/estados'
import { fechaHora, hora, horasTexto, num } from '../../utils/formato'

function Evolucion({ puntos, minimo }) {
  if (puntos.length < 2) return <p className="text-sm text-tinta-2">Hace falta más de un registro en el día para ver la evolución.</p>
  const max = Math.max(minimo + 5, ...puntos.map((p) => p.cantidad_carros))
  const ancho = 600
  const alto = 160
  const x = (i) => 30 + (i * (ancho - 40)) / (puntos.length - 1)
  const y = (v) => alto - 20 - (v / max) * (alto - 30)
  const camino = puntos.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.cantidad_carros)}`).join(' ')
  return (
    <figure>
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="h-44 w-full" role="img" aria-label={`Evolución del colchón: de ${puntos[0].cantidad_carros} a ${puntos.at(-1).cantidad_carros} carros`}>
        <line x1="30" x2={ancho - 10} y1={y(minimo)} y2={y(minimo)} stroke="#d03b3b" strokeWidth="1.5" />
        <text x={ancho - 12} y={y(minimo) - 5} textAnchor="end" fontSize="12" fill="#a42727">
          {minimo} carros
        </text>
        <line x1="30" x2={ancho - 10} y1={alto - 20} y2={alto - 20} stroke="#c3c2b7" />
        <path d={camino} fill="none" stroke="#2a78d6" strokeWidth="2" strokeLinejoin="round" />
        {puntos.map((p, i) => (
          <g key={p.fecha_hora}>
            <circle cx={x(i)} cy={y(p.cantidad_carros)} r="4.5" fill="#2a78d6" stroke="#fcfcfb" strokeWidth="2">
              <title>{`${hora(p.fecha_hora)}: ${p.cantidad_carros} carros`}</title>
            </circle>
            {(i === 0 || i === puntos.length - 1) && (
              <text x={x(i)} y={alto - 4} textAnchor="middle" fontSize="12" fill="#6f7c73">
                {hora(p.fecha_hora)}
              </text>
            )}
          </g>
        ))}
        <text x={x(puntos.length - 1)} y={y(puntos.at(-1).cantidad_carros) - 10} textAnchor="middle" fontSize="12" fontWeight="600" fill="#16241b">
          {puntos.at(-1).cantidad_carros}
        </text>
      </svg>
    </figure>
  )
}

export default function Abastecimiento() {
  const { perfil } = useAuth()
  const { datos, cargando, error, recargar } = useApi('/abastecimiento')

  useEffect(() => escucharColeccion('registros_patio', () => recargar(true), { cantidad: 1 }), [recargar])
  useEffect(() => escucharColeccion('alertas', () => recargar(true)), [recargar])

  const bajo = datos?.calculo?.bajo_umbral
  return (
    <>
      <Encabezado
        codigo={perfil.rol === 'fabrica' ? 'F06' : 'T13'}
        titulo="Abastecimiento de patio"
        descripcion="Se actualiza solo cuando Báscula carga un registro. Mientras se muele siguen entrando camiones (ciclo de 1 hora aproximadamente)."
      />
      {cargando && !datos && <Cargando />}
      {error && <ErrorCarga error={error} alReintentar={recargar} />}
      {datos && (
        <div className="flex flex-col gap-6">
          <section className={`rounded-lg border-2 bg-superficie p-5 md:p-7 ${bajo ? 'border-critico' : 'border-linea'}`} aria-live="polite">
            {datos.calculo ? (
              <Colchon
                calculo={datos.calculo}
                fechaHora={datos.ultimo.fecha_hora}
                fabricaParada={datos.fabrica_parada}
                carrosParaReanudar={datos.carros_para_reanudar}
                grande
              />
            ) : (
              <Vacio titulo="Báscula todavía no registró carros.">Cuando cargue el primer registro, el tablero se actualiza solo.</Vacio>
            )}
          </section>

          {datos.alertas_activas.length > 0 && (
            <Seccion titulo="Alertas abiertas">
              <div className="grid gap-3 lg:grid-cols-2">
                {datos.alertas_activas.map((a) => (
                  <TarjetaAlerta key={a.id} alerta={a} enlace={perfil.rol === 'fabrica' ? `/fabrica/alertas/${a.id}` : undefined} />
                ))}
              </div>
            </Seccion>
          )}

          <div className="grid gap-6 xl:grid-cols-2">
            <Seccion titulo="Evolución del colchón" descripcion={datos.evolucion.length ? `Registros del ${fechaHora(datos.evolucion[0].fecha_hora).slice(0, 10)}` : undefined}>
              <Evolucion puntos={datos.evolucion} minimo={datos.parametros.carros_minimos} />
            </Seccion>
            <Seccion titulo={`Lotes en cosecha · ${datos.lotes_en_cosecha.length}`} descripcion="Los lotes lejanos alargan el ciclo de los camiones y bajan el ritmo de llegada">
              <Tabla
                etiqueta="Lotes en cosecha"
                claveFila="id_unico"
                columnas={[
                  { clave: 'nombre', titulo: 'Lote', render: (l) => <span className="font-semibold">{l.nombre}</span> },
                  { clave: 'finca', titulo: 'Finca' },
                  { clave: 'zona', titulo: 'Zona', render: (l) => <InsigniaZona zona={l.zona} /> },
                  { clave: 'dist_ingenio_km', titulo: 'Distancia', alinear: 'derecha', render: (l) => (l.dist_ingenio_km != null ? `${num(l.dist_ingenio_km, 0)} km` : '—') },
                ]}
                filas={datos.lotes_en_cosecha}
                vacio={<p className="text-sm text-tinta-2">No hay lotes con cosecha en curso.</p>}
              />
            </Seccion>
          </div>
          <p className="text-xs text-tenue">
            Cálculo: {num(datos.parametros.carga_bruta_carro_t, 0)} t brutas por carro con {num(datos.parametros.merma_min_pct, 0)} % a{' '}
            {num(datos.parametros.merma_max_pct, 0)} % que no es caña ({num(datos.parametros.carga_neta_carro_t, 1)} t netas normal,{' '}
            {num(datos.parametros.carga_neta_post_lluvia_t, 1)} t después de lluvia), molienda de {num(datos.parametros.capacidad_molienda_th, 1)} t/h.{' '}
            {datos.parametros.carros_minimos} carros ≈ {horasTexto((datos.parametros.carros_minimos * datos.parametros.carga_neta_carro_t) / datos.parametros.capacidad_molienda_th)} de molienda.
          </p>
        </div>
      )}
    </>
  )
}
