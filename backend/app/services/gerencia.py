"""CU20 – Generar informes: panel gerencial (10 KPI) e informes de detalle.

Nada de esto se guarda: se calcula con los registros cuando se pide.
Lluvia por finca y día: promedio de los pluviómetros de la finca; un pluviómetro
sin lectura ese día cuenta como 0 mm (la lectura se carga después de llover).
"""
from collections import defaultdict
from datetime import date, datetime, timedelta

from ..domain import fechas, paradas, patio
from ..domain.constantes import (
    ALERTA_LLUVIA,
    CAUSA_LEJANIA,
    CAUSA_LLUVIA,
    CAUSAS_FALTA_CANA,
    COL_PARADAS,
    COL_PATIO,
    ESTADO_PRODUCCION,
    NOMBRE_DRENAJE,
    RIESGO_ALTO,
    ZONAS,
)
from ..domain.riesgo import periodos_sin_piso
from ..errors import NoEncontrado, Validacion
from .contexto import Contexto
from ..domain.formato import num


class Filtros:
    def __init__(self, ctx: Contexto, desde=None, hasta=None, id_finca=None, zona=None, tipo_cultivo=None):
        inicio_campania = fechas.de_fecha(ctx.campania.get("fecha_inicio") or fechas.fecha_txt(ctx.hoy))
        fin_campania = fechas.de_fecha(ctx.campania["fecha_fin"]) if ctx.campania.get("fecha_fin") else ctx.hoy
        try:
            self.desde = fechas.de_fecha(desde) if desde else inicio_campania
            self.hasta = fechas.de_fecha(hasta) if hasta else min(ctx.hoy, fin_campania)
        except ValueError:
            raise Validacion("Rango de fechas inválido.")
        if self.desde > self.hasta:
            raise Validacion("La fecha desde no puede ser posterior a la fecha hasta.",
                             {"campos": {"desde": "Debe ser anterior o igual a hasta."}})
        if id_finca and id_finca not in ctx.fincas:
            raise Validacion("La finca no existe.")
        if zona and zona not in ZONAS:
            raise Validacion("Zona inválida.")
        self.id_finca, self.zona, self.tipo_cultivo = id_finca, zona, tipo_cultivo
        self.inicio_dt = datetime.combine(self.desde, datetime.min.time(), tzinfo=fechas.TZ)
        fin_dt = datetime.combine(self.hasta + timedelta(days=1), datetime.min.time(), tzinfo=fechas.TZ)
        self.fin_dt = min(fin_dt, ctx.ahora)

    def lote_ok(self, l) -> bool:
        return ((not self.id_finca or l.get("id_finca") == self.id_finca)
                and (not self.zona or l.get("zona") == self.zona)
                and (not self.tipo_cultivo or l.get("tipo_cultivo") == self.tipo_cultivo))

    def dict(self):
        return {"desde": fechas.fecha_txt(self.desde), "hasta": fechas.fecha_txt(self.hasta),
                "id_finca": self.id_finca, "zona": self.zona, "tipo_cultivo": self.tipo_cultivo}


def _semana(d: date) -> date:
    return d - timedelta(days=d.weekday())


def _horas_en_rango(p: dict, inicio: datetime, fin: datetime, ahora: datetime) -> float:
    a = max(fechas.de_iso(p["fecha_hora_inicio"]), inicio)
    b = min(fechas.de_iso(p["fecha_hora_fin"]) if p.get("fecha_hora_fin") else ahora, fin)
    return max(0.0, fechas.horas_entre(a, b))


def _paradas(ctx):
    return ctx.repo.listar(COL_PARADAS)


def _horas_falta_cana(paradas_, inicio, fin, ahora):
    return sum(_horas_en_rango(p, inicio, fin, ahora) for p in paradas_ if p.get("causa") in CAUSAS_FALTA_CANA)


def _produccion(ctx, f: Filtros):
    return [l for l in ctx.lotes if l.get("estado_lote") == ESTADO_PRODUCCION and f.lote_ok(l)]


def _avance(lotes, hasta: date):
    total = sum(float(l.get("area_neta_ha") or 0) for l in lotes)
    hechas = sum(float(l.get("area_neta_ha") or 0) for l in lotes
                 if l.get("fecha_terminado") and fechas.de_fecha(l["fecha_terminado"]) <= hasta)
    return (round(hechas / total * 100, 1) if total else 0.0), round(hechas, 2), round(total, 2)


def _lluvia_finca_dia(ctx):
    """{(id_finca, fecha): promedio mm de los pluviómetros de la finca}"""
    pluv_por_finca = defaultdict(list)
    for p in ctx.pluviometros.values():
        pluv_por_finca[p.get("id_finca")].append(p["id"])
    suma = defaultdict(float)
    for id_pluv, lecturas in ctx.lecturas_por_pluviometro.items():
        finca = ctx.pluviometros.get(id_pluv, {}).get("id_finca")
        for l in lecturas:
            suma[(finca, l["fecha"])] += float(l.get("mm") or 0)
    return {k: round(v / max(1, len(pluv_por_finca.get(k[0], []))), 1) for k, v in suma.items()}


def _hectareas_sin_piso(ctx, f: Filtros):
    """Hectáreas netas inhabilitadas por día y tipo de drenaje."""
    serie = {d: defaultdict(float) for d in fechas.dias_rango(f.desde, f.hasta)}
    for l in ctx.lotes:
        if not f.lote_ok(l):
            continue
        for per in periodos_sin_piso(ctx.estados_por_lote.get(l["id_unico"], []), ctx.ahora):
            d0 = fechas.de_iso(per["desde"]).date()
            d1 = fechas.de_iso(per["hasta"]).date() if per["hasta"] else ctx.hoy
            for d in fechas.dias_rango(max(d0, f.desde), min(d1, f.hasta)):
                serie[d][l.get("drenaje") or "sin_dato"] += float(l.get("area_neta_ha") or 0)
    return [
        {"fecha": fechas.fecha_txt(d), **{k: round(v.get(k, 0.0), 2) for k in ("bien", "medio", "imperfecto", "sin_dato")}}
        for d, v in serie.items()
    ]


def _cobertura(ctx, f: Filtros):
    p = ctx.params
    regs = sorted(ctx.repo.listar(COL_PATIO), key=lambda r: r["fecha_hora"])
    puntos = [r for r in regs if f.inicio_dt <= fechas.de_iso(r["fecha_hora"]) < f.fin_dt]
    bajo_h = total_h = 0.0
    minimo = int(p["carros_minimos_patio"])
    for i, r in enumerate(regs):
        a = fechas.de_iso(r["fecha_hora"])
        b = fechas.de_iso(regs[i + 1]["fecha_hora"]) if i + 1 < len(regs) else ctx.ahora
        a, b = max(a, f.inicio_dt), min(b, f.fin_dt)
        if b <= a:
            continue
        h = fechas.horas_entre(a, b)
        total_h += h
        if r["cantidad_carros"] < minimo:
            bajo_h += h
    return {
        "puntos": [{"fecha_hora": r["fecha_hora"], "horas_cobertura": r["horas_cobertura"],
                    "cantidad_carros": r["cantidad_carros"]} for r in puntos],
        "umbral_h": round(minimo * float(p["carga_neta_carro_t"]) / float(p["capacidad_molienda_th"]), 2),
        "pct_tiempo_bajo_umbral": round(bajo_h / total_h * 100, 1) if total_h else None,
        "promedio_h": round(sum(r["horas_cobertura"] for r in puntos) / len(puntos), 2) if puntos else None,
    }


def _matriz_alertas(ctx, f: Filtros, lluvia):
    alertas = {(a.get("id_finca"), a.get("fecha_prevista")) for a in ctx.alertas if a.get("tipo") == ALERTA_LLUVIA}
    m = {"alerta_llovio": 0, "alerta_no_llovio": 0, "sin_alerta_llovio": 0, "sin_alerta_no_llovio": 0}
    fincas = [f.id_finca] if f.id_finca else list(ctx.fincas)
    for d in fechas.dias_rango(f.desde, f.hasta):
        dtxt = fechas.fecha_txt(d)
        for id_finca in fincas:
            hubo = (id_finca, dtxt) in alertas
            llovio = lluvia.get((id_finca, dtxt), 0) > 0
            clave = ("alerta_" if hubo else "sin_alerta_") + ("llovio" if llovio else "no_llovio")
            m[clave] += 1
    total_alertas = m["alerta_llovio"] + m["alerta_no_llovio"]
    m["acierto_pct"] = round(m["alerta_llovio"] / total_alertas * 100, 1) if total_alertas else None
    return m


def panel(repo, **filtros):
    ctx = Contexto(repo)
    f = Filtros(ctx, **filtros)
    p = ctx.params
    todas = _paradas(ctx)
    ahora = ctx.ahora

    # Tarjetas: valor del rango y variación de los últimos 7 días contra los 7 anteriores
    fin = f.fin_dt
    semana_ini, previa_ini = fin - timedelta(days=7), fin - timedelta(days=14)
    horas = _horas_falta_cana(todas, f.inicio_dt, fin, ahora)
    h_sem = _horas_falta_cana(todas, semana_ini, fin, ahora)
    h_prev = _horas_falta_cana(todas, previa_ini, semana_ini, ahora)
    costos = paradas.costos(horas, p)
    prod = _produccion(ctx, f)
    av_pct, av_ha, av_total = _avance(prod, f.hasta)
    av_prev, _, _ = _avance(prod, f.hasta - timedelta(days=7))
    madura_riesgo = [l for l in prod if not l.get("terminado") and l.get("brix") is not None
                     and float(l["brix"]) >= float(p["brix_minimo"]) and (l.get("riesgo") or {}).get("nivel") == RIESGO_ALTO]
    ha_riesgo = round(sum(float(l.get("area_neta_ha") or 0) for l in madura_riesgo), 2)
    riesgo_finca = defaultdict(float)
    for l in madura_riesgo:
        riesgo_finca[l.get("finca")] += float(l.get("area_neta_ha") or 0)

    tarjetas = [
        {"id": 1, "titulo": "Horas de parada por falta de caña", "valor": round(horas, 1), "unidad": "h",
         "variacion": round(h_sem - h_prev, 1), "detalle": f"Últimos 7 días: {num(h_sem, 1)} h (semana anterior {num(h_prev, 1)} h)"},
        {"id": 2, "titulo": "Costo estimado de las paradas", "valor": costos["central"], "unidad": "USD",
         "variacion": round((h_sem - h_prev) * float(p["costo_hora_parada_central"])),
         "detalle": f"Rango {num(costos['bajo'], 0)} a {num(costos['alto'], 0)} USD"},
        {"id": 5, "titulo": "Avance de cosecha", "valor": av_pct, "unidad": "% del área neta",
         "variacion": round(av_pct - av_prev, 1), "detalle": f"{num(av_ha, 0)} de {num(av_total, 0)} ha netas"},
        {"id": 6, "titulo": "Caña madura en riesgo", "valor": ha_riesgo, "unidad": "ha",
         "variacion": None, "detalle": f"{len(madura_riesgo)} lotes con riesgo alto y ≥ {p['brix_minimo']} °Bx (valor del momento)"},
    ]

    # Gráfico 1 y 3: por semana
    semanas = sorted({_semana(d) for d in fechas.dias_rango(f.desde, f.hasta)})
    paradas_semana, disponibilidad = [], []
    for s in semanas:
        a = max(datetime.combine(s, datetime.min.time(), tzinfo=fechas.TZ), f.inicio_dt)
        b = min(datetime.combine(s + timedelta(days=7), datetime.min.time(), tzinfo=fechas.TZ), f.fin_dt)
        if b <= a:
            continue
        lluvia_h = sum(_horas_en_rango(x, a, b, ahora) for x in todas if x.get("causa") == CAUSA_LLUVIA)
        lejos_h = sum(_horas_en_rango(x, a, b, ahora) for x in todas if x.get("causa") == CAUSA_LEJANIA)
        total_h = sum(_horas_en_rango(x, a, b, ahora) for x in todas)
        transcurridas = fechas.horas_entre(a, b)
        etiqueta = fechas.fecha_corta(s)
        paradas_semana.append({"semana": etiqueta, "inicio": fechas.fecha_txt(s), "lluvia": round(lluvia_h, 1), "lejania": round(lejos_h, 1)})
        disponibilidad.append({"semana": etiqueta, "inicio": fechas.fecha_txt(s),
                               "pct": round((1 - total_h / transcurridas) * 100, 1) if transcurridas else None})
    total_paradas = sum(_horas_en_rango(x, f.inicio_dt, f.fin_dt, ahora) for x in todas)
    transcurridas = fechas.horas_entre(f.inicio_dt, f.fin_dt)

    # Gráfico 5: avance por zona
    avance_zona = []
    for z in ("Lejana", "Media", "Cercana"):
        pct, ha, tot = _avance([l for l in prod if l.get("zona") == z], f.hasta)
        avance_zona.append({"zona": z, "pct": pct, "ha_terminadas": ha, "ha_total": tot})

    # Gráfico 8: lluvia por finca con alertas
    lluvia = _lluvia_finca_dia(ctx)
    fincas = {k: v for k, v in sorted(ctx.fincas.items()) if not f.id_finca or k == f.id_finca}
    alertas_dia = defaultdict(list)
    for a in ctx.alertas:
        if a.get("tipo") == ALERTA_LLUVIA and a.get("id_finca") in fincas:
            alertas_dia[a.get("fecha_prevista")].append(a.get("finca"))
    dias_lluvia = []
    for d in fechas.dias_rango(f.desde, f.hasta):
        dtxt = fechas.fecha_txt(d)
        fila = {"fecha": dtxt, **{v["nombre"]: lluvia.get((k, dtxt), 0.0) for k, v in fincas.items()},
                "alertas": alertas_dia.get(dtxt, [])}
        dias_lluvia.append(fila)

    # KPI 9 y 10
    reservados = [l for l in ctx.lotes if l.get("en_reserva") and f.lote_ok(l)]
    reserva_zona = defaultdict(float)
    for l in reservados:
        reserva_zona[l.get("zona")] += float(l.get("area_neta_ha") or 0)

    desde_txt, hasta_txt = fechas.fecha_txt(f.desde), fechas.fecha_txt(f.hasta)
    ton_total = ton_conv = ton_org = 0.0
    for l in prod:
        t_lote = sum(
            float(c.get("toneladas") or 0)
            for c in ctx.cosechas_por_lote_campania.get(l.get("id_lote_campania"), [])
            if desde_txt <= c["fecha"] <= hasta_txt
        )
        ton_total += t_lote
        if l.get("tipo_cultivo") == "Orgánico":
            ton_org += t_lote
        elif l.get("tipo_cultivo") == "Convencional":
            ton_conv += t_lote

    return {
        "filtros": f.dict(),
        "campania": {k: ctx.campania.get(k) for k in ("id", "nombre", "fecha_inicio", "fecha_fin", "toneladas_plan")},
        "tarjetas": tarjetas,
        "toneladas_cosechadas": {
            "total": round(ton_total, 1),
            "convencional": round(ton_conv, 1),
            "organico": round(ton_org, 1),
        },
        "graficos": {
            "paradas_semana": paradas_semana,
            "disponibilidad": disponibilidad,
            "disponibilidad_pct": round((1 - total_paradas / transcurridas) * 100, 1) if transcurridas else None,
            "cobertura": _cobertura(ctx, f),
            "avance_zona": avance_zona,
            "sin_piso": _hectareas_sin_piso(ctx, f),
            "lluvia": {"fincas": [v["nombre"] for v in fincas.values()], "dias": dias_lluvia},
            "riesgo_por_finca": [{"finca": k, "ha": round(v, 2)} for k, v in sorted(riesgo_finca.items())],
        },
        "reserva": {"ha_total": round(sum(reserva_zona.values()), 2),
                    "por_zona": [{"zona": z, "ha": round(reserva_zona.get(z, 0.0), 2)} for z in ("Cercana", "Media", "Lejana")]},
        "acierto_alertas": _matriz_alertas(ctx, f, lluvia),
        "costos_hora": {"bajo": p["costo_hora_parada_bajo"], "central": p["costo_hora_parada_central"], "alto": p["costo_hora_parada_alto"]},
    }


# ---------------- Informes ----------------
INFORMES = {
    "sin-piso": "Lotes sin piso",
    "lluvias": "Lluvias por pluviómetro y finca",
    "paradas": "Paradas de fábrica y su costo",
    "avance": "Avance de cosecha",
    "patio": "Abastecimiento de patio",
    "alertas": "Alertas vs. lluvia real",
}
INFORMES_POR_ROL = {
    "tecnico": list(INFORMES),
    "fabrica": ["paradas", "patio", "alertas"],
}


def informe(repo, tipo: str, rol: str, **filtros):
    if tipo not in INFORMES:
        raise NoEncontrado("El informe no existe.")
    if tipo not in INFORMES_POR_ROL.get(rol, []):
        from ..errors import Prohibido

        raise Prohibido("Tu rol no tiene acceso a este informe.")
    ctx = Contexto(repo)
    f = Filtros(ctx, **filtros)
    generador = {
        "sin-piso": _inf_sin_piso, "lluvias": _inf_lluvias, "paradas": _inf_paradas,
        "avance": _inf_avance, "patio": _inf_patio, "alertas": _inf_alertas,
    }[tipo]
    datos = generador(ctx, f)
    return {"tipo": tipo, "titulo": INFORMES[tipo], "filtros": f.dict(),
            "generado": fechas.a_iso(ctx.ahora), "sin_datos": not datos["filas"], **datos}


def _col(clave, titulo, tipo="texto"):
    return {"clave": clave, "titulo": titulo, "tipo": tipo}


def _inf_sin_piso(ctx, f):
    filas = []
    for l in ctx.lotes:
        if not f.lote_ok(l):
            continue
        for per in periodos_sin_piso(ctx.estados_por_lote.get(l["id_unico"], []), ctx.ahora):
            d0 = per["desde"][:10]
            d1 = (per["hasta"] or fechas.a_iso(ctx.ahora))[:10]
            if d1 < fechas.fecha_txt(f.desde) or d0 > fechas.fecha_txt(f.hasta):
                continue
            filas.append({"finca": l.get("finca"), "lote": l.get("nombre"), "zona": l.get("zona"),
                          "drenaje": NOMBRE_DRENAJE.get(l.get("drenaje"), "Sin dato"), "area_neta_ha": l.get("area_neta_ha"),
                          "desde": per["desde"], "hasta": per["hasta"], "dias": per["dias"],
                          "estado": "Abierto" if per["abierto"] else "Cerrado", "observacion": per.get("observacion")})
    filas.sort(key=lambda r: r["desde"], reverse=True)
    por_drenaje = defaultdict(list)
    for r in filas:
        if r["estado"] == "Cerrado":
            por_drenaje[r["drenaje"]].append(r["dias"])
    resumen = [{"etiqueta": "Períodos", "valor": len(filas)}] + [
        {"etiqueta": f"Promedio de días sin piso – {k}", "valor": round(sum(v) / len(v), 1)} for k, v in sorted(por_drenaje.items())
    ]
    columnas = [_col("finca", "Finca"), _col("lote", "Lote"), _col("zona", "Zona"), _col("drenaje", "Drenaje"),
                _col("area_neta_ha", "Ha netas", "numero"), _col("desde", "Desde", "fecha_hora"),
                _col("hasta", "Hasta", "fecha_hora"), _col("dias", "Días", "numero"), _col("estado", "Estado"),
                _col("observacion", "Observación")]
    return {"columnas": columnas, "filas": filas, "resumen": resumen}


def _inf_lluvias(ctx, f):
    filas = []
    total_pluv = defaultdict(float)
    for id_pluv, lecturas in ctx.lecturas_por_pluviometro.items():
        pluv = ctx.pluviometros.get(id_pluv, {})
        if f.id_finca and pluv.get("id_finca") != f.id_finca:
            continue
        for l in lecturas:
            if not (fechas.fecha_txt(f.desde) <= l["fecha"] <= fechas.fecha_txt(f.hasta)):
                continue
            filas.append({"fecha": l["fecha"], "finca": ctx.fincas.get(pluv.get("id_finca"), {}).get("nombre"),
                          "pluviometro": pluv.get("nombre"), "mm": l["mm"], "cargado_por": l.get("usuario_nombre"),
                          "corregida": "Sí" if l.get("fecha_hora_correccion") else "No"})
            total_pluv[pluv.get("nombre")] += float(l["mm"])
    filas.sort(key=lambda r: (r["fecha"], r["finca"] or "", r["pluviometro"] or ""), reverse=True)
    lluvia = _lluvia_finca_dia(ctx)
    por_finca = defaultdict(float)
    for (id_finca, d), mm in lluvia.items():
        if fechas.fecha_txt(f.desde) <= d <= fechas.fecha_txt(f.hasta) and (not f.id_finca or id_finca == f.id_finca):
            por_finca[ctx.fincas.get(id_finca, {}).get("nombre")] += mm
    resumen = [{"etiqueta": f"Acumulado {k} (promedio de sus pluviómetros)", "valor": f"{num(v, 1)} mm"} for k, v in sorted(por_finca.items())]
    resumen += [{"etiqueta": f"Total {k}", "valor": f"{num(v, 1)} mm"} for k, v in sorted(total_pluv.items())]
    columnas = [_col("fecha", "Fecha", "fecha"), _col("finca", "Finca"), _col("pluviometro", "Pluviómetro"),
                _col("mm", "mm", "numero"), _col("cargado_por", "Cargado por"), _col("corregida", "Corregida")]
    return {"columnas": columnas, "filas": filas, "resumen": resumen}


def _inf_paradas(ctx, f):
    filas = []
    total = 0.0
    for p in ctx.repo.listar(COL_PARADAS):
        h = _horas_en_rango(p, f.inicio_dt, f.fin_dt, ctx.ahora)
        if h <= 0:
            continue
        total += h
        c = paradas.costos(h, ctx.params)
        prev = paradas.alerta_previa(p, ctx.alertas)
        filas.append({"inicio": p["fecha_hora_inicio"], "fin": p.get("fecha_hora_fin"), "causa": p["causa"],
                      "horas": round(h, 1), "costo_bajo": c["bajo"], "costo_central": c["central"], "costo_alto": c["alto"],
                      "alerta_previa": ("Sí" if prev["hubo_alerta"] else "No") if prev else "—",
                      "anticipacion_h": prev["horas_anticipacion"] if prev else None,
                      "observacion": p.get("observacion")})
    filas.sort(key=lambda r: r["inicio"], reverse=True)
    c = paradas.costos(total, ctx.params)
    resumen = [{"etiqueta": "Horas de parada en el rango", "valor": f"{num(total, 1)} h"},
               {"etiqueta": "Costo central", "valor": f"{num(c['central'], 0)} USD"},
               {"etiqueta": "Rango de costo", "valor": f"{num(c['bajo'], 0)} a {num(c['alto'], 0)} USD"}]
    columnas = [_col("inicio", "Inicio", "fecha_hora"), _col("fin", "Fin", "fecha_hora"), _col("causa", "Causa"),
                _col("horas", "Horas", "numero"), _col("costo_bajo", "Costo bajo (USD)", "numero"),
                _col("costo_central", "Costo central (USD)", "numero"), _col("costo_alto", "Costo alto (USD)", "numero"),
                _col("alerta_previa", "Alerta previa"), _col("anticipacion_h", "Anticipación (h)", "numero"),
                _col("observacion", "Observación")]
    return {"columnas": columnas, "filas": filas, "resumen": resumen}


def _inf_avance(ctx, f):
    prod = _produccion(ctx, f)
    filas = []
    for l in prod:
        terminado = l.get("fecha_terminado") and fechas.de_fecha(l["fecha_terminado"]) <= f.hasta
        estado = "Terminado" if terminado else ("En cosecha" if l.get("en_cosecha") or l.get("terminado") else "Pendiente")
        filas.append({"finca": l.get("finca"), "lote": l.get("nombre"), "zona": l.get("zona") or "Sin zona",
                      "area_neta_ha": l.get("area_neta_ha"), "estado": estado,
                      "fecha_terminado": l.get("fecha_terminado") if terminado else None,
                      "toneladas": l.get("toneladas_cosechadas") or None})
    filas.sort(key=lambda r: (r["zona"], r["finca"] or "", r["lote"] or ""))
    resumen = []
    for z in ("Lejana", "Media", "Cercana"):
        pct, ha, tot = _avance([l for l in prod if l.get("zona") == z], f.hasta)
        resumen.append({"etiqueta": f"Zona {z.lower()}", "valor": f"{num(pct, 1)} % ({num(ha, 0)} de {num(tot, 0)} ha)"})
    pct, ha, tot = _avance(prod, f.hasta)
    resumen.append({"etiqueta": "Total", "valor": f"{num(pct, 1)} % ({num(ha, 0)} de {num(tot, 0)} ha)"})
    columnas = [_col("finca", "Finca"), _col("lote", "Lote"), _col("zona", "Zona"), _col("area_neta_ha", "Ha netas", "numero"),
                _col("estado", "Estado"), _col("fecha_terminado", "Terminado el", "fecha"), _col("toneladas", "Toneladas", "numero")]
    return {"columnas": columnas, "filas": filas, "resumen": resumen}


def _inf_patio(ctx, f):
    filas = []
    for r in sorted(ctx.repo.listar(COL_PATIO), key=lambda r: r["fecha_hora"], reverse=True):
        if not (f.inicio_dt <= fechas.de_iso(r["fecha_hora"]) < f.fin_dt):
            continue
        calc = patio.calcular(r["cantidad_carros"], r["condicion"], ctx.params)
        filas.append({"fecha_hora": r["fecha_hora"], "cantidad_carros": r["cantidad_carros"], "condicion": r["condicion"],
                      "t_netas": r["t_netas"], "horas_cobertura": r["horas_cobertura"],
                      "bajo_umbral": "Sí" if calc["bajo_umbral"] else "No", "cargado_por": r.get("usuario_nombre")})
    cob = _cobertura(ctx, f)
    resumen = [{"etiqueta": "Registros", "valor": len(filas)},
               {"etiqueta": "Cobertura promedio", "valor": f"{num(cob['promedio_h'], 2)} h" if cob["promedio_h"] is not None else "—"},
               {"etiqueta": f"Tiempo con menos de {ctx.params['carros_minimos_patio']} carros",
                "valor": f"{num(cob['pct_tiempo_bajo_umbral'], 1)} %" if cob["pct_tiempo_bajo_umbral"] is not None else "—"}]
    columnas = [_col("fecha_hora", "Fecha y hora", "fecha_hora"), _col("cantidad_carros", "Carros", "numero"),
                _col("condicion", "Condición"), _col("t_netas", "t netas", "numero"), _col("horas_cobertura", "Horas", "numero"),
                _col("bajo_umbral", "Bajo umbral"), _col("cargado_por", "Cargado por")]
    return {"columnas": columnas, "filas": filas, "resumen": resumen}


def _inf_alertas(ctx, f):
    lluvia = _lluvia_finca_dia(ctx)
    filas = []
    for a in ctx.alertas:
        if a.get("tipo") != ALERTA_LLUVIA:
            continue
        d = a.get("fecha_prevista") or ""
        if not (fechas.fecha_txt(f.desde) <= d <= fechas.fecha_txt(f.hasta)):
            continue
        if f.id_finca and a.get("id_finca") != f.id_finca:
            continue
        mm = lluvia.get((a.get("id_finca"), d), 0.0)
        pasado = d < fechas.fecha_txt(ctx.hoy)
        filas.append({"emitida": a["fecha_hora"], "finca": a.get("finca"), "fecha_prevista": d,
                      "prob_lluvia_pct": a.get("prob_lluvia_pct"), "mm_previstos": a.get("mm_previstos"),
                      "mm_registrados": mm, "resultado": ("Llovió" if mm > 0 else "No llovió") if pasado or mm > 0 else "Pendiente",
                      "vista": "Sí" if a.get("vista") else "No"})
    filas.sort(key=lambda r: r["fecha_prevista"], reverse=True)
    m = _matriz_alertas(ctx, f, lluvia)
    resumen = [{"etiqueta": "Acierto de las alertas", "valor": f"{num(m['acierto_pct'], 1)} %" if m["acierto_pct"] is not None else "—"},
               {"etiqueta": "Alerta y llovió", "valor": m["alerta_llovio"]},
               {"etiqueta": "Alerta y no llovió", "valor": m["alerta_no_llovio"]},
               {"etiqueta": "Sin alerta y llovió", "valor": m["sin_alerta_llovio"]},
               {"etiqueta": "Sin alerta y no llovió", "valor": m["sin_alerta_no_llovio"]}]
    columnas = [_col("emitida", "Emitida", "fecha_hora"), _col("finca", "Finca"), _col("fecha_prevista", "Fecha prevista", "fecha"),
                _col("prob_lluvia_pct", "Prob. (%)", "numero"), _col("mm_previstos", "mm previstos", "numero"),
                _col("mm_registrados", "mm registrados", "numero"), _col("resultado", "Resultado"), _col("vista", "Vista")]
    return {"columnas": columnas, "filas": filas, "resumen": resumen, "matriz": m}
