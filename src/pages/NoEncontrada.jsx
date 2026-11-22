import { useAuth } from '../context/AuthContext'
import { BASE_ROL } from '../config/navegacion'
import { BotonLink, Vacio } from '../components/ui'

export default function NoEncontrada() {
  const { perfil } = useAuth()
  return (
    <Vacio
      titulo="Esta pantalla no existe."
      accion={
        <BotonLink to={BASE_ROL[perfil?.rol] || '/'} variante="primario">
          Ir al inicio
        </BotonLink>
      }
    >
      Revisá la dirección o volvé al inicio de tu rol.
    </Vacio>
  )
}
