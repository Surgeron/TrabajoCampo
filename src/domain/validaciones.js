// Validaciones de formularios y de entidades. Se usan en el frontend (para avisar
// mientras se completa) y en el backend simulado (para rechazar datos inválidos).
import { normalizar } from "../utils/formato";
import { MESA_MAXIMA } from "./constantes";

export const soloDigitos = (valor = "") => String(valor).replace(/\D/g, "");

/** CUIT/CUIL argentino: 11 dígitos con dígito verificador válido. */
export function cuitValido(valor) {
  const digitos = soloDigitos(valor);
  if (digitos.length !== 11) return false;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((acc, peso, i) => acc + peso * Number(digitos[i]), 0);
  let verificador = 11 - (suma % 11);
  if (verificador === 11) verificador = 0;
  if (verificador === 10) verificador = 9;
  return verificador === Number(digitos[10]);
}

/** Completa un CUIT de 10 dígitos con su dígito verificador (para datos de ejemplo). */
export function conDigitoVerificador(base10) {
  const digitos = soloDigitos(base10);
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((acc, peso, i) => acc + peso * Number(digitos[i]), 0);
  let verificador = 11 - (suma % 11);
  if (verificador === 11) verificador = 0;
  if (verificador === 10) verificador = 9;
  return formatCuit(`${digitos}${verificador}`);
}

export function formatCuit(valor) {
  const d = soloDigitos(valor);
  if (d.length !== 11) return valor;
  return `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}`;
}

const vacio = (valor) => valor === undefined || valor === null || String(valor).trim() === "";

const existeOtro = (lista, item, comparar) => lista.some((otro) => otro.id !== item.id && comparar(otro));

/** Errores de la cabecera de una comanda (CU-03). */
export function validarComanda({ tipoCliente, idTrabajador, mesa, items }) {
  const errores = {};
  if (!tipoCliente) errores.tipoCliente = "Indicá si el cliente tiene convenio.";
  if (tipoCliente === "convenio" && !idTrabajador) errores.idTrabajador = "Elegí el trabajador.";
  const numeroMesa = Number(mesa);
  if (vacio(mesa)) errores.mesa = "Ingresá el número de mesa.";
  else if (!Number.isInteger(numeroMesa) || numeroMesa < 1 || numeroMesa > MESA_MAXIMA) {
    errores.mesa = `La mesa debe ser un número entre 1 y ${MESA_MAXIMA}.`;
  }
  if (!items || items.length === 0) errores.items = "Agregá al menos un ítem al pedido.";
  return errores;
}

/** Errores de un pago (CU-07). */
export function validarPago(pago) {
  const errores = {};
  if (!pago.medio) errores.medio = "Elegí el medio de pago.";
  if (!(Number(pago.monto) > 0)) errores.monto = "El monto debe ser mayor a cero.";
  if (pago.ordenante && soloDigitos(pago.ordenante).length === 11 && !cuitValido(pago.ordenante)) {
    errores.ordenante = "El CUIT del ordenante no es válido.";
  }
  return errores;
}

/** Errores de los datos de una factura de Tango (CU-07, CU-08). */
export function validarFactura(factura) {
  const errores = {};
  if (!factura.tipoComprobante) errores.tipoComprobante = "Elegí el tipo de comprobante.";
  const pv = Number(factura.puntoVenta);
  if (!Number.isInteger(pv) || pv < 1 || pv > 9999) errores.puntoVenta = "Punto de venta: entre 1 y 9999.";
  const numero = Number(factura.numero);
  if (!Number.isInteger(numero) || numero < 1 || numero > 99999999) errores.numero = "Número: entre 1 y 99999999.";
  if (vacio(factura.fecha)) errores.fecha = "Ingresá la fecha de la factura.";
  if (vacio(factura.clienteFacturado)) errores.clienteFacturado = "Ingresá a nombre de quién se facturó.";
  if (!vacio(factura.cuitCliente) && !cuitValido(factura.cuitCliente)) errores.cuitCliente = "CUIT inválido.";
  if (factura.tipoComprobante === "Factura A" && vacio(factura.cuitCliente)) {
    errores.cuitCliente = "La factura A requiere el CUIT del cliente.";
  }
  if (!(Number(factura.importe) > 0)) errores.importe = "El importe debe ser mayor a cero.";
  return errores;
}

export const mismaFactura = (a, b) =>
  a.tipoComprobante === b.tipoComprobante &&
  Number(a.puntoVenta) === Number(b.puntoVenta) &&
  Number(a.numero) === Number(b.numero);

/** Validaciones de maestros (CU-14). Reciben la base para detectar duplicados. */
export const validadoresMaestros = {
  usuarios(db, u) {
    const e = {};
    if (vacio(u.nombre)) e.nombre = "Ingresá el nombre.";
    if (vacio(u.apellido)) e.apellido = "Ingresá el apellido.";
    if (vacio(u.nombreUsuario)) e.nombreUsuario = "Ingresá el nombre de usuario.";
    else if (!/^[a-z0-9._]{3,30}$/.test(u.nombreUsuario)) {
      e.nombreUsuario = "Solo minúsculas, números, punto o guion bajo (3 a 30).";
    } else if (existeOtro(db.usuarios, u, (o) => o.nombreUsuario === u.nombreUsuario)) {
      e.nombreUsuario = "Ya existe un usuario con ese nombre.";
    }
    if (!u.id && vacio(u.password)) e.password = "Ingresá una contraseña.";
    if (!vacio(u.password) && String(u.password).length < 4) e.password = "Mínimo 4 caracteres.";
    if (!u.roles || u.roles.length === 0) e.roles = "Asigná al menos un rol.";
    return e;
  },
  sucursales(db, s) {
    const e = {};
    if (vacio(s.nombre)) e.nombre = "Ingresá el nombre.";
    else if (existeOtro(db.sucursales, s, (o) => normalizar(o.nombre) === normalizar(s.nombre))) {
      e.nombre = "Ya existe una sucursal con ese nombre.";
    }
    if (vacio(s.ubicacion)) e.ubicacion = "Ingresá la ubicación.";
    const capacidad = Number(s.capacidadComedor);
    if (!Number.isInteger(capacidad) || capacidad < 1) e.capacidadComedor = "Capacidad: número entero mayor a 0.";
    return e;
  },
  empresas(db, emp) {
    const e = {};
    if (vacio(emp.razonSocial)) e.razonSocial = "Ingresá la razón social.";
    else if (existeOtro(db.empresas, emp, (o) => normalizar(o.razonSocial) === normalizar(emp.razonSocial))) {
      e.razonSocial = "Ya existe una empresa con esa razón social.";
    }
    if (vacio(emp.cuit)) e.cuit = "Ingresá el CUIT.";
    else if (!cuitValido(emp.cuit)) e.cuit = "CUIT inválido (11 dígitos con dígito verificador).";
    else if (existeOtro(db.empresas, emp, (o) => soloDigitos(o.cuit) === soloDigitos(emp.cuit))) {
      e.cuit = "Ya existe una empresa con ese CUIT.";
    }
    return e;
  },
  trabajadores(db, t) {
    const e = {};
    if (vacio(t.nombre)) e.nombre = "Ingresá el nombre.";
    if (vacio(t.apellido)) e.apellido = "Ingresá el apellido.";
    if (vacio(t.idEmpresa)) e.idEmpresa = "Elegí la empresa.";
    if (!vacio(t.dni) && !/^\d{7,8}$/.test(soloDigitos(t.dni))) e.dni = "El DNI tiene 7 u 8 dígitos.";
    if (
      !e.nombre &&
      !e.apellido &&
      existeOtro(
        db.trabajadores,
        t,
        (o) =>
          o.idEmpresa === t.idEmpresa &&
          normalizar(o.nombre) === normalizar(t.nombre) &&
          normalizar(o.apellido) === normalizar(t.apellido),
      )
    ) {
      e.apellido = "Ese trabajador ya está cargado en la empresa.";
    }
    if (!vacio(t.dni) && existeOtro(db.trabajadores, t, (o) => o.dni && soloDigitos(o.dni) === soloDigitos(t.dni))) {
      e.dni = "Ya existe un trabajador con ese DNI.";
    }
    return e;
  },
  convenios(db, c) {
    const e = {};
    if (vacio(c.idEmpresa)) e.idEmpresa = "Elegí la empresa.";
    if (vacio(c.fechaDesde)) e.fechaDesde = "Ingresá la fecha de inicio.";
    if (!vacio(c.fechaHasta) && c.fechaHasta < c.fechaDesde) e.fechaHasta = "Debe ser posterior al inicio.";
    const corte = Number(c.diaCorte);
    if (!Number.isInteger(corte) || corte < 1 || corte > 28) e.diaCorte = "Día de corte entre 1 y 28.";
    if (!c.coberturas || !c.coberturas.some((cob) => cob.cubierto)) {
      e.coberturas = "El convenio debe cubrir al menos un producto.";
    }
    (c.coberturas || []).forEach((cob) => {
      if (!vacio(cob.cantidadMaximaPorDia) && !(Number(cob.cantidadMaximaPorDia) >= 1)) {
        e.coberturas = "La cantidad máxima por día debe ser 1 o más.";
      }
    });
    const hasta = (conv) => conv.fechaHasta || "9999-12-31";
    if (
      c.activo !== false &&
      !e.idEmpresa &&
      !e.fechaDesde &&
      existeOtro(
        db.convenios,
        c,
        (o) => o.activo && o.idEmpresa === c.idEmpresa && o.fechaDesde <= hasta(c) && c.fechaDesde <= hasta(o),
      )
    ) {
      e.fechaDesde = "Se superpone con otro convenio activo de la misma empresa.";
    }
    return e;
  },
  productos(db, p) {
    const e = {};
    if (vacio(p.nombre)) e.nombre = "Ingresá el nombre.";
    else if (existeOtro(db.productos, p, (o) => normalizar(o.nombre) === normalizar(p.nombre))) {
      e.nombre = "Ya existe un producto con ese nombre.";
    }
    if (vacio(p.idCategoria)) e.idCategoria = "Elegí la categoría.";
    Object.entries(p.precios || {}).forEach(([idSucursal, precio]) => {
      if (!precio.activo) return;
      if (!(Number(precio.precio) > 0)) e[`precio_${idSucursal}`] = "Precio mayor a cero.";
      if (vacio(precio.codigoTango)) e[`codigo_${idSucursal}`] = "Ingresá el código de Tango.";
      else if (
        db.productos.some(
          (o) => o.id !== p.id && o.precios?.[idSucursal]?.codigoTango === precio.codigoTango,
        )
      ) {
        e[`codigo_${idSucursal}`] = "Ese código ya está usado en esta sucursal.";
      }
    });
    if (!Object.values(p.precios || {}).some((precio) => precio.activo)) {
      e.precios = "Habilitá el producto en al menos una sucursal.";
    }
    return e;
  },
  insumos(db, i) {
    const e = {};
    if (vacio(i.nombre)) e.nombre = "Ingresá el nombre.";
    else if (existeOtro(db.insumos, i, (o) => normalizar(o.nombre) === normalizar(i.nombre))) {
      e.nombre = "Ya existe un insumo con ese nombre.";
    }
    if (vacio(i.unidad)) e.unidad = "Elegí la unidad de medida.";
    if (vacio(i.codigoTango)) e.codigoTango = "Ingresá el código de Tango.";
    else if (existeOtro(db.insumos, i, (o) => o.codigoTango === i.codigoTango)) {
      e.codigoTango = "Ese código ya está usado.";
    }
    return e;
  },
  motivosDesperdicio(db, m) {
    const e = {};
    if (vacio(m.descripcion)) e.descripcion = "Ingresá la descripción.";
    else if (
      existeOtro(db.motivosDesperdicio, m, (o) => normalizar(o.descripcion) === normalizar(m.descripcion))
    ) {
      e.descripcion = "Ese motivo ya existe.";
    }
    return e;
  },
};

/** Errores de un movimiento de depósito (CU-10). */
export function validarMovimiento(mov) {
  const errores = {};
  if (!mov.tipo) errores.tipo = "Elegí retiro o devolución.";
  const lineas = mov.detalle || [];
  if (lineas.length === 0) errores.detalle = "Agregá al menos un insumo.";
  lineas.forEach((linea, i) => {
    if (!linea.idInsumo) errores[`insumo_${i}`] = "Elegí el insumo.";
    if (!(Number(linea.cantidad) > 0)) errores[`cantidad_${i}`] = "Cantidad mayor a cero.";
  });
  const ids = lineas.map((l) => l.idInsumo).filter(Boolean);
  if (new Set(ids).size !== ids.length) errores.detalle = "Hay un insumo repetido: sumá las cantidades en una sola línea.";
  return errores;
}

/** Errores de un registro de desperdicio (CU-11). */
export function validarDesperdicio(desp, motivo) {
  const errores = {};
  if (!desp.tipo) errores.tipo = "Elegí insumo o plato.";
  if (desp.tipo === "insumo" && !desp.idInsumo) errores.idInsumo = "Elegí el insumo.";
  if (desp.tipo === "plato" && !desp.idProducto) errores.idProducto = "Elegí el plato.";
  if (!(Number(desp.cantidad) > 0)) errores.cantidad = "Cantidad mayor a cero.";
  if (!desp.idMotivo) errores.idMotivo = "Elegí el motivo.";
  if (motivo && normalizar(motivo.descripcion) === "otro" && vacio(desp.observacion)) {
    errores.observacion = "Con el motivo «Otro», la observación es obligatoria.";
  }
  return errores;
}

export const tieneErrores = (errores) => Object.keys(errores).length > 0;
