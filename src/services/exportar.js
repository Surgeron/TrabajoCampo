// Exportación a Excel (SheetJS) y a PDF (jsPDF). Se cargan solo cuando se usan.
import { fecha, fechaHora, num } from '../utils/formato'

function valorCelda(fila, col) {
  const v = fila[col.clave]
  if (v === null || v === undefined || v === '') return ''
  if (col.tipo === 'fecha') return fecha(v)
  if (col.tipo === 'fecha_hora') return fechaHora(v)
  return v
}

function textoCelda(fila, col) {
  const v = valorCelda(fila, col)
  if (col.tipo === 'numero' && v !== '') return num(v, Number.isInteger(Number(v)) ? 0 : 1)
  return String(v)
}

function nombreArchivo(base, extension) {
  const limpio = base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  return `${limpio}.${extension}`
}

export async function exportarExcel({ titulo, columnas, filas, resumen = [] }) {
  const XLSX = await import('xlsx')
  const datos = [columnas.map((c) => c.titulo), ...filas.map((f) => columnas.map((c) => valorCelda(f, c)))]
  const libro = XLSX.utils.book_new()
  const hoja = XLSX.utils.aoa_to_sheet(datos)
  hoja['!cols'] = columnas.map((c) => ({ wch: Math.max(10, Math.min(40, c.titulo.length + 4)) }))
  XLSX.utils.book_append_sheet(libro, hoja, 'Datos')
  if (resumen.length) {
    const hojaResumen = XLSX.utils.aoa_to_sheet([['Indicador', 'Valor'], ...resumen.map((r) => [r.etiqueta, r.valor])])
    hojaResumen['!cols'] = [{ wch: 50 }, { wch: 30 }]
    XLSX.utils.book_append_sheet(libro, hojaResumen, 'Resumen')
  }
  XLSX.writeFile(libro, nombreArchivo(titulo, 'xlsx'))
}

async function nuevoPdf(orientacion = 'landscape') {
  const { jsPDF } = await import('jspdf')
  return new jsPDF({ orientation: orientacion, unit: 'mm', format: 'a4' })
}

function encabezadoPdf(doc, titulo, subtitulo) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(18, 53, 36)
  doc.text(titulo, 14, 16)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(70, 85, 75)
  doc.text(subtitulo, 14, 22)
  return 30
}

function tablaPdf(doc, y0, columnas, filas) {
  const ancho = doc.internal.pageSize.getWidth() - 28
  const alto = doc.internal.pageSize.getHeight()
  const anchoCol = ancho / columnas.length
  let y = y0
  const fila = (valores, negrita) => {
    doc.setFont('helvetica', negrita ? 'bold' : 'normal')
    doc.setFontSize(7.5)
    const lineas = valores.map((v) => doc.splitTextToSize(String(v), anchoCol - 2).slice(0, 3))
    const h = Math.max(...lineas.map((l) => l.length)) * 3.4 + 2.4
    if (y + h > alto - 12) {
      doc.addPage()
      y = 16
    }
    if (negrita) {
      doc.setFillColor(226, 239, 229)
      doc.rect(14, y - 3.6, ancho, h, 'F')
    }
    lineas.forEach((l, i) => doc.text(l, 15 + i * anchoCol, y))
    y += h
    doc.setDrawColor(218, 225, 217)
    doc.line(14, y - 3.4, 14 + ancho, y - 3.4)
    return negrita
  }
  fila(columnas.map((c) => c.titulo), true)
  filas.forEach((f) => fila(columnas.map((c) => textoCelda(f, c)), false))
  return y
}

export async function exportarPdf({ titulo, subtitulo, columnas, filas, resumen = [] }) {
  const doc = await nuevoPdf('landscape')
  let y = encabezadoPdf(doc, titulo, subtitulo)
  if (resumen.length) {
    doc.setFontSize(8.5)
    resumen.forEach((r) => {
      doc.setFont('helvetica', 'normal')
      doc.text(`${r.etiqueta}: ${r.valor}`, 14, y)
      y += 4.5
    })
    y += 3
  }
  tablaPdf(doc, y, columnas, filas)
  doc.save(nombreArchivo(titulo, 'pdf'))
}

// Convierte un gráfico SVG (Recharts) en imagen para el PDF del panel
async function svgAImagen(svg) {
  const caja = svg.getBoundingClientRect()
  const copia = svg.cloneNode(true)
  copia.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  copia.setAttribute('width', caja.width)
  copia.setAttribute('height', caja.height)
  const datos = new XMLSerializer().serializeToString(copia)
  const url = URL.createObjectURL(new Blob([datos], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const img = await new Promise((ok, mal) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = mal
      i.src = url
    })
    const escala = 2
    const lienzo = document.createElement('canvas')
    lienzo.width = caja.width * escala
    lienzo.height = caja.height * escala
    const ctx = lienzo.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, lienzo.width, lienzo.height)
    ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height)
    return { src: lienzo.toDataURL('image/png'), ancho: caja.width, alto: caja.height }
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Panel gerencial: tarjetas como texto y cada gráfico como imagen
export async function exportarPanelPdf({ titulo, subtitulo, tarjetas, contenedor }) {
  const doc = await nuevoPdf('portrait')
  let y = encabezadoPdf(doc, titulo, subtitulo)
  doc.setFontSize(10)
  tarjetas.forEach((t) => {
    doc.setFont('helvetica', 'bold')
    doc.text(`${t.titulo}: ${t.valorTexto}`, 14, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    if (t.detalle) doc.text(t.detalle, 14, y + 4.5)
    doc.setFontSize(10)
    y += 11
  })
  const figuras = contenedor ? [...contenedor.querySelectorAll('[data-grafico]')] : []
  const anchoUtil = doc.internal.pageSize.getWidth() - 28
  for (const fig of figuras) {
    const svg = fig.querySelector('svg.recharts-surface')
    if (!svg) continue
    const img = await svgAImagen(svg)
    const alto = (img.alto / img.ancho) * anchoUtil
    if (y + alto + 10 > doc.internal.pageSize.getHeight() - 10) {
      doc.addPage()
      y = 16
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(fig.getAttribute('data-grafico'), 14, y)
    doc.addImage(img.src, 'PNG', 14, y + 2, anchoUtil, alto)
    y += alto + 10
  }
  doc.save(nombreArchivo(titulo, 'pdf'))
}
