// Consultas de solo lectura sobre los datos. No modifican nada.
import { ESTADOS, TIPOS_CLIENTE } from "./constantes";
import { fechaISO } from "../utils/fechas";

const porId = (lista, id) => lista.find((item) => item.id === id) || null;

export const getSucursal = (db, id) => porId(db.sucursales, id);
export const getUsuario = (db, id) => porId(db.usuarios, id);
export const getEmpresa = (db, id) => porId(db.empresas, id);
export const getTrabajador = (db, id) => porId(db.trabajadores, id);
export const getProducto = (db, id) => porId(db.productos, id);
export const getCategoria = (db, id) => porId(db.categorias, id);
export const getInsumo = (db, id) => porId(db.insumos, id);
export const getMotivo = (db, id) => porId(db.motivosDesperdicio, id);
export const getComanda = (db, id) => porId(db.comandas, id);
export const getConvenio = (db, id) => porId(db.convenios, id);

export const sucursalesActivas = (db) => db.sucursales.filter((s) => s.activo);
export const empresasActivas = (db) => db.empresas.filter((e) => e.activo);

export function nombreUsuario(db, id) {
  const usuario = getUsuario(db, id);
  return usuario ? `${usuario.nombre} ${usuario.apellido}` : "—";
}

/** Convenio vigente de la empresa en la fecha dada, o null. */
export function convenioVigente(db, idEmpresa, fecha = fechaISO()) {
  return (
    db.convenios.find(
      (c) =>
        c.idEmpresa === idEmpresa &&
        c.activo &&
        c.fechaDesde <= fecha &&
        (!c.fechaHasta || c.fechaHasta >= fecha),
    ) || null
  );
}

/** Empresas activas con un convenio vigente hoy. */
export function empresasConConvenio(db, fecha = fechaISO()) {
  return empresasActivas(db).filter((e) => convenioVigente(db, e.id, fecha));
}

export const trabajadoresDeEmpresa = (db, idEmpresa) =>
  db.trabajadores.filter((t) => t.idEmpresa === idEmpresa && t.activo);

/** Producto vendible en la sucursal: activo y con precio activo cargado. */
export function precioEnSucursal(producto, idSucursal) {
  const precio = producto.precios?.[idSucursal];
  return precio && precio.activo ? precio : null;
}

export function productosVendibles(db, idSucursal) {
  return db.productos.filter((p) => p.activo && precioEnSucursal(p, idSucursal));
}

export function comandasDeSucursal(db, idSucursal) {
  return db.comandas.filter((c) => c.idSucursal === idSucursal);
}

export function etiquetaCliente(db, comanda) {
  const trabajador = comanda.idTrabajador ? getTrabajador(db, comanda.idTrabajador) : null;
  if (comanda.tipoCliente === TIPOS_CLIENTE.PARTICULAR) {
    // Comanda aparte: consumo no cubierto que paga el propio trabajador.
    return trabajador ? `Fuera de convenio · ${trabajador.apellido}, ${trabajador.nombre}` : "Particular";
  }
  const empresa = trabajador ? getEmpresa(db, trabajador.idEmpresa) : null;
  return trabajador ? `${trabajador.apellido}, ${trabajador.nombre} · ${empresa?.razonSocial || ""}` : "Convenio";
}

export function empresaDeComanda(db, comanda) {
  const trabajador = comanda.idTrabajador ? getTrabajador(db, comanda.idTrabajador) : null;
  return trabajador ? getEmpresa(db, trabajador.idEmpresa) : null;
}

export const pagosDeComanda = (db, idComanda) =>
  db.pagos.filter((p) => p.aplicaciones.some((a) => a.idComanda === idComanda));

export const facturasDeComanda = (db, idComanda) =>
  db.facturas.filter((f) => f.comandas.includes(idComanda));

export function mediosDePago(db, comanda) {
  if (comanda.estado === ESTADOS.CUENTA_CORRIENTE) return ["cuenta_corriente"];
  return [...new Set(pagosDeComanda(db, comanda.id).map((p) => p.medio))];
}

/** Punto de venta de la última factura registrada en la sucursal (para precargar el formulario). */
export function puntoVentaSugerido(db, idSucursal) {
  const ids = new Set(db.comandas.filter((c) => c.idSucursal === idSucursal).map((c) => c.id));
  const ultima = [...db.facturas].reverse().find((f) => f.comandas.some((id) => ids.has(id)));
  return ultima ? String(ultima.puntoVenta) : "";
}

/** Comanda aparte generada a partir de esta (consumos no cubiertos). */
export const comandaAparteDe = (db, idComanda) =>
  db.comandas.filter((c) => c.idComandaOrigen === idComanda);
