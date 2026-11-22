"""CU04 – Gestionar fincas y lotes, y catálogos de solo lectura (CU03, CU07)."""
from collections import defaultdict

from ..domain import fechas, riesgo, zonas
from ..domain.constantes import (
    CERTIFICACIONES,
    COL_LECTURAS,
    COL_LOTES,
    COL_LOTES_CAMPANIA,
    DRENAJES,
    ESTADO_PRODUCCION,
    ESTADOS_LOTE,
    NOMBRE_DRENAJE,
    TIPOS_CULTIVO,
)
from ..errors import Conflicto, NoEncontrado, Validacion
from .contexto import Contexto


# ---------- catálogos ----------
def listar_parametros(repo):
    ctx = Contexto(repo)
    registros = {r["clave"]: r for r in ctx.registros_parametros}
    from ..domain.parametros import lista_defaults

    salida = []
    for d in lista_defaults(ctx.campania["id"]):
        r = registros.get(d["clave"], {})
        salida.append({**d, **{k: v for k, v in r.items() if v is not None}, "en_base": bool(r)})
    return {"campania": _campania(ctx), "parametros": salida}


def listar_fincas(repo):
    ctx = Contexto(repo)
    por_finca = defaultdict(list)
    for l in ctx.lotes:
        por_finca[l["id_finca"]].append(l)
    salida = []
    for id_finca, f in sorted(ctx.fincas.items()):
        lotes = por_finca.get(id_finca, [])
        prod = [l for l in lotes if l["estado_lote"] == ESTADO_PRODUCCION]
        salida.append({
            **f,
            "cantidad_lotes": len(lotes),
            "lotes_en_produccion": len(prod),
            "area_bruta_ha": round(sum(float(l.get("area_bruta_ha") or 0) for l in lotes), 2),
            "area_neta_ha": round(sum(float(l.get("area_neta_ha") or 0) for l in prod), 2),
            "pluviometros": len([p for p in ctx.pluviometros.values() if p.get("id_finca") == id_finca]),
        })
    return salida


def listar_pluviometros(repo):
    ctx = Contexto(repo)
    cuenta = defaultdict(int)
    for l in ctx.lotes:
        if l.get("id_pluviometro"):
            cuenta[l["id_pluviometro"]] += 1
    salida = []
    for p in sorted(ctx.pluviometros.values(), key=lambda p: p.get("nombre") or ""):
        lecturas = ctx.lecturas_por_pluviometro.get(p["id"], [])
        ultima = max(lecturas, key=lambda l: l["fecha"]) if lecturas else None
        salida.append({
            **p,
            "finca": ctx.fincas.get(p.get("id_finca"), {}).get("nombre"),
            "cantidad_lotes": cuenta[p["id"]],
            "ultima_lectura": {"fecha": ultima["fecha"], "mm": ultima["mm"]} if ultima else None,
        })
    return salida


def _campania(ctx):
    c = ctx.campania
    return {k: c.get(k) for k in ("id", "nombre", "anio", "fecha_inicio", "fecha_fin", "toneladas_plan")}


# ---------- lotes ----------
def _vista_lista(l: dict) -> dict:
    r = l.get("riesgo") or {}
    return {
        k: l.get(k)
        for k in (
            "id_unico", "id_finca", "finca", "nro_lote", "nombre", "tipo_cultivo", "certificacion",
            "area_bruta_ha", "area_neta_ha", "dist_ingenio_km", "zona", "madurez", "drenaje",
            "id_pluviometro", "pluviometro", "variedad", "estado_lote", "estado_piso", "brix",
            "en_reserva", "terminado", "en_cosecha", "datos_incompletos", "latitud", "longitud", "poligono",
        )
    } | {"drenaje_nombre": NOMBRE_DRENAJE.get(l.get("drenaje")), "riesgo": r.get("nivel"), "riesgo_justificacion": r.get("justificacion")}


def listar_lotes(repo, id_finca=None, tipo_cultivo=None, zona=None, drenaje=None, estado_lote=None, texto=None):
    ctx = Contexto(repo)
    salida = []
    t = (texto or "").strip().lower()
    for l in ctx.lotes:
        if id_finca and l.get("id_finca") != id_finca:
            continue
        if tipo_cultivo and l.get("tipo_cultivo") != tipo_cultivo:
            continue
        if zona:
            if zona == "Sin zona" and l.get("zona"):
                continue
            if zona != "Sin zona" and l.get("zona") != zona:
                continue
        if drenaje:
            if drenaje == "sin_dato" and l.get("drenaje"):
                continue
            if drenaje != "sin_dato" and l.get("drenaje") != drenaje:
                continue
        if estado_lote and l.get("estado_lote") != estado_lote:
            continue
        if t and t not in f"{l.get('nombre')} {l.get('nro_lote')} {l.get('id_unico')} {l.get('finca')}".lower():
            continue
        salida.append(_vista_lista(l))
    return salida


def ficha_lote(repo, id_unico: str):
    ctx = Contexto(repo)
    l = ctx.lote(id_unico)
    periodos = riesgo.periodos_sin_piso(ctx.estados_por_lote.get(id_unico, []), ctx.ahora)
    lecturas = sorted(ctx.lecturas_por_pluviometro.get(l.get("id_pluviometro"), []), key=lambda x: x["fecha"], reverse=True)
    return {
        "lote": {**l, "drenaje_nombre": NOMBRE_DRENAJE.get(l.get("drenaje"))},
        "brix": list(reversed(ctx.brix_por_lote_campania.get(l.get("id_lote_campania"), []))),
        "estados_piso": list(reversed(ctx.estados_por_lote.get(id_unico, []))),
        "periodos_sin_piso": list(reversed(periodos)),
        "cosechas": list(reversed(ctx.cosechas_por_lote_campania.get(l.get("id_lote_campania"), []))),
        "lecturas_recientes": lecturas[:10],
        "campania": _campania(ctx),
    }


EDITABLES_LOTE = ("nombre", "nro_lote", "tipo_cultivo", "certificacion", "area_bruta_ha", "area_neta_ha",
                  "dist_ingenio_km", "drenaje", "id_pluviometro")
EDITABLES_CAMPANIA = ("variedad", "anio_plantacion", "cantidad_cortes", "estado_lote", "observaciones")


def actualizar_lote(repo, usuario: dict, id_unico: str, cambios: dict):
    ctx = Contexto(repo)
    actual = ctx.lote(id_unico)
    datos_lote = {k: cambios[k] for k in EDITABLES_LOTE if k in cambios}
    datos_lc = {k: cambios[k] for k in EDITABLES_CAMPANIA if k in cambios}
    nuevo = {**actual, **datos_lote, **datos_lc}

    errores = {}
    if not str(nuevo.get("nombre") or "").strip():
        errores["nombre"] = "El nombre es obligatorio."
    if not str(nuevo.get("nro_lote") or "").strip():
        errores["nro_lote"] = "El número de lote es obligatorio."
    if nuevo.get("tipo_cultivo") not in TIPOS_CULTIVO:
        errores["tipo_cultivo"] = "Tipo de cultivo inválido."
    if nuevo.get("tipo_cultivo") == "Orgánico" and nuevo.get("certificacion") not in CERTIFICACIONES:
        errores["certificacion"] = "Un lote orgánico necesita su certificación (Orgánico Full u Orgánico NOP)."
    if nuevo.get("tipo_cultivo") == "Convencional":
        nuevo["certificacion"] = None
        if "certificacion" in datos_lote or "tipo_cultivo" in datos_lote:
            datos_lote["certificacion"] = None
    ab, an = nuevo.get("area_bruta_ha"), nuevo.get("area_neta_ha")
    if ab is not None and float(ab) <= 0:
        errores["area_bruta_ha"] = "El área bruta debe ser mayor a cero."
    if an is not None and float(an) < 0:
        errores["area_neta_ha"] = "El área neta no puede ser negativa."
    if ab is not None and an is not None and float(an) > float(ab):
        errores["area_neta_ha"] = "El área neta no puede superar al área bruta."
    if nuevo.get("drenaje") not in (None, *DRENAJES):
        errores["drenaje"] = "Tipo de drenaje inválido."
    if nuevo.get("id_pluviometro") and nuevo["id_pluviometro"] not in ctx.pluviometros:
        errores["id_pluviometro"] = "El pluviómetro no existe."
    if nuevo.get("estado_lote") not in ESTADOS_LOTE:
        errores["estado_lote"] = "Estado inválido."
    anio = nuevo.get("anio_plantacion")
    if anio is not None and not (1950 <= int(anio) <= int(ctx.campania.get("anio") or fechas.hoy().year)):
        errores["anio_plantacion"] = f"El año de plantación debe estar entre 1950 y {ctx.campania.get('anio')}."
    if nuevo.get("estado_lote") == ESTADO_PRODUCCION and not str(nuevo.get("variedad") or "").strip():
        errores["variedad"] = "Un lote en producción necesita su variedad."
    # Unicidad finca + número de lote
    if "nro_lote" in datos_lote:
        for otro in ctx.lotes:
            if otro["id_unico"] != id_unico and otro.get("id_finca") == actual.get("id_finca") \
                    and str(otro.get("nro_lote")).strip() == str(nuevo["nro_lote"]).strip():
                errores["nro_lote"] = f"Ya existe el lote {nuevo['nro_lote']} en la finca {actual.get('finca')} ({otro.get('nombre')})."
                break
    if errores:
        raise Validacion("Revisá los datos del lote.", {"campos": errores})

    marca = {"fecha_hora_modificacion": fechas.a_iso(ctx.ahora), "id_usuario_modificacion": usuario["uid"]}
    if datos_lote:
        if "dist_ingenio_km" in datos_lote:
            datos_lote["zona"] = zonas.calcular_zona(datos_lote["dist_ingenio_km"], ctx.params)
        repo.actualizar(COL_LOTES, id_unico, {**datos_lote, **marca})
    if datos_lc:
        if not actual.get("id_lote_campania"):
            raise Conflicto("El lote no tiene registro en la campaña activa.")
        repo.actualizar(COL_LOTES_CAMPANIA, actual["id_lote_campania"], {**datos_lc, **marca})
    return ficha_lote(repo, id_unico)


def lecturas_de_pluviometro(repo, id_pluviometro):
    if not repo.obtener("pluviometros", id_pluviometro):
        raise NoEncontrado("El pluviómetro no existe.")
    return sorted(repo.listar(COL_LECTURAS, id_pluviometro=id_pluviometro), key=lambda l: l["fecha"], reverse=True)
