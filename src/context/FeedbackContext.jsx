import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import ConfirmDialog from "../components/ui/ConfirmDialog/ConfirmDialog";
import ToastStack from "../components/ui/Toast/ToastStack";

const FeedbackContext = createContext(null);
const DURACION_TOAST = 4500;

/**
 * Mensajes al usuario: notificaciones breves (éxito, advertencia, error, info)
 * y diálogos de confirmación que devuelven una promesa.
 */
export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmacion, setConfirmacion] = useState(null);
  const contador = useRef(0);

  const cerrarToast = useCallback((id) => setToasts((lista) => lista.filter((t) => t.id !== id)), []);

  const notificar = useCallback(
    (tipo, mensaje, titulo) => {
      contador.current += 1;
      const id = contador.current;
      setToasts((lista) => [...lista.slice(-3), { id, tipo, mensaje, titulo }]);
      window.setTimeout(() => cerrarToast(id), tipo === "error" ? DURACION_TOAST * 1.5 : DURACION_TOAST);
    },
    [cerrarToast],
  );

  const confirmar = useCallback(
    (opciones) =>
      new Promise((resolve) => {
        setConfirmacion({
          titulo: "¿Confirmás la operación?",
          confirmarTexto: "Confirmar",
          cancelarTexto: "Cancelar",
          tono: "primario",
          ...opciones,
          resolver: resolve,
        });
      }),
    [],
  );

  const responder = (valor) => {
    confirmacion?.resolver(valor);
    setConfirmacion(null);
  };

  const valor = useMemo(
    () => ({
      notificar,
      exito: (mensaje, titulo) => notificar("exito", mensaje, titulo),
      error: (mensaje, titulo) => notificar("error", mensaje, titulo),
      advertencia: (mensaje, titulo) => notificar("advertencia", mensaje, titulo),
      info: (mensaje, titulo) => notificar("info", mensaje, titulo),
      confirmar,
    }),
    [notificar, confirmar],
  );

  return (
    <FeedbackContext.Provider value={valor}>
      {children}
      <ToastStack toasts={toasts} onCerrar={cerrarToast} />
      {confirmacion && (
        <ConfirmDialog
          {...confirmacion}
          onConfirmar={() => responder(true)}
          onCancelar={() => responder(false)}
        />
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const contexto = useContext(FeedbackContext);
  if (!contexto) throw new Error("useFeedback debe usarse dentro de FeedbackProvider");
  return contexto;
}
