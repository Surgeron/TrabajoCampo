import Icon from "../Icon/Icon";
import "./EmptyState.css";

export default function EmptyState({ icono = "comandas", titulo, children, accion }) {
  return (
    <div className="vacio">
      <span className="vacio__icono">
        <Icon nombre={icono} tamano={30} />
      </span>
      <strong className="vacio__titulo">{titulo}</strong>
      {children && <p className="vacio__texto">{children}</p>}
      {accion && <div className="vacio__accion">{accion}</div>}
    </div>
  );
}
