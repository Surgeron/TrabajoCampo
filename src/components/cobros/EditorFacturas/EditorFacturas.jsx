import { TIPOS_COMPROBANTE } from "../../../domain/constantes";
import { fechaISO } from "../../../utils/fechas";
import { formatMoneda } from "../../../utils/formato";
import Button from "../../ui/Button/Button";
import FormField, { Input, Select } from "../../ui/FormField/FormField";
import "../cobros.css";

export const facturaVacia = ({ puntoVenta = "", importe = "" } = {}) => ({
  tipoComprobante: "Factura B",
  puntoVenta,
  numero: "",
  fecha: fechaISO(),
  clienteFacturado: "",
  cuitCliente: "",
  importe,
});

/**
 * Datos de la factura emitida en Tango (el sistema no factura: guarda la referencia).
 * Admite varias facturas para un mismo cobro (factura dividida).
 */
export default function EditorFacturas({ facturas, onCambiar, total, errores = {}, puntoVentaSugerido = "" }) {
  const suma = facturas.reduce((s, f) => s + (Number(f.importe) || 0), 0);
  const actualizar = (i, campo, valor) => onCambiar(facturas.map((f, j) => (j === i ? { ...f, [campo]: valor } : f)));
  const err = (i, campo) => errores[i]?.[campo];

  return (
    <div className="editor-cobro">
      {facturas.map((factura, i) => (
        <fieldset key={i} className="editor-cobro__bloque">
          <legend>
            Factura {i + 1}
            {facturas.length > 1 && (
              <button type="button" className="editor-cobro__quitar" onClick={() => onCambiar(facturas.filter((_, j) => j !== i))}>
                Quitar
              </button>
            )}
          </legend>
          <div className="grilla-form grilla-form--2">
            <FormField etiqueta="Comprobante" error={err(i, "tipoComprobante")} obligatorio>
              <Select value={factura.tipoComprobante} onChange={(e) => actualizar(i, "tipoComprobante", e.target.value)}>
                {TIPOS_COMPROBANTE.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </FormField>
            <FormField etiqueta="Punto de venta" error={err(i, "puntoVenta")} obligatorio>
              <Input
                type="number"
                inputMode="numeric"
                value={factura.puntoVenta}
                onChange={(e) => actualizar(i, "puntoVenta", e.target.value)}
              />
            </FormField>
            <FormField etiqueta="Número" error={err(i, "numero")} obligatorio>
              <Input type="number" inputMode="numeric" value={factura.numero} onChange={(e) => actualizar(i, "numero", e.target.value)} />
            </FormField>
            <FormField etiqueta="Fecha" error={err(i, "fecha")} obligatorio>
              <Input type="date" value={factura.fecha} onChange={(e) => actualizar(i, "fecha", e.target.value)} max={fechaISO()} />
            </FormField>
            <FormField etiqueta="A nombre de" error={err(i, "clienteFacturado")} obligatorio className="ocupa-todo">
              <Input
                value={factura.clienteFacturado}
                onChange={(e) => actualizar(i, "clienteFacturado", e.target.value)}
                placeholder="Nombre o razón social"
                maxLength={80}
              />
            </FormField>
            <FormField
              etiqueta="CUIT del cliente"
              error={err(i, "cuitCliente")}
              ayuda={factura.tipoComprobante === "Factura A" ? "Obligatorio en factura A" : "Opcional"}
            >
              <Input inputMode="numeric" value={factura.cuitCliente} onChange={(e) => actualizar(i, "cuitCliente", e.target.value)} placeholder="30-12345678-9" />
            </FormField>
            <FormField etiqueta="Importe" error={err(i, "importe")} obligatorio>
              <Input type="number" inputMode="decimal" value={factura.importe} onChange={(e) => actualizar(i, "importe", e.target.value)} />
            </FormField>
          </div>
        </fieldset>
      ))}

      {total !== undefined && (
        <div className={`editor-cobro__saldo ${Math.abs(total - suma) > 0.5 ? "editor-cobro__saldo--pendiente" : "editor-cobro__saldo--ok"}`}>
          <span>
            Facturado <strong className="numero">{formatMoneda(suma)}</strong> de <strong className="numero">{formatMoneda(total)}</strong>
          </span>
          <span>{Math.abs(total - suma) <= 0.5 ? "Coincide" : "No coincide con el total"}</span>
        </div>
      )}

      <Button
        variante="secundario"
        icono="mas"
        onClick={() => onCambiar([...facturas, facturaVacia({ puntoVenta: puntoVentaSugerido, importe: total ? Math.max(0, total - suma) : "" })])}
      >
        Agregar otra factura (factura dividida)
      </Button>
    </div>
  );
}
