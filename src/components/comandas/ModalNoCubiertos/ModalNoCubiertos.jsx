import Alert from "../../ui/Alert/Alert";
import Button from "../../ui/Button/Button";
import Modal from "../../ui/Modal/Modal";
import { formatMoneda } from "../../../utils/formato";
import "./ModalNoCubiertos.css";

/**
 * Alerta de consumo fuera de convenio (CU-03 paso 5, CU-06).
 * El mozo informa al cliente: si quiere continuar, esos ítems van a una comanda aparte (particular).
 */
export default function ModalNoCubiertos({ noCubiertos, onGenerarAparte, onQuitar, onCerrar, cargando }) {
  const total = noCubiertos.reduce((suma, i) => suma + i.cantidad * i.precioUnitario, 0);
  return (
    <Modal
      titulo="Consumo no cubierto por el convenio"
      subtitulo="Informale al cliente antes de continuar."
      onCerrar={onCerrar}
      cerrable={!cargando}
      pie={
        <>
          <Button variante="secundario" onClick={onQuitar} disabled={cargando}>
            Quitar del pedido
          </Button>
          <Button variante="primario" onClick={onGenerarAparte} cargando={cargando}>
            Generar comanda aparte
          </Button>
        </>
      }
    >
      <ul className="no-cubiertos">
        {noCubiertos.map((item) => (
          <li key={`${item.idProducto}-${item.motivo}`}>
            <span>
              <strong>
                {item.cantidad} × {item.nombre}
              </strong>
              <span className="texto-secundario">{item.motivo}</span>
            </span>
            <strong className="numero">{formatMoneda(item.cantidad * item.precioUnitario)}</strong>
          </li>
        ))}
      </ul>
      <Alert tipo="advertencia">
        Si el cliente quiere continuar, se registra una comanda aparte como particular por {formatMoneda(total)}, que se
        cobra en el hotel.
      </Alert>
    </Modal>
  );
}
