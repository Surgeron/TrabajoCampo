import { ESTADOS_INFO } from "../../../domain/constantes";
import "./Badge.css";

/** Etiqueta de color. tono: info | exito | alerta | peligro | neutro | violeta | naranja */
export default function Badge({ tono = "neutro", children, grande = false }) {
  return <span className={`badge badge--${tono} ${grande ? "badge--grande" : ""}`}>{children}</span>;
}

export function EstadoBadge({ estado, grande }) {
  const info = ESTADOS_INFO[estado];
  return (
    <Badge tono={info?.tono} grande={grande}>
      {info?.label || estado}
    </Badge>
  );
}
