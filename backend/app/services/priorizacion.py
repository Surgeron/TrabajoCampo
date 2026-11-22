"""CU13 ranking, CU21 lotes de reserva y CU23 simulación de escenarios."""
import copy

from ..domain import fechas, ranking, reserva
from ..domain.constantes import COL_LOTES_CAMPANIA, ESTADO_PRODUCCION, INHABILITADO, RIESGO_ALTO
from ..domain.riesgo import dias_por_lluvia
from ..errors import Conflicto, Validacion
from .contexto import Contexto


# ---------- CU13 ----------
def consultar_ranking(repo):
    ctx = Contexto(repo)
    resultado = ranking.calcular(ctx.lotes, ctx.params)
    resultado["fecha_hora"] = fechas.a_iso(ctx.ahora)
    resultado["brix_minimo"] = ctx.params["brix_minimo"]
    if not resultado["ranking"]:
        resultado["mensaje"] = "No queda ningún lote habilitado para cosechar."
    return resultado


# ---------- CU21 ----------
def depurar_reserva(repo) -> list[str]:
    """Saca de la reserva los lotes que dejaron de cumplir las condiciones y devuelve los avisos."""
    ctx = Contexto(repo)
    avisos = []
    for l in ctx.lotes:
        if not l.get("en_reserva"):
            continue
        motivo = reserva.motivo_baja(l, ctx.params)
        if motivo:
            repo.actualizar(COL_LOTES_CAMPANIA, l["id_lote_campania"], {
                "en_reserva": False,
                "fecha_reserva": None,
                "fecha_baja_reserva": fechas.a_iso(ctx.ahora),
                "motivo_baja_reserva": motivo,
            })
            avisos.append(f"{l.get('nombre')} ({l.get('finca')}) salió de la reserva: {motivo}.")
    return avisos


def _vista_lote(l):
    return ranking._resumen(l) | {"fecha_reserva": l.get("fecha_reserva")}


def vista_reserva(repo):
    avisos = depurar_reserva(repo)
    ctx = Contexto(repo)
    p = ctx.params
    reservados = [l for l in ctx.lotes if l.get("en_reserva")]
    candidatos = [l for l in ctx.lotes if not l.get("en_reserva") and reserva.es_candidato(l, p)]
    vigentes = ctx.alertas_lluvia_vigentes()
    fincas_alertadas = {a.get("id_finca") for a in vigentes}
    adelantar = reserva.sugerencia_adelantar(ctx.lotes, fincas_alertadas, p) if vigentes else []
    return {
        "avisos": avisos,
        "reservados": [_vista_lote(l) for l in reservados],
        "candidatos": [_vista_lote(l) for l in candidatos],
        "ha_por_zona": reserva.hectareas_por(reservados, "zona"),
        "ha_por_finca": reserva.hectareas_por(reservados, "finca"),
        "ha_total": round(sum(float(l.get("area_neta_ha") or 0) for l in reservados), 2),
        "alertas_vigentes": [
            {k: a.get(k) for k in ("id", "finca", "id_finca", "fecha_prevista", "prob_lluvia_pct", "mm_previstos")}
            for a in vigentes
        ],
        "sugerencia_adelantar": [_vista_lote(l) for l in adelantar],
    }


def marcar_reserva(repo, usuario, id_unico: str, en_reserva: bool):
    ctx = Contexto(repo)
    lote = ctx.lote(id_unico)
    if en_reserva:
        if lote.get("en_reserva"):
            raise Conflicto(f"{lote.get('nombre')} ya está en reserva.")
        if not reserva.es_candidato(lote, ctx.params):
            raise Conflicto(
                f"{lote.get('nombre')} no cumple las condiciones de reserva: en producción, sin terminar, "
                f"≥ {ctx.params['brix_minimo']} °Bx, bien drenado, habilitado y en zona cercana o media."
            )
        cambios = {"en_reserva": True, "fecha_reserva": fechas.a_iso(ctx.ahora), "id_usuario_reserva": usuario["uid"]}
    else:
        if not lote.get("en_reserva"):
            raise Conflicto(f"{lote.get('nombre')} no está en reserva.")
        cambios = {"en_reserva": False, "fecha_reserva": None, "fecha_baja_reserva": fechas.a_iso(ctx.ahora),
                   "motivo_baja_reserva": "Quitado por el usuario"}
    repo.actualizar(COL_LOTES_CAMPANIA, lote["id_lote_campania"], cambios)
    return vista_reserva(repo)


# ---------- CU23 ----------
def simular(repo, lluvias: list[dict], pedido_organico: bool):
    """Copia los datos en memoria, aplica los supuestos y recalcula riesgo y ranking. No guarda nada."""
    ctx = Contexto(repo)
    p = ctx.params
    if not lluvias and not pedido_organico:
        raise Validacion("Elegí al menos un supuesto: lluvia en una finca o pedido orgánico.")
    lluvia_por_finca = {}
    for s in lluvias:
        if s["id_finca"] not in ctx.fincas:
            raise Validacion(f"La finca {s['id_finca']} no existe.")
        if s["id_finca"] in lluvia_por_finca:
            raise Validacion(f"La finca {ctx.fincas[s['id_finca']]['nombre']} está repetida en los supuestos.")
        lluvia_por_finca[s["id_finca"]] = float(s["mm"])

    real = ranking.calcular(ctx.lotes, p)
    hoy = fechas.fecha_txt(ctx.hoy)
    simulados, sin_piso, a_alto = [], [], []
    for original in ctx.lotes:
        s = copy.deepcopy(original)
        mm = lluvia_por_finca.get(s.get("id_finca"))
        if mm and s.get("estado_lote") == ESTADO_PRODUCCION and not s.get("terminado") and s.get("estado_piso") != INHABILITADO:
            acum = (original.get("riesgo") or {}).get("lluvia_acumulada_mm") or 0.0
            dias = dias_por_lluvia(s.get("drenaje"), acum + mm, p)
            if dias > 0:
                s["estado_piso"] = INHABILITADO
                s["riesgo"] = None
                s["dias_sin_piso_simulados"] = dias
                sin_piso.append({**ranking._resumen(s), "dias": dias, "lluvia_total_mm": round(acum + mm, 1)})
            else:
                pron = {"prob_lluvia_pct": 100, "mm_previstos": mm, "fecha_pronosticada": hoy}
                s["riesgo"] = ctx.riesgo_de(s, pronostico_forzado=pron, mm_extra=mm)
                if s["riesgo"]["nivel"] == RIESGO_ALTO and (original.get("riesgo") or {}).get("nivel") != RIESGO_ALTO:
                    a_alto.append({**ranking._resumen(s)})
        simulados.append(s)
    sim = ranking.calcular(simulados, p, prioridad_organica=pedido_organico)

    pos_real = {r["id_unico"]: r for r in real["ranking"]}
    pos_sim = {r["id_unico"]: r for r in sim["ranking"]}
    motivo_sim = {e["id_unico"]: e["motivo"] for e in sim["excluidos"]}
    movimientos = []
    for id_unico in set(pos_real) | set(pos_sim):
        r, s = pos_real.get(id_unico), pos_sim.get(id_unico)
        base = s or r
        fila = {k: base.get(k) for k in ("id_unico", "finca", "nombre", "zona", "tipo_cultivo", "brix", "drenaje_nombre")}
        fila["posicion_real"] = r["posicion"] if r else None
        fila["posicion_simulada"] = s["posicion"] if s else None
        fila["riesgo_real"] = r["riesgo"] if r else None
        fila["riesgo_simulado"] = s["riesgo"] if s else None
        if r and s:
            delta = r["posicion"] - s["posicion"]
            fila["cambio"] = "Sube" if delta > 0 else "Baja" if delta < 0 else "Igual"
            fila["delta"] = delta
        elif r:
            fila["cambio"] = "Sale del ranking"
            fila["delta"] = None
            fila["motivo"] = motivo_sim.get(id_unico)
        else:
            fila["cambio"] = "Entra al ranking"
            fila["delta"] = None
        movimientos.append(fila)
    movimientos.sort(key=lambda f: (f["posicion_simulada"] or 10_000, f["posicion_real"] or 10_000))

    def ha_reserva(lotes):
        return round(sum(float(l.get("area_neta_ha") or 0) for l in lotes
                         if l.get("en_reserva") and l.get("estado_piso") != INHABILITADO), 2)

    return {
        "supuestos": {
            "lluvias": [{"id_finca": f, "finca": ctx.fincas[f]["nombre"], "mm": mm} for f, mm in lluvia_por_finca.items()],
            "pedido_organico": pedido_organico,
        },
        "resumen": {
            "lotes_ranking_real": len(real["ranking"]),
            "lotes_ranking_simulado": len(sim["ranking"]),
            "lotes_sin_piso": len(sin_piso),
            "ha_sin_piso": round(sum(float(l.get("area_neta_ha") or 0) for l in sin_piso), 2),
            "lotes_a_riesgo_alto": len(a_alto),
            "ha_reserva_real": ha_reserva(ctx.lotes),
            "ha_reserva_simulada": ha_reserva(simulados),
        },
        "movimientos": movimientos,
        "quedarian_sin_piso": sin_piso,
        "pasan_a_riesgo_alto": a_alto,
        "ranking_simulado": sim["ranking"],
        "mapa": [
            {
                **ranking._resumen(s),
                "poligono": s.get("poligono"),
                "afectado": s.get("id_finca") in lluvia_por_finca,
                "sin_piso_simulado": bool(s.get("dias_sin_piso_simulados")),
            }
            for s in simulados
        ],
        "nota": "La simulación no modifica los datos reales y no se guarda.",
    }
