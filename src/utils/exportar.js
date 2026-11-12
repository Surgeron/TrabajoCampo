// Exportación de informes sin bibliotecas externas:
// - Excel: CSV separado por punto y coma, con BOM UTF-8 (Excel en español lo abre con tildes y columnas).
// - PDF: impresión del navegador con estilos de impresión ("Guardar como PDF").
import { formatFecha, formatFechaHora } from "./fechas";
import { formatMoneda, formatNumero } from "./formato";

/** Texto de una celda para mostrar en pantalla o imprimir. */
export function formatearCelda(columna, valor) {
  if (valor === undefined || valor === null || valor === "") return "";
  switch (columna.tipo) {
    case "moneda":
      return formatMoneda(valor);
    case "numero":
      return formatNumero(valor);
    case "fecha":
      return formatFecha(valor);
    case "fechaHora":
      return formatFechaHora(valor);
    default:
      return String(valor);
  }
}

function celdaCsv(columna, valor) {
  if (valor === undefined || valor === null) return "";
  let texto;
  if (columna.tipo === "moneda" || columna.tipo === "numero") texto = String(valor).replace(".", ",");
  else if (columna.tipo === "fecha") texto = formatFecha(valor);
  else if (columna.tipo === "fechaHora") texto = formatFechaHora(valor);
  else texto = String(valor);
  return /[;"\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function exportarExcel(nombreArchivo, { columnas, filas, totales }) {
  const lineas = [columnas.map((c) => celdaCsv({ tipo: "texto" }, c.titulo)).join(";")];
  filas.forEach((fila) => lineas.push(columnas.map((c) => celdaCsv(c, fila[c.clave])).join(";")));
  if (totales) {
    lineas.push(columnas.map((c, i) => (i === 0 && totales[c.clave] === undefined ? "Total" : celdaCsv(c, totales[c.clave]))).join(";"));
  }
  const blob = new Blob([`﻿${lineas.join("\r\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `${nombreArchivo}.csv`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}

export function exportarPdf() {
  window.print();
}
