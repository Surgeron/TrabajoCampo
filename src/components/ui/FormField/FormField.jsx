import { cloneElement, isValidElement, useId } from "react";
import "./FormField.css";

/**
 * Campo de formulario: etiqueta, control, ayuda y error.
 * El control hijo recibe id, aria-invalid y aria-describedby automáticamente.
 */
export default function FormField({ etiqueta, error, ayuda, obligatorio, children, className = "" }) {
  const id = useId();
  const idDescripcion = error || ayuda ? `${id}-desc` : undefined;
  const control = isValidElement(children)
    ? cloneElement(children, {
        id: children.props.id || id,
        "aria-invalid": error ? "true" : undefined,
        "aria-describedby": idDescripcion,
      })
    : children;

  return (
    <div className={`campo ${error ? "campo--error" : ""} ${className}`}>
      {etiqueta && (
        <label className="campo__etiqueta" htmlFor={children?.props?.id || id}>
          {etiqueta}
          {obligatorio && <span className="campo__obligatorio" aria-hidden="true"> *</span>}
        </label>
      )}
      {control}
      {(error || ayuda) && (
        <p id={idDescripcion} className={error ? "campo__error" : "campo__ayuda"}>
          {error || ayuda}
        </p>
      )}
    </div>
  );
}

export function Input(props) {
  return <input className="control" {...props} />;
}

export function Select({ children, ...props }) {
  return (
    <select className="control control--select" {...props}>
      {children}
    </select>
  );
}

export function Textarea(props) {
  return <textarea className="control control--area" rows={3} {...props} />;
}

/** Opciones excluyentes como botones grandes (más cómodo que un select en táctil). */
export function Segmentado({ opciones, valor, onCambiar, nombre, deshabilitado }) {
  return (
    <div className="segmentado" role="radiogroup" aria-label={nombre}>
      {opciones.map((opcion) => (
        <button
          key={opcion.valor}
          type="button"
          role="radio"
          aria-checked={valor === opcion.valor}
          className={`segmentado__opcion ${valor === opcion.valor ? "segmentado__opcion--activa" : ""}`}
          onClick={() => onCambiar(opcion.valor)}
          disabled={deshabilitado}
        >
          {opcion.etiqueta}
        </button>
      ))}
    </div>
  );
}

export function Checkbox({ etiqueta, checked, onChange, disabled, descripcion }) {
  return (
    <label className={`check ${disabled ? "check--deshabilitado" : ""}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      <span>
        <span className="check__etiqueta">{etiqueta}</span>
        {descripcion && <span className="check__descripcion">{descripcion}</span>}
      </span>
    </label>
  );
}
