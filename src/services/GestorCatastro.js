// ==========================================
// GESTOR DE CATASTRO (LOTES Y FINCAS)
// ==========================================

export class GestorCatastro {
  /**
   * Recalcula el IVL Estático al cambiar condiciones de suelo, camino o drenaje.
   */
  static calcularIVL(suelo = "", drenaje = "", camino = "") {
    const s = String(suelo || "").toLowerCase();
    const d = String(drenaje || "").toLowerCase();
    const c = String(camino || "").toLowerCase();

    const pSuelo = s.includes("arcilloso") ? 5.0 : s.includes("limoso") || s.includes("franco") ? 3.0 : 1.0;
    const pDrenaje = d.includes("deficiente") || d.includes("bajo") ? 5.0 : d.includes("medio") ? 3.0 : 1.0;
    const pCamino = c.includes("tierra") ? 5.0 : c.includes("secundario") ? 3.0 : 1.0;

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
