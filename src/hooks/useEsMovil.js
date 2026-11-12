import { useEffect, useState } from "react";

const CONSULTA = "(max-width: 767px)";

/** true en celular (< 768 px). Sirve para ajustar comportamiento, no solo estilos (por ejemplo, paginar más corto). */
export function useEsMovil() {
  const [esMovil, setEsMovil] = useState(() => window.matchMedia?.(CONSULTA).matches ?? false);
  useEffect(() => {
    const consulta = window.matchMedia?.(CONSULTA);
    if (!consulta) return undefined;
    const alCambiar = (e) => setEsMovil(e.matches);
    consulta.addEventListener("change", alCambiar);
    return () => consulta.removeEventListener("change", alCambiar);
  }, []);
  return esMovil;
}
