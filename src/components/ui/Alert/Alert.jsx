import Icon from "../Icon/Icon";
import "./Alert.css";

const ICONOS = { info: "info", exito: "check", advertencia: "alerta", error: "error" };

/** Aviso dentro de la página (no desaparece solo). tipo: info | exito | advertencia | error */
export default function Alert({ tipo = "info", titulo, children, accion }) {
  return (
    <div className={`aviso aviso--${tipo}`} role={tipo === "error" ? "alert" : undefined}>
      <span className="aviso__icono">
        <Icon nombre={ICONOS[tipo]} />
      </span>
      <div className="aviso__texto">
        {titulo && <strong className="aviso__titulo">{titulo}</strong>}
        {children && <div>{children}</div>}
      </div>
      {accion && <div className="aviso__accion">{accion}</div>}
    </div>
  );
}
