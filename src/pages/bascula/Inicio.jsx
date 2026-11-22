// B01 – Inicio del Personal de báscula
import { useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useApi } from '../../hooks/useApi'
import { escucharColeccion } from '../../services/tiempoReal'
import Colchon from '../../components/Colchon'
import { BotonLink, Cargando, Encabezado, ErrorCarga, Seccion, Vacio } from '../../components/ui'

export default function InicioBascula() {
  const { perfil } = useAuth()
  const { datos, cargando, error, recargar } = useApi('/abastecimiento')
  useEffect(() => escucharColeccion('registros_patio', () => recargar(true), { cantidad: 1 }), [recargar])
  return (
    <>
      <Encabezado
        codigo="B01"
        titulo={`Hola, ${perfil.nombre}`}
        descripcion="Informá el colchón de caña en patio cada vez que cambie."
        acciones={
          <BotonLink to="/bascula/carros" variante="primario" icono="patio" className="min-h-14 text-base">
            Registrar carros
          </BotonLink>
        }
      />
      {cargando && !datos && <Cargando />}
      {error && <ErrorCarga error={error} alReintentar={recargar} />}
      {datos && (
        <Seccion titulo="Último registro">
          {datos.calculo ? (
            <Colchon calculo={datos.calculo} fechaHora={datos.ultimo.fecha_hora} fabricaParada={datos.fabrica_parada} carrosParaReanudar={datos.carros_para_reanudar} grande />
          ) : (
            <Vacio titulo="Todavía no hay registros." accion={<BotonLink to="/bascula/carros" variante="primario">Registrar el primero</BotonLink>} />
          )}
        </Seccion>
      )}
    </>
  )
}
