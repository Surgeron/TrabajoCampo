// Menú de cada rol según el mapa de navegación del documento (36 pantallas).
// `codigo` es el de la pantalla en el mapa; `principal` la muestra en la barra inferior del celular.
export const BASE_ROL = {
  tecnico: '/tecnico',
  jefe_lote: '/jefe',
  bascula: '/bascula',
  fabrica: '/fabrica',
}

export const MENU = {
  tecnico: [
    { a: '/tecnico', texto: 'Inicio', codigo: 'T01', icono: 'inicio', principal: true, fin: true },
    { a: '/tecnico/ranking', texto: 'Ranking de cosecha', corto: 'Ranking', codigo: 'T02', icono: 'ranking', principal: true },
    { a: '/tecnico/mapa', texto: 'Mapa de lotes', corto: 'Mapa', codigo: 'T04', icono: 'mapa', principal: true },
    { a: '/tecnico/reserva', texto: 'Lotes de reserva', codigo: 'T05', icono: 'reserva' },
    { a: '/tecnico/lotes', texto: 'Fincas y lotes', codigo: 'T06', icono: 'lotes' },
    { grupo: 'Registros de campo' },
    { a: '/tecnico/estado-piso', texto: 'Estado de piso', codigo: 'T08', icono: 'piso' },
    { a: '/tecnico/brix', texto: 'Medición de Brix', codigo: 'T09', icono: 'brix' },
    { a: '/tecnico/cosecha', texto: 'Cosecha realizada', codigo: 'T10', icono: 'cosecha' },
    { grupo: 'Lluvia y patio' },
    { a: '/tecnico/pronostico', texto: 'Pronóstico de lluvia', corto: 'Pronóstico', codigo: 'T11', icono: 'lluvia', principal: true },
    { a: '/tecnico/abastecimiento', texto: 'Abastecimiento de patio', codigo: 'T13', icono: 'patio' },
    { a: '/tecnico/simulador', texto: 'Simular escenario', codigo: 'T14', icono: 'simular' },
    { grupo: 'Gerencia' },
    { a: '/tecnico/panel', texto: 'Panel gerencial', codigo: 'T16', icono: 'panel' },
    { a: '/tecnico/informes', texto: 'Informes', codigo: 'T17', icono: 'informe' },
    { a: '/tecnico/parametros', texto: 'Parámetros', codigo: 'T19', icono: 'parametros' },
  ],
  jefe_lote: [
    { a: '/jefe', texto: 'Inicio', codigo: 'J01', icono: 'inicio', principal: true, fin: true },
    { a: '/jefe/lectura', texto: 'Lectura de pluviómetro', corto: 'Lluvia', codigo: 'J02', icono: 'lluvia', principal: true },
    { a: '/jefe/estado-piso', texto: 'Estado de piso', corto: 'Piso', codigo: 'J03', icono: 'piso', principal: true },
    { a: '/jefe/registros', texto: 'Mis registros', corto: 'Registros', codigo: 'J04', icono: 'informe', principal: true },
  ],
  bascula: [
    { a: '/bascula', texto: 'Inicio', codigo: 'B01', icono: 'inicio', principal: true, fin: true },
    { a: '/bascula/carros', texto: 'Registrar carros', corto: 'Carros', codigo: 'B02', icono: 'patio', principal: true },
    { a: '/bascula/historial', texto: 'Historial del patio', corto: 'Historial', codigo: 'B03', icono: 'informe', principal: true },
  ],
  fabrica: [
    { a: '/fabrica', texto: 'Inicio', codigo: 'F01', icono: 'inicio', principal: true, fin: true },
    { a: '/fabrica/alertas', texto: 'Alertas', codigo: 'F02', icono: 'alerta', principal: true },
    { a: '/fabrica/paradas', texto: 'Paradas', codigo: 'F04', icono: 'parada', principal: true },
    { a: '/fabrica/abastecimiento', texto: 'Abastecimiento de patio', corto: 'Patio', codigo: 'F06', icono: 'patio', principal: true },
    { a: '/fabrica/panel', texto: 'Panel gerencial', codigo: 'F07', icono: 'panel' },
    { a: '/fabrica/informes', texto: 'Informes', codigo: 'F08', icono: 'informe' },
  ],
}
