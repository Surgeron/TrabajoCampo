"""CU13 – Consultar ranking de cosecha (se calcula en el momento, no se guarda).

Quedan afuera: lotes En preparación, terminados (CU16), sin zona (sin distancia
al ingenio), inhabilitados (CU09), sin medición de Brix y con menos de 8 °Bx (CU10).
Los lotes en cosecha se muestran arriba, aparte.

Orden de los restantes:
  1. Riesgo Alto primero (mal drenados, maduros, con lluvia >= 70 %): adelantar corte.
  2. Zona, que también define la madurez: lejana (Temprana), media, cercana (Tardía).
  3. Dentro de cada zona, mayor Brix (propuesta).
Con `prioridad_organica` (solo en la simulación de CU23) los orgánicos van primero.
"""
from .constantes import (
    CON_RESTRICCIONES,
    ESTADO_PREPARACION,
    INHABILITADO,
    MADUREZ_POR_ZONA,
    NOMBRE_DRENAJE,
    ORDEN_ZONA,
    RIESGO_ALTO,
)
from .formato import num


def motivo_exclusion(lote: dict, params: dict):
    """Devuelve el motivo por el que el lote no entra al ranking, o None."""
    if lote.get("estado_lote") == ESTADO_PREPARACION:
        return "En preparación"
    if lote.get("terminado"):
        return "Cosecha terminada"
    if not lote.get("zona"):
        return "Sin distancia al ingenio (sin zona)"
    if lote.get("estado_piso") == INHABILITADO:
        return "Inhabilitado (sin piso)"
    if lote.get("brix") is None:
        return "Sin medición de Brix"
    if float(lote["brix"]) < float(params["brix_minimo"]):
        return f"Brix menor a {params['brix_minimo']} °Bx"
    return None


def _clave(lote: dict, prioridad_organica: bool):
    riesgo = lote.get("riesgo", {}).get("nivel")
    clave = (
        0 if riesgo == RIESGO_ALTO else 1,
        ORDEN_ZONA.get(lote.get("zona"), 9),
        -float(lote.get("brix") or 0),
        lote.get("finca") or "",
        lote.get("nombre") or "",
    )
    if prioridad_organica:
        return (0 if lote.get("tipo_cultivo") == "Orgánico" else 1,) + clave
    return clave


def _motivo(lote: dict, prioridad_organica: bool) -> str:
    riesgo = lote.get("riesgo", {})
    zona = lote.get("zona")
    partes = []
    if prioridad_organica and lote.get("tipo_cultivo") == "Orgánico":
        partes.append("Pedido orgánico simulado: los orgánicos habilitados van primero")
    if riesgo.get("nivel") == RIESGO_ALTO:
        partes.append(f"Riesgo alto por {riesgo.get('justificacion')}: adelantar el corte antes de que quede sin piso")
    partes.append(f"Zona {zona.lower()} (madurez {MADUREZ_POR_ZONA[zona]})")
    partes.append(f"{num(float(lote['brix']), 1)} °Bx")
    return "; ".join(partes)


def _avisos(lote: dict) -> list[str]:
    avisos = []
    if lote.get("estado_piso") == INHABILITADO:
        avisos.append("Inhabilitado (sin piso)")
    if lote.get("estado_piso") == CON_RESTRICCIONES:
        obs = lote.get("observacion_piso")
        avisos.append("Con restricciones" + (f": {obs}" if obs else ""))
    if not lote.get("drenaje"):
        avisos.append("Datos incompletos: falta el tipo de drenaje")
    return avisos


def calcular(lotes: list[dict], params: dict, prioridad_organica: bool = False) -> dict:
    """`lotes` ya vienen enriquecidos (estado de piso, Brix, cosecha) y con `riesgo`."""
    en_cosecha, candidatos, excluidos = [], [], []
    for lote in lotes:
        if lote.get("estado_lote") == ESTADO_PREPARACION or lote.get("terminado"):
            excluidos.append({**_resumen(lote), "motivo": motivo_exclusion(lote, params)})
            continue
        if lote.get("en_cosecha"):
            en_cosecha.append({**_resumen(lote), "avisos": _avisos(lote)})
            continue
        motivo = motivo_exclusion(lote, params)
        if motivo:
            excluidos.append({**_resumen(lote), "motivo": motivo})
        else:
            candidatos.append(lote)

    candidatos.sort(key=lambda l: _clave(l, prioridad_organica))
    ranking = []
    for i, lote in enumerate(candidatos, start=1):
        ranking.append({
            **_resumen(lote),
            "posicion": i,
            "motivo": _motivo(lote, prioridad_organica),
            "avisos": _avisos(lote),
        })
    en_cosecha.sort(key=lambda l: (ORDEN_ZONA.get(l.get("zona"), 9), l.get("finca") or "", l.get("nombre") or ""))
    excluidos.sort(key=lambda l: (l["motivo"] or "", l.get("finca") or "", l.get("nombre") or ""))
    return {"en_cosecha": en_cosecha, "ranking": ranking, "excluidos": excluidos}


def _resumen(lote: dict) -> dict:
    riesgo = lote.get("riesgo") or {}
    return {
        "id_unico": lote["id_unico"],
        "id_finca": lote.get("id_finca"),
        "finca": lote.get("finca"),
        "nro_lote": lote.get("nro_lote"),
        "nombre": lote.get("nombre"),
        "tipo_cultivo": lote.get("tipo_cultivo"),
        "zona": lote.get("zona"),
        "madurez": lote.get("madurez"),
        "dist_ingenio_km": lote.get("dist_ingenio_km"),
        "variedad": lote.get("variedad"),
        "brix": lote.get("brix"),
        "drenaje": lote.get("drenaje"),
        "drenaje_nombre": NOMBRE_DRENAJE.get(lote.get("drenaje")) if lote.get("drenaje") else None,
        "area_neta_ha": lote.get("area_neta_ha"),
        "estado_piso": lote.get("estado_piso"),
        "en_reserva": bool(lote.get("en_reserva")),
        "riesgo": riesgo.get("nivel"),
        "riesgo_justificacion": riesgo.get("justificacion"),
        "latitud": lote.get("latitud"),
        "longitud": lote.get("longitud"),
    }
