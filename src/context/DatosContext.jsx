import { createContext, useContext, useEffect, useState } from "react";
import { cargarDatos, obtenerDatos, suscribirse } from "../services/mockApi";

const DatosContext = createContext(null);

/**
 * Expone la "base de datos" simulada como estado de React y la mantiene al día:
 * cada operación (o un cambio en otra pestaña) vuelve a renderizar las pantallas,
 * como lo haría un listener de Firestore.
 */
export function DatosProvider({ children }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;
    cargarDatos()
      .then((inicial) => activo && setDatos(inicial))
      .catch(() => activo && setError("No se pudieron cargar los datos."));
    const desuscribir = suscribirse((nuevos) => setDatos(nuevos));
    return () => {
      activo = false;
      desuscribir();
    };
  }, []);

  return (
    <DatosContext.Provider value={{ datos: datos || (error ? obtenerDatos() : null), cargando: !datos && !error, error }}>
      {children}
    </DatosContext.Provider>
  );
}

export function useDatos() {
  const contexto = useContext(DatosContext);
  if (!contexto) throw new Error("useDatos debe usarse dentro de DatosProvider");
  return contexto;
}
