import { useCallback, useRef, useState } from "react";
import { useFeedback } from "../context/FeedbackContext";
import { useSesion } from "../context/SesionContext";

/**
 * Ejecuta una operación del backend simulado con la sesión actual,
 * maneja el estado de carga y muestra los errores.
 *
 *   const [cobrar, cobrando] = useOperacion(cobrarComandas);
 *   const { ok, datos, error } = await cobrar(cobro);
 *
 * Opciones: mensajeExito (texto o función del resultado) y manejarError
 * (devuelve true si la pantalla ya mostró el error por su cuenta).
 */
export function useOperacion(funcionApi, { mensajeExito, manejarError } = {}) {
  const { contextoApi } = useSesion();
  const feedback = useFeedback();
  const [cargando, setCargando] = useState(false);
  const enCurso = useRef(false);

  const ejecutar = useCallback(
    async (...argumentos) => {
      if (enCurso.current) return { ok: false, error: null };
      enCurso.current = true;
      setCargando(true);
      try {
        const datos = await funcionApi(...argumentos, contextoApi);
        if (mensajeExito) {
          feedback.exito(typeof mensajeExito === "function" ? mensajeExito(datos) : mensajeExito);
        }
        return { ok: true, datos };
      } catch (error) {
        const manejado = manejarError ? manejarError(error) : false;
        if (!manejado) feedback.error(error.message || "Ocurrió un error inesperado.");
        return { ok: false, error };
      } finally {
        enCurso.current = false;
        setCargando(false);
      }
    },
    [funcionApi, contextoApi, feedback, mensajeExito, manejarError],
  );

  return [ejecutar, cargando];
}
