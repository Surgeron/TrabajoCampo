// ==========================================
// GESTOR DE PRIORIZACIÓN DSS (MOTOR DE INTELIGENCIA)
// ==========================================

export class GestorPriorizacionDSS {
  /**
   * Calcula el puntaje de prioridad y semáforo para un lote dado un escenario climático.
   */
  static evaluarLote(lote, cfgClima) {
    if (lote.estado === "COSECHADO") {
      return {
        puntaje: 0,
        semaforo: "COSECHADO",
        color: "#64748b",
        recomendacion: "Lote ya cosechado. Caña entregada a fábrica sin riesgo.",
        badgeClass: "badge-harvested",
        badgeText: "Cosechado ✔️"
      };
    }

    if (lote.estado === "EN_COSECHA") {
      return {
        puntaje: 8.5,
        semaforo: "EN_COSECHA",
        color: "#3b82f6",
        recomendacion: `Frente activo cortando (${lote.avancePct || 65}% completado). No interrumpir frente.`,
        badgeClass: "badge-active",
        badgeText: `En Cosecha (${lote.avancePct || 65}%)`
      };
    }

    // Riesgo meteorológico dinámico (0 a 10)
    const rMet = Math.min(
      10,
      ((cfgClima.lluviaCaidaMm * 0.4) + (cfgClima.lluviaPrevistaMm * (cfgClima.probabilidadPct / 100) * 0.6)) / 3.0
    );

    // Puntaje DSS final
    const puntaje = (lote.ivlEstatico * 1.0) + (rMet * 0.9);

    if (puntaje >= 6.5) {
      return {
        puntaje: Number(puntaje.toFixed(2)),
        semaforo: "ROJO",
        color: "#ef4444",
        recomendacion: `🚨 COSECHAR URGENTE: Suelo ${lote.suelo} y ${lote.camino}. Quedará intransitable con ${cfgClima.lluviaPrevistaMm} mm.`,
        badgeClass: "badge-urgent",
        badgeText: "Urgente Cosechar 🚨"
      };
    } else if (puntaje >= 4.0) {
      return {
        puntaje: Number(puntaje.toFixed(2)),
        semaforo: "AMARILLO",
        color: "#f59e0b",
        recomendacion: `⚠️ MONITOREO PREVENTIVO: Camino sensible pero transitable. Programar en segunda línea.`,
        badgeClass: "badge-warning",
        badgeText: "Precaución ⚠️"
      };
    } else {
      return {
        puntaje: Number(puntaje.toFixed(2)),
        semaforo: "VERDE",
        color: "#10b981",
        recomendacion: `🟢 LOTE SEGURO / RESERVA: Acceso con ripio firme. Conservar para días de lluvia.`,
        badgeClass: "badge-safe",
        badgeText: "Reserva Segura 🟢"
      };
    }
  }

  /**
   * Genera el ranking de cosecha ordenado para todos los lotes.
   */
  static generarRanking(lotes, cfgClima, filtro = "todos") {
    let evaluados = lotes.map(lote => ({
      ...lote,
      dss: this.evaluarLote(lote, cfgClima)
    }));

    if (filtro === "pendientes") {
      evaluados = evaluados.filter(l => l.estado === "PENDIENTE");
    } else if (filtro === "riesgo") {
      evaluados = evaluados.filter(l => l.dss.semaforo === "ROJO" || l.dss.semaforo === "AMARILLO");
    } else if (filtro === "cosechados") {
      evaluados = evaluados.filter(l => l.estado === "COSECHADO");
    }

    return evaluados.sort((a, b) => (b.dss.puntaje || 0) - (a.dss.puntaje || 0));
  }
}
