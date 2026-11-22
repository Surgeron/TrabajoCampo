"""CU19 – Registrar parada de fábrica: duración, costo, superposición y alerta previa."""
from datetime import datetime, timedelta

from . import fechas
from .constantes import ALERTA_LLUVIA, CAUSA_LLUVIA

VENTANA_ALERTA_PREVIA_H = 72  # se buscan alertas de lluvia emitidas hasta 72 h antes del inicio


def duracion_h(parada: dict, ahora: datetime) -> float:
    inicio = fechas.de_iso(parada["fecha_hora_inicio"])
    fin = fechas.de_iso(parada["fecha_hora_fin"]) if parada.get("fecha_hora_fin") else ahora
    return round(max(0.0, fechas.horas_entre(inicio, fin)), 2)


def costos(horas: float, params: dict) -> dict:
    return {
        "bajo": round(horas * float(params["costo_hora_parada_bajo"])),
        "central": round(horas * float(params["costo_hora_parada_central"])),
        "alto": round(horas * float(params["costo_hora_parada_alto"])),
    }


def se_superponen(inicio_a: datetime, fin_a, inicio_b: datetime, fin_b) -> bool:
    """Una parada sin fin (abierta) se toma como que sigue indefinidamente."""
    lejano = datetime.max.replace(tzinfo=fechas.TZ) - timedelta(days=1)
    fa = fin_a or lejano
    fb = fin_b or lejano
    return inicio_a < fb and inicio_b < fa


def buscar_superposicion(inicio: datetime, fin, existentes: list[dict], excluir_id=None):
    for p in existentes:
        if excluir_id and p.get("id") == excluir_id:
            continue
        ib = fechas.de_iso(p["fecha_hora_inicio"])
        fb = fechas.de_iso(p["fecha_hora_fin"]) if p.get("fecha_hora_fin") else None
        if se_superponen(inicio, fin, ib, fb):
            return p
    return None


def alerta_previa(parada: dict, alertas: list[dict]):
    """Para paradas por lluvia: la alerta de lluvia más antigua emitida en las 72 h previas al inicio."""
    if parada.get("causa") != CAUSA_LLUVIA:
        return None
    inicio = fechas.de_iso(parada["fecha_hora_inicio"])
    desde = inicio - timedelta(hours=VENTANA_ALERTA_PREVIA_H)
    previas = []
    for a in alertas:
        if a.get("tipo") != ALERTA_LLUVIA:
            continue
        emitida = fechas.de_iso(a["fecha_hora"])
        if desde <= emitida < inicio:
            previas.append((emitida, a))
    if not previas:
        return {"hubo_alerta": False, "horas_anticipacion": None, "alerta": None}
    previas.sort(key=lambda x: x[0])
    emitida, alerta = previas[0]
    return {
        "hubo_alerta": True,
        "horas_anticipacion": round(fechas.horas_entre(emitida, inicio), 1),
        "alerta": {k: alerta.get(k) for k in ("id", "fecha_hora", "finca", "fecha_prevista", "prob_lluvia_pct", "mm_previstos")},
    }
