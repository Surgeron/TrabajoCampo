import { useMemo } from "react";
import { armarItems, consumosDelDia, evaluarCobertura } from "../domain/reglas";
import { convenioVigente, getTrabajador } from "../domain/selectores";
import { fechaISO } from "../utils/fechas";

/**
 * Evalúa en vivo el pedido contra el convenio del trabajador (CU-03 / CU-06).
 * Devuelve la evaluación y una función para marcar cada producto en el selector.
 */
export function useCobertura(datos, { idTrabajador, cantidades, idSucursal, fecha = fechaISO() }) {
  return useMemo(() => {
    if (!datos || !idTrabajador) return { evaluacion: null, estadoCobertura: null };
    const trabajador = getTrabajador(datos, idTrabajador);
    const convenio = trabajador ? convenioVigente(datos, trabajador.idEmpresa, fecha) : null;
    const items = armarItems(datos, cantidades, idSucursal);
    const evaluacion = evaluarCobertura(datos, { idTrabajador, items, fecha });
    const consumidos = consumosDelDia(datos, idTrabajador, fecha);

    const estadoCobertura = (idProducto) => {
      const cobertura = convenio?.coberturas.find((c) => c.idProducto === idProducto);
      if (!cobertura || !cobertura.cubierto) return { tono: "peligro", texto: "No cubierto" };
      if (!cobertura.cantidadMaximaPorDia) return { tono: "exito", texto: "Cubierto" };
      const quedan = Math.max(0, cobertura.cantidadMaximaPorDia - (consumidos[idProducto] || 0));
      return {
        tono: quedan > 0 ? "alerta" : "peligro",
        texto: quedan > 0 ? `Máx. ${cobertura.cantidadMaximaPorDia}/día · quedan ${quedan}` : "Límite diario alcanzado",
      };
    };
    return { evaluacion, estadoCobertura };
  }, [datos, idTrabajador, cantidades, idSucursal, fecha]);
}
