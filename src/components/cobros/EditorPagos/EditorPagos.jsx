import { MEDIOS_PAGO } from "../../../domain/constantes";
import { formatMoneda } from "../../../utils/formato";
import Button from "../../ui/Button/Button";
import FormField, { Input, Segmentado } from "../../ui/FormField/FormField";
import "../cobros.css";

export const pagoVacio = (monto = "") => ({ medio: MEDIOS_PAGO.TRANSFERENCIA, monto, ordenante: "", numeroOperacion: "" });

const OPCIONES_MEDIO = [
  { valor: MEDIOS_PAGO.TRANSFERENCIA, etiqueta: "Transferencia" },
  { valor: MEDIOS_PAGO.EFECTIVO, etiqueta: "Efectivo" },
];

/**
 * Pagos de un cobro. Dos o más pagos equivalen a un pago mixto.
 * En transferencias se puede registrar quién transfiere y el número de operación (ayuda a conciliar).
 */
export default function EditorPagos({ pagos, onCambiar, total, errores = {} }) {
  const pagado = pagos.reduce((s, p) => s + (Number(p.monto) || 0), 0);
  const saldo = total - pagado;

  const actualizar = (i, campo, valor) => onCambiar(pagos.map((p, j) => (j === i ? { ...p, [campo]: valor } : p)));

  return (
    <div className="editor-cobro">
      {pagos.map((pago, i) => (
        <fieldset key={i} className="editor-cobro__bloque">
          <legend>
            Pago {i + 1}
            {pagos.length > 1 && (
              <button type="button" className="editor-cobro__quitar" onClick={() => onCambiar(pagos.filter((_, j) => j !== i))}>
                Quitar
              </button>
            )}
          </legend>
          <div className="grilla-form grilla-form--2">
            <div className="ocupa-todo">
              <Segmentado
                nombre={`Medio de pago ${i + 1}`}
                opciones={OPCIONES_MEDIO}
                valor={pago.medio}
                onCambiar={(v) => actualizar(i, "medio", v)}
              />
            </div>
            <FormField etiqueta="Monto" error={errores[`monto_${i}`]} obligatorio>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                value={pago.monto}
                onChange={(e) => actualizar(i, "monto", e.target.value)}
              />
            </FormField>
            {pago.medio === MEDIOS_PAGO.TRANSFERENCIA && (
              <>
                <FormField etiqueta="Quién transfiere" ayuda="Nombre o CUIT del titular de la cuenta" error={errores[`ordenante_${i}`]}>
                  <Input value={pago.ordenante} onChange={(e) => actualizar(i, "ordenante", e.target.value)} maxLength={60} />
                </FormField>
                <FormField etiqueta="N° de operación" ayuda="Opcional">
                  <Input
                    inputMode="numeric"
                    value={pago.numeroOperacion}
                    onChange={(e) => actualizar(i, "numeroOperacion", e.target.value)}
                    maxLength={30}
                  />
                </FormField>
              </>
            )}
          </div>
        </fieldset>
      ))}

      <div className={`editor-cobro__saldo ${Math.abs(saldo) > 0.5 ? "editor-cobro__saldo--pendiente" : "editor-cobro__saldo--ok"}`}>
        <span>
          Pagado <strong className="numero">{formatMoneda(pagado)}</strong> de <strong className="numero">{formatMoneda(total)}</strong>
        </span>
        <span>
          {saldo > 0.5 && `Falta ${formatMoneda(saldo)}`}
          {saldo < -0.5 && `Sobra ${formatMoneda(-saldo)}`}
          {Math.abs(saldo) <= 0.5 && "Completo"}
        </span>
      </div>

      <div className="fila-acciones">
        {saldo > 0.5 && pagos.length > 0 && (
          <Button
            variante="secundario"
            onClick={() => onCambiar(pagos.map((p, j) => (j === pagos.length - 1 ? { ...p, monto: (Number(p.monto) || 0) + saldo } : p)))}
          >
            Completar el saldo
          </Button>
        )}
        <Button variante="secundario" icono="mas" onClick={() => onCambiar([...pagos, pagoVacio(saldo > 0 ? saldo : "")])}>
          Agregar otro medio (pago mixto)
        </Button>
      </div>
    </div>
  );
}
