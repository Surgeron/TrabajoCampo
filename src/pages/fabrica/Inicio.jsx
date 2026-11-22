// F01 – Inicio de Fábrica: alertas en tiempo real, colchón de patio y parada en curso.
import { useEffect } from 'react'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { useMarcarVista } from '../../hooks/useMarcarVista'
import { escucharColeccion } from '../../services/tiempoReal'
import Colchon from '../../components/Colchon'
import TarjetaAlerta from '../../components/TarjetaAlerta'
import { Boton, BotonLink, Cargando, Encabezado, ErrorCarga, Seccion } from '../../components/ui'
import { fechaHora, horasTexto, usd } from '../../utils/formato'

export default function InicioFabrica() {
  const { perfil } = useAuth()
  const alertas = useApi('/alertas', { activas: true })
  const patio = useApi('/abastecimiento')
  const paradas = useApi('/paradas')
  const recargarAlertas = alertas.recargar
  const recargarPatio = patio.recargar
  const { marcar, enCurso } = useMarcarVista(() => recargarAlertas(true))

  useEffect(() => escucharColeccion('alertas', () => recargarAlertas(true)), [recargarAlertas])
  useEffect(() => escucharColeccion('registros_patio', () => recargarPatio(true), { cantidad: 1 }), [recargarPatio])

  const abierta = paradas.datos?.paradas.find((p) => p.abierta)
  const sinVer = (alertas.datos || []).filter((a) => !a.vista).length

  return (
    <>
      <Encabezado
        codigo="F01"
        titulo={`Hola, ${perfil.nombre}`}
        descripcion={sinVer ? `Tenés ${sinVer} alerta(s) sin ver.` : 'Sin alertas nuevas.'}
        acciones={
          abierta ? (
            <BotonLink to={`/fabrica/paradas/${abierta.id}/cerrar`} variante="primario">
              Registrar reanudación
            </BotonLink>
          ) : (
            <BotonLink to="/fabrica/paradas/nueva" variante="peligro" icono="parada">
              Registrar parada
            </BotonLink>
          )
        }
      />
      {abierta && (
        <section className="mb-6 rounded-lg border-2 border-critico bg-critico-claro p-5" role="status">
          <p className="font-display text-xl font-semibold text-critico-texto">Fábrica parada desde {fechaHora(abierta.fecha_hora_inicio)}</p>
          <p className="mt-1 text-sm text-tinta">
            {abierta.causa} · {horasTexto(abierta.duracion_h)} · costo estimado {usd(abierta.costos_usd.central)} (de {usd(abierta.costos_usd.bajo)} a{' '}
            {usd(abierta.costos_usd.alto)})
          </p>
          {abierta.patio && (
            <p className="mt-2 font-semibold">
              Faltan {abierta.patio.carros_faltantes} carros para llegar a los {abierta.patio.carros_minimos} que permiten reanudar.
            </p>
          )}
        </section>
      )}
      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Seccion titulo="Alertas activas" acciones={<BotonLink to="/fabrica/alertas" variante="fantasma">Ver todas</BotonLink>}>
          {alertas.cargando && !alertas.datos && <Cargando />}
          {alertas.error && <ErrorCarga error={alertas.error} alReintentar={alertas.recargar} />}
          {alertas.datos &&
            (alertas.datos.length ? (
              <div className="flex flex-col gap-3">
                {alertas.datos.map((a) => (
                  <TarjetaAlerta
                    key={a.id}
                    alerta={a}
                    enlace={`/fabrica/alertas/${a.id}`}
                    accion={
                      !a.vista && (
                        <Boton variante="secundario" icono="ojo" onClick={() => marcar(a)} cargando={enCurso === a.id}>
                          Marcar como vista
                        </Boton>
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-tinta-2">No hay alertas de lluvia ni de colchón bajo.</p>
            ))}
        </Seccion>
        <Seccion titulo="Colchón en patio" acciones={<BotonLink to="/fabrica/abastecimiento" variante="fantasma">Abrir tablero</BotonLink>}>
          {patio.cargando && !patio.datos && <Cargando />}
          {patio.error && <ErrorCarga error={patio.error} alReintentar={patio.recargar} />}
          {patio.datos &&
            (patio.datos.calculo ? (
              <Colchon calculo={patio.datos.calculo} fechaHora={patio.datos.ultimo.fecha_hora} fabricaParada={patio.datos.fabrica_parada} carrosParaReanudar={patio.datos.carros_para_reanudar} />
            ) : (
              <p className="text-sm text-tinta-2">Báscula todavía no registró carros.</p>
            ))}
        </Seccion>
      </div>
    </>
  )
}
