import { calcularTotal } from "../../../domain/reglas";
import { formatMoneda } from "../../../utils/formato";
import Icon from "../../ui/Icon/Icon";
import "./ResumenPedido.css";

/** Resumen del pedido en curso: ítems, marcas de no cubierto y total. */
export default function ResumenPedido({ items, noCubiertos = [], onQuitar, vacio = "Todavía no cargaste ítems." }) {
  const fueraDeConvenio = (idProducto) => noCubiertos.find((n) => n.idProducto === idProducto);
  const total = calcularTotal(items);

  if (items.length === 0) return <p className="resumen__vacio">{vacio}</p>;

  return (
    <div className="resumen">
      <ul className="resumen__items">
        {items.map((item) => {
          const fuera = fueraDeConvenio(item.idProducto);
          return (
            <li key={item.idProducto} className={fuera ? "resumen__item resumen__item--fuera" : "resumen__item"}>
              <span className="resumen__cantidad numero">{item.cantidad}×</span>
              <span className="resumen__nombre">
                {item.nombre}
                {fuera && <span className="resumen__aviso">{fuera.cantidad} fuera de convenio</span>}
              </span>
              <span className="resumen__importe numero">{formatMoneda(item.cantidad * item.precioUnitario)}</span>
              {onQuitar && (
                <button
                  type="button"
                  className="resumen__quitar"
                  onClick={() => onQuitar(item.idProducto)}
                  aria-label={`Quitar ${item.nombre}`}
                >
                  <Icon nombre="cerrar" tamano={18} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <div className="resumen__total">
        <span>Total</span>
        <strong className="numero">{formatMoneda(total)}</strong>
      </div>
    </div>
  );
}
