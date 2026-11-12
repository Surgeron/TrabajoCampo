import "./Spinner.css";

export default function Spinner({ tamano = 22, etiqueta }) {
  return (
    <span className="spinner" style={{ width: tamano, height: tamano }} role={etiqueta ? "status" : undefined}>
      {etiqueta && <span className="visualmente-oculto">{etiqueta}</span>}
    </span>
  );
}

/** Estado de carga de una sección completa. */
export function Cargando({ texto = "Cargando…" }) {
  return (
    <div className="cargando" role="status">
      <Spinner tamano={32} />
      <span>{texto}</span>
    </div>
  );
}
