import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ROLES_INFO } from "../domain/constantes";
import { getSucursal } from "../domain/selectores";
import { iniciarSesion } from "../services/mockApi";
import { useDatos } from "./DatosContext";

const CLAVE_SESION = "trazaplato.sesion";
const SesionContext = createContext(null);

function leerSesionGuardada() {
  try {
    return JSON.parse(window.localStorage.getItem(CLAVE_SESION)) || null;
  } catch {
    return null;
  }
}

/**
 * Sesión del empleado: usuario, rol activo (puede tener varios) y sucursal donde opera.
 * Mozo y cocinero necesitan sucursal; finanzas, supervisor y administrador filtran por sucursal en cada pantalla.
 */
export function SesionProvider({ children }) {
  const { datos } = useDatos();
  const [sesion, setSesion] = useState(leerSesionGuardada);

  useEffect(() => {
    try {
      if (sesion) window.localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
      else window.localStorage.removeItem(CLAVE_SESION);
    } catch {
      // Sin almacenamiento la sesión dura hasta recargar.
    }
  }, [sesion]);

  const usuario = useMemo(
    () => (sesion && datos ? datos.usuarios.find((u) => u.id === sesion.idUsuario) || null : null),
    [sesion, datos],
  );

  // Si el administrador desactiva al usuario o le quita el rol activo, la sesión se ajusta.
  useEffect(() => {
    if (!sesion || !datos) return;
    if (!usuario || !usuario.activo) {
      setSesion(null);
      return;
    }
    if (!usuario.roles.includes(sesion.rol)) {
      setSesion((actual) => ({ ...actual, rol: usuario.roles[0] }));
    }
  }, [sesion, datos, usuario]);

  const iniciar = useCallback(async (nombreUsuario, password) => {
    const encontrado = await iniciarSesion(nombreUsuario, password);
    const rol = encontrado.roles[0];
    setSesion({
      idUsuario: encontrado.id,
      rol,
      idSucursal: encontrado.idSucursalTrabajo || null,
    });
    return encontrado;
  }, []);

  const cerrar = useCallback(() => setSesion(null), []);

  const cambiarRol = useCallback((rol) => setSesion((actual) => ({ ...actual, rol })), []);

  const seleccionarSucursal = useCallback(
    (idSucursal) => setSesion((actual) => ({ ...actual, idSucursal })),
    [],
  );

  const valor = useMemo(() => {
    const rol = sesion?.rol || null;
    // Una sucursal desactivada por el administrador deja de ser válida para operar.
    const encontrada = sesion?.idSucursal && datos ? getSucursal(datos, sesion.idSucursal) : null;
    const sucursal = encontrada?.activo ? encontrada : null;
    return {
      usuario,
      rol,
      sucursal,
      requiereSucursal: rol ? ROLES_INFO[rol].requiereSucursal : false,
      /** Lo que el backend recibe para autorizar cada operación. */
      contextoApi: sesion ? { idUsuario: sesion.idUsuario, rol, idSucursal: sesion.idSucursal } : null,
      iniciar,
      cerrar,
      cambiarRol,
      seleccionarSucursal,
    };
  }, [sesion, usuario, datos, iniciar, cerrar, cambiarRol, seleccionarSucursal]);

  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion() {
  const contexto = useContext(SesionContext);
  if (!contexto) throw new Error("useSesion debe usarse dentro de SesionProvider");
  return contexto;
}
