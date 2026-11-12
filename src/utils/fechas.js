// Utilidades de fecha y hora. Todas trabajan en hora local del navegador.

const DIAS = ["Dom.", "Lun.", "Mar.", "Mié.", "Jue.", "Vie.", "Sáb."];
const MESES = ["Ene.", "Feb.", "Mar.", "Abr.", "May.", "Jun.", "Jul.", "Ago.", "Sep.", "Oct.", "Nov.", "Dic."];

const dosDigitos = (n) => String(n).padStart(2, "0");

/** Fecha local en formato AAAA-MM-DD. */
export function fechaISO(fecha = new Date()) {
  const d = new Date(fecha);
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;
}

/** Fecha y hora local en formato AAAA-MM-DDTHH:mm:ss (sin zona). */
export function fechaHoraISO(fecha = new Date()) {
  const d = new Date(fecha);
  return `${fechaISO(d)}T${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}:${dosDigitos(d.getSeconds())}`;
}

export function formatFechaLarga(fecha = new Date()) {
  const d = new Date(fecha);
  return `${DIAS[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

/** 07/11/2026 */
export function formatFecha(valor) {
  if (!valor) return "—";
  const [a, m, d] = valor.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

/** 14:05 */
export function formatHora(valor) {
  if (!valor) return "—";
  return valor.slice(11, 16);
}

/** 07/11/2026 14:05 */
export function formatFechaHora(valor) {
  if (!valor) return "—";
  return `${formatFecha(valor)} ${formatHora(valor)}`;
}

export function minutosDesde(valor, ahora = new Date()) {
  return Math.max(0, Math.floor((ahora - new Date(valor)) / 60000));
}

export function sumarDias(fecha, dias) {
  const d = new Date(`${fecha.slice(0, 10)}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return fechaISO(d);
}

/** Lista de fechas AAAA-MM-DD entre desde y hasta, inclusive. */
export function rangoDeFechas(desde, hasta) {
  const fechas = [];
  let actual = desde;
  while (actual <= hasta) {
    fechas.push(actual);
    actual = sumarDias(actual, 1);
  }
  return fechas;
}

/**
 * Período de consumo de cuenta corriente: del día de corte (21) al día anterior
 * del mes siguiente (20). Devuelve el período que contiene a la fecha de referencia.
 */
export function periodoDeCorte(fechaReferencia, diaCorte = 21) {
  const [a, m, d] = fechaReferencia.slice(0, 10).split("-").map(Number);
  let anioDesde = a;
  let mesDesde = m;
  if (d < diaCorte) {
    mesDesde -= 1;
    if (mesDesde === 0) {
      mesDesde = 12;
      anioDesde -= 1;
    }
  }
  const desde = `${anioDesde}-${dosDigitos(mesDesde)}-${dosDigitos(diaCorte)}`;
  let anioHasta = anioDesde;
  let mesHasta = mesDesde + 1;
  if (mesHasta === 13) {
    mesHasta = 1;
    anioHasta += 1;
  }
  const hasta = sumarDias(`${anioHasta}-${dosDigitos(mesHasta)}-${dosDigitos(diaCorte)}`, -1);
  return { desde, hasta };
}

/** Períodos de corte de los últimos n meses, el más reciente primero. */
export function ultimosPeriodosDeCorte(cantidad = 4, diaCorte = 21, hoy = fechaISO()) {
  const periodos = [];
  let referencia = hoy;
  for (let i = 0; i < cantidad; i += 1) {
    const periodo = periodoDeCorte(referencia, diaCorte);
    periodos.push(periodo);
    referencia = sumarDias(periodo.desde, -1);
  }
  return periodos;
}
