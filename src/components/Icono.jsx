// Íconos de trazo propios (sin bibliotecas). Decorativos salvo que se pase `titulo`.
const TRAZOS = {
  inicio: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  ranking: 'M4 6h11M4 12h8M4 18h5M18 4v16m0 0l-3-3m3 3l3-3',
  mapa: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zm0 0v14m6-12v14',
  reserva: 'M5 4h14v17l-7-4-7 4z',
  lotes: 'M3 5h18v14H3zM3 12h18M12 5v14',
  piso: 'M3 18h18M5 18l3-6h8l3 6M9 12V7h6v5',
  brix: 'M10 3h4M11 3v6l-5 9a2 2 0 0 0 2 3h8a2 2 0 0 0 2-3l-5-9V3M8 15h8',
  cosecha: 'M12 21V9m0 0c0-3 2-5 5-6 0 3-2 5-5 6zm0 0C12 6 10 4 7 3c0 3 2 5 5 6zm0 6c0-2 2-4 5-4 0 2-2 4-5 4zm0 0c0-2-2-4-5-4 0 2 2 4 5 4z',
  lluvia: 'M7 15a4 4 0 0 1-.6-8A6 6 0 0 1 18 8a3.5 3.5 0 0 1-.5 7zM8 18l-1 3m5-3l-1 3m5-3l-1 3',
  patio: 'M2 16h13V7H2zm13-6h4l3 3v3h-7M6 19a2 2 0 1 0 0-.1M18 19a2 2 0 1 0 0-.1',
  simular: 'M4 20l4-8 4 4 4-9 4 6M4 4v16h16',
  panel: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  informe: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6',
  parametros: 'M4 7h10m4 0h2M4 17h4m4 0h8M14 5v4m-4 6v4',
  alerta: 'M12 4l9 16H3zM12 10v4m0 3v.5',
  parada: 'M6 6h12v12H6z',
  salir: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  menu: 'M4 6h16M4 12h16M4 18h16',
  cerrar: 'M6 6l12 12M18 6L6 18',
  atras: 'M15 5l-7 7 7 7',
  descargar: 'M12 4v11m0 0l-4-4m4 4l4-4M5 20h14',
  actualizar: 'M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6',
  editar: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  ojo: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  check: 'M5 12l5 5 9-10',
  mas: 'M12 5v14M5 12h14',
  nube: 'M7 18a4 4 0 0 1-.6-8A6 6 0 0 1 18 11a3.5 3.5 0 0 1-.5 7z',
  info: 'M12 8v.5M12 11v6M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
}

export default function Icono({ nombre, className = 'h-5 w-5', titulo }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={titulo ? undefined : 'true'}
      role={titulo ? 'img' : undefined}
    >
      {titulo && <title>{titulo}</title>}
      <path d={TRAZOS[nombre] || TRAZOS.info} />
    </svg>
  )
}
