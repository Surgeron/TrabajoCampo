import { Navigate, useLocation } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout/MainLayout";
import Button from "../components/ui/Button/Button";
import EmptyState from "../components/ui/EmptyState/EmptyState";
import { Cargando } from "../components/ui/Spinner/Spinner";
import { useDatos } from "../context/DatosContext";
import { useSesion } from "../context/SesionContext";
import { ROLES_INFO } from "../domain/constantes";
import { tituloDeRuta } from "./navegacion";

/**
 * Control de acceso: exige sesión, sucursal (para mozo y cocinero) y uno de los roles indicados.
 * Si el rol activo no corresponde, muestra un aviso en lugar de la pantalla.
 */
export default function RutaProtegida({ roles, children }) {
  const { cargando } = useDatos();
  const { usuario, rol, sucursal, requiereSucursal } = useSesion();
  const location = useLocation();

  if (cargando) return <Cargando texto="Cargando datos…" />;
  if (!usuario) return <Navigate to="/login" replace state={{ desde: location.pathname }} />;
  if (requiereSucursal && !sucursal) return <Navigate to="/sucursal" replace />;

  const permitido = !roles || roles.includes(rol);
  return (
    <MainLayout title={permitido ? tituloDeRuta(location.pathname) : "Acceso restringido"}>
      {permitido ? (
        children
      ) : (
        <EmptyState
          icono="anular"
          titulo="Tu rol actual no tiene acceso a esta sección"
          accion={
            <Button onClick={() => window.history.back()} variante="secundario">
              Volver
            </Button>
          }
        >
          Estás trabajando como {ROLES_INFO[rol]?.label}. Si tenés otro rol, cambialo desde tu cuenta.
        </EmptyState>
      )}
    </MainLayout>
  );
}

/** Redirige a la pantalla inicial del rol (o al login). */
export function RedireccionInicio() {
  const { cargando } = useDatos();
  const { usuario, rol } = useSesion();
  if (cargando) return <Cargando texto="Cargando datos…" />;
  if (!usuario) return <Navigate to="/login" replace />;
  return <Navigate to={ROLES_INFO[rol].inicio} replace />;
}
