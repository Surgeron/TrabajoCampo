import Button from "../Button/Button";
import Modal from "../Modal/Modal";

/** Confirmación antes de una operación importante. Se abre con useFeedback().confirmar(). */
export default function ConfirmDialog({ titulo, mensaje, detalle, confirmarTexto, cancelarTexto, tono, onConfirmar, onCancelar }) {
  return (
    <Modal
      titulo={titulo}
      onCerrar={onCancelar}
      ancho="sm"
      pie={
        <>
          <Button variante="secundario" onClick={onCancelar}>
            {cancelarTexto}
          </Button>
          <Button variante={tono === "peligro" ? "peligro" : "primario"} onClick={onConfirmar}>
            {confirmarTexto}
          </Button>
        </>
      }
    >
      <p style={{ fontWeight: 700, color: "var(--color-texto-2)" }}>{mensaje}</p>
      {detalle && <div style={{ marginTop: 12 }}>{detalle}</div>}
    </Modal>
  );
}
