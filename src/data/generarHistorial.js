// Genera un historial de operación de ejemplo (últimas semanas y el día de hoy)
// para que los informes y listados tengan datos desde el primer uso.
// Es determinístico: la misma fecha de hoy produce siempre los mismos datos.
import { ESTADOS, TIPOS_CLIENTE } from "../domain/constantes";
import { calcularTotal } from "../domain/reglas";
import { convenioVigente } from "../domain/selectores";
import { fechaHoraISO, fechaISO, sumarDias } from "../utils/fechas";
import { CLIENTES_CONTADO } from "./catalogos";

const DIAS_DE_HISTORIA = 40;
const PUNTO_VENTA = { "suc-unq": 3, "suc-olc": 4 };
const OPERARIO = { "suc-unq": "usr-1", "suc-olc": "usr-2" };

const HORARIOS = {
  desayuno: [7, 9],
  almuerzo: [12, 14],
  merienda: [16, 17],
  cena: [19, 21],
};
const PLATO_DEL_TURNO = {
  desayuno: "prod-desayuno",
  almuerzo: "prod-almuerzo",
  merienda: "prod-merienda",
  cena: "prod-cena",
};

/** Generador pseudoaleatorio con semilla (mulberry32). */
function crearAzar(semilla) {
  let a = semilla;
  const siguiente = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    numero: siguiente,
    entero: (min, max) => Math.floor(siguiente() * (max - min + 1)) + min,
    elegir: (lista) => lista[Math.floor(siguiente() * lista.length)],
    probabilidad: (p) => siguiente() < p,
  };
}

function precio(catalogo, idProducto, idSucursal) {
  return catalogo.productos.find((p) => p.id === idProducto).precios[idSucursal].precio;
}

function item(catalogo, idProducto, cantidad, idSucursal, idAdicion = null) {
  const producto = catalogo.productos.find((p) => p.id === idProducto);
  return {
    id: `it-${Math.random().toString(36).slice(2, 10)}`,
    idProducto,
    nombre: producto.nombre,
    cantidad,
    precioUnitario: precio(catalogo, idProducto, idSucursal),
    idAdicion,
  };
}

function enMinutos(fechaHora, minutos) {
  return fechaHoraISO(new Date(new Date(fechaHora).getTime() + minutos * 60000));
}

function historialHasta(estadoFinal, fechaHora, idUsuario, motivo = null) {
  const pasos = [
    [null, ESTADOS.INICIADO, 0],
    [ESTADOS.INICIADO, ESTADOS.LISTO, 12],
    [ESTADOS.LISTO, ESTADOS.ENTREGADO, 15],
  ];
  const historial = [];
  for (const [anterior, nuevo, minutos] of pasos) {
    historial.push({ estadoAnterior: anterior, estadoNuevo: nuevo, fechaHora: enMinutos(fechaHora, minutos), idUsuario, motivo: null });
    if (nuevo === estadoFinal) return historial;
  }
  if (estadoFinal === ESTADOS.ANULADO) {
    return [
      historial[0],
      { estadoAnterior: ESTADOS.INICIADO, estadoNuevo: ESTADOS.ANULADO, fechaHora: enMinutos(fechaHora, 3), idUsuario, motivo },
    ];
  }
  historial.push({
    estadoAnterior: ESTADOS.ENTREGADO,
    estadoNuevo: estadoFinal,
    fechaHora: enMinutos(fechaHora, 50),
    idUsuario,
    motivo: null,
  });
  return historial;
}

export function generarHistorial(catalogo, hoy = new Date()) {
  const fechaHoy = fechaISO(hoy);
  const semilla = Number(fechaHoy.replace(/-/g, ""));
  const azar = crearAzar(semilla);

  const comandas = [];
  const pagos = [];
  const facturas = [];
  const movimientos = [];
  const desperdicios = [];
  const numeroFactura = { "suc-unq": 1820, "suc-olc": 2410 };
  let secuencia = 0;
  const nuevoId = (prefijo) => {
    secuencia += 1;
    return `${prefijo}-h${secuencia}`;
  };

  const registrarCobro = (comanda, { conFactura, fechaHora, cliente }) => {
    const medio = azar.probabilidad(0.72) ? "transferencia" : "efectivo";
    const pago = {
      id: nuevoId("pago"),
      fechaHora,
      medio,
      monto: comanda.total,
      ordenante: medio === "transferencia" ? cliente.nombre === "Consumidor final" ? "Particular" : cliente.cuit : "",
      numeroOperacion: medio === "transferencia" ? String(azar.entero(10000000, 99999999)) : "",
      idUsuario: comanda.idMozo,
      aplicaciones: [{ idComanda: comanda.id, montoAplicado: comanda.total }],
    };
    pagos.push(pago);
    if (conFactura) {
      numeroFactura[comanda.idSucursal] += 1;
      facturas.push({
        id: nuevoId("fac"),
        tipoComprobante: cliente.tipo,
        puntoVenta: PUNTO_VENTA[comanda.idSucursal],
        numero: numeroFactura[comanda.idSucursal],
        fecha: fechaHora.slice(0, 10),
        clienteFacturado: cliente.nombre,
        cuitCliente: cliente.cuit,
        importe: comanda.total,
        idUsuario: comanda.idMozo,
        comandas: [comanda.id],
      });
    }
  };

  const crearComanda = (datos) => {
    const comanda = {
      id: nuevoId("com"),
      numero: 0,
      firmoControlDiario: false,
      observaciones: "",
      idComandaOrigen: null,
      adiciones: [],
      ...datos,
    };
    comanda.total = calcularTotal(comanda.items);
    comandas.push(comanda);
    return comanda;
  };

  // --- Días anteriores: operación cerrada ---
  for (let dias = DIAS_DE_HISTORIA; dias >= 1; dias -= 1) {
    const fecha = sumarDias(fechaHoy, -dias);
    const empresasVigentes = catalogo.empresas.filter((e) => convenioVigente(catalogo, e.id, fecha));
    const trabajadoresVigentes = catalogo.trabajadores.filter((t) =>
      empresasVigentes.some((e) => e.id === t.idEmpresa),
    );

    for (const sucursal of catalogo.sucursales) {
      const grande = sucursal.id === "suc-olc";
      const platosDelDia = { total: 0 };

      for (const turno of Object.keys(HORARIOS)) {
        const [desde, hasta] = HORARIOS[turno];
        const horaAlAzar = () => {
          const d = new Date(`${fecha}T00:00:00`);
          d.setHours(azar.entero(desde, hasta), azar.entero(0, 59), azar.entero(0, 59));
          return fechaHoraISO(d);
        };
        const cantidadConvenio = turno === "merienda" ? azar.entero(1, 3) : azar.entero(grande ? 4 : 2, grande ? 9 : 6);

        for (let i = 0; i < cantidadConvenio; i += 1) {
          const trabajador = azar.elegir(trabajadoresVigentes);
          const convenio = convenioVigente(catalogo, trabajador.idEmpresa, fecha);
          const cubreProducto = (id) => convenio.coberturas.some((c) => c.idProducto === id && c.cubierto);
          const plato = turno === "cena" && azar.probabilidad(0.15) ? "prod-asado" : PLATO_DEL_TURNO[turno];
          if (!cubreProducto(plato)) continue;
          const fechaHora = horaAlAzar();
          const items = [item(catalogo, plato, 1, sucursal.id)];
          if (turno !== "desayuno" && cubreProducto("prod-agua500") && azar.probabilidad(0.5)) {
            items.push(item(catalogo, "prod-agua500", 1, sucursal.id));
          }
          const anulada = azar.probabilidad(0.02);
          const comanda = crearComanda({
            idSucursal: sucursal.id,
            idMozo: OPERARIO[sucursal.id],
            mesa: azar.entero(1, grande ? 20 : 12),
            fechaHora,
            turno,
            tipoCliente: TIPOS_CLIENTE.CONVENIO,
            idTrabajador: trabajador.id,
            idConvenio: convenio.id,
            estado: anulada ? ESTADOS.ANULADO : ESTADOS.CUENTA_CORRIENTE,
            firmoControlDiario: !anulada,
            items,
            historial: historialHasta(
              anulada ? ESTADOS.ANULADO : ESTADOS.CUENTA_CORRIENTE,
              fechaHora,
              OPERARIO[sucursal.id],
              anulada ? "El trabajador se retiró antes de que saliera el plato." : null,
            ),
          });
          if (!anulada) platosDelDia.total += 1;

          // Consumo no cubierto: el trabajador pide una gaseosa y la paga aparte.
          if (!anulada && !cubreProducto("prod-gaseosa") && turno !== "desayuno" && azar.probabilidad(0.08)) {
            const aparte = crearComanda({
              idSucursal: sucursal.id,
              idMozo: OPERARIO[sucursal.id],
              mesa: comanda.mesa,
              fechaHora: enMinutos(fechaHora, 1),
              turno,
              tipoCliente: TIPOS_CLIENTE.PARTICULAR,
              idTrabajador: trabajador.id,
              idConvenio: null,
              idComandaOrigen: comanda.id,
              estado: ESTADOS.FACTURADO,
              items: [item(catalogo, "prod-gaseosa", 1, sucursal.id)],
              historial: historialHasta(ESTADOS.FACTURADO, enMinutos(fechaHora, 1), OPERARIO[sucursal.id]),
            });
            registrarCobro(aparte, {
              conFactura: true,
              fechaHora: enMinutos(fechaHora, 50),
              cliente: { nombre: `${trabajador.nombre} ${trabajador.apellido}`, cuit: "", tipo: "Factura B" },
            });
          }
        }

        const cantidadParticular = turno === "merienda" ? azar.entero(0, 1) : azar.entero(0, 3);
        for (let i = 0; i < cantidadParticular; i += 1) {
          const fechaHora = horaAlAzar();
          const plato = turno === "cena" && azar.probabilidad(0.25) ? "prod-asado" : PLATO_DEL_TURNO[turno];
          const items = [item(catalogo, plato, azar.entero(1, 2), sucursal.id)];
          if (azar.probabilidad(0.6)) {
            items.push(item(catalogo, azar.elegir(["prod-agua500", "prod-gaseosa", "prod-agua15"]), 1, sucursal.id));
          }
          // Las ventas recientes quedan a veces sin facturar o sin cobrar (para los informes).
          let estado = ESTADOS.FACTURADO;
          if (dias <= 6 && azar.probabilidad(0.12)) estado = ESTADOS.COBRADO_SIN_FACTURAR;
          if (dias <= 3 && azar.probabilidad(0.05)) estado = ESTADOS.ENTREGADO;
          const comanda = crearComanda({
            idSucursal: sucursal.id,
            idMozo: OPERARIO[sucursal.id],
            mesa: azar.entero(1, grande ? 20 : 12),
            fechaHora,
            turno,
            tipoCliente: TIPOS_CLIENTE.PARTICULAR,
            idTrabajador: null,
            idConvenio: null,
            estado,
            items,
            historial: historialHasta(estado, fechaHora, OPERARIO[sucursal.id]),
          });
          platosDelDia.total += items[0].cantidad;
          if (estado !== ESTADOS.ENTREGADO) {
            registrarCobro(comanda, {
              conFactura: estado === ESTADOS.FACTURADO,
              fechaHora: enMinutos(fechaHora, 50),
              cliente: azar.elegir(CLIENTES_CONTADO),
            });
          }
        }
      }

      // Retiro de depósito del día, proporcional a los platos servidos.
      const platos = platosDelDia.total;
      const exceso = 1 + azar.numero() * 0.35;
      const lineas = [
        ["ins-papa", platos * 0.18],
        ["ins-aceite", platos * 0.03],
        ["ins-carne", platos * 0.12],
        ["ins-pollo", platos * 0.08],
        ["ins-pan", platos * 0.05],
        ["ins-leche", platos * 0.06],
      ];
      movimientos.push({
        id: nuevoId("mov"),
        numero: 0,
        tipo: "retiro",
        idSucursal: sucursal.id,
        idUsuario: OPERARIO[sucursal.id],
        fechaHora: `${fecha}T06:30:00`,
        turno: "desayuno",
        detalle: lineas.map(([idInsumo, cantidad]) => ({
          idInsumo,
          cantidad: Math.max(1, Math.round(cantidad * exceso * 10) / 10),
        })),
      });
      if (azar.probabilidad(0.15)) {
        movimientos.push({
          id: nuevoId("mov"),
          numero: 0,
          tipo: "devolucion",
          idSucursal: sucursal.id,
          idUsuario: OPERARIO[sucursal.id],
          fechaHora: `${fecha}T22:00:00`,
          turno: "cena",
          detalle: [{ idInsumo: "ins-papa", cantidad: azar.entero(1, 3) }],
        });
      }

      if (azar.probabilidad(0.45)) {
        const esInsumo = azar.probabilidad(0.6);
        desperdicios.push({
          id: nuevoId("desp"),
          idSucursal: sucursal.id,
          idUsuario: OPERARIO[sucursal.id],
          fechaHora: `${fecha}T15:${String(azar.entero(10, 59)).padStart(2, "0")}:00`,
          tipo: esInsumo ? "insumo" : "plato",
          idInsumo: esInsumo ? azar.elegir(["ins-tomate", "ins-pan", "ins-leche", "ins-papa"]) : null,
          idProducto: esInsumo ? null : azar.elegir(["prod-almuerzo", "prod-cena"]),
          cantidad: esInsumo ? Math.round(azar.numero() * 30) / 10 + 0.5 : azar.entero(1, 4),
          unidad: esInsumo ? "kg" : "unidad",
          idMotivo: esInsumo
            ? azar.elegir(["mot-vencido", "mot-malestado"])
            : azar.elegir(["mot-sobrante", "mot-error", "mot-devuelto"]),
          observacion: "",
        });
      }
    }
  }

  // --- Hoy: comandas abiertas en distintos estados para probar el flujo ---
  const ahora = hoy.getTime();
  const haceMinutos = (m) => fechaHoraISO(new Date(ahora - m * 60000));
  const turnoActual = (() => {
    const h = hoy.getHours();
    if (h >= 5 && h < 11) return "desayuno";
    if (h >= 11 && h < 16) return "almuerzo";
    if (h >= 16 && h < 19) return "merienda";
    return "cena";
  })();
  const platoActual = PLATO_DEL_TURNO[turnoActual];

  const abiertas = [
    { suc: "suc-unq", mesa: 3, hace: 42, estado: ESTADOS.ENTREGADO, trab: "trab-sdj-1" },
    { suc: "suc-unq", mesa: 5, hace: 38, estado: ESTADOS.ENTREGADO, particular: true },
    { suc: "suc-unq", mesa: 2, hace: 30, estado: ESTADOS.LISTO, trab: "trab-tgn-1" },
    { suc: "suc-unq", mesa: 7, hace: 24, estado: ESTADOS.LISTO, particular: true },
    { suc: "suc-unq", mesa: 4, hace: 18, estado: ESTADOS.ADICION, trab: "trab-sdj-3" },
    { suc: "suc-unq", mesa: 1, hace: 9, estado: ESTADOS.INICIADO, trab: "trab-sdj-2" },
    { suc: "suc-unq", mesa: 8, hace: 4, estado: ESTADOS.INICIADO, particular: true },
    { suc: "suc-unq", mesa: 6, hace: 70, estado: ESTADOS.COBRADO_SIN_FACTURAR, particular: true },
    { suc: "suc-olc", mesa: 11, hace: 35, estado: ESTADOS.ENTREGADO, trab: "trab-exar-1" },
    { suc: "suc-olc", mesa: 14, hace: 20, estado: ESTADOS.LISTO, particular: true },
    { suc: "suc-olc", mesa: 9, hace: 12, estado: ESTADOS.INICIADO, trab: "trab-condor-1" },
    { suc: "suc-olc", mesa: 15, hace: 6, estado: ESTADOS.INICIADO, trab: "trab-sdj-5" },
  ];

  abiertas.forEach((a) => {
    const fechaHora = haceMinutos(a.hace);
    const trabajador = a.trab ? catalogo.trabajadores.find((t) => t.id === a.trab) : null;
    const convenio = trabajador ? convenioVigente(catalogo, trabajador.idEmpresa, fechaHoy) : null;
    const items = [item(catalogo, platoActual, a.particular ? 2 : 1, a.suc)];
    if (!a.particular) items.push(item(catalogo, "prod-agua500", 1, a.suc));
    else items.push(item(catalogo, "prod-gaseosa", 2, a.suc));
    const historial = [
      { estadoAnterior: null, estadoNuevo: ESTADOS.INICIADO, fechaHora, idUsuario: OPERARIO[a.suc], motivo: null },
    ];
    const adiciones = [];
    if (a.estado === ESTADOS.ADICION) {
      const idAdicion = nuevoId("adi");
      const momento = haceMinutos(a.hace - 10);
      adiciones.push({ id: idAdicion, fechaHora: momento, idUsuario: OPERARIO[a.suc] });
      items.push(item(catalogo, "prod-agua500", 1, a.suc, idAdicion));
      historial.push({ estadoAnterior: ESTADOS.INICIADO, estadoNuevo: ESTADOS.LISTO, fechaHora: haceMinutos(a.hace - 8), idUsuario: OPERARIO[a.suc], motivo: null });
      historial.push({ estadoAnterior: ESTADOS.LISTO, estadoNuevo: ESTADOS.ADICION, fechaHora: momento, idUsuario: OPERARIO[a.suc], motivo: null });
    }
    if ([ESTADOS.LISTO, ESTADOS.ENTREGADO, ESTADOS.COBRADO_SIN_FACTURAR].includes(a.estado)) {
      historial.push({ estadoAnterior: ESTADOS.INICIADO, estadoNuevo: ESTADOS.LISTO, fechaHora: haceMinutos(a.hace - 12), idUsuario: OPERARIO[a.suc], motivo: null });
    }
    if ([ESTADOS.ENTREGADO, ESTADOS.COBRADO_SIN_FACTURAR].includes(a.estado)) {
      historial.push({ estadoAnterior: ESTADOS.LISTO, estadoNuevo: ESTADOS.ENTREGADO, fechaHora: haceMinutos(a.hace - 15), idUsuario: OPERARIO[a.suc], motivo: null });
    }
    if (a.estado === ESTADOS.COBRADO_SIN_FACTURAR) {
      historial.push({ estadoAnterior: ESTADOS.ENTREGADO, estadoNuevo: ESTADOS.COBRADO_SIN_FACTURAR, fechaHora: haceMinutos(a.hace - 40), idUsuario: OPERARIO[a.suc], motivo: null });
    }
    const comanda = crearComanda({
      idSucursal: a.suc,
      idMozo: OPERARIO[a.suc],
      mesa: a.mesa,
      fechaHora,
      turno: turnoActual,
      tipoCliente: a.particular ? TIPOS_CLIENTE.PARTICULAR : TIPOS_CLIENTE.CONVENIO,
      idTrabajador: trabajador?.id || null,
      idConvenio: convenio?.id || null,
      estado: a.estado,
      items,
      adiciones,
      historial,
    });
    if (a.estado === ESTADOS.COBRADO_SIN_FACTURAR) {
      registrarCobro(comanda, {
        conFactura: false,
        fechaHora: haceMinutos(a.hace - 40),
        cliente: CLIENTES_CONTADO[0],
      });
    }
  });

  // Numeración correlativa por sucursal, en orden cronológico.
  const contadores = {};
  catalogo.sucursales.forEach((s) => {
    contadores[s.id] = { comanda: 0, movimiento: 0 };
  });
  [...comandas]
    .sort((a, b) => a.fechaHora.localeCompare(b.fechaHora))
    .forEach((c) => {
      contadores[c.idSucursal].comanda += 1;
      c.numero = contadores[c.idSucursal].comanda;
    });
  [...movimientos]
    .sort((a, b) => a.fechaHora.localeCompare(b.fechaHora))
    .forEach((m) => {
      contadores[m.idSucursal].movimiento += 1;
      m.numero = contadores[m.idSucursal].movimiento;
    });

  return { comandas, pagos, facturas, movimientos, desperdicios, contadores };
}
