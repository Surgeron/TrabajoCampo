import Icon from "../Icon/Icon";
import "./Stepper.css";

/** Control de cantidad con botones grandes − / +. */
export default function Stepper({ valor, onCambiar, minimo = 0, maximo = 50, etiqueta }) {
  return (
    <div className="contador" role="group" aria-label={etiqueta}>
      <button
        type="button"
        className="contador__boton"
        onClick={() => onCambiar(Math.max(minimo, valor - 1))}
        disabled={valor <= minimo}
        aria-label={`Quitar uno${etiqueta ? ` de ${etiqueta}` : ""}`}
      >
        <Icon nombre="menos" tamano={20} />
      </button>
      <span className="contador__valor numero" aria-live="polite">
        {valor}
      </span>
      <button
        type="button"
        className="contador__boton contador__boton--mas"
        onClick={() => onCambiar(Math.min(maximo, valor + 1))}
        disabled={valor >= maximo}
        aria-label={`Agregar uno${etiqueta ? ` de ${etiqueta}` : ""}`}
      >
        <Icon nombre="mas" tamano={20} />
      </button>
    </div>
  );
}
