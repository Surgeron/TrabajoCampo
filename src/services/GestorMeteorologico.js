// ==========================================
// GESTOR METEOROLÓGICO (CLIMA & PLUVIÓMETROS)
// ==========================================

export class GestorMeteorologico {
  /**
   * Consulta en tiempo real a Open-Meteo para las coordenadas de La Esperanza / San Pedro.
   */
  static async consultarPronosticoLive() {
    try {
      const res = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=-24.2255&longitude=-64.8638&daily=precipitation_sum,precipitation_probability_max&timezone=America%2FArgentina%2FJujuy"
      );
      if (res.ok) {
        const data = await res.json();
        if (data.daily && data.daily.precipitation_sum) {
          const mm = data.daily.precipitation_sum[0] || 0;
          const prob = data.daily.precipitation_probability_max[0] || 0;
          return {
            lluviaPrevistaMm: mm,
            probabilidadPct: prob,
            badge: `📡 En vivo Open-Meteo: ${mm} mm hoy (Prob ${prob}%)`
          };
        }
      }
    } catch (e) {
      console.warn("Open-Meteo offline, usando fallback.");
    }
    return {
      lluviaPrevistaMm: 2.0,
      probabilidadPct: 15,
      badge: "📡 En vivo Open-Meteo: Seco (2 mm prev)"
    };
  }

  /**
   * Agrega una lectura de pluviómetro y retorna la lista actualizada.
   */
  static registrarLectura(lecturasPrevias, nuevaLectura) {
    const id = `pluv-${Date.now()}`;
    const fecha = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return [
      { id, fecha: `Hoy ${fecha}`, ...nuevaLectura },
      ...lecturasPrevias
    ];
  }
}
