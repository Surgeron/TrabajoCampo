import Icon from "../Icon/Icon";
import "./Toast.css";

const ICONOS = { exito: "check", error: "error", advertencia: "alerta", info: "info" };

/** Notificaciones breves apiladas (arriba a la derecha en escritorio, arriba a todo el ancho en celular). */
export default function ToastStack({ toasts, onCerrar }) {
  return (
    <div className="toasts" aria-live="polite" aria-relevant="additions">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.tipo}`} role={toast.tipo === "error" ? "alert" : "status"}>
          <span className="toast__icono">
            <Icon nombre={ICONOS[toast.tipo]} />
          </span>
          <div className="toast__texto">
            {toast.titulo && <strong>{toast.titulo}</strong>}
            <span>{toast.mensaje}</span>
          </div>
          <button type="button" className="toast__cerrar" onClick={() => onCerrar(toast.id)} aria-label="Cerrar aviso">
            <Icon nombre="cerrar" tamano={18} />
          </button>
        </div>
      ))}
    </div>
  );
}
