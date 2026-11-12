// Maestros de ejemplo. Nombres de personas, CUIT, precios y códigos son ficticios.
import { ROLES } from "../domain/constantes";
import { conDigitoVerificador } from "../domain/validaciones";

export const SUCURSALES = [
  {
    id: "suc-unq",
    nombre: "El Unquillar",
    ubicacion: "Ruta Provincial N° 52, Susques",
    capacidadComedor: 50,
    activo: true,
  },
  {
    id: "suc-olc",
    nombre: "Las Vertientes",
    ubicacion: "Olaroz Chico, 4.165 msnm",
    capacidadComedor: 80,
    activo: true,
  },
];

/** Usuarios de demostración. Todas las contraseñas son 1234. */
export const USUARIOS = [
  {
    id: "usr-1",
    nombre: "Ana",
    apellido: "Quispe",
    nombreUsuario: "operario.unquillar",
    password: "1234",
    roles: [ROLES.MOZO, ROLES.COCINERO],
    idSucursalTrabajo: "suc-unq",
    activo: true,
  },
  {
    id: "usr-2",
    nombre: "Luis",
    apellido: "Mamaní",
    nombreUsuario: "operario.vertientes",
    password: "1234",
    roles: [ROLES.MOZO, ROLES.COCINERO],
    idSucursalTrabajo: "suc-olc",
    activo: true,
  },
  {
    id: "usr-3",
    nombre: "Rosa",
    apellido: "Cruz",
    nombreUsuario: "cocina",
    password: "1234",
    roles: [ROLES.COCINERO],
    idSucursalTrabajo: null,
    activo: true,
  },
  {
    id: "usr-4",
    nombre: "Paula",
    apellido: "Gómez",
    nombreUsuario: "finanzas",
    password: "1234",
    roles: [ROLES.FINANZAS],
    idSucursalTrabajo: null,
    activo: true,
  },
  {
    id: "usr-5",
    nombre: "Jorge",
    apellido: "Vilte",
    nombreUsuario: "supervisor",
    password: "1234",
    roles: [ROLES.SUPERVISOR],
    idSucursalTrabajo: null,
    activo: true,
  },
  {
    id: "usr-6",
    nombre: "Marcos",
    apellido: "Tolaba",
    nombreUsuario: "admin",
    password: "1234",
    roles: [ROLES.ADMINISTRADOR, ROLES.FINANZAS],
    idSucursalTrabajo: null,
    activo: true,
  },
  {
    id: "usr-7",
    nombre: "Carla",
    apellido: "Ríos",
    nombreUsuario: "ex.empleada",
    password: "1234",
    roles: [ROLES.MOZO],
    idSucursalTrabajo: "suc-olc",
    activo: false,
  },
];

export const EMPRESAS = [
  { id: "emp-sdj", razonSocial: "Sales de Jujuy", cuit: conDigitoVerificador("3071234567"), activo: true },
  { id: "emp-exar", razonSocial: "EXAR", cuit: conDigitoVerificador("3070987654"), activo: true },
  { id: "emp-tgn", razonSocial: "Transportadora Gas del Norte", cuit: conDigitoVerificador("3054321098"), activo: true },
  { id: "emp-ejesa", razonSocial: "EJESA", cuit: conDigitoVerificador("3068765432"), activo: true },
  { id: "emp-condor", razonSocial: "Cóndor Link", cuit: conDigitoVerificador("3071122334"), activo: true },
  { id: "emp-janar", razonSocial: "Janar", cuit: conDigitoVerificador("3070555666"), activo: true },
];

export const CATEGORIAS = [
  { id: "desayuno", nombre: "Desayuno", tipo: "comida", turno: "desayuno" },
  { id: "almuerzo", nombre: "Almuerzo", tipo: "comida", turno: "almuerzo" },
  { id: "merienda", nombre: "Merienda", tipo: "comida", turno: "merienda" },
  { id: "cena", nombre: "Cena", tipo: "comida", turno: "cena" },
  { id: "asado", nombre: "Asado / Minuta", tipo: "comida", turno: null },
  { id: "bebida", nombre: "Bebidas", tipo: "bebida", turno: null },
];

const precios = (unquillar, vertientes, codigo) => ({
  "suc-unq": { precio: unquillar, codigoTango: `UNQ-${codigo}`, activo: true },
  "suc-olc": { precio: vertientes, codigoTango: `OLC-${codigo}`, activo: true },
});

export const PRODUCTOS = [
  { id: "prod-desayuno", nombre: "Desayuno", idCategoria: "desayuno", activo: true, precios: precios(6500, 6800, "DES") },
  { id: "prod-almuerzo", nombre: "Almuerzo", idCategoria: "almuerzo", activo: true, precios: precios(14500, 15000, "ALM") },
  { id: "prod-merienda", nombre: "Merienda", idCategoria: "merienda", activo: true, precios: precios(6000, 6200, "MER") },
  { id: "prod-cena", nombre: "Cena", idCategoria: "cena", activo: true, precios: precios(14500, 15000, "CEN") },
  { id: "prod-asado", nombre: "Asado / Minuta", idCategoria: "asado", activo: true, precios: precios(17500, 18000, "ASA") },
  { id: "prod-agua500", nombre: "Agua 500 ml", idCategoria: "bebida", activo: true, precios: precios(1800, 1900, "A05") },
  { id: "prod-agua15", nombre: "Agua 1,5 L", idCategoria: "bebida", activo: true, precios: precios(3200, 3300, "A15") },
  { id: "prod-gaseosa", nombre: "Gaseosa 500 ml", idCategoria: "bebida", activo: true, precios: precios(2500, 2600, "GAS") },
  { id: "prod-bidon", nombre: "Bidón de agua 20 L", idCategoria: "bebida", activo: true, precios: precios(9000, 9400, "B20") },
];

const COMIDAS = ["prod-desayuno", "prod-almuerzo", "prod-merienda", "prod-cena", "prod-asado"];
const cubre = (ids, maximos = {}) =>
  ids.map((idProducto) => ({
    idProducto,
    cubierto: true,
    cantidadMaximaPorDia: maximos[idProducto] ?? null,
  }));

export const CONVENIOS = [
  {
    id: "conv-sdj",
    idEmpresa: "emp-sdj",
    fechaDesde: "2026-01-01",
    fechaHasta: null,
    diaCorte: 21,
    observaciones: "Audita los consumos después de facturar.",
    activo: true,
    coberturas: [...cubre(COMIDAS), ...cubre(["prod-agua500"], { "prod-agua500": 2 })],
  },
  {
    id: "conv-exar",
    idEmpresa: "emp-exar",
    fechaDesde: "2026-03-01",
    fechaHasta: null,
    diaCorte: 21,
    observaciones: "",
    activo: true,
    coberturas: cubre([...COMIDAS, "prod-agua500", "prod-gaseosa"]),
  },
  {
    id: "conv-tgn",
    idEmpresa: "emp-tgn",
    fechaDesde: "2026-02-01",
    fechaHasta: null,
    diaCorte: 21,
    observaciones: "Circular: solo autoriza agua de 500 ml; otras bebidas las paga el trabajador.",
    activo: true,
    coberturas: [...cubre(COMIDAS), ...cubre(["prod-agua500"], { "prod-agua500": 1 })],
  },
  {
    id: "conv-ejesa",
    idEmpresa: "emp-ejesa",
    fechaDesde: "2026-04-01",
    fechaHasta: null,
    diaCorte: 21,
    observaciones: "",
    activo: true,
    coberturas: cubre(["prod-desayuno", "prod-almuerzo", "prod-cena", "prod-agua500"]),
  },
  {
    id: "conv-condor",
    idEmpresa: "emp-condor",
    fechaDesde: "2026-05-15",
    fechaHasta: null,
    diaCorte: 21,
    observaciones: "",
    activo: true,
    coberturas: cubre([...COMIDAS, "prod-agua15"]),
  },
  {
    id: "conv-janar",
    idEmpresa: "emp-janar",
    fechaDesde: "2026-01-01",
    fechaHasta: "2026-09-30",
    diaCorte: 21,
    observaciones: "Convenio vencido; pendiente de renovación por Comercial.",
    activo: true,
    coberturas: cubre(COMIDAS),
  },
];

const trabajadores = (idEmpresa, prefijo, nombres) =>
  nombres.map(([nombre, apellido], i) => ({
    id: `trab-${prefijo}-${i + 1}`,
    nombre,
    apellido,
    idEmpresa,
    dni: "",
    activo: true,
  }));

export const TRABAJADORES = [
  ...trabajadores("emp-sdj", "sdj", [
    ["Benjamín", "Cruz"],
    ["Martín", "Gutiérrez"],
    ["Lucía", "Fernández"],
    ["Diego", "Alancay"],
    ["Sofía", "Choque"],
    ["Ramiro", "Tejerina"],
    ["Valeria", "Zerpa"],
    ["Héctor", "Condori"],
  ]),
  ...trabajadores("emp-exar", "exar", [
    ["Pablo", "Ibáñez"],
    ["Natalia", "Sajama"],
    ["Germán", "Ortiz"],
  ]),
  ...trabajadores("emp-tgn", "tgn", [
    ["Federico", "Romero"],
    ["Marcela", "Aramayo"],
    ["Sergio", "Lamas"],
    ["Iván", "Pereyra"],
  ]),
  ...trabajadores("emp-ejesa", "ejesa", [
    ["Cecilia", "Vargas"],
    ["Oscar", "Farfán"],
  ]),
  ...trabajadores("emp-condor", "condor", [
    ["Andrés", "Molina"],
    ["Julieta", "Burgos"],
  ]),
  ...trabajadores("emp-janar", "janar", [
    ["Tomás", "Aguirre"],
    ["Elena", "Paredes"],
  ]),
];

export const INSUMOS = [
  { id: "ins-papa", nombre: "Papa", unidad: "kg", codigoTango: "INS-001", activo: true },
  { id: "ins-aceite", nombre: "Aceite", unidad: "L", codigoTango: "INS-002", activo: true },
  { id: "ins-carne", nombre: "Carne vacuna", unidad: "kg", codigoTango: "INS-003", activo: true },
  { id: "ins-pollo", nombre: "Pollo", unidad: "kg", codigoTango: "INS-004", activo: true },
  { id: "ins-arroz", nombre: "Arroz", unidad: "kg", codigoTango: "INS-005", activo: true },
  { id: "ins-harina", nombre: "Harina", unidad: "kg", codigoTango: "INS-006", activo: true },
  { id: "ins-tomate", nombre: "Tomate", unidad: "kg", codigoTango: "INS-007", activo: true },
  { id: "ins-leche", nombre: "Leche", unidad: "L", codigoTango: "INS-008", activo: true },
  { id: "ins-pan", nombre: "Pan", unidad: "kg", codigoTango: "INS-009", activo: true },
  { id: "ins-cafe", nombre: "Café", unidad: "kg", codigoTango: "INS-010", activo: true },
  { id: "ins-huevo", nombre: "Huevos", unidad: "unidad", codigoTango: "INS-011", activo: true },
];

export const MOTIVOS_DESPERDICIO = [
  { id: "mot-vencido", descripcion: "Vencido", activo: true },
  { id: "mot-malestado", descripcion: "En mal estado", activo: true },
  { id: "mot-sobrante", descripcion: "Sobrante", activo: true },
  { id: "mot-error", descripcion: "Error de preparación", activo: true },
  { id: "mot-devuelto", descripcion: "Devuelto por el cliente", activo: true },
  { id: "mot-otro", descripcion: "Otro", activo: true },
];

/** Clientes de venta de contado que piden factura a nombre de su empresa. */
export const CLIENTES_CONTADO = [
  { nombre: "Transportes Rivas", cuit: conDigitoVerificador("3071555444"), tipo: "Factura A" },
  { nombre: "Andina Construcciones", cuit: conDigitoVerificador("3070333222"), tipo: "Factura A" },
  { nombre: "Consumidor final", cuit: "", tipo: "Factura B" },
];
