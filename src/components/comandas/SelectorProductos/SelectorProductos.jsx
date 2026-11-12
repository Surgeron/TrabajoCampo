import { useState } from "react";
import { formatMoneda } from "../../../utils/formato";
import Badge from "../../ui/Badge/Badge";
import Stepper from "../../ui/Stepper/Stepper";
import Tabs from "../../ui/Tabs/Tabs";
import "./SelectorProductos.css";

/**
 * Carga rápida del pedido por categoría, con botones grandes y contador por producto.
 * estadoCobertura(idProducto) devuelve { tono, texto } para marcar lo que cubre el convenio.
 */
export default function SelectorProductos({
  categorias,
  productos,
  idSucursal,
  cantidades,
  onCambiar,
  categoriaInicial,
  estadoCobertura,
}) {
  const conProductos = categorias.filter((c) => productos.some((p) => p.idCategoria === c.id));
  const [activa, setActiva] = useState(
    conProductos.some((c) => c.id === categoriaInicial) ? categoriaInicial : conProductos[0]?.id,
  );

  const pestanas = conProductos.map((c) => ({
    id: c.id,
    etiqueta: c.nombre,
    contador:
      productos
        .filter((p) => p.idCategoria === c.id)
        .reduce((suma, p) => suma + (cantidades[p.id] || 0), 0) || undefined,
  }));

  const visibles = productos.filter((p) => p.idCategoria === activa);

  return (
    <div className="selector-productos">
      <Tabs pestanas={pestanas} activa={activa} onCambiar={setActiva} etiqueta="Categorías" />
      <ul className="selector-productos__lista">
        {visibles.map((producto) => {
          const cantidad = cantidades[producto.id] || 0;
          const cobertura = estadoCobertura?.(producto.id);
          return (
            <li key={producto.id} className={`producto ${cantidad > 0 ? "producto--elegido" : ""}`}>
              <button
                type="button"
                className="producto__info"
                onClick={() => onCambiar(producto.id, cantidad + 1)}
                aria-label={`Agregar ${producto.nombre}`}
              >
                <span className="producto__nombre">{producto.nombre}</span>
                <span className="producto__precio numero">{formatMoneda(producto.precios[idSucursal].precio)}</span>
                {cobertura && <Badge tono={cobertura.tono}>{cobertura.texto}</Badge>}
              </button>
              <Stepper valor={cantidad} onCambiar={(n) => onCambiar(producto.id, n)} etiqueta={producto.nombre} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
