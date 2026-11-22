"""CU18 – Emitir alerta temprana a Fábrica.

Dos disparadores:
  Lluvia: pronóstico >= 70 % para una finca con cosecha en curso (CU16).
          Una sola alerta por finca y día previsto; si cambia la probabilidad,
          se actualiza esa misma alerta.
  Colchón bajo: menos de 30 carros en patio (CU17). Una sola alerta abierta a la
          vez; se cierra cuando el patio vuelve a 30 carros o más.
"""
from datetime import timedelta

from ..domain import fechas, reserva
from ..domain.constantes import ALERTA_COLCHON, ALERTA_LLUVIA, COL_ALERTAS
from ..errors import Conflicto, NoEncontrado
from .contexto import Contexto
from ..domain.formato import num

NIVEL_ALERTA = "Alto"


def _lista_lotes(lotes, max_items=8):
    nombres = [f"{l.get('nombre')} ({num(float(l.get('area_neta_ha') or 0), 0)} ha)" for l in lotes[:max_items]]
    extra = len(lotes) - max_items
    return ", ".join(nombres) + (f" y {extra} más" if extra > 0 else "")


def generar_alertas_lluvia(repo, ctx: Contexto | None = None) -> list[dict]:
    """Revisa el pronóstico del horizonte y crea o actualiza las alertas de lluvia."""
    ctx = ctx or Contexto(repo)
    p = ctx.params
    umbral = float(p["prob_lluvia_alerta"])
    horizonte = int(p["horizonte_pronostico_dias"])
    hoy = ctx.hoy
    hasta = hoy + timedelta(days=horizonte - 1)
    en_cosecha_por_finca = {}
    for l in ctx.lotes:
        if l.get("en_cosecha"):
            en_cosecha_por_finca.setdefault(l["id_finca"], []).append(l)
    reservados = [l for l in ctx.lotes if l.get("en_reserva")]
    existentes = {(a.get("id_finca"), a.get("fecha_prevista")): a for a in ctx.alertas if a.get("tipo") == ALERTA_LLUVIA}
    generadas = []
    for id_finca, pronosticos in ctx.pronosticos_por_finca.items():
        finca = ctx.fincas.get(id_finca, {})
        for pr in pronosticos:
            f = fechas.de_fecha(pr["fecha_pronosticada"])
            prob = float(pr.get("prob_lluvia_pct") or 0)
            mm = float(pr.get("mm_previstos") or 0)
            previa = existentes.get((id_finca, pr["fecha_pronosticada"]))
            if previa:
                # Se actualiza la misma alerta si cambió la probabilidad o los milímetros
                if float(previa.get("prob_lluvia_pct") or 0) != prob or float(previa.get("mm_previstos") or 0) != mm:
                    cambios = {
                        "prob_lluvia_pct": prob,
                        "mm_previstos": mm,
                        "fecha_hora_actualizacion": fechas.a_iso(ctx.ahora),
                        "mensaje": _mensaje_lluvia(finca, pr, en_cosecha_por_finca.get(id_finca, []), reservados,
                                                   reserva.sugerencia_adelantar(ctx.lotes, {id_finca}, p), umbral),
                    }
                    repo.actualizar(COL_ALERTAS, previa["id"], cambios)
                    generadas.append({**previa, **cambios})
                continue
            if not (hoy <= f <= hasta) or prob < umbral or id_finca not in en_cosecha_por_finca:
                continue
            adelantar = reserva.sugerencia_adelantar(ctx.lotes, {id_finca}, p)
            datos = {
                "tipo": ALERTA_LLUVIA,
                "id_finca": id_finca,
                "finca": finca.get("nombre"),
                "id_pronostico": pr.get("id"),
                "fecha_hora": fechas.a_iso(ctx.ahora),
                "fecha_prevista": pr["fecha_pronosticada"],
                "prob_lluvia_pct": prob,
                "mm_previstos": mm,
                "nivel": NIVEL_ALERTA,
                "mensaje": _mensaje_lluvia(finca, pr, en_cosecha_por_finca[id_finca], reservados, adelantar, umbral),
                "lotes_en_cosecha": [l["id_unico"] for l in en_cosecha_por_finca[id_finca]],
                "lotes_reserva": [l["id_unico"] for l in reservados],
                "lotes_adelantar": [l["id_unico"] for l in adelantar],
                "vista": False,
                "id_usuario_vista": None,
                "fecha_hora_vista": None,
            }
            id_doc = repo.agregar(COL_ALERTAS, datos, f"lluvia_{id_finca}_{pr['fecha_pronosticada']}")
            generadas.append({**datos, "id": id_doc})
    return generadas


def _mensaje_lluvia(finca, pr, en_cosecha, reservados, adelantar, umbral):
    prob = float(pr.get("prob_lluvia_pct") or 0)
    mm = float(pr.get("mm_previstos") or 0)
    txt = (
        f"Lluvia de {prob:.0f} %"
        + (f" ({mm:.0f} mm)" if mm else "")
        + f" prevista para el {fechas.fecha_corta(pr['fecha_pronosticada'])} en {finca.get('nombre')}, "
        f"con {len(en_cosecha)} lote(s) en cosecha."
    )
    if prob < umbral:
        txt += f" La probabilidad bajó a menos de {umbral:.0f} %."
    if reservados:
        ha = sum(float(l.get("area_neta_ha") or 0) for l in reservados)
        txt += f" Reserva disponible: {len(reservados)} lotes, {num(ha, 0)} ha ({_lista_lotes(reservados)})."
    else:
        txt += " No hay lotes de reserva marcados."
    if adelantar:
        txt += f" Conviene adelantar los mal drenados maduros: {_lista_lotes(adelantar)}."
    return txt


def actualizar_alerta_colchon(repo, ctx: Contexto, registro: dict, calculo: dict):
    """Abre, actualiza o cierra la alerta de colchón bajo según el último registro de patio."""
    abierta = next((a for a in ctx.alertas if a.get("tipo") == ALERTA_COLCHON and not a.get("fecha_hora_cierre")), None)
    ahora = fechas.a_iso(ctx.ahora)
    if calculo["bajo_umbral"]:
        mensaje = (
            f"Colchón bajo: {calculo['cantidad_carros']} carros en patio ({calculo['t_netas']:.0f} t netas, "
            f"{num(calculo['horas_cobertura'], 1)} h de molienda). Faltan {calculo['carros_faltantes']} carros para "
            f"llegar a {calculo['carros_minimos']}."
        )
        datos = {
            "id_registro_patio": registro["id"],
            "cantidad_carros": calculo["cantidad_carros"],
            "horas_cobertura": calculo["horas_cobertura"],
            "t_netas": calculo["t_netas"],
            "mensaje": mensaje,
        }
        if abierta:
            repo.actualizar(COL_ALERTAS, abierta["id"], {**datos, "fecha_hora_actualizacion": ahora})
            return {**abierta, **datos, "accion": "actualizada"}
        nueva = {
            "tipo": ALERTA_COLCHON,
            "fecha_hora": ahora,
            "nivel": NIVEL_ALERTA,
            "vista": False,
            "id_usuario_vista": None,
            "fecha_hora_vista": None,
            "fecha_hora_cierre": None,
            **datos,
        }
        id_doc = repo.agregar(COL_ALERTAS, nueva)
        return {**nueva, "id": id_doc, "accion": "creada"}
    if abierta:
        repo.actualizar(COL_ALERTAS, abierta["id"], {"fecha_hora_cierre": ahora, "id_registro_patio_cierre": registro["id"]})
        return {**abierta, "fecha_hora_cierre": ahora, "accion": "cerrada"}
    return None


def es_activa(alerta: dict, hoy_txt: str) -> bool:
    if alerta.get("tipo") == ALERTA_COLCHON:
        return not alerta.get("fecha_hora_cierre")
    return (alerta.get("fecha_prevista") or "") >= hoy_txt


def listar(repo, tipo=None, solo_activas=False, desde=None, hasta=None):
    ctx = Contexto(repo)
    hoy = fechas.fecha_txt(ctx.hoy)
    salida = []
    for a in ctx.alertas:
        if tipo and a.get("tipo") != tipo:
            continue
        activa = es_activa(a, hoy)
        if solo_activas and not activa:
            continue
        if desde and a["fecha_hora"][:10] < desde:
            continue
        if hasta and a["fecha_hora"][:10] > hasta:
            continue
        salida.append({**a, "activa": activa})
    return salida


def detalle(repo, id_alerta):
    ctx = Contexto(repo)
    a = repo.obtener(COL_ALERTAS, id_alerta)
    if not a:
        raise NoEncontrado("La alerta no existe.")
    lotes = ctx.lotes_por_id

    def vistas(ids):
        return [
            {k: lotes[i].get(k) for k in ("id_unico", "nombre", "finca", "zona", "area_neta_ha", "brix", "drenaje")}
            for i in ids or [] if i in lotes
        ]

    return {
        **a,
        "activa": es_activa(a, fechas.fecha_txt(ctx.hoy)),
        "detalle_lotes_en_cosecha": vistas(a.get("lotes_en_cosecha")),
        "detalle_lotes_reserva": vistas(a.get("lotes_reserva")),
        "detalle_lotes_adelantar": vistas(a.get("lotes_adelantar")),
    }


def marcar_vista(repo, usuario, id_alerta):
    a = repo.obtener(COL_ALERTAS, id_alerta)
    if not a:
        raise NoEncontrado("La alerta no existe.")
    if a.get("vista"):
        raise Conflicto("La alerta ya estaba marcada como vista.")
    cambios = {"vista": True, "id_usuario_vista": usuario["uid"], "fecha_hora_vista": fechas.a_iso(fechas.ahora())}
    repo.actualizar(COL_ALERTAS, id_alerta, cambios)
    return {**a, **cambios}
