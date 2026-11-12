import { useMemo } from "react";
import { useDatos } from "../context/DatosContext";
import { useSesion } from "../context/SesionContext";
import { ESTADOS, TIPOS_CLIENTE } from "../domain/constantes";
import { ESTADOS_EN_COCINA } from "../domain/estados";

/** Pendientes que se muestran en el menú y en los inicios (en la sucursal activa, si la hay). */
export function useContadores() {
  const { datos } = useDatos();
  const { sucursal } = useSesion();

  return useMemo(() => {
    if (!datos) return {};
    const comandas = sucursal ? datos.comandas.filter((c) => c.idSucursal === sucursal.id) : datos.comandas;
    return {
      enCocina: comandas.filter((c) => ESTADOS_EN_COCINA.includes(c.estado)).length,
      listas: comandas.filter((c) => c.estado === ESTADOS.LISTO).length,
      entregadas: comandas.filter((c) => c.estado === ESTADOS.ENTREGADO).length,
      sinFacturar: comandas.filter(
        (c) => c.estado === ESTADOS.COBRADO_SIN_FACTURAR && c.tipoCliente === TIPOS_CLIENTE.PARTICULAR,
      ).length,
    };
  }, [datos, sucursal]);
}
