// ==========================================
// GESTOR DE CATASTRO (LOTES Y FINCAS)
// ==========================================

export class GestorCatastro {
  /**
   * Recalcula el IVL Estático al cambiar condiciones de suelo, camino o drenaje.
   */
  static calcularIVL(suelo, drenaje, camino) {
    let pSuelo = suelo.includes("Arcilloso") ? 5.0 : suelo.includes("Limoso") || suelo.includes("Franco") ? 3.0 : 1.0;
    let pDrenaje = drenaje.includes("Deficiente") || drenaje.includes("Bajo") ? 5.0 : drenaje.includes("Medio") ? 3.0 : 1.0;
    let pCamino = camino.includes("tierra") ? 5.0 : camino.includes("secundario") ? 3.0 : 1.0;

    const ivl = (pSuelo * 0.35) + (pDrenaje * 0.35) + (pCamino * 0.30);
    return Number(ivl.toFixed(2));
  }

  /**
   * Actualiza los atributos de acceso o suelo de un lote.
   */
  static actualizarLote(lotes, idLote, nuevosDatos) {
    return lotes.map(lote => {
      if (lote.id === idLote) {
        const suelo = nuevosDatos.suelo || lote.suelo;
        const drenaje = nuevosDatos.drenaje || lote.drenaje;
        const camino = nuevosDatos.camino || lote.camino;
        const ivlEstatico = this.calcularIVL(suelo, drenaje, camino);

        return {
          ...lote,
          ...nuevosDatos,
          ivlEstatico
        };
      }
      return lote;
    });
  }
}
