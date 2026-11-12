import { useNavigate } from "react-router-dom";
import Icon from "../Icon/Icon";
import "./PageHeader.css";

/** Encabezado de sección: volver, título, descripción y acciones. */
export default function PageHeader({ titulo, descripcion, acciones, volverA, children }) {
  const navigate = useNavigate();
  return (
    <div className="encabezado">
      <div className="encabezado__principal">
        {volverA && (
          <button
            type="button"
            className="encabezado__volver"
            onClick={() => (volverA === -1 ? navigate(-1) : navigate(volverA))}
            aria-label="Volver"
          >
            <Icon nombre="volver" />
          </button>
        )}
        <div className="encabezado__textos">
          <h2 className="encabezado__titulo">{titulo}</h2>
          {descripcion && <p className="encabezado__descripcion">{descripcion}</p>}
        </div>
      </div>
      {acciones && <div className="encabezado__acciones">{acciones}</div>}
      {children}
    </div>
  );
}
