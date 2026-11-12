import {
  CATEGORIAS,
  CONVENIOS,
  EMPRESAS,
  INSUMOS,
  MOTIVOS_DESPERDICIO,
  PRODUCTOS,
  SUCURSALES,
  TRABAJADORES,
  USUARIOS,
} from "./catalogos";
import { generarHistorial } from "./generarHistorial";

/** Versión del esquema de datos. Si cambia, se descartan los datos guardados en el navegador. */
export const VERSION_DATOS = 1;

const copia = (valor) => JSON.parse(JSON.stringify(valor));

/** Base de datos simulada completa: maestros + historial de ejemplo. */
export function crearDatosIniciales(hoy = new Date()) {
  const catalogo = {
    sucursales: copia(SUCURSALES),
    usuarios: copia(USUARIOS),
    empresas: copia(EMPRESAS),
    convenios: copia(CONVENIOS),
    trabajadores: copia(TRABAJADORES),
    categorias: copia(CATEGORIAS),
    productos: copia(PRODUCTOS),
    insumos: copia(INSUMOS),
    motivosDesperdicio: copia(MOTIVOS_DESPERDICIO),
  };
  return {
    version: VERSION_DATOS,
    ...catalogo,
    ...generarHistorial(catalogo, hoy),
  };
}
