// Exporta los datos de ejemplo del prototipo (src/data) a JSON para cargarlos en Firestore.
// Uso:  npm run seed:exportar            (21 días de historial)
//       npm run seed:exportar -- 30      (otra cantidad de días)
// Genera backend/seed/datos_iniciales.json con la fecha de generación, para que el backend
// pueda desplazar las fechas del historial al día en que se cargue.
//
// Se recorta el historial porque cada carga completa del frontend lee todos los documentos
// y el plan gratuito de Firestore permite 50.000 lecturas por día.
import { writeFileSync } from "node:fs";
import { crearDatosIniciales } from "../../src/data/datosIniciales";
import { fechaHoraISO, fechaISO, sumarDias } from "../../src/utils/fechas";

const dias = Number(process.argv[2]) || 21;
const destino = "backend/seed/datos_iniciales.json";

const ahora = new Date();
const datos = crearDatosIniciales(ahora);
const desde = sumarDias(fechaISO(ahora), -dias);

const comandas = datos.comandas.filter((c) => c.fechaHora.slice(0, 10) >= desde);
const idsComandas = new Set(comandas.map((c) => c.id));
const pagos = datos.pagos.filter((p) => p.aplicaciones.every((a) => idsComandas.has(a.idComanda)));
const facturas = datos.facturas.filter((f) => f.comandas.every((id) => idsComandas.has(id)));
const movimientos = datos.movimientos.filter((m) => m.fechaHora.slice(0, 10) >= desde);
const desperdicios = datos.desperdicios.filter((d) => d.fechaHora.slice(0, 10) >= desde);

const salida = {
  ...datos,
  generadoEn: fechaHoraISO(ahora),
  diasDeHistoria: dias,
  comandas,
  pagos,
  facturas,
  movimientos,
  desperdicios,
};
writeFileSync(destino, JSON.stringify(salida), "utf-8");

const resumen = Object.entries(salida)
  .filter(([, valor]) => Array.isArray(valor))
  .map(([clave, valor]) => `${clave}: ${valor.length}`)
  .join(" | ");
const total = Object.values(salida).filter(Array.isArray).reduce((suma, lista) => suma + lista.length, 0);
console.log(`Datos exportados a ${destino} (${dias} días de historial, ${total} documentos)`);
console.log(resumen);
