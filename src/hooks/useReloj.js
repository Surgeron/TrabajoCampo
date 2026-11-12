import { useEffect, useState } from "react";

/** Hora actual que se actualiza sola (para minutos de espera). */
export function useReloj(intervaloMs = 30000) {
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setAhora(new Date()), intervaloMs);
    return () => window.clearInterval(id);
  }, [intervaloMs]);
  return ahora;
}
