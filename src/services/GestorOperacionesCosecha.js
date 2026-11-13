// ==========================================
// GESTOR DE OPERACIONES DE COSECHA
// ==========================================

export class GestorOperacionesCosecha {
  /**
   * Marca un lote como Cosechado.
   */
  static marcarCosechado(lotes, idLote) {
    return lotes.map(l => (l.id === idLote ? { ...l, estado: "COSECHADO", avancePct: 100 } : l));
  }

  /**
   * Reabre un lote a estado Pendiente.
   */
  static reabrirLote(lotes, idLote) {
    return lotes.map(l => (l.id === idLote ? { ...l, estado: "PENDIENTE", avancePct: 0, cuadrillaAsignada: null } : l));
  }

  /**
   * Asigna un frente de cosecha a un lote.
   */
  static asignarFrente(lotes, idLote, nombreFrente = "Frente Asignado") {
    return lotes.map(l =>
      l.id === idLote
        ? { ...l, estado: "EN_COSECHA", avancePct: 15, cuadrillaAsignada: nombreFrente }
        : l
    );
  }

  /**
   * Calcula métricas globales de zafra (avance, toneladas, riesgos).
   */
  static calcularMetricas(lotes, evaluadosDSS) {
    const totalToneladas = lotes.reduce((acc, l) => acc + l.toneladas, 0);
    const cosechadas = lotes.filter(l => l.estado === "COSECHADO").reduce((acc, l) => acc + l.toneladas, 0);
    const pendientes = lotes.filter(l => l.estado === "PENDIENTE");
    const toneladasPendientes = pendientes.reduce((acc, l) => acc + l.toneladas, 0);
    const frentesActivos = lotes.filter(l => l.estado === "EN_COSECHA").length;

    const enRiesgoRojo = evaluadosDSS.filter(l => l.estado === "PENDIENTE" && l.dss.semaforo === "ROJO");
    const toneladasEnRiesgo = enRiesgoRojo.reduce((acc, l) => acc + l.toneladas, 0);

    const avancePct = totalToneladas > 0 ? Number(((cosechadas / totalToneladas) * 100).toFixed(1)) : 0;

    return {
      totalToneladas,
      cosechadas,
      toneladasPendientes,
      pendientesCount: pendientes.length,
      frentesActivos,
      toneladasEnRiesgo,
      lotesEnRiesgoCount: enRiesgoRojo.length,
      avancePct
    };
  }
}
