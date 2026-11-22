"""CU21 – Gestionar lotes de reserva.

Candidatos: lotes en producción, no terminados, con Brix >= 8, bien drenados,
habilitados y en zona cercana o media. Si hay una alerta de lluvia >= 70 % vigente,
se muestran además los lotes mal drenados (imperfectamente drenados) y maduros
de las fincas alertadas, con la sugerencia de adelantar su corte.
"""
from collections import defaultdict

from .constantes import ESTADO_PRODUCCION, HABILITADO, INHABILITADO


def es_candidato(lote: dict, params: dict) -> bool:
    return (
        lote.get("estado_lote") == ESTADO_PRODUCCION
        and not lote.get("terminado")
        and lote.get("brix") is not None
        and float(lote["brix"]) >= float(params["brix_minimo"])
        and lote.get("drenaje") == "bien"
        and (lote.get("estado_piso") or HABILITADO) == HABILITADO
        and lote.get("zona") in ("Cercana", "Media")
    )


def motivo_baja(lote: dict, params: dict):
    """Motivo por el que un lote en reserva deja de cumplir las condiciones, o None.

    El documento nombra tres causas (se inhabilita, se termina o baja de 8 °Bx);
    se agregan los demás requisitos de candidato para no dejar en reserva un lote
    que ya no podría elegirse.
    """
    if lote.get("terminado"):
        return "Se terminó su cosecha"
    if lote.get("estado_piso") == INHABILITADO:
        return "Quedó inhabilitado (sin piso)"
    if lote.get("brix") is None or float(lote["brix"]) < float(params["brix_minimo"]):
        return f"Su Brix es menor a {params['brix_minimo']} °Bx"
    if not es_candidato(lote, params):
        return "Ya no cumple las condiciones de reserva (estado, drenaje, piso o zona)"
    return None


def sugerencia_adelantar(lotes: list[dict], fincas_alertadas: set, params: dict) -> list[dict]:
    """Lotes mal drenados y maduros de las fincas con alerta de lluvia vigente."""
    salida = []
    for l in lotes:
        if (
            l.get("id_finca") in fincas_alertadas
            and l.get("estado_lote") == ESTADO_PRODUCCION
            and not l.get("terminado")
            and l.get("drenaje") == "imperfecto"
            and l.get("estado_piso") != INHABILITADO
            and l.get("brix") is not None
            and float(l["brix"]) >= float(params["brix_minimo"])
        ):
            salida.append(l)
    return salida


def hectareas_por(lotes: list[dict], campo: str) -> dict:
    tot = defaultdict(float)
    for l in lotes:
        tot[l.get(campo) or "Sin dato"] += float(l.get("area_neta_ha") or 0)
    return {k: round(v, 2) for k, v in sorted(tot.items())}
