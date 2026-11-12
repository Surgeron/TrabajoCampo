import { formatFecha } from "../../../utils/fechas";
import { formatNumero } from "../../../utils/formato";
import "./GraficoBarras.css";

/** Gráfico de barras simple en SVG (sin bibliotecas): una barra por día. */
export default function GraficoBarras({ serie, valor, etiqueta }) {
  const maximo = Math.max(1, ...serie.map((p) => p[valor]));
  const ancho = 720;
  const alto = 220;
  const margen = { arriba: 16, abajo: 34, izquierda: 40, derecha: 8 };
  const util = ancho - margen.izquierda - margen.derecha;
  const paso = util / serie.length;
  const barra = Math.max(2, paso * 0.68);
  const escala = (v) => ((alto - margen.arriba - margen.abajo) * v) / maximo;
  const cadaEtiqueta = Math.ceil(serie.length / 8);
  const promedio = serie.reduce((s, p) => s + p[valor], 0) / (serie.length || 1);

  return (
    <figure className="grafico">
      <figcaption className="grafico__titulo">
        {etiqueta} · promedio {formatNumero(Math.round(promedio * 10) / 10)}
      </figcaption>
      <svg viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label={etiqueta} className="grafico__svg">
        {[0, 0.5, 1].map((f) => {
          const y = alto - margen.abajo - (alto - margen.arriba - margen.abajo) * f;
          return (
            <g key={f}>
              <line x1={margen.izquierda} x2={ancho - margen.derecha} y1={y} y2={y} className="grafico__guia" />
              <text x={margen.izquierda - 6} y={y + 4} textAnchor="end" className="grafico__eje">
                {Math.round(maximo * f)}
              </text>
            </g>
          );
        })}
        {serie.map((p, i) => {
          const h = escala(p[valor]);
          const x = margen.izquierda + i * paso + (paso - barra) / 2;
          return (
            <g key={p.fecha}>
              <rect x={x} y={alto - margen.abajo - h} width={barra} height={h} rx="3" className="grafico__barra">
                <title>
                  {formatFecha(p.fecha)}: {p[valor]}
                </title>
              </rect>
              {i % cadaEtiqueta === 0 && (
                <text x={x + barra / 2} y={alto - margen.abajo + 18} textAnchor="middle" className="grafico__eje">
                  {formatFecha(p.fecha).slice(0, 5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
