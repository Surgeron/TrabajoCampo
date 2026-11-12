import { useEffect, useState } from "react";
import { useEsMovil } from "../../../hooks/useEsMovil";
import Button from "../Button/Button";
import "./DataTable.css";

/**
 * Tabla adaptable: tabla clásica en tablet y escritorio, tarjetas apiladas en celular.
 *
 * columnas: [{ clave, titulo, render?(fila), alinear?: 'derecha', principal?: true, ocultarEnMovil?: true }]
 * La columna "principal" encabeza cada tarjeta en celular.
 * seleccion: { seleccionados: Set, onCambiar(id, marcado), puedeSeleccionar?(fila) }
 * mostrarTodas: sin paginar (por ejemplo, para imprimir).
 */
export default function DataTable({
  columnas,
  filas,
  claveFila = (fila) => fila.id,
  onFilaClick,
  vacio = null,
  totales,
  porPagina = 25,
  seleccion,
  etiqueta = "Listado",
  mostrarTodas = false,
}) {
  // En celular cada fila es una tarjeta alta: se pagina de a 10 para no generar listas interminables.
  const esMovil = useEsMovil();
  const porPaginaEfectiva = mostrarTodas ? Math.max(filas.length, 1) : esMovil ? Math.min(porPagina, 10) : porPagina;
  const [visibles, setVisibles] = useState(porPaginaEfectiva);
  useEffect(() => setVisibles(porPaginaEfectiva), [filas, porPaginaEfectiva]);

  if (filas.length === 0) return vacio;

  const mostradas = filas.slice(0, visibles);
  const valor = (columna, fila) => (columna.render ? columna.render(fila) : fila[columna.clave]);

  return (
    <div className="tabla">
      <div className="tabla__marco">
        <table className="tabla__tabla" aria-label={etiqueta}>
          <thead>
            <tr>
              {seleccion && (
                <th className="tabla__check">
                  <span className="visualmente-oculto">Seleccionar</span>
                </th>
              )}
              {columnas.map((c) => (
                <th key={c.clave} className={c.alinear === "derecha" ? "tabla__derecha" : ""}>
                  {c.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mostradas.map((fila) => {
              const id = claveFila(fila);
              const seleccionable = seleccion && (!seleccion.puedeSeleccionar || seleccion.puedeSeleccionar(fila));
              return (
                <tr
                  key={id}
                  className={`${onFilaClick ? "tabla__fila--accion" : ""} ${seleccion?.seleccionados.has(id) ? "tabla__fila--marcada" : ""}`}
                  onClick={onFilaClick ? () => onFilaClick(fila) : undefined}
                  onKeyDown={
                    onFilaClick
                      ? (e) => {
                          if (e.key === "Enter") onFilaClick(fila);
                        }
                      : undefined
                  }
                  tabIndex={onFilaClick ? 0 : undefined}
                >
                  {seleccion && (
                    <td className="tabla__check" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label="Seleccionar fila"
                        checked={seleccion.seleccionados.has(id)}
                        disabled={!seleccionable}
                        onChange={(e) => seleccion.onCambiar(id, e.target.checked)}
                      />
                    </td>
                  )}
                  {columnas.map((c) => (
                    <td
                      key={c.clave}
                      data-etiqueta={c.titulo}
                      className={[
                        c.alinear === "derecha" ? "tabla__derecha" : "",
                        c.principal ? "tabla__principal" : "",
                        c.ocultarEnMovil ? "tabla__oculta-movil" : "",
                      ].join(" ")}
                    >
                      {valor(c, fila)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
          {totales && (
            <tfoot>
              <tr>
                {seleccion && <td className="tabla__check" />}
                {columnas.map((c, i) => (
                  <td
                    key={c.clave}
                    data-etiqueta={c.titulo}
                    className={`${c.alinear === "derecha" ? "tabla__derecha" : ""} ${totales[c.clave] === undefined && i > 0 ? "tabla__oculta-movil" : ""}`}
                  >
                    {i === 0 && totales[c.clave] === undefined ? "Total" : totales[c.clave]}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {filas.length > visibles && (
        <div className="tabla__mas">
          <span className="texto-secundario">
            Mostrando {visibles} de {filas.length}
          </span>
          <Button variante="secundario" onClick={() => setVisibles((v) => v + porPaginaEfectiva)}>
            Mostrar {Math.min(porPaginaEfectiva, filas.length - visibles)} más
          </Button>
        </div>
      )}
    </div>
  );
}
