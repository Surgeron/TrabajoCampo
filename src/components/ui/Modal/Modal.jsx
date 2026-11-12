import { useEffect, useRef } from "react";
import Icon from "../Icon/Icon";
import "./Modal.css";

/**
 * Ventana modal. En escritorio y tablet aparece centrada; en celular, como hoja
 * inferior a pantalla casi completa, con el pie de acciones siempre visible.
 */
export default function Modal({ abierto = true, titulo, subtitulo, onCerrar, children, pie, ancho = "md", cerrable = true }) {
  const panel = useRef(null);
  const alCerrar = useRef(onCerrar);
  alCerrar.current = onCerrar;

  // Se ejecuta solo al abrir: enfoca el primer control y devuelve el foco al cerrar.
  useEffect(() => {
    if (!abierto) return undefined;
    const anterior = document.activeElement;
    const alPresionar = (evento) => {
      if (evento.key === "Escape" && cerrable) alCerrar.current?.();
    };
    document.addEventListener("keydown", alPresionar);
    document.body.style.overflow = "hidden";
    // En pantallas táctiles no se enfoca un campo, para no abrir el teclado de golpe.
    const tactil = window.matchMedia?.("(pointer: coarse)").matches;
    const enfocable = tactil ? null : panel.current?.querySelector("input, select, textarea");
    (enfocable || panel.current)?.focus();
    return () => {
      document.removeEventListener("keydown", alPresionar);
      document.body.style.overflow = "";
      anterior?.focus?.();
    };
  }, [abierto, cerrable]);

  if (!abierto) return null;

  return (
    <div className="modal" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && cerrable && onCerrar?.()}>
      <section
        ref={panel}
        className={`modal__panel modal__panel--${ancho}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
        tabIndex={-1}
      >
        <header className="modal__cabecera">
          <div>
            <h2 id="modal-titulo" className="modal__titulo">
              {titulo}
            </h2>
            {subtitulo && <p className="modal__subtitulo">{subtitulo}</p>}
          </div>
          {cerrable && (
            <button type="button" className="modal__cerrar" onClick={onCerrar} aria-label="Cerrar">
              <Icon nombre="cerrar" />
            </button>
          )}
        </header>
        <div className="modal__cuerpo">{children}</div>
        {pie && <footer className="modal__pie">{pie}</footer>}
      </section>
    </div>
  );
}
