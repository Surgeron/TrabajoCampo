import { Navigate, useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button/Button";
import Icon from "../../components/ui/Icon/Icon";
import { Cargando } from "../../components/ui/Spinner/Spinner";
import { useDatos } from "../../context/DatosContext";
import { useSesion } from "../../context/SesionContext";
import { ESTADOS_ACTIVOS } from "../../domain/estados";
import { ROLES_INFO } from "../../domain/constantes";
import { sucursalesActivas } from "../../domain/selectores";
import "./SucursalPage.css";

/** CU-02 Seleccionar sucursal. Queda fija para la sesión y visible en la barra superior. */
export default function SucursalPage() {
  const { datos, cargando } = useDatos();
  const { usuario, rol, sucursal, seleccionarSucursal, cerrar } = useSesion();
  const navigate = useNavigate();

  if (cargando) return <Cargando />;
  if (!usuario) return <Navigate to="/login" replace />;
  if (sucursal && usuario.idSucursalTrabajo === sucursal.id) return <Navigate to={ROLES_INFO[rol].inicio} replace />;

  const sucursales = sucursalesActivas(datos);

  const elegir = (id) => {
    seleccionarSucursal(id);
    navigate(ROLES_INFO[rol].inicio, { replace: true });
  };

  return (
    <div className="sucursal">
      <div className="sucursal__contenido">
        <h1>¿Dónde vas a trabajar hoy?</h1>
        <p className="sucursal__ayuda">
          {usuario.nombre}, elegí el hotel. Vas a ver y registrar solo lo de esa sucursal.
        </p>
        <div className="sucursal__lista">
          {sucursales.map((s) => {
            const abiertas = datos.comandas.filter((c) => c.idSucursal === s.id && ESTADOS_ACTIVOS.includes(c.estado)).length;
            return (
              <button
                key={s.id}
                type="button"
                className={`sucursal__opcion ${sucursal?.id === s.id ? "sucursal__opcion--actual" : ""}`}
                onClick={() => elegir(s.id)}
              >
                <span className="sucursal__icono">
                  <Icon nombre="sucursal" tamano={28} />
                </span>
                <span className="sucursal__datos">
                  <strong>{s.nombre}</strong>
                  <span>{s.ubicacion}</span>
                  <span>
                    Comedor para {s.capacidadComedor} personas · {abiertas} comanda{abiertas === 1 ? "" : "s"} abierta
                    {abiertas === 1 ? "" : "s"}
                  </span>
                </span>
                <Icon nombre="derecha" />
              </button>
            );
          })}
        </div>
        {sucursales.length === 0 && <p>No hay sucursales activas. Consultá con el administrador.</p>}
        <Button variante="fantasma" icono="salir" onClick={cerrar}>
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
