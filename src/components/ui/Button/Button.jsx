import Icon from "../Icon/Icon";
import Spinner from "../Spinner/Spinner";
import "./Button.css";

/**
 * Botón reutilizable.
 * variante: primario | secundario | fantasma | peligro | exito
 * tamano: md | lg (táctil, para tareas frecuentes)
 */
export default function Button({
  children,
  variante = "primario",
  tamano = "md",
  icono,
  iconoDerecha,
  cargando = false,
  bloque = false,
  soloIcono = false,
  className = "",
  type = "button",
  disabled,
  ...resto
}) {
  const clases = [
    "boton",
    `boton--${variante}`,
    `boton--${tamano}`,
    bloque ? "boton--bloque" : "",
    soloIcono ? "boton--solo-icono" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={clases} disabled={disabled || cargando} aria-busy={cargando || undefined} {...resto}>
      {cargando ? <Spinner tamano={18} /> : icono && <Icon nombre={icono} tamano={tamano === "lg" ? 22 : 20} />}
      {children && <span className="boton__texto">{children}</span>}
      {iconoDerecha && !cargando && <Icon nombre={iconoDerecha} tamano={20} />}
    </button>
  );
}
