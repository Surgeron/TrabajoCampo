import { ESTADOS, ROLES, TIPOS_CLIENTE } from "./constantes";

const { INICIADO, ADICION, LISTO, ENTREGADO, CUENTA_CORRIENTE, COBRADO_SIN_FACTURAR, FACTURADO, ANULADO } =
  ESTADOS;

/** Estados en los que la comanda sigue en el salón (todavía no se cerró). */
export const ESTADOS_ACTIVOS = [INICIADO, ADICION, LISTO, ENTREGADO];

/** Estados que la cocina tiene que preparar. */
export const ESTADOS_EN_COCINA = [INICIADO, ADICION];

export const ESTADOS_FINALES = [CUENTA_CORRIENTE, FACTURADO, ANULADO];

export const puedeAgregarAdicion = (comanda) => [INICIADO, ADICION, LISTO, ENTREGADO].includes(comanda.estado);

export const puedeMarcarListo = (comanda) => ESTADOS_EN_COCINA.includes(comanda.estado);

export const puedeMarcarEntregado = (comanda) => comanda.estado === LISTO;

export const puedeCobrar = (comanda) => comanda.estado === ENTREGADO;

export const puedeCompletarFactura = (comanda) =>
  comanda.estado === COBRADO_SIN_FACTURAR && comanda.tipoCliente === TIPOS_CLIENTE.PARTICULAR;

/**
 * CU-09: el mozo solo anula en Iniciado; después de pasar por cocina, solo el supervisor.
 * Nunca se anula una comanda cerrada (cuenta corriente, cobrada o facturada).
 */
export function puedeAnular(comanda, rolActivo) {
  if (rolActivo === ROLES.MOZO) return comanda.estado === INICIADO;
  if (rolActivo === ROLES.SUPERVISOR) return [INICIADO, ADICION, LISTO, ENTREGADO].includes(comanda.estado);
  return false;
}

export function motivoNoAnulable(comanda, rolActivo) {
  if (puedeAnular(comanda, rolActivo)) return null;
  if ([CUENTA_CORRIENTE, FACTURADO].includes(comanda.estado)) {
    return "Una comanda en cuenta corriente o facturada no se anula: la corrección es una nota de crédito en Tango.";
  }
  if (comanda.estado === COBRADO_SIN_FACTURAR) return "La comanda ya tiene un pago registrado.";
  if (comanda.estado === ANULADO) return "La comanda ya está anulada.";
  if (rolActivo === ROLES.MOZO) return "Después de pasar por cocina, solo el supervisor puede anular.";
  return "Tu rol no puede anular comandas.";
}
