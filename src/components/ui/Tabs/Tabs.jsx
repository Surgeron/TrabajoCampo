import "./Tabs.css";

/** Pestañas con contador opcional. Se desplazan horizontalmente si no entran. */
export default function Tabs({ pestanas, activa, onCambiar, etiqueta = "Secciones" }) {
  return (
    <div className="pestanas" role="tablist" aria-label={etiqueta}>
      {pestanas.map((p) => (
        <button
          key={p.id}
          type="button"
          role="tab"
          aria-selected={activa === p.id}
          className={`pestanas__boton ${activa === p.id ? "pestanas__boton--activa" : ""}`}
          onClick={() => onCambiar(p.id)}
        >
          {p.etiqueta}
          {p.contador !== undefined && <span className="pestanas__contador">{p.contador}</span>}
        </button>
      ))}
    </div>
  );
}
