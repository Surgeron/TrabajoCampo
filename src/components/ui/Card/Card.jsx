import Icon from "../Icon/Icon";
import "./Card.css";

/** Panel blanco con título opcional y acciones a la derecha. */
export default function Card({ titulo, subtitulo, acciones, children, className = "", sinRelleno = false }) {
  return (
    <section className={`tarjeta ${sinRelleno ? "tarjeta--sin-relleno" : ""} ${className}`}>
      {(titulo || acciones) && (
        <header className="tarjeta__cabecera">
          <div className="tarjeta__titulos">
            {titulo && <h2 className="tarjeta__titulo">{titulo}</h2>}
            {subtitulo && <p className="tarjeta__subtitulo">{subtitulo}</p>}
          </div>
          {acciones && <div className="tarjeta__acciones">{acciones}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

/** Indicador numérico. Si recibe onClick funciona como acceso directo. */
export function StatCard({ etiqueta, valor, icono, tono = "info", detalle, onClick }) {
  const Contenido = (
    <>
      {icono && (
        <span className={`indicador__icono indicador__icono--${tono}`}>
          <Icon nombre={icono} />
        </span>
      )}
      <span className="indicador__texto">
        <span className="indicador__etiqueta">{etiqueta}</span>
        <strong className="indicador__valor numero">{valor}</strong>
        {detalle && <span className="indicador__detalle">{detalle}</span>}
      </span>
    </>
  );
  return onClick ? (
    <button type="button" className="indicador indicador--accion" onClick={onClick}>
      {Contenido}
    </button>
  ) : (
    <div className="indicador">{Contenido}</div>
  );
}
