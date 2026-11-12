// Valores fijos del dominio. Cambian solo con una decisión de diseño.

export const ROLES = {
  MOZO: "mozo",
  COCINERO: "cocinero",
  FINANZAS: "finanzas",
  SUPERVISOR: "supervisor",
  ADMINISTRADOR: "administrador",
};

export const ROLES_INFO = {
  [ROLES.MOZO]: { label: "Mozo", inicio: "/inicio", requiereSucursal: true },
  [ROLES.COCINERO]: { label: "Cocinero", inicio: "/cocina", requiereSucursal: true },
  [ROLES.FINANZAS]: { label: "Finanzas", inicio: "/informes", requiereSucursal: false },
  [ROLES.SUPERVISOR]: { label: "Supervisor", inicio: "/informes", requiereSucursal: false },
  [ROLES.ADMINISTRADOR]: { label: "Administrador", inicio: "/admin", requiereSucursal: false },
};

export const ESTADOS = {
  INICIADO: "iniciado",
  ADICION: "adicion",
  LISTO: "listo",
  ENTREGADO: "entregado",
  CUENTA_CORRIENTE: "cuenta_corriente",
  COBRADO_SIN_FACTURAR: "cobrado_sin_facturar",
  FACTURADO: "facturado",
  ANULADO: "anulado",
};

export const ESTADOS_INFO = {
  [ESTADOS.INICIADO]: { label: "Iniciado", tono: "info" },
  [ESTADOS.ADICION]: { label: "Adición de pedido", tono: "violeta" },
  [ESTADOS.LISTO]: { label: "Listo para entregar", tono: "exito" },
  [ESTADOS.ENTREGADO]: { label: "Entregado", tono: "naranja" },
  [ESTADOS.CUENTA_CORRIENTE]: { label: "Cuenta corriente", tono: "neutro" },
  [ESTADOS.COBRADO_SIN_FACTURAR]: { label: "Cobrado sin facturar", tono: "alerta" },
  [ESTADOS.FACTURADO]: { label: "Facturado", tono: "neutro" },
  [ESTADOS.ANULADO]: { label: "Anulado", tono: "peligro" },
};

export const TIPOS_CLIENTE = { CONVENIO: "convenio", PARTICULAR: "particular" };

export const TURNOS = [
  { id: "desayuno", label: "Desayuno" },
  { id: "almuerzo", label: "Almuerzo" },
  { id: "merienda", label: "Merienda" },
  { id: "cena", label: "Cena" },
];

export const MEDIOS_PAGO = {
  EFECTIVO: "efectivo",
  TRANSFERENCIA: "transferencia",
};

export const MEDIOS_PAGO_INFO = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  cuenta_corriente: "Cuenta corriente",
};

export const TIPOS_COMPROBANTE = ["Factura A", "Factura B", "Factura C"];

export const UNIDADES = [
  { id: "kg", label: "kg" },
  { id: "L", label: "L" },
  { id: "unidad", label: "unidad" },
];

export const TIPOS_MOVIMIENTO = { RETIRO: "retiro", DEVOLUCION: "devolucion" };

export const MAX_INTENTOS_LOGIN = 5;
export const MINUTOS_BLOQUEO_LOGIN = 5;
export const MESA_MAXIMA = 99;
