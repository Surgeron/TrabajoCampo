// F02 – Alertas (CU18)
import { useEffect, useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { escucharColeccion } from '../../services/tiempoReal'
import TarjetaAlerta from '../../components/TarjetaAlerta'
import { Boton, Campo, Cargando, Encabezado, ErrorCarga, Vacio } from '../../components/ui'
import { useMarcarVista } from '../../hooks/useMarcarVista'

export default function Alertas() {
  const [filtros, setFiltros] = useState({ tipo: '', activas: 'true' })
  const { datos, cargando, error, recargar } = useApi('/alertas', { tipo: filtros.tipo, activas: filtros.activas === 'true' })
  const { marcar, enCurso } = useMarcarVista(() => recargar(true))
  useEffect(() => escucharColeccion('alertas', () => recargar(true)), [recargar])

  return (
    <>
      <Encabezado codigo="F02" titulo="Alertas" descripcion="Por lluvia de 70 % o más en una finca con cosecha en curso, y por menos de 30 carros en patio." />
      <div className="mb-5 grid max-w-xl grid-cols-2 gap-3">
        <Campo etiqueta="Tipo">
          {(a) => (
            <select {...a} className="campo-entrada" value={filtros.tipo} onChange={(e) => setFiltros((f) => ({ ...f, tipo: e.target.value }))}>
              <option value="">Todas</option>
              <option>Lluvia</option>
              <option>Colchón bajo</option>
            </select>
          )}
        </Campo>
        <Campo etiqueta="Mostrar">
          {(a) => (
            <select {...a} className="campo-entrada" value={filtros.activas} onChange={(e) => setFiltros((f) => ({ ...f, activas: e.target.value }))}>
              <option value="true">Solo activas</option>
              <option value="false">Todas, también las pasadas</option>
            </select>
          )}
        </Campo>
      </div>
      {cargando && !datos && <Cargando />}
      {error && <ErrorCarga error={error} alReintentar={recargar} />}
      {datos &&
        (datos.length ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {datos.map((a) => (
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
          <Vacio titulo="No hay alertas con esos filtros." />
        ))}
    </>
  )
}
