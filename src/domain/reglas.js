// Reglas de negocio puras: reciben datos y devuelven resultados, sin efectos.
import { ESTADOS, TIPOS_CLIENTE } from "./constantes";
import { convenioVigente, getCategoria, getProducto, getTrabajador, precioEnSucursal } from "./selectores";

/** Turno según la hora del día: desayuno, almuerzo, merienda o cena. */
export function turnoPorHora(fechaHora) {
  const hora = new Date(fechaHora).getHours();
  if (hora >= 5 && hora < 11) return "desayuno";
  if (hora >= 11 && hora < 16) return "almuerzo";
  if (hora >= 16 && hora < 19) return "merienda";
  return "cena";
}

/**
 * Turno de la comanda: el de la primera comida pedida; si solo hay bebidas,
 * el que corresponde a la hora de alta.
 */
export function determinarTurno(db, items, fechaHora) {
  for (const item of items) {
    const producto = getProducto(db, item.idProducto);
    const categoria = producto && getCategoria(db, producto.idCategoria);
    if (categoria?.turno) return categoria.turno;
  }
  return turnoPorHora(fechaHora);
}

export const calcularTotal = (items) =>
  items.reduce((total, item) => total + item.cantidad * item.precioUnitario, 0);

/** Convierte { idProducto: cantidad } en ítems con precio de la sucursal. */
export function armarItems(db, cantidades, idSucursal) {
  return Object.entries(cantidades)
    .filter(([, cantidad]) => cantidad > 0)
    .map(([idProducto, cantidad]) => {
      const producto = getProducto(db, idProducto);
      const precio = producto ? precioEnSucursal(producto, idSucursal) : null;
      return {
        idProducto,
        nombre: producto?.nombre || "Producto",
        cantidad,
        precioUnitario: precio?.precio || 0,
      };
    });
}

/** Cantidad de cada producto que el trabajador ya consumió en el día (comandas de convenio no anuladas). */
export function consumosDelDia(db, idTrabajador, fecha, excluirComandaId = null) {
  const consumos = {};
  db.comandas
    .filter(
      (c) =>
        c.idTrabajador === idTrabajador &&
        c.tipoCliente === TIPOS_CLIENTE.CONVENIO &&
        c.estado !== ESTADOS.ANULADO &&
        c.fechaHora.slice(0, 10) === fecha &&
        c.id !== excluirComandaId,
    )
    .forEach((c) =>
      c.items.forEach((item) => {
        consumos[item.idProducto] = (consumos[item.idProducto] || 0) + item.cantidad;
      }),
    );
  return consumos;
}

/**
 * Valida los ítems contra el convenio vigente del trabajador.
 * Devuelve qué cantidades cubre el convenio y cuáles quedan fuera (y por qué).
 * Un producto sin cobertura cargada se considera no cubierto.
 */
export function evaluarCobertura(db, { idTrabajador, items, fecha }) {
  const trabajador = getTrabajador(db, idTrabajador);
  const convenio = trabajador ? convenioVigente(db, trabajador.idEmpresa, fecha) : null;
  const cubiertos = [];
  const noCubiertos = [];

  if (!convenio) {
    items.forEach((item) => noCubiertos.push({ ...item, motivo: "La empresa no tiene un convenio vigente." }));
    return { convenio: null, cubiertos, noCubiertos };
  }

  // Incluye lo ya pedido en la propia comanda cuando se trata de una adición.
  const consumidos = consumosDelDia(db, idTrabajador, fecha);
  items.forEach((item) => {
    const cobertura = convenio.coberturas.find((c) => c.idProducto === item.idProducto);
    if (!cobertura || !cobertura.cubierto) {
      noCubiertos.push({ ...item, motivo: "No está cubierto por el convenio." });
      return;
    }
    if (!cobertura.cantidadMaximaPorDia) {
      cubiertos.push(item);
      return;
    }
    const yaConsumido = consumidos[item.idProducto] || 0;
    const disponible = Math.max(0, cobertura.cantidadMaximaPorDia - yaConsumido);
    const cantidadCubierta = Math.min(disponible, item.cantidad);
    if (cantidadCubierta > 0) cubiertos.push({ ...item, cantidad: cantidadCubierta });
    if (item.cantidad > cantidadCubierta) {
      noCubiertos.push({
        ...item,
        cantidad: item.cantidad - cantidadCubierta,
        motivo: `Supera el máximo diario del convenio (${cobertura.cantidadMaximaPorDia} por día).`,
      });
    }
    consumidos[item.idProducto] = yaConsumido + cantidadCubierta;
  });

  return { convenio, cubiertos, noCubiertos };
}

/** Descripción breve de las restricciones del convenio para mostrar al mozo. */
export function describirCoberturas(db, convenio) {
  if (!convenio) return { cubiertos: [], noCubiertos: [] };
  const cubiertos = [];
  const noCubiertos = [];
  db.productos
    .filter((p) => p.activo)
    .forEach((producto) => {
      const cobertura = convenio.coberturas.find((c) => c.idProducto === producto.id);
      if (cobertura?.cubierto) {
        cubiertos.push(
          cobertura.cantidadMaximaPorDia
            ? `${producto.nombre} (máx. ${cobertura.cantidadMaximaPorDia}/día)`
            : producto.nombre,
        );
      } else {
        noCubiertos.push(producto.nombre);
      }
    });
  return { cubiertos, noCubiertos };
}

/**
 * Reparte los pagos entre las comandas en orden (una transferencia puede pagar varias
 * comandas y una comanda puede tener varios pagos).
 */
export function distribuirPagos(pagos, comandas) {
  const pendientes = comandas.map((c) => ({ idComanda: c.id, saldo: c.total }));
  return pagos.map((pago) => {
    let restante = pago.monto;
    const aplicaciones = [];
    pendientes.forEach((p) => {
      if (restante <= 0 || p.saldo <= 0) return;
      const aplicado = Math.min(restante, p.saldo);
      aplicaciones.push({ idComanda: p.idComanda, montoAplicado: aplicado });
      p.saldo -= aplicado;
      restante -= aplicado;
    });
    return { ...pago, aplicaciones };
  });
}

/** Números faltantes en una secuencia correlativa. */
export function saltosDeNumeracion(numeros) {
  if (numeros.length === 0) return [];
  const ordenados = [...numeros].sort((a, b) => a - b);
  const faltantes = [];
  for (let n = ordenados[0]; n <= ordenados[ordenados.length - 1]; n += 1) {
    if (!ordenados.includes(n)) faltantes.push(n);
  }
  return faltantes;
}
