const formatoMoneda = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const formatoNumero = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

export const formatMoneda = (valor) => formatoMoneda.format(Number(valor) || 0);
export const formatNumero = (valor) => formatoNumero.format(Number(valor) || 0);

/** 0003-00001234 */
export function formatComprobante(factura) {
  if (!factura) return "—";
  const pv = String(factura.puntoVenta).padStart(4, "0");
  const numero = String(factura.numero).padStart(8, "0");
  return `${factura.tipoComprobante} ${pv}-${numero}`;
}

export const formatNumeroComanda = (numero) => `N° ${String(numero).padStart(4, "0")}`;

export function nombreCompleto(persona) {
  if (!persona) return "—";
  return `${persona.apellido}, ${persona.nombre}`;
}

/** Normaliza texto para búsquedas sin tildes ni mayúsculas. */
export function normalizar(texto = "") {
  return String(texto)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function generarId(prefijo) {
  const aleatorio = Math.random().toString(36).slice(2, 8);
  return `${prefijo}-${Date.now().toString(36)}${aleatorio}`;
}
