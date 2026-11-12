import { TIPOS_CLIENTE } from "../../../domain/constantes";
import { etiquetaCliente } from "../../../domain/selectores";
import { formatHora, minutosDesde } from "../../../utils/fechas";
import { formatMoneda, formatNumeroComanda } from "../../../utils/formato";
import Badge, { EstadoBadge } from "../../ui/Badge/Badge";
import Icon from "../../ui/Icon/Icon";
import "./ComandaCard.css";

/**
 * Tarjeta de comanda para listados del salón y de la cocina.
 * resaltarAdiciones: separa los ítems agregados después (para la cocina).
 */
export default function ComandaCard({
  datos,
  comanda,
  onAbrir,
  acciones,
  seleccion,
  resaltarAdiciones = false,
  mostrarTotal = true,
  ahora = new Date(),
}) {
  const minutos = minutosDesde(comanda.fechaHora, ahora);
  const originales = comanda.items.filter((i) => !i.idAdicion);
  const adicionales = comanda.items.filter((i) => i.idAdicion);
  const demorada = minutos >= 20;

  const listaItems = (items) => (
    <ul className="comanda-card__items">
      {items.map((i) => (
        <li key={i.id}>
          <strong className="numero">{i.cantidad}×</strong> {i.nombre}
        </li>
      ))}
    </ul>
  );

  return (
    <article className={`comanda-card ${seleccion?.marcada ? "comanda-card--marcada" : ""}`}>
      <header className="comanda-card__cabecera">
        {seleccion && (
          <input
            type="checkbox"
            className="comanda-card__check"
            checked={seleccion.marcada}
            disabled={seleccion.deshabilitada}
            onChange={(e) => seleccion.onCambiar(e.target.checked)}
            aria-label={`Seleccionar comanda ${comanda.numero}`}
          />
        )}
        <button type="button" className="comanda-card__titulo" onClick={onAbrir} disabled={!onAbrir}>
          <span className="comanda-card__numero numero">{formatNumeroComanda(comanda.numero)}</span>
          <span className="comanda-card__mesa">
            <Icon nombre="mesa" tamano={16} /> Mesa {comanda.mesa}
          </span>
        </button>
        <EstadoBadge estado={comanda.estado} />
      </header>

      <p className="comanda-card__cliente">
        {comanda.tipoCliente === TIPOS_CLIENTE.CONVENIO ? <Badge tono="info">Convenio</Badge> : <Badge>Particular</Badge>}
        {(comanda.tipoCliente === TIPOS_CLIENTE.CONVENIO || comanda.idTrabajador) && <span>{etiquetaCliente(datos, comanda)}</span>}
      </p>

      {resaltarAdiciones && adicionales.length > 0 ? (
        <>
          {listaItems(originales)}
          <div className="comanda-card__adicion">
            <span>Adición</span>
            {listaItems(adicionales)}
          </div>
        </>
      ) : (
        listaItems(comanda.items)
      )}

      {comanda.observaciones && <p className="comanda-card__obs">Obs.: {comanda.observaciones}</p>}

      <footer className="comanda-card__pie">
        <span className={`comanda-card__tiempo ${demorada ? "comanda-card__tiempo--demorada" : ""}`}>
          <Icon nombre="reloj" tamano={16} />
          {formatHora(comanda.fechaHora)} · {minutos} min
        </span>
        {mostrarTotal && <strong className="numero">{formatMoneda(comanda.total)}</strong>}
      </footer>
      {acciones && <div className="comanda-card__acciones">{acciones}</div>}
    </article>
  );
}
