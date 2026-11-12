// Informes para Finanzas y supervisión (CU-12). Funciones puras: reciben los datos y los
// filtros y devuelven columnas, filas y totales. La pantalla solo los muestra o exporta.
import { ESTADOS, ESTADOS_INFO, MEDIOS_PAGO_INFO, TIPOS_CLIENTE, TURNOS } from "./constantes";
import { saltosDeNumeracion } from "./reglas";
import {
  empresaDeComanda,
  facturasDeComanda,
  getCategoria,
  getEmpresa,
  getInsumo,
  getMotivo,
  getProducto,
  getSucursal,
  getTrabajador,
  mediosDePago,
  nombreUsuario,
  pagosDeComanda,
} from "./selectores";
import { formatComprobante, formatNumeroComanda } from "../utils/formato";
import { rangoDeFechas } from "../utils/fechas";

const etiquetaTurno = (id) => TURNOS.find((t) => t.id === id)?.label || "—";
const dia = (fechaHora) => fechaHora.slice(0, 10);
const enRango = (fecha, { desde, hasta }) => fecha >= desde && fecha <= hasta;
const sumar = (filas, clave) => filas.reduce((s, f) => s + (Number(f[clave]) || 0), 0);

function esComida(datos, idProducto) {
  const producto = getProducto(datos, idProducto);
  return getCategoria(datos, producto?.idCategoria)?.tipo === "comida";
}

/** Comandas que cumplen los filtros comunes (fechas, sucursal, turno). */
function comandasFiltradas(datos, filtros, { incluirAnuladas = false } = {}) {
  return datos.comandas.filter(
    (c) =>
      enRango(dia(c.fechaHora), filtros) &&
      (!filtros.idSucursal || c.idSucursal === filtros.idSucursal) &&
      (!filtros.turno || c.turno === filtros.turno) &&
      (incluirAnuladas || c.estado !== ESTADOS.ANULADO),
  );
}

function cumpleMedioPago(datos, comanda, medio) {
  return !medio || mediosDePago(datos, comanda).includes(medio);
}

function montoPorMedio(datos, comanda) {
  const montos = { efectivo: 0, transferencia: 0, cuenta_corriente: 0 };
  if (comanda.tipoCliente === TIPOS_CLIENTE.CONVENIO) {
    montos.cuenta_corriente = comanda.estado === ESTADOS.CUENTA_CORRIENTE ? comanda.total : 0;
    return montos;
  }
  pagosDeComanda(datos, comanda.id).forEach((p) => {
    montos[p.medio] += p.aplicaciones.find((a) => a.idComanda === comanda.id)?.montoAplicado || 0;
  });
  return montos;
}

const columna = (clave, titulo, tipo = "texto", extra = {}) => ({ clave, titulo, tipo, ...extra });

export const INFORMES = [
  {
    id: "ventas",
    titulo: "Ventas",
    descripcion: "Comandas, platos y bebidas por día, sucursal y turno, con su medio de pago.",
    filtros: ["fechas", "sucursal", "turno", "medioPago"],
    generar(datos, filtros) {
      const grupos = new Map();
      comandasFiltradas(datos, filtros)
        .filter((c) => cumpleMedioPago(datos, c, filtros.medioPago))
        .forEach((c) => {
          const clave = `${dia(c.fechaHora)}|${c.idSucursal}|${c.turno}`;
          if (!grupos.has(clave)) {
            grupos.set(clave, {
              id: clave,
              fecha: dia(c.fechaHora),
              sucursal: getSucursal(datos, c.idSucursal)?.nombre,
              turno: etiquetaTurno(c.turno),
              comandas: 0,
              platos: 0,
              bebidas: 0,
              efectivo: 0,
              transferencia: 0,
              cuentaCorriente: 0,
              importe: 0,
            });
          }
          const g = grupos.get(clave);
          g.comandas += 1;
          c.items.forEach((i) => {
            if (esComida(datos, i.idProducto)) g.platos += i.cantidad;
            else g.bebidas += i.cantidad;
          });
          const montos = montoPorMedio(datos, c);
          g.efectivo += montos.efectivo;
          g.transferencia += montos.transferencia;
          g.cuentaCorriente += montos.cuenta_corriente;
          g.importe += c.total;
        });
      const filas = [...grupos.values()].sort((a, b) => b.fecha.localeCompare(a.fecha) || a.sucursal.localeCompare(b.sucursal));
      const columnas = [
        columna("fecha", "Fecha", "fecha", { principal: true }),
        columna("sucursal", "Sucursal"),
        columna("turno", "Turno"),
        columna("comandas", "Comandas", "numero"),
        columna("platos", "Platos", "numero"),
        columna("bebidas", "Bebidas", "numero"),
        columna("efectivo", "Efectivo", "moneda"),
        columna("transferencia", "Transferencia", "moneda"),
        columna("cuentaCorriente", "Cuenta corriente", "moneda"),
        columna("importe", "Importe total", "moneda"),
      ];
      const totales = Object.fromEntries(
        ["comandas", "platos", "bebidas", "efectivo", "transferencia", "cuentaCorriente", "importe"].map((k) => [k, sumar(filas, k)]),
      );
      return { columnas, filas, totales };
    },
  },
  {
    id: "sinFacturar",
    titulo: "Comandas sin facturar",
    descripcion: "Ventas particulares cobradas sin factura o entregadas sin cobrar. El control clave para Finanzas.",
    filtros: ["fechas", "sucursal", "turno"],
    generar(datos, filtros) {
      const filas = comandasFiltradas(datos, filtros)
        .filter(
          (c) =>
            c.tipoCliente === TIPOS_CLIENTE.PARTICULAR &&
            [ESTADOS.COBRADO_SIN_FACTURAR, ESTADOS.ENTREGADO].includes(c.estado),
        )
        .map((c) => ({
          id: c.id,
          comanda: formatNumeroComanda(c.numero),
          fecha: c.fechaHora,
          sucursal: getSucursal(datos, c.idSucursal)?.nombre,
          estado: ESTADOS_INFO[c.estado].label,
          medio: mediosDePago(datos, c).map((m) => MEDIOS_PAGO_INFO[m]).join(" + ") || "Sin cobrar",
          ordenante: pagosDeComanda(datos, c.id).map((p) => p.ordenante).filter(Boolean).join(", "),
          total: c.total,
        }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
      return {
        columnas: [
          columna("comanda", "Comanda", "texto", { principal: true }),
          columna("fecha", "Fecha", "fechaHora"),
          columna("sucursal", "Sucursal"),
          columna("estado", "Estado"),
          columna("medio", "Medio de pago"),
          columna("ordenante", "Quién transfirió"),
          columna("total", "Total", "moneda"),
        ],
        filas,
        totales: { total: sumar(filas, "total") },
      };
    },
  },
  {
    id: "comandasFacturas",
    titulo: "Comandas vs. facturas",
    descripcion: "Cada comanda particular con su factura, medio de pago y datos de la transferencia, para cruzar con el libro IVA y el banco.",
    filtros: ["fechas", "sucursal", "medioPago"],
    generar(datos, filtros) {
      const filas = comandasFiltradas(datos, filtros)
        .filter(
          (c) =>
            c.tipoCliente === TIPOS_CLIENTE.PARTICULAR &&
            [ESTADOS.FACTURADO, ESTADOS.COBRADO_SIN_FACTURAR].includes(c.estado) &&
            cumpleMedioPago(datos, c, filtros.medioPago),
        )
        .map((c) => {
          const pagos = pagosDeComanda(datos, c.id);
          return {
            id: c.id,
            comanda: formatNumeroComanda(c.numero),
            fecha: c.fechaHora,
            sucursal: getSucursal(datos, c.idSucursal)?.nombre,
            medio: mediosDePago(datos, c).map((m) => MEDIOS_PAGO_INFO[m]).join(" + "),
            ordenante: pagos.map((p) => p.ordenante).filter(Boolean).join(", "),
            operacion: pagos.map((p) => p.numeroOperacion).filter(Boolean).join(", "),
            factura: facturasDeComanda(datos, c.id).map(formatComprobante).join(", ") || "Sin factura",
            cliente: facturasDeComanda(datos, c.id).map((f) => f.clienteFacturado).join(", "),
            total: c.total,
          };
        })
        .sort((a, b) => b.fecha.localeCompare(a.fecha));
      return {
        columnas: [
          columna("comanda", "Comanda", "texto", { principal: true }),
          columna("fecha", "Fecha", "fechaHora"),
          columna("sucursal", "Sucursal"),
          columna("medio", "Medio de pago"),
          columna("ordenante", "Ordenante"),
          columna("operacion", "N° operación"),
          columna("factura", "Factura"),
          columna("cliente", "Facturado a"),
          columna("total", "Total", "moneda"),
        ],
        filas,
        totales: { total: sumar(filas, "total") },
      };
    },
  },
  {
    id: "consumoEmpresa",
    titulo: "Consumo por empresa con convenio",
    descripcion: "Cantidades por día y concepto en el período de corte (21 al 20). Base y control del Certificado de servicios.",
    filtros: ["periodo", "empresa", "sucursal"],
    requiere: ["idEmpresa"],
    generar(datos, filtros) {
      const comandas = comandasFiltradas(datos, { ...filtros, turno: null }).filter(
        (c) =>
          c.tipoCliente === TIPOS_CLIENTE.CONVENIO &&
          c.estado !== ESTADOS.ANULADO &&
          empresaDeComanda(datos, c)?.id === filtros.idEmpresa,
      );
      const idsProductos = [...new Set(comandas.flatMap((c) => c.items.map((i) => i.idProducto)))];
      const productos = datos.productos.filter((p) => idsProductos.includes(p.id));
      const filas = rangoDeFechas(filtros.desde, filtros.hasta)
        .map((fecha) => {
          const delDia = comandas.filter((c) => dia(c.fechaHora) === fecha);
          const fila = { id: fecha, fecha, importe: delDia.reduce((s, c) => s + c.total, 0) };
          productos.forEach((p) => {
            fila[p.id] = delDia.reduce(
              (s, c) => s + c.items.filter((i) => i.idProducto === p.id).reduce((x, i) => x + i.cantidad, 0),
              0,
            );
          });
          return fila;
        })
        .filter((f) => f.importe > 0);
      const columnas = [
        columna("fecha", "Fecha", "fecha", { principal: true }),
        ...productos.map((p) => columna(p.id, p.nombre, "numero")),
        columna("importe", "Importe (precio de lista)", "moneda"),
      ];
      const totales = Object.fromEntries([...productos.map((p) => p.id), "importe"].map((k) => [k, sumar(filas, k)]));
      return {
        columnas,
        filas,
        totales,
        nota: `Período ${filtros.desde} al ${filtros.hasta}. Los precios del certificado los define Comercial según el contrato.`,
      };
    },
  },
  {
    id: "fueraConvenio",
    titulo: "Consumos fuera de convenio",
    descripcion: "Comandas aparte generadas por consumos que el convenio no cubre, por empresa y trabajador.",
    filtros: ["fechas", "sucursal", "empresa"],
    generar(datos, filtros) {
      const filas = comandasFiltradas(datos, filtros)
        .filter((c) => c.tipoCliente === TIPOS_CLIENTE.PARTICULAR && c.idTrabajador)
        .filter((c) => !filtros.idEmpresa || getTrabajador(datos, c.idTrabajador)?.idEmpresa === filtros.idEmpresa)
        .map((c) => {
          const trabajador = getTrabajador(datos, c.idTrabajador);
          return {
            id: c.id,
            comanda: formatNumeroComanda(c.numero),
            fecha: c.fechaHora,
            empresa: getEmpresa(datos, trabajador?.idEmpresa)?.razonSocial,
            trabajador: trabajador ? `${trabajador.apellido}, ${trabajador.nombre}` : "—",
            items: c.items.map((i) => `${i.cantidad}× ${i.nombre}`).join(", "),
            estado: ESTADOS_INFO[c.estado].label,
            total: c.total,
          };
        })
        .sort((a, b) => b.fecha.localeCompare(a.fecha));
      return {
        columnas: [
          columna("comanda", "Comanda", "texto", { principal: true }),
          columna("fecha", "Fecha", "fechaHora"),
          columna("empresa", "Empresa"),
          columna("trabajador", "Trabajador"),
          columna("items", "Consumo"),
          columna("estado", "Estado"),
          columna("total", "Total", "moneda"),
        ],
        filas,
        totales: { total: sumar(filas, "total") },
      };
    },
  },
  {
    id: "numeracion",
    titulo: "Control de numeración",
    descripcion: "Saltos en la numeración y comandas anuladas, con su motivo y el usuario que las anuló.",
    filtros: ["fechas", "sucursal"],
    generar(datos, filtros) {
      const filas = [];
      const sucursales = datos.sucursales.filter((s) => !filtros.idSucursal || s.id === filtros.idSucursal);
      const resumen = [];
      sucursales.forEach((s) => {
        const comandas = comandasFiltradas(datos, { ...filtros, idSucursal: s.id, turno: null }, { incluirAnuladas: true });
        if (comandas.length === 0) return;
        const numeros = comandas.map((c) => c.numero);
        const saltos = saltosDeNumeracion(numeros);
        resumen.push(
          `${s.nombre}: N° ${Math.min(...numeros)} a ${Math.max(...numeros)}, ${
            saltos.length ? `${saltos.length} salto(s)` : "sin saltos"
          }.`,
        );
        saltos.forEach((n) =>
          filas.push({ id: `${s.id}-salto-${n}`, sucursal: s.nombre, numero: formatNumeroComanda(n), tipo: "Salto", fecha: "", usuario: "—", motivo: "Número faltante" }),
        );
        comandas
          .filter((c) => c.estado === ESTADOS.ANULADO)
          .forEach((c) => {
            const anulacion = c.historial.find((h) => h.estadoNuevo === ESTADOS.ANULADO);
            filas.push({
              id: c.id,
              sucursal: s.nombre,
              numero: formatNumeroComanda(c.numero),
              tipo: "Anulada",
              fecha: anulacion?.fechaHora || c.fechaHora,
              usuario: nombreUsuario(datos, anulacion?.idUsuario),
              motivo: anulacion?.motivo || "—",
            });
          });
      });
      return {
        columnas: [
          columna("numero", "Comanda", "texto", { principal: true }),
          columna("sucursal", "Sucursal"),
          columna("tipo", "Tipo"),
          columna("fecha", "Fecha", "fechaHora"),
          columna("usuario", "Usuario"),
          columna("motivo", "Motivo"),
        ],
        filas,
        nota: resumen.join(" "),
        sinFilasEsValido: resumen.length > 0,
      };
    },
  },
  {
    id: "desperdicio",
    titulo: "Desperdicio",
    descripcion: "Cantidades desechadas por producto, motivo, sucursal y período.",
    filtros: ["fechas", "sucursal"],
    generar(datos, filtros) {
      const grupos = new Map();
      datos.desperdicios
        .filter((d) => enRango(dia(d.fechaHora), filtros) && (!filtros.idSucursal || d.idSucursal === filtros.idSucursal))
        .forEach((d) => {
          const nombre = d.tipo === "insumo" ? getInsumo(datos, d.idInsumo)?.nombre : getProducto(datos, d.idProducto)?.nombre;
          const clave = `${d.tipo}|${nombre}|${d.idMotivo}|${d.idSucursal}`;
          if (!grupos.has(clave)) {
            grupos.set(clave, {
              id: clave,
              producto: nombre,
              tipo: d.tipo === "insumo" ? "Insumo" : "Plato",
              motivo: getMotivo(datos, d.idMotivo)?.descripcion,
              sucursal: getSucursal(datos, d.idSucursal)?.nombre,
              registros: 0,
              cantidad: 0,
              unidad: d.unidad,
            });
          }
          const g = grupos.get(clave);
          g.registros += 1;
          g.cantidad += d.cantidad;
        });
      const filas = [...grupos.values()].sort((a, b) => b.cantidad - a.cantidad);
      return {
        columnas: [
          columna("producto", "Producto", "texto", { principal: true }),
          columna("tipo", "Tipo"),
          columna("motivo", "Motivo"),
          columna("sucursal", "Sucursal"),
          columna("registros", "Registros", "numero"),
          columna("cantidad", "Cantidad", "numero"),
          columna("unidad", "Unidad"),
        ],
        filas,
        totales: { registros: sumar(filas, "registros") },
      };
    },
  },
  {
    id: "retiros",
    titulo: "Retiros del depósito vs. platos servidos",
    descripcion: "Insumos retirados (neto de devoluciones) comparados con los platos servidos en el período.",
    filtros: ["fechas", "sucursal"],
    generar(datos, filtros) {
      const platos = comandasFiltradas(datos, { ...filtros, turno: null }).reduce(
        (s, c) => s + c.items.filter((i) => esComida(datos, i.idProducto)).reduce((x, i) => x + i.cantidad, 0),
        0,
      );
      const netos = new Map();
      datos.movimientos
        .filter((m) => enRango(dia(m.fechaHora), filtros) && (!filtros.idSucursal || m.idSucursal === filtros.idSucursal))
        .forEach((m) =>
          m.detalle.forEach((l) => {
            const signo = m.tipo === "retiro" ? 1 : -1;
            netos.set(l.idInsumo, (netos.get(l.idInsumo) || 0) + signo * l.cantidad);
          }),
        );
      const filas = [...netos.entries()]
        .map(([idInsumo, cantidad]) => {
          const insumo = getInsumo(datos, idInsumo);
          return {
            id: idInsumo,
            insumo: insumo?.nombre,
            unidad: insumo?.unidad,
            retirado: Math.round(cantidad * 10) / 10,
            platos,
            porPlato: platos ? Math.round((cantidad / platos) * 1000) / 1000 : 0,
          };
        })
        .sort((a, b) => a.insumo.localeCompare(b.insumo));
      return {
        columnas: [
          columna("insumo", "Insumo", "texto", { principal: true }),
          columna("retirado", "Retirado neto", "numero"),
          columna("unidad", "Unidad"),
          columna("platos", "Platos servidos", "numero"),
          columna("porPlato", "Retiro por plato", "numero"),
        ],
        filas,
        nota: `${platos} platos servidos en el período. Cuando se carguen las recetas (etapa 3), se podrá comparar con el consumo teórico.`,
      };
    },
  },
  {
    id: "historico",
    titulo: "Histórico y gráficos",
    descripcion: "Evolución diaria de platos servidos, ventas y desperdicio.",
    filtros: ["fechas", "sucursal"],
    generar(datos, filtros) {
      const comandas = comandasFiltradas(datos, { ...filtros, turno: null });
      const filas = rangoDeFechas(filtros.desde, filtros.hasta).map((fecha) => {
        const delDia = comandas.filter((c) => dia(c.fechaHora) === fecha);
        return {
          id: fecha,
          fecha,
          comandas: delDia.length,
          platos: delDia.reduce(
            (s, c) => s + c.items.filter((i) => esComida(datos, i.idProducto)).reduce((x, i) => x + i.cantidad, 0),
            0,
          ),
          importe: delDia.reduce((s, c) => s + c.total, 0),
          desperdicio: datos.desperdicios.filter(
            (d) => dia(d.fechaHora) === fecha && (!filtros.idSucursal || d.idSucursal === filtros.idSucursal),
          ).length,
        };
      });
      return {
        columnas: [
          columna("fecha", "Fecha", "fecha", { principal: true }),
          columna("comandas", "Comandas", "numero"),
          columna("platos", "Platos servidos", "numero"),
          columna("importe", "Importe", "moneda"),
          columna("desperdicio", "Registros de desperdicio", "numero"),
        ],
        filas: [...filas].reverse(),
        totales: Object.fromEntries(["comandas", "platos", "importe", "desperdicio"].map((k) => [k, sumar(filas, k)])),
        grafico: { serie: filas, valor: "platos", etiqueta: "Platos servidos por día" },
        sinFilasEsValido: false,
        vacio: filas.every((f) => f.comandas === 0),
      };
    },
  },
];

export const getInforme = (id) => INFORMES.find((i) => i.id === id);

/** El informe "no tiene datos" si no hay filas (salvo los que informan un resumen igualmente). */
export function informeVacio(resultado) {
  if (resultado.vacio !== undefined) return resultado.vacio;
  return resultado.filas.length === 0 && !resultado.sinFilasEsValido;
}
