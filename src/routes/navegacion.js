import { ROLES } from "../domain/constantes";

const { MOZO, COCINERO, FINANZAS, SUPERVISOR, ADMINISTRADOR } = ROLES;

/**
 * Secciones del menú por rol. "principal" marca las que van en la barra inferior del celular
 * (máximo 4; el resto queda en el menú lateral), con "etiquetaCorta" si el nombre no entra.
 * "contador" vincula un número de pendientes.
 */
export const NAVEGACION = [
  { id: "inicio", ruta: "/inicio", etiqueta: "Inicio", icono: "inicio", roles: [MOZO], principal: true },
  { id: "nueva", ruta: "/comandas/nueva", etiqueta: "Nueva comanda", etiquetaCorta: "Nueva", icono: "mas", roles: [MOZO], principal: true },
  { id: "comandas", ruta: "/comandas", etiqueta: "Comandas", icono: "comandas", roles: [MOZO], principal: true, contador: "listas" },
  {
    id: "sin-facturar",
    ruta: "/facturas-pendientes",
    etiqueta: "Sin facturar",
    icono: "factura",
    roles: [MOZO, FINANZAS],
    principal: true,
    contador: "sinFacturar",
  },
  { id: "cocina", ruta: "/cocina", etiqueta: "Cocina", icono: "cocina", roles: [COCINERO], principal: true, contador: "enCocina" },
  { id: "deposito", ruta: "/deposito", etiqueta: "Depósito", icono: "deposito", roles: [COCINERO], principal: true },
  { id: "desperdicio", ruta: "/desperdicio", etiqueta: "Desperdicio", icono: "desperdicio", roles: [COCINERO], principal: true },
  { id: "informes", ruta: "/informes", etiqueta: "Informes", icono: "informes", roles: [FINANZAS, SUPERVISOR], principal: true },
  { id: "consulta", ruta: "/consulta", etiqueta: "Consultar comandas", etiquetaCorta: "Consultar", icono: "buscar", roles: [FINANZAS, SUPERVISOR], principal: true },
  { id: "admin", ruta: "/admin", etiqueta: "Administración", etiquetaCorta: "Admin.", icono: "ajustes", roles: [ADMINISTRADOR], principal: true },
];

export const navegacionDelRol = (rol) => NAVEGACION.filter((item) => item.roles.includes(rol));

/** Título de la barra superior según la ruta actual. */
export function tituloDeRuta(ruta) {
  if (ruta.startsWith("/comandas/nueva")) return "Nueva comanda";
  if (/^\/comandas\/[^/]+/.test(ruta)) return "Detalle de comanda";
  if (ruta.startsWith("/cobrar")) return "Cobrar";
  const item = [...NAVEGACION].sort((a, b) => b.ruta.length - a.ruta.length).find((i) => ruta.startsWith(i.ruta));
  return item ? item.etiqueta : "TrazaPlato";
}
