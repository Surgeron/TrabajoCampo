// Íconos SVG propios (sin bibliotecas). Trazo de 1,8 px, 24×24.
const TRAZOS = {
  inicio: "M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z",
  comandas: "M7 3.5h7.2L19 8.2V20a1.2 1.2 0 0 1-1.2 1.2H7A1.2 1.2 0 0 1 5.8 20V4.7A1.2 1.2 0 0 1 7 3.5zM14 3.8V8h4.2M8.5 12.2h7M8.5 16h5",
  mas: "M12 5v14M5 12h14",
  menos: "M5 12h14",
  cocina: "M6 13a6 6 0 0 1 12 0zM4 13h16M12 7V5M8 17h8M9 20h6",
  cobrar: "M3 7h18v10H3zM3 10h18M7 14h3",
  factura: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3",
  deposito: "M3 8l9-5 9 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1zM3 8h18M8 20v-7h8v7",
  desperdicio: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6",
  informes: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  buscar: "M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM20 20l-4-4",
  ajustes: "M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2.1-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2.1 1.2L5.1 5.9l-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2.1 1.2L10 21h4l.5-2.6a7 7 0 0 0 2.1-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z",
  salir: "M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l4-4-4-4M14 12H4",
  usuario: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1-4 4-6 8-6s7 2 8 6",
  menu: "M4 7h16M4 12h16M4 17h16",
  cerrar: "M6 6l12 12M18 6 6 18",
  check: "M5 12.5 10 17l9-10",
  alerta: "M12 4 2.5 20h19zM12 10v4.5M12 17.5v.5",
  info: "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 11v6M12 7.5v.5",
  error: "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM9 9l6 6M15 9l-6 6",
  derecha: "M9 5l7 7-7 7",
  izquierda: "M15 5l-7 7 7 7",
  abajo: "M5 9l7 7 7-7",
  volver: "M10 5 3 12l7 7M3 12h18",
  editar: "M4 20h4L19 9l-4-4L4 16zM13 7l4 4",
  anular: "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM5.6 5.6l12.8 12.8",
  recargar: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  descargar: "M12 4v11M7 10l5 5 5-5M5 20h14",
  imprimir: "M7 9V3h10v6M7 17H4v-7a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v7h-3M7 14h10v7H7z",
  sucursal: "M3 21h18M5 21V8l7-4 7 4v13M9 21v-5h6v5M9 11h.5M14.5 11h.5",
  cambiar: "M7 7h13l-4-4M17 17H4l4 4",
  reloj: "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 7v5l3 2",
  filtro: "M4 5h16l-6 7v6l-4 2v-8z",
  subir: "M12 20V9M7 14l5-5 5 5M5 4h14",
  ojo: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6z",
  mesa: "M3 9h18M5 9v11M19 9v11M8 9V5h8v4",
  empresa: "M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 10h4a1 1 0 0 1 1 1v10M2 21h20M8 8h3M8 12h3M8 16h3",
  bebida: "M7 3h10l-1.5 17a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1zM7.5 8h9",
  plato: "M12 19a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM12 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6z",
  firma: "M3 17c3-1 4-8 6-8s0 7 2 7 3-4 4-4 1 3 3 3M3 21h18",
  historial: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2",
};

export default function Icon({ nombre, tamano = 22, className = "", titulo }) {
  const trazo = TRAZOS[nombre];
  if (!trazo) return null;
  return (
    <svg
      className={`icono ${className}`}
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={titulo ? undefined : "true"}
      role={titulo ? "img" : undefined}
    >
      {titulo && <title>{titulo}</title>}
      <path d={trazo} />
    </svg>
  );
}
