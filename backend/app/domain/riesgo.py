"""CU12 – Calcular riesgo de los lotes.

El riesgo se calcula en el momento y no se guarda. Combina tipo de drenaje,
lluvia acumulada en el pluviómetro del lote, pronóstico de su finca y estado de piso.

Niveles (propuesta del documento, pendiente de validar):
  Alto:  imperfectamente drenado con pronóstico >= prob_lluvia_alerta (70 %).
  Medio: medianamente drenado con pronóstico >= 70 %, o imperfectamente drenado
         con pronóstico entre prob_lluvia_media (50 %) y 69 %.
  Bajo:  el resto, incluidos todos los bien drenados.
Si el lote no tiene tipo de drenaje, el nivel es "Sin datos" (datos incompletos).
"""
from datetime import date, datetime, timedelta

from . import fechas
from .constantes import (
    INHABILITADO,
    NOMBRE_DRENAJE,
    RIESGO_ALTO,
    RIESGO_BAJO,
    RIESGO_MEDIO,
    RIESGO_SIN_DATOS,
)


def lluvia_acumulada(lecturas: list[dict], hoy: date, ventana_dias: int) -> float:
    """Suma de las lecturas del pluviómetro en los últimos `ventana_dias` días (hoy incluido)."""
    desde = hoy - timedelta(days=int(ventana_dias) - 1)
    total = 0.0
    for l in lecturas:
        f = fechas.de_fecha(l["fecha"])
        if desde <= f <= hoy:
            total += float(l.get("mm") or 0)
    return round(total, 1)


def pronostico_relevante(pronosticos: list[dict], hoy: date, horizonte_dias: int):
    """Entre los días del horizonte (hoy incluido), el de mayor probabilidad de lluvia."""
    hasta = hoy + timedelta(days=int(horizonte_dias) - 1)
    mejor = None
    for p in pronosticos:
        f = fechas.de_fecha(p["fecha_pronosticada"])
        if hoy <= f <= hasta:
            prob = float(p.get("prob_lluvia_pct") or 0)
            if mejor is None or prob > float(mejor.get("prob_lluvia_pct") or 0):
                mejor = p
    return mejor


def periodos_sin_piso(estados: list[dict], ahora: datetime) -> list[dict]:
    """Arma los períodos Inhabilitado de un lote a partir de su historial de estado de piso.

    Registros Inhabilitado consecutivos se unen en un solo período. El período se
    cierra cuando el lote cambia a otro estado; si sigue Inhabilitado, queda abierto.
    """
    ordenados = sorted(estados, key=lambda e: e["fecha_hora_desde"])
    periodos = []
    actual = None
    for e in ordenados:
        if e["estado"] == INHABILITADO:
            if actual is None:
                actual = {"desde": e["fecha_hora_desde"], "hasta": None, "observacion": e.get("observacion") or ""}
        else:
            if actual is not None:
                actual["hasta"] = e["fecha_hora_desde"]
                periodos.append(actual)
                actual = None
    if actual is not None:
        periodos.append(actual)
    for p in periodos:
        fin = fechas.de_iso(p["hasta"]) if p["hasta"] else ahora
        p["abierto"] = p["hasta"] is None
        p["dias"] = round(max(0.0, fechas.horas_entre(fechas.de_iso(p["desde"]), fin)) / 24.0, 1)
    return periodos


def dias_estimados(drenaje, periodos: list[dict], params: dict):
    """Días que el lote quedaría sin piso si llueve: historial del lote o valor experto."""
    cerrados = [p["dias"] for p in periodos if not p["abierto"]]
    if cerrados:
        return round(sum(cerrados) / len(cerrados), 1), "Historial del lote"
    if drenaje:
        return float(params[f"dias_sin_piso_{drenaje}"]), "Criterio experto por drenaje"
    return None, None


def dias_por_lluvia(drenaje, mm: float, params: dict) -> int:
    """Tabla de prueba para CU23: días sin piso según la lluvia acumulada y el drenaje."""
    if not drenaje:
        return 0
    if mm > float(params["lluvia_fuerte_min_mm"]):
        return int(params[f"dias_sin_piso_{drenaje}"])
    if mm >= float(params["lluvia_moderada_min_mm"]):
        return int(params[f"dias_sin_piso_moderada_{drenaje}"])
    return 0


def nivel_riesgo(drenaje, prob: float, params: dict) -> str:
    if not drenaje:
        return RIESGO_SIN_DATOS
    alerta = float(params["prob_lluvia_alerta"])
    media = float(params["prob_lluvia_media"])
    if drenaje == "imperfecto":
        if prob >= alerta:
            return RIESGO_ALTO
        if prob >= media:
            return RIESGO_MEDIO
        return RIESGO_BAJO
    if drenaje == "medio" and prob >= alerta:
        return RIESGO_MEDIO
    return RIESGO_BAJO


def evaluar(lote: dict, pronostico, lluvia_acum_mm: float, periodos: list[dict], params: dict) -> dict:
    """Riesgo de un lote con su justificación en texto."""
    drenaje = lote.get("drenaje")
    prob = float(pronostico.get("prob_lluvia_pct") or 0) if pronostico else 0.0
    mm_prev = float(pronostico.get("mm_previstos") or 0) if pronostico else 0.0
    fecha_prob = pronostico.get("fecha_pronosticada") if pronostico else None
    nivel = nivel_riesgo(drenaje, prob, params)
    dias, origen = dias_estimados(drenaje, periodos, params)

    partes = []
    if not drenaje:
        partes.append("sin tipo de drenaje (datos incompletos)")
    else:
        partes.append(NOMBRE_DRENAJE[drenaje].lower())
    if pronostico:
        partes.append(
            f"{prob:.0f} % de lluvia el {fechas.fecha_corta(fecha_prob)} en {lote.get('finca') or 'su finca'}"
            + (f" ({mm_prev:.0f} mm previstos)" if mm_prev else "")
        )
    else:
        partes.append("sin pronóstico cargado para su finca")
    if lluvia_acum_mm:
        partes.append(f"{lluvia_acum_mm:.0f} mm acumulados en {int(params['ventana_lluvia_dias'])} días")
    if lote.get("estado_piso") and lote["estado_piso"] != "Habilitado":
        partes.append(f"piso {lote['estado_piso'].lower()}")
    return {
        "nivel": nivel,
        "justificacion": ", ".join(partes),
        "prob_lluvia_pct": prob if pronostico else None,
        "mm_previstos": mm_prev if pronostico else None,
        "fecha_pronostico": fecha_prob,
        "lluvia_acumulada_mm": lluvia_acum_mm,
        "dias_sin_piso_estimados": dias,
        "origen_estimacion": origen,
    }
