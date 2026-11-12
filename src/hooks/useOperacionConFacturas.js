import { useFeedback } from "../context/FeedbackContext";
import { useOperacion } from "./useOperacion";

/**
 * Igual que useOperacion, pero si el número de factura ya está vinculado a otra comanda
 * pregunta si es un pago compartido y, si se confirma, la vincula igualmente (CU-07, CU-08).
 */
export function useOperacionConFacturas(funcionApi, opciones = {}) {
  const feedback = useFeedback();
  const [ejecutar, cargando] = useOperacion(funcionApi, {
    ...opciones,
    manejarError: (error) => error.codigo === "FACTURA_DUPLICADA" || (opciones.manejarError?.(error) ?? false),
  });

  const ejecutarConConfirmacion = async (carga) => {
    let resultado = await ejecutar(carga);
    if (!resultado.ok && resultado.error?.codigo === "FACTURA_DUPLICADA") {
      const compartida = await feedback.confirmar({
        titulo: "Esa factura ya está registrada",
        mensaje: `${resultado.error.message} Si es un pago compartido, se vincula la misma factura también a esta comanda. Si no, revisá el número.`,
        confirmarTexto: "Es un pago compartido",
        cancelarTexto: "Revisar el número",
      });
      if (compartida) resultado = await ejecutar({ ...carga, confirmarCompartida: true });
    }
    return resultado;
  };

  return [ejecutarConConfirmacion, cargando];
}
