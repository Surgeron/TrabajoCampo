// ==========================================
// GESTOR DE PARADAS DE FÁBRICA (AUDITORÍA E IMPACTO)
// ==========================================

export class GestorParadasFabrica {
  /**
   * Registra una nueva parada de molienda y calcula pérdidas.
   */
  static registrarParada(paradasPrevias, nuevaParada) {
    const id = `PAR-${Date.now().toString().slice(-4)}`;
    const fecha = new Date().toISOString().split("T")[0];
    const costoARS = nuevaParada.toneladasNoMolidas * 6000; // Estimación ~6.000 ARS por ton no molida

    const paradaObj = {
      id,
      fecha,
      costoARS,
      ...nuevaParada
    };

    return [paradaObj, ...paradasPrevias];
  }

  /**
   * Calcula el acumulado de horas y pérdidas económicas.
   */
  static calcularTotales(paradas) {
    const horasTotales = paradas.reduce((acc, p) => acc + Number(p.duracionHoras), 0);
    const costoTotalARS = paradas.reduce((acc, p) => acc + Number(p.costoARS), 0);
    const tonNoMolidas = paradas.reduce((acc, p) => acc + Number(p.toneladasNoMolidas), 0);

    return {
      horasTotales: Number(horasTotales.toFixed(1)),
      costoTotalARS,
      tonNoMolidas
    };
  }
}
