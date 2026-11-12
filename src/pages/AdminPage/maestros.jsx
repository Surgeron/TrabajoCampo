// Configuración de cada maestro para el CRUD genérico (columnas, búsqueda y valores iniciales).
import Badge from "../../components/ui/Badge/Badge";
import { ROLES_INFO } from "../../domain/constantes";
import { convenioVigente, getCategoria, getEmpresa, getSucursal } from "../../domain/selectores";
import { formatFecha } from "../../utils/fechas";
import { formatMoneda } from "../../utils/formato";
import {
  FormConvenio,
  FormEmpresa,
  FormInsumo,
  FormMotivo,
  FormProducto,
  FormSucursal,
  FormTrabajador,
  FormUsuario,
} from "./formularios";

export const MAESTROS = [
  {
    id: "usuarios",
    coleccion: "usuarios",
    titulo: "Usuarios",
    singular: "Usuario",
    Formulario: FormUsuario,
    nuevo: () => ({ nombre: "", apellido: "", nombreUsuario: "", password: "", roles: [], idSucursalTrabajo: null }),
    textoBusqueda: (u) => `${u.nombre} ${u.apellido} ${u.nombreUsuario}`,
    columnas: (datos) => [
      { clave: "nombre", titulo: "Usuario", principal: true, render: (u) => `${u.apellido}, ${u.nombre}` },
      { clave: "nombreUsuario", titulo: "Ingreso" },
      { clave: "roles", titulo: "Roles", render: (u) => u.roles.map((r) => ROLES_INFO[r].label).join(", ") },
      { clave: "sucursal", titulo: "Sucursal", render: (u) => getSucursal(datos, u.idSucursalTrabajo)?.nombre || "La elige" },
    ],
  },
  {
    id: "sucursales",
    coleccion: "sucursales",
    titulo: "Sucursales",
    singular: "Sucursal",
    femenino: true,
    Formulario: FormSucursal,
    nuevo: () => ({ nombre: "", ubicacion: "", capacidadComedor: "" }),
    textoBusqueda: (s) => `${s.nombre} ${s.ubicacion}`,
    columnas: () => [
      { clave: "nombre", titulo: "Sucursal", principal: true },
      { clave: "ubicacion", titulo: "Ubicación" },
      { clave: "capacidadComedor", titulo: "Comedor", render: (s) => `${s.capacidadComedor} personas` },
    ],
  },
  {
    id: "empresas",
    coleccion: "empresas",
    titulo: "Empresas",
    singular: "Empresa",
    femenino: true,
    Formulario: FormEmpresa,
    nuevo: () => ({ razonSocial: "", cuit: "" }),
    textoBusqueda: (e) => `${e.razonSocial} ${e.cuit}`,
    columnas: (datos) => [
      { clave: "razonSocial", titulo: "Empresa", principal: true },
      { clave: "cuit", titulo: "CUIT" },
      {
        clave: "convenio",
        titulo: "Convenio",
        render: (e) => (convenioVigente(datos, e.id) ? <Badge tono="exito">Vigente</Badge> : <Badge tono="alerta">Sin convenio vigente</Badge>),
      },
      { clave: "trabajadores", titulo: "Trabajadores", render: (e) => datos.trabajadores.filter((t) => t.idEmpresa === e.id && t.activo).length },
    ],
  },
  {
    id: "trabajadores",
    coleccion: "trabajadores",
    titulo: "Trabajadores",
    singular: "Trabajador",
    Formulario: FormTrabajador,
    nuevo: () => ({ nombre: "", apellido: "", idEmpresa: "", dni: "" }),
    textoBusqueda: (t, datos) => `${t.apellido} ${t.nombre} ${t.dni} ${getEmpresa(datos, t.idEmpresa)?.razonSocial}`,
    columnas: (datos) => [
      { clave: "nombre", titulo: "Trabajador", principal: true, render: (t) => `${t.apellido}, ${t.nombre}` },
      { clave: "empresa", titulo: "Empresa", render: (t) => getEmpresa(datos, t.idEmpresa)?.razonSocial },
      { clave: "dni", titulo: "DNI", render: (t) => t.dni || "—" },
    ],
  },
  {
    id: "convenios",
    coleccion: "convenios",
    titulo: "Convenios",
    singular: "Convenio",
    anchoFormulario: "lg",
    Formulario: FormConvenio,
    nuevo: () => ({ idEmpresa: "", fechaDesde: "", fechaHasta: "", diaCorte: 21, observaciones: "", coberturas: [] }),
    textoBusqueda: (c, datos) => `${getEmpresa(datos, c.idEmpresa)?.razonSocial} ${c.observaciones}`,
    columnas: (datos) => [
      { clave: "empresa", titulo: "Empresa", principal: true, render: (c) => getEmpresa(datos, c.idEmpresa)?.razonSocial },
      {
        clave: "vigencia",
        titulo: "Vigencia",
        render: (c) => `${formatFecha(c.fechaDesde)} → ${c.fechaHasta ? formatFecha(c.fechaHasta) : "sin vencimiento"}`,
      },
      { clave: "corte", titulo: "Corte", render: (c) => `Día ${c.diaCorte}` },
      {
        clave: "cubre",
        titulo: "Cubre",
        render: (c) => `${c.coberturas.filter((x) => x.cubierto).length} productos`,
      },
    ],
    validarLocal: (_datos, c) => (c.coberturas.some((x) => x.cubierto) ? {} : { coberturas: "Marcá al menos un producto cubierto." }),
  },
  {
    id: "productos",
    coleccion: "productos",
    titulo: "Productos",
    singular: "Producto",
    anchoFormulario: "lg",
    Formulario: FormProducto,
    nuevo: () => ({ nombre: "", idCategoria: "", precios: {} }),
    textoBusqueda: (p) => `${p.nombre} ${Object.values(p.precios).map((x) => x.codigoTango).join(" ")}`,
    columnas: (datos) => [
      { clave: "nombre", titulo: "Producto", principal: true },
      { clave: "categoria", titulo: "Categoría", render: (p) => getCategoria(datos, p.idCategoria)?.nombre },
      ...datos.sucursales.map((s) => ({
        clave: `precio_${s.id}`,
        titulo: s.nombre,
        render: (p) => (p.precios[s.id]?.activo ? `${formatMoneda(p.precios[s.id].precio)} · ${p.precios[s.id].codigoTango}` : "No se vende"),
      })),
    ],
  },
  {
    id: "insumos",
    coleccion: "insumos",
    titulo: "Insumos",
    singular: "Insumo",
    Formulario: FormInsumo,
    nuevo: () => ({ nombre: "", unidad: "", codigoTango: "" }),
    textoBusqueda: (i) => `${i.nombre} ${i.codigoTango}`,
    columnas: () => [
      { clave: "nombre", titulo: "Insumo", principal: true },
      { clave: "unidad", titulo: "Unidad" },
      { clave: "codigoTango", titulo: "Código Tango" },
    ],
  },
  {
    id: "motivos",
    coleccion: "motivosDesperdicio",
    titulo: "Motivos de desperdicio",
    singular: "Motivo",
    Formulario: FormMotivo,
    nuevo: () => ({ descripcion: "" }),
    textoBusqueda: (m) => m.descripcion,
    columnas: () => [{ clave: "descripcion", titulo: "Motivo", principal: true }],
  },
];
