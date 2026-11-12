import { useState } from "react";
import { useOperacion } from "../../../hooks/useOperacion";
import { anularComanda } from "../../../services/mockApi";
import { formatNumeroComanda } from "../../../utils/formato";
import Alert from "../../ui/Alert/Alert";
import Button from "../../ui/Button/Button";
import FormField, { Textarea } from "../../ui/FormField/FormField";
import Modal from "../../ui/Modal/Modal";

const MOTIVOS_FRECUENTES = ["Error de carga del mozo", "El cliente canceló el pedido", "Pedido duplicado"];

/** CU-09 Anular comanda: motivo obligatorio; la comanda conserva su número y queda auditada. */
export default function ModalAnular({ comanda, onCerrar, onListo }) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [anular, anulando] = useOperacion(anularComanda, {
    mensajeExito: (c) => `${formatNumeroComanda(c.numero)} anulada.`,
  });

  const confirmar = async () => {
    if (motivo.trim().length < 5) {
      setError("Escribí el motivo (mínimo 5 caracteres).");
      return;
    }
    const { ok } = await anular(comanda.id, motivo);
    if (ok) onListo();
  };

  return (
    <Modal
      titulo={`Anular ${formatNumeroComanda(comanda.numero)}`}
      subtitulo="La comanda no se borra: queda anulada con su número y el motivo."
      onCerrar={onCerrar}
      cerrable={!anulando}
      ancho="sm"
      pie={
        <>
          <Button variante="secundario" onClick={onCerrar} disabled={anulando}>
            Volver
          </Button>
          <Button variante="peligro" icono="anular" cargando={anulando} onClick={confirmar}>
            Anular comanda
          </Button>
        </>
      }
    >
      <div className="grilla-form">
        <Alert tipo="advertencia">Esta acción no se puede deshacer.</Alert>
        <div className="fila-acciones">
          {MOTIVOS_FRECUENTES.map((m) => (
            <Button
              key={m}
              variante="secundario"
              onClick={() => {
                setMotivo(m);
                setError("");
              }}
            >
              {m}
            </Button>
          ))}
        </div>
        <FormField etiqueta="Motivo" error={error} obligatorio>
          <Textarea
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              setError("");
            }}
            maxLength={200}
            placeholder="Explicá por qué se anula"
          />
        </FormField>
      </div>
    </Modal>
  );
}
