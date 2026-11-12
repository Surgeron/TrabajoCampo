// Backend simulado. Reemplaza a la API real (Python + Firestore) durante el prototipo:
// - guarda los datos en localStorage,
// - responde con latencia, como lo haría una red,
// - valida permisos y reglas de negocio y rechaza con ApiError,
// - avisa los cambios a los suscriptores (como onSnapshot de Firestore), también entre pestañas.
//
// Para integrar el backend real, se reemplaza este módulo manteniendo las mismas funciones.

import { crearDatosIniciales, VERSION_DATOS } from "../data/datosIniciales";
import {
  ESTADOS,
  ESTADOS_INFO,
  MAX_INTENTOS_LOGIN,
  MINUTOS_BLOQUEO_LOGIN,
  ROLES,
  TIPOS_CLIENTE,
} from "../domain/constantes";
import {
  puedeAgregarAdicion,
  puedeAnular,
  motivoNoAnulable,
  puedeCobrar,
  puedeCompletarFactura,
  puedeMarcarEntregado,
  puedeMarcarListo,
} from "../domain/estados";
import { getInforme as getInformeDefinido } from "../domain/informes";
import { armarItems, calcularTotal, determinarTurno, distribuirPagos, evaluarCobertura } from "../domain/reglas";
import { convenioVigente, getInsumo, getMotivo, getProducto, getTrabajador, precioEnSucursal } from "../domain/selectores";
import {
  formatCuit,
  mismaFactura,
  soloDigitos,
  tieneErrores,
  validadoresMaestros,
  validarComanda,
  validarDesperdicio,
  validarFactura,
  validarMovimiento,
  validarPago,
} from "../domain/validaciones";
import { fechaHoraISO, fechaISO } from "../utils/fechas";
import { formatComprobante, formatNumeroComanda, generarId } from "../utils/formato";

const CLAVE_DATOS = "trazaplato.datos";
const CLAVE_INTENTOS = "trazaplato.intentosLogin";
const LATENCIA = { lectura: 450, escritura: 350 };

export class ApiError extends Error {
  constructor(codigo, mensaje, detalles = null) {
    super(mensaje);
    this.name = "ApiError";
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

// ---------------------------------------------------------------------------
// Almacenamiento y suscripciones
// ---------------------------------------------------------------------------

const almacenamiento = {
  leer(clave) {
    try {
      const texto = window.localStorage.getItem(clave);
      return texto ? JSON.parse(texto) : null;
    } catch {
      return null;
    }
  },
  escribir(clave, valor) {
    try {
      window.localStorage.setItem(clave, JSON.stringify(valor));
      return true;
    } catch {
      return false;
    }
  },
};

function cargarDatosGuardados() {
  const guardados = almacenamiento.leer(CLAVE_DATOS);
  if (guardados && guardados.version === VERSION_DATOS) return guardados;
  const nuevos = crearDatosIniciales();
  almacenamiento.escribir(CLAVE_DATOS, nuevos);
  return nuevos;
}

let db = cargarDatosGuardados();
const suscriptores = new Set();

const notificar = () => suscriptores.forEach((callback) => callback(db));

// Otra pestaña guardó cambios: se reflejan acá también (simula el tiempo real).
if (typeof window !== "undefined") {
  window.addEventListener("storage", (evento) => {
    if (evento.key !== CLAVE_DATOS || !evento.newValue) return;
    try {
      db = JSON.parse(evento.newValue);
      notificar();
    } catch {
      // Se ignora un valor corrupto.
    }
  });
}

export const obtenerDatos = () => db;

export function suscribirse(callback) {
  suscriptores.add(callback);
  return () => suscriptores.delete(callback);
}

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Lectura inicial con latencia (pantalla de carga). */
export async function cargarDatos() {
  await esperar(LATENCIA.lectura);
  return db;
}

/**
 * Ejecuta una operación de escritura sobre una copia de los datos.
 * Si la operación lanza un error, no se guarda nada (todo o nada).
 */
async function transaccion(operacion) {
  await esperar(LATENCIA.escritura);
  const borrador = structuredClone(db);
  const resultado = operacion(borrador);
  if (!almacenamiento.escribir(CLAVE_DATOS, borrador)) {
    throw new ApiError("ALMACENAMIENTO", "No se pudo guardar en el navegador (espacio lleno o bloqueado).");
  }
  db = borrador;
  notificar();
  return resultado === undefined ? undefined : structuredClone(resultado);
}

// ---------------------------------------------------------------------------
// Ayudantes de permisos y entidades
// ---------------------------------------------------------------------------

function exigirRol(sesion, roles) {
  if (!sesion || !roles.includes(sesion.rol)) {
    throw new ApiError("PERMISO", "Tu rol no tiene permiso para esta operación.");
  }
}

function exigirSucursal(sesion) {
  if (!sesion.idSucursal) throw new ApiError("SUCURSAL", "Elegí una sucursal antes de operar.");
}

function buscarComanda(datos, idComanda, sesion) {
  const comanda = datos.comandas.find((c) => c.id === idComanda);
  if (!comanda) throw new ApiError("NO_ENCONTRADO", "La comanda no existe.");
  if (sesion.idSucursal && comanda.idSucursal !== sesion.idSucursal && [ROLES.MOZO, ROLES.COCINERO].includes(sesion.rol)) {
    throw new ApiError("PERMISO", "La comanda pertenece a otra sucursal.");
  }
  return comanda;
}

function errorDeEstado(comanda, accion) {
  return new ApiError(
    "ESTADO",
    `No se puede ${accion}: la comanda ${formatNumeroComanda(comanda.numero)} está en «${ESTADOS_INFO[comanda.estado].label}».`,
  );
}

function cambiarEstado(comanda, estadoNuevo, sesion, motivo = null) {
  comanda.historial.push({
    estadoAnterior: comanda.estado,
    estadoNuevo,
    fechaHora: fechaHoraISO(),
    idUsuario: sesion.idUsuario,
    motivo,
  });
  comanda.estado = estadoNuevo;
}

function siguienteNumero(datos, idSucursal, tipo) {
  if (!datos.contadores[idSucursal]) datos.contadores[idSucursal] = { comanda: 0, movimiento: 0 };
  datos.contadores[idSucursal][tipo] += 1;
  return datos.contadores[idSucursal][tipo];
}

function itemsConId(items, idAdicion = null) {
  return items.map((item) => ({ ...item, id: generarId("it"), idAdicion }));
}

function nuevaComanda(datos, sesion, campos) {
  const fechaHora = fechaHoraISO();
  const comanda = {
    id: generarId("com"),
    numero: siguienteNumero(datos, sesion.idSucursal, "comanda"),
    idSucursal: sesion.idSucursal,
    idMozo: sesion.idUsuario,
    fechaHora,
    turno: determinarTurno(datos, campos.items, fechaHora),
    firmoControlDiario: false,
    adiciones: [],
    observaciones: "",
    idComandaOrigen: null,
    idConvenio: null,
    idTrabajador: null,
    ...campos,
    estado: ESTADOS.INICIADO,
    historial: [{ estadoAnterior: null, estadoNuevo: ESTADOS.INICIADO, fechaHora, idUsuario: sesion.idUsuario, motivo: null }],
  };
  comanda.total = calcularTotal(comanda.items);
  datos.comandas.push(comanda);
  return comanda;
}

function errorNoCubierto(noCubiertos) {
  return new ApiError(
    "NO_CUBIERTO",
    "Hay consumos que el convenio no cubre.",
    { noCubiertos },
  );
}

function validarItemsVendibles(datos, cantidades, idSucursal) {
  Object.entries(cantidades).forEach(([idProducto, cantidad]) => {
    if (!(cantidad > 0)) return;
    const producto = getProducto(datos, idProducto);
    if (!producto || !producto.activo || !precioEnSucursal(producto, idSucursal)) {
      throw new ApiError("PRODUCTO", `«${producto?.nombre || idProducto}» no está disponible en esta sucursal.`);
    }
    if (!Number.isInteger(cantidad) || cantidad > 50) {
      throw new ApiError("CANTIDAD", "Las cantidades deben ser enteras y no mayores a 50.");
    }
  });
}

function trabajadorConConvenio(datos, idTrabajador, fecha) {
  const trabajador = getTrabajador(datos, idTrabajador);
  if (!trabajador || !trabajador.activo) throw new ApiError("TRABAJADOR", "El trabajador no está activo en el listado.");
  const convenio = convenioVigente(datos, trabajador.idEmpresa, fecha);
  if (!convenio) {
    throw new ApiError("SIN_CONVENIO", "La empresa del trabajador no tiene un convenio vigente. Registrá el pedido como particular.");
  }
  return { trabajador, convenio };
}

// ---------------------------------------------------------------------------
// CU-01 Iniciar sesión
// ---------------------------------------------------------------------------

export async function iniciarSesion(nombreUsuario, password) {
  await esperar(LATENCIA.escritura);
  const clave = String(nombreUsuario || "").trim().toLowerCase();
  if (!clave || !password) throw new ApiError("DATOS", "Ingresá usuario y contraseña.");

  const intentos = almacenamiento.leer(CLAVE_INTENTOS) || {};
  const registro = intentos[clave] || { fallidos: 0, bloqueadoHasta: null };
  if (registro.bloqueadoHasta && new Date(registro.bloqueadoHasta) > new Date()) {
    const minutos = Math.ceil((new Date(registro.bloqueadoHasta) - new Date()) / 60000);
    throw new ApiError(
      "BLOQUEADO",
      `Usuario bloqueado por ${MAX_INTENTOS_LOGIN} intentos fallidos. Probá de nuevo en ${minutos} min.`,
    );
  }

  const usuario = db.usuarios.find((u) => u.nombreUsuario === clave);
  if (!usuario || usuario.password !== password) {
    registro.fallidos += 1;
    if (registro.fallidos >= MAX_INTENTOS_LOGIN) {
      registro.bloqueadoHasta = new Date(Date.now() + MINUTOS_BLOQUEO_LOGIN * 60000).toISOString();
      registro.fallidos = 0;
    }
    intentos[clave] = registro;
    almacenamiento.escribir(CLAVE_INTENTOS, intentos);
    const restantes = MAX_INTENTOS_LOGIN - registro.fallidos;
    throw new ApiError(
      "CREDENCIALES",
      registro.bloqueadoHasta
        ? `Usuario bloqueado por ${MINUTOS_BLOQUEO_LOGIN} minutos.`
        : `Usuario o contraseña incorrectos. Te quedan ${restantes} intento${restantes === 1 ? "" : "s"}.`,
    );
  }
  if (!usuario.activo) throw new ApiError("INACTIVO", "El usuario está desactivado. Consultá con el administrador.");

  delete intentos[clave];
  almacenamiento.escribir(CLAVE_INTENTOS, intentos);
  const { password: _omitida, ...publico } = usuario;
  return publico;
}

// ---------------------------------------------------------------------------
// CU-03 Registrar comanda
// ---------------------------------------------------------------------------

/**
 * @param {object} pedido { tipoCliente, idTrabajador, mesa, cantidades: {idProducto: n}, observaciones, generarAparte }
 * Si el convenio no cubre algún ítem y no se confirmó generarAparte, rechaza con NO_CUBIERTO.
 */
export function registrarComanda(pedido, sesion) {
  return transaccion((datos) => {
    exigirRol(sesion, [ROLES.MOZO]);
    exigirSucursal(sesion);
    validarItemsVendibles(datos, pedido.cantidades, sesion.idSucursal);
    const items = armarItems(datos, pedido.cantidades, sesion.idSucursal);
    const errores = validarComanda({ ...pedido, items });
    if (tieneErrores(errores)) throw new ApiError("VALIDACION", Object.values(errores)[0], errores);

    const base = { mesa: Number(pedido.mesa), observaciones: (pedido.observaciones || "").trim() };

    if (pedido.tipoCliente === TIPOS_CLIENTE.PARTICULAR) {
      return [nuevaComanda(datos, sesion, { ...base, tipoCliente: TIPOS_CLIENTE.PARTICULAR, items: itemsConId(items) })];
    }

    const hoy = fechaISO();
    const { trabajador, convenio } = trabajadorConConvenio(datos, pedido.idTrabajador, hoy);
    const { cubiertos, noCubiertos } = evaluarCobertura(datos, { idTrabajador: trabajador.id, items, fecha: hoy });
    if (noCubiertos.length > 0 && !pedido.generarAparte) throw errorNoCubierto(noCubiertos);

    const creadas = [];
    let principal = null;
    if (cubiertos.length > 0) {
      principal = nuevaComanda(datos, sesion, {
        ...base,
        tipoCliente: TIPOS_CLIENTE.CONVENIO,
        idTrabajador: trabajador.id,
        idConvenio: convenio.id,
        items: itemsConId(cubiertos),
      });
      creadas.push(principal);
    }
    if (noCubiertos.length > 0) {
      creadas.push(
        nuevaComanda(datos, sesion, {
          ...base,
          tipoCliente: TIPOS_CLIENTE.PARTICULAR,
          idTrabajador: trabajador.id,
          idComandaOrigen: principal?.id || null,
          items: itemsConId(noCubiertos.map(({ motivo: _m, ...item }) => item)),
        }),
      );
    }
    return creadas;
  });
}

// ---------------------------------------------------------------------------
// CU-04 / CU-05 Cambios de estado en cocina y salón
// ---------------------------------------------------------------------------

export function marcarListo(idComanda, sesion) {
  return transaccion((datos) => {
    exigirRol(sesion, [ROLES.COCINERO]);
    const comanda = buscarComanda(datos, idComanda, sesion);
    if (!puedeMarcarListo(comanda)) throw errorDeEstado(comanda, "marcarla como lista");
    cambiarEstado(comanda, ESTADOS.LISTO, sesion);
    return comanda;
  });
}

export function marcarEntregado(idComanda, sesion) {
  return transaccion((datos) => {
    exigirRol(sesion, [ROLES.MOZO]);
    const comanda = buscarComanda(datos, idComanda, sesion);
    if (!puedeMarcarEntregado(comanda)) throw errorDeEstado(comanda, "marcarla como entregada");
    cambiarEstado(comanda, ESTADOS.ENTREGADO, sesion);
    return comanda;
  });
}

// ---------------------------------------------------------------------------
// CU-06 Agregar adición
// ---------------------------------------------------------------------------

export function agregarAdicion(idComanda, { cantidades, generarAparte }, sesion) {
  return transaccion((datos) => {
    exigirRol(sesion, [ROLES.MOZO]);
    const comanda = buscarComanda(datos, idComanda, sesion);
    if (!puedeAgregarAdicion(comanda)) {
      throw new ApiError(
        "ESTADO",
        `La comanda está en «${ESTADOS_INFO[comanda.estado].label}»: registrá una comanda nueva.`,
      );
    }
    validarItemsVendibles(datos, cantidades, comanda.idSucursal);
    const items = armarItems(datos, cantidades, comanda.idSucursal);
    if (items.length === 0) throw new ApiError("VALIDACION", "Agregá al menos un ítem.");

    let cubiertos = items;
    let noCubiertos = [];
    if (comanda.tipoCliente === TIPOS_CLIENTE.CONVENIO) {
      const fecha = comanda.fechaHora.slice(0, 10);
      trabajadorConConvenio(datos, comanda.idTrabajador, fecha);
      ({ cubiertos, noCubiertos } = evaluarCobertura(datos, { idTrabajador: comanda.idTrabajador, items, fecha }));
      if (noCubiertos.length > 0 && !generarAparte) throw errorNoCubierto(noCubiertos);
    }

    const resultado = { comanda: null, aparte: null };
    if (cubiertos.length > 0) {
      const adicion = { id: generarId("adi"), fechaHora: fechaHoraISO(), idUsuario: sesion.idUsuario };
      comanda.adiciones.push(adicion);
      comanda.items.push(...itemsConId(cubiertos, adicion.id));
      comanda.total = calcularTotal(comanda.items);
      cambiarEstado(comanda, ESTADOS.ADICION, sesion);
      resultado.comanda = comanda;
    }
    if (noCubiertos.length > 0) {
      resultado.aparte = nuevaComanda(
        datos,
        { ...sesion, idSucursal: comanda.idSucursal },
        {
          mesa: comanda.mesa,
          tipoCliente: TIPOS_CLIENTE.PARTICULAR,
          idTrabajador: comanda.idTrabajador,
          idComandaOrigen: comanda.id,
          items: itemsConId(noCubiertos.map(({ motivo: _m, ...item }) => item)),
        },
      );
    }
    return resultado;
  });
}

// ---------------------------------------------------------------------------
// CU-07 Cobrar comanda
// ---------------------------------------------------------------------------

export function cerrarCuentaCorriente(idComanda, { firmoControlDiario }, sesion) {
  return transaccion((datos) => {
    exigirRol(sesion, [ROLES.MOZO]);
    const comanda = buscarComanda(datos, idComanda, sesion);
    if (comanda.tipoCliente !== TIPOS_CLIENTE.CONVENIO) {
      throw new ApiError("TIPO", "Solo las comandas de convenio se cierran en cuenta corriente.");
    }
    if (!puedeCobrar(comanda)) throw errorDeEstado(comanda, "cerrarla");
    if (!firmoControlDiario) {
      throw new ApiError("FIRMA", "Confirmá que el trabajador firmó el Control diario de servicio.");
    }
    comanda.firmoControlDiario = true;
    cambiarEstado(comanda, ESTADOS.CUENTA_CORRIENTE, sesion);
    return comanda;
  });
}

/**
 * Registra las facturas de Tango para un grupo de comandas.
 * Si un número ya existe, rechaza con FACTURA_DUPLICADA salvo que se confirme
 * que es un pago compartido: en ese caso se vincula la factura existente.
 */
function vincularFacturas(datos, comandas, facturas, { confirmarCompartida, exigirImporte }, sesion) {
  const total = comandas.reduce((suma, c) => suma + c.total, 0);
  facturas.forEach((factura, i) => {
    const errores = validarFactura(factura);
    if (tieneErrores(errores)) {
      throw new ApiError("VALIDACION", `Factura ${i + 1}: ${Object.values(errores)[0]}`, { indice: i, errores });
    }
    if (facturas.some((otra, j) => j !== i && mismaFactura(otra, factura))) {
      throw new ApiError("VALIDACION", `La factura ${formatComprobante(factura)} está repetida en el formulario.`);
    }
  });

  const existentes = facturas
    .map((factura) => ({ factura, existente: datos.facturas.find((f) => mismaFactura(f, factura)) }))
    .filter((par) => par.existente);
  if (existentes.length > 0 && !confirmarCompartida) {
    const { factura, existente } = existentes[0];
    const numeros = existente.comandas
      .map((id) => datos.comandas.find((c) => c.id === id))
      .filter(Boolean)
      .map((c) => formatNumeroComanda(c.numero));
    throw new ApiError(
      "FACTURA_DUPLICADA",
      `La factura ${formatComprobante(factura)} ya está vinculada a la comanda ${numeros.join(", ")}.`,
      { comprobante: formatComprobante(factura), comandas: numeros },
    );
  }

  const nuevas = facturas.filter((f) => !datos.facturas.some((existente) => mismaFactura(existente, f)));
  if (exigirImporte && existentes.length === 0) {
    const sumaFacturas = nuevas.reduce((suma, f) => suma + Number(f.importe), 0);
    if (Math.abs(sumaFacturas - total) > 0.5) {
      throw new ApiError(
        "IMPORTE",
        `La suma de las facturas (${sumaFacturas}) no coincide con el total de las comandas (${total}).`,
      );
    }
  }

  const idsComandas = comandas.map((c) => c.id);
  existentes.forEach(({ existente }) => {
    const registro = datos.facturas.find((f) => f.id === existente.id);
    registro.comandas = [...new Set([...registro.comandas, ...idsComandas])];
  });
  nuevas.forEach((f) => {
    datos.facturas.push({
      id: generarId("fac"),
      tipoComprobante: f.tipoComprobante,
      puntoVenta: Number(f.puntoVenta),
      numero: Number(f.numero),
      fecha: f.fecha,
      clienteFacturado: f.clienteFacturado.trim(),
      cuitCliente: f.cuitCliente ? formatCuit(f.cuitCliente) : "",
      importe: Number(f.importe),
      idUsuario: sesion.idUsuario,
      comandas: idsComandas,
    });
  });
}

/**
 * @param {object} cobro { idsComandas, pagos: [{medio, monto, ordenante, numeroOperacion}], facturas: [...], confirmarCompartida }
 */
export function cobrarComandas(cobro, sesion) {
  return transaccion((datos) => {
    exigirRol(sesion, [ROLES.MOZO]);
    const comandas = cobro.idsComandas.map((id) => buscarComanda(datos, id, sesion));
    if (comandas.length === 0) throw new ApiError("VALIDACION", "Elegí al menos una comanda.");
    comandas.forEach((c) => {
      if (c.tipoCliente !== TIPOS_CLIENTE.PARTICULAR) {
        throw new ApiError("TIPO", `La comanda ${formatNumeroComanda(c.numero)} es de convenio: se cierra en cuenta corriente.`);
      }
      if (!puedeCobrar(c)) throw errorDeEstado(c, "cobrarla");
    });

    const total = comandas.reduce((suma, c) => suma + c.total, 0);
    if (!cobro.pagos || cobro.pagos.length === 0) throw new ApiError("VALIDACION", "Registrá al menos un pago.");
    cobro.pagos.forEach((pago, i) => {
      const errores = validarPago(pago);
      if (tieneErrores(errores)) throw new ApiError("VALIDACION", `Pago ${i + 1}: ${Object.values(errores)[0]}`);
    });
    const pagado = cobro.pagos.reduce((suma, p) => suma + Number(p.monto), 0);
    if (Math.abs(pagado - total) > 0.5) {
      throw new ApiError("IMPORTE", `Los pagos suman ${pagado} y el total a cobrar es ${total}.`);
    }

    const facturas = cobro.facturas || [];
    if (facturas.length > 0) {
      vincularFacturas(datos, comandas, facturas, { confirmarCompartida: cobro.confirmarCompartida, exigirImporte: true }, sesion);
    }

    const fechaHora = fechaHoraISO();
    const pagos = distribuirPagos(
      cobro.pagos.map((p) => ({
        id: generarId("pago"),
        fechaHora,
        medio: p.medio,
        monto: Number(p.monto),
        ordenante: (p.ordenante || "").trim(),
        numeroOperacion: (p.numeroOperacion || "").trim(),
        idUsuario: sesion.idUsuario,
      })),
      comandas,
    );
    datos.pagos.push(...pagos);

    const estadoFinal = facturas.length > 0 ? ESTADOS.FACTURADO : ESTADOS.COBRADO_SIN_FACTURAR;
    comandas.forEach((c) => cambiarEstado(c, estadoFinal, sesion));
    return { comandas, estado: estadoFinal };
  });
}

// ---------------------------------------------------------------------------
// CU-08 Completar datos de factura
// ---------------------------------------------------------------------------

export function completarFacturas({ idsComandas, facturas, confirmarCompartida }, sesion) {
  return transaccion((datos) => {
    exigirRol(sesion, [ROLES.MOZO, ROLES.FINANZAS]);
    const comandas = idsComandas.map((id) => buscarComanda(datos, id, sesion));
    if (comandas.length === 0) throw new ApiError("VALIDACION", "Elegí al menos una comanda.");
    comandas.forEach((c) => {
      if (!puedeCompletarFactura(c)) throw errorDeEstado(c, "cargarle la factura");
    });
    if (!facturas || facturas.length === 0) throw new ApiError("VALIDACION", "Cargá los datos de la factura.");
    vincularFacturas(datos, comandas, facturas, { confirmarCompartida, exigirImporte: true }, sesion);
    comandas.forEach((c) => cambiarEstado(c, ESTADOS.FACTURADO, sesion));
    return comandas;
  });
}

// ---------------------------------------------------------------------------
// CU-09 Anular comanda
// ---------------------------------------------------------------------------

export function anularComanda(idComanda, motivo, sesion) {
  return transaccion((datos) => {
    exigirRol(sesion, [ROLES.MOZO, ROLES.SUPERVISOR]);
    const comanda = buscarComanda(datos, idComanda, sesion);
    const texto = (motivo || "").trim();
    if (texto.length < 5) throw new ApiError("VALIDACION", "El motivo es obligatorio (mínimo 5 caracteres).");
    if (!puedeAnular(comanda, sesion.rol)) throw new ApiError("ESTADO", motivoNoAnulable(comanda, sesion.rol));
    cambiarEstado(comanda, ESTADOS.ANULADO, sesion, texto);
    return comanda;
  });
}

// ---------------------------------------------------------------------------
// CU-10 Registrar retiro de depósito
// ---------------------------------------------------------------------------

export function registrarMovimiento(movimiento, sesion) {
  return transaccion((datos) => {
    exigirRol(sesion, [ROLES.COCINERO]);
    exigirSucursal(sesion);
    const errores = validarMovimiento(movimiento);
    if (tieneErrores(errores)) throw new ApiError("VALIDACION", Object.values(errores)[0], errores);
    movimiento.detalle.forEach((linea) => {
      const insumo = getInsumo(datos, linea.idInsumo);
      if (!insumo || !insumo.activo) throw new ApiError("INSUMO", "Hay un insumo que ya no está activo.");
    });
    const registro = {
      id: generarId("mov"),
      numero: siguienteNumero(datos, sesion.idSucursal, "movimiento"),
      tipo: movimiento.tipo,
      idSucursal: sesion.idSucursal,
      idUsuario: sesion.idUsuario,
      fechaHora: fechaHoraISO(),
      turno: movimiento.turno || null,
      detalle: movimiento.detalle.map((l) => ({ idInsumo: l.idInsumo, cantidad: Number(l.cantidad) })),
    };
    datos.movimientos.push(registro);
    return registro;
  });
}

// ---------------------------------------------------------------------------
// CU-11 Registrar desperdicio
// ---------------------------------------------------------------------------

export function registrarDesperdicio(desperdicio, sesion) {
  return transaccion((datos) => {
    exigirRol(sesion, [ROLES.COCINERO]);
    exigirSucursal(sesion);
    const motivo = getMotivo(datos, desperdicio.idMotivo);
    const errores = validarDesperdicio(desperdicio, motivo);
    if (tieneErrores(errores)) throw new ApiError("VALIDACION", Object.values(errores)[0], errores);
    const insumo = desperdicio.tipo === "insumo" ? getInsumo(datos, desperdicio.idInsumo) : null;
    const registro = {
      id: generarId("desp"),
      idSucursal: sesion.idSucursal,
      idUsuario: sesion.idUsuario,
      fechaHora: fechaHoraISO(),
      tipo: desperdicio.tipo,
      idInsumo: desperdicio.tipo === "insumo" ? desperdicio.idInsumo : null,
      idProducto: desperdicio.tipo === "plato" ? desperdicio.idProducto : null,
      cantidad: Number(desperdicio.cantidad),
      unidad: insumo ? insumo.unidad : "unidad",
      idMotivo: desperdicio.idMotivo,
      observacion: (desperdicio.observacion || "").trim(),
    };
    datos.desperdicios.push(registro);
    return registro;
  });
}

// ---------------------------------------------------------------------------
// CU-12 Generar informe
// ---------------------------------------------------------------------------

export async function generarInforme(idInforme, filtros, sesion) {
  await esperar(LATENCIA.lectura);
  exigirRol(sesion, [ROLES.FINANZAS, ROLES.SUPERVISOR]);
  const informe = getInformeDefinido(idInforme);
  if (!informe) throw new ApiError("INFORME", "El tipo de informe no existe.");
  if (!filtros.desde || !filtros.hasta) throw new ApiError("VALIDACION", "Indicá el rango de fechas.");
  if (filtros.desde > filtros.hasta) throw new ApiError("VALIDACION", "La fecha «desde» es posterior a «hasta».");
  (informe.requiere || []).forEach((campo) => {
    if (!filtros[campo]) throw new ApiError("VALIDACION", "Completá los filtros obligatorios.");
  });
  return structuredClone(informe.generar(db, filtros));
}

// ---------------------------------------------------------------------------
// CU-13 Consultar comanda e historial
// ---------------------------------------------------------------------------

/** Búsqueda por número, fechas, sucursal, estado, trabajador o número de factura. */
export async function buscarComandas(filtros, sesion) {
  await esperar(LATENCIA.lectura);
  exigirRol(sesion, [ROLES.FINANZAS, ROLES.SUPERVISOR]);
  const texto = (valor) => String(valor || "").trim().toLowerCase();
  const numero = Number(filtros.numero);
  const trabajador = texto(filtros.trabajador);
  const factura = Number(String(filtros.factura || "").replace(/\D/g, ""));
  if (filtros.desde && filtros.hasta && filtros.desde > filtros.hasta) {
    throw new ApiError("VALIDACION", "La fecha «desde» es posterior a «hasta».");
  }
  const resultados = db.comandas.filter((c) => {
    const fecha = c.fechaHora.slice(0, 10);
    if (filtros.numero && c.numero !== numero) return false;
    if (filtros.desde && fecha < filtros.desde) return false;
    if (filtros.hasta && fecha > filtros.hasta) return false;
    if (filtros.idSucursal && c.idSucursal !== filtros.idSucursal) return false;
    if (filtros.estado && c.estado !== filtros.estado) return false;
    if (trabajador) {
      const t = c.idTrabajador ? getTrabajador(db, c.idTrabajador) : null;
      if (!t || !`${t.apellido} ${t.nombre}`.toLowerCase().includes(trabajador)) return false;
    }
    if (factura) {
      const vinculada = db.facturas.some((f) => f.comandas.includes(c.id) && Number(f.numero) === factura);
      if (!vinculada) return false;
    }
    return true;
  });
  return resultados.sort((a, b) => b.fechaHora.localeCompare(a.fechaHora)).map((c) => c.id);
}

// ---------------------------------------------------------------------------
// CU-14 Administrar maestros
// ---------------------------------------------------------------------------

export const COLECCIONES_MAESTRAS = [
  "usuarios",
  "sucursales",
  "empresas",
  "trabajadores",
  "convenios",
  "productos",
  "insumos",
  "motivosDesperdicio",
];

const PREFIJOS = {
  usuarios: "usr",
  sucursales: "suc",
  empresas: "emp",
  trabajadores: "trab",
  convenios: "conv",
  productos: "prod",
  insumos: "ins",
  motivosDesperdicio: "mot",
};

function normalizarMaestro(coleccion, registro) {
  const r = { ...registro };
  Object.keys(r).forEach((clave) => {
    if (typeof r[clave] === "string") r[clave] = r[clave].trim();
  });
  if (coleccion === "usuarios") r.nombreUsuario = (r.nombreUsuario || "").toLowerCase();
  if (coleccion === "empresas") r.cuit = formatCuit(r.cuit);
  if (coleccion === "trabajadores") r.dni = soloDigitos(r.dni);
  if (coleccion === "sucursales") r.capacidadComedor = Number(r.capacidadComedor);
  if (coleccion === "convenios") {
    r.diaCorte = Number(r.diaCorte);
    r.fechaHasta = r.fechaHasta || null;
    r.coberturas = (r.coberturas || []).map((c) => ({
      idProducto: c.idProducto,
      cubierto: Boolean(c.cubierto),
      cantidadMaximaPorDia: c.cantidadMaximaPorDia ? Number(c.cantidadMaximaPorDia) : null,
    }));
  }
  if (coleccion === "productos") {
    const precios = {};
    Object.entries(r.precios || {}).forEach(([idSucursal, p]) => {
      precios[idSucursal] = { precio: Number(p.precio) || 0, codigoTango: (p.codigoTango || "").trim(), activo: Boolean(p.activo) };
    });
    r.precios = precios;
  }
  return r;
}

export function guardarMaestro(coleccion, registro, sesion) {
  return transaccion((datos) => {
    exigirRol(sesion, [ROLES.ADMINISTRADOR]);
    if (!COLECCIONES_MAESTRAS.includes(coleccion)) throw new ApiError("COLECCION", "Colección desconocida.");
    const normalizado = normalizarMaestro(coleccion, registro);
    const anterior = normalizado.id ? datos[coleccion].find((r) => r.id === normalizado.id) : null;
    if (normalizado.id && !anterior) throw new ApiError("NO_ENCONTRADO", "El registro ya no existe.");

    const errores = validadoresMaestros[coleccion](datos, normalizado);
    if (tieneErrores(errores)) throw new ApiError("VALIDACION", Object.values(errores)[0], errores);

    if (coleccion === "usuarios" && anterior?.id === sesion.idUsuario) {
      if (!normalizado.roles.includes(ROLES.ADMINISTRADOR)) {
        throw new ApiError("PROPIO", "No podés quitarte el rol de administrador a vos mismo.");
      }
      if (normalizado.activo === false) throw new ApiError("PROPIO", "No podés desactivar tu propio usuario.");
    }

    if (anterior) {
      const actualizado = { ...anterior, ...normalizado };
      if (coleccion === "usuarios" && !normalizado.password) actualizado.password = anterior.password;
      Object.assign(anterior, actualizado);
      return anterior;
    }
    const nuevo = { activo: true, ...normalizado, id: generarId(PREFIJOS[coleccion]) };
    if (coleccion === "sucursales") datos.contadores[nuevo.id] = { comanda: 0, movimiento: 0 };
    datos[coleccion].push(nuevo);
    return nuevo;
  });
}

/** Desactivar reemplaza a borrar: el histórico de comandas sigue apuntando al registro. */
export function cambiarActivoMaestro(coleccion, id, activo, sesion) {
  return transaccion((datos) => {
    exigirRol(sesion, [ROLES.ADMINISTRADOR]);
    const registro = datos[coleccion]?.find((r) => r.id === id);
    if (!registro) throw new ApiError("NO_ENCONTRADO", "El registro ya no existe.");
    if (!activo) {
      if (coleccion === "usuarios" && id === sesion.idUsuario) {
        throw new ApiError("PROPIO", "No podés desactivar tu propio usuario.");
      }
      if (
        coleccion === "usuarios" &&
        registro.roles.includes(ROLES.ADMINISTRADOR) &&
        datos.usuarios.filter((u) => u.activo && u.roles.includes(ROLES.ADMINISTRADOR)).length <= 1
      ) {
        throw new ApiError("ULTIMO_ADMIN", "Tiene que quedar al menos un administrador activo.");
      }
      if (coleccion === "sucursales") {
        const abiertas = datos.comandas.filter(
          (c) => c.idSucursal === id && [ESTADOS.INICIADO, ESTADOS.ADICION, ESTADOS.LISTO, ESTADOS.ENTREGADO].includes(c.estado),
        ).length;
        if (abiertas > 0) {
          throw new ApiError("EN_USO", `La sucursal tiene ${abiertas} comanda(s) abierta(s). Cerralas antes de desactivarla.`);
        }
      }
    } else if (coleccion === "convenios") {
      const errores = validadoresMaestros.convenios(datos, { ...registro, activo: true });
      if (errores.fechaDesde) throw new ApiError("VALIDACION", errores.fechaDesde);
    }
    registro.activo = activo;
    return registro;
  });
}

/**
 * Importa trabajadores desde el listado de personal (filas ya leídas del archivo).
 * Las filas inválidas o duplicadas se omiten y se informan.
 */
export function importarTrabajadores(idEmpresa, filas, sesion) {
  return transaccion((datos) => {
    exigirRol(sesion, [ROLES.ADMINISTRADOR]);
    if (!datos.empresas.some((e) => e.id === idEmpresa)) throw new ApiError("VALIDACION", "Elegí la empresa.");
    if (!filas || filas.length === 0) throw new ApiError("VALIDACION", "El archivo no tiene filas para importar.");
    const importados = [];
    const omitidos = [];
    filas.forEach((fila, i) => {
      const candidato = normalizarMaestro("trabajadores", {
        nombre: fila.nombre || "",
        apellido: fila.apellido || "",
        dni: fila.dni || "",
        idEmpresa,
        activo: true,
      });
      const errores = validadoresMaestros.trabajadores(datos, candidato);
      if (tieneErrores(errores)) {
        omitidos.push({ fila: i + 2, motivo: Object.values(errores)[0], nombre: `${candidato.apellido}, ${candidato.nombre}` });
        return;
      }
      const nuevo = { ...candidato, id: generarId("trab") };
      datos.trabajadores.push(nuevo);
      importados.push(nuevo);
    });
    return { importados: importados.length, omitidos };
  });
}

export async function restablecerDatos(sesion) {
  return transaccion((datos) => {
    exigirRol(sesion, [ROLES.ADMINISTRADOR]);
    const nuevos = crearDatosIniciales();
    Object.keys(datos).forEach((clave) => delete datos[clave]);
    Object.assign(datos, nuevos);
    almacenamiento.escribir(CLAVE_INTENTOS, {});
    return true;
  });
}
