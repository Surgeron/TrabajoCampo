"""CU19 – Registrar parada de fábrica."""
from ..domain import fechas, paradas, patio
from ..domain.constantes import CAUSAS_PARADA, COL_PARADAS, COL_PATIO
from ..errors import Conflicto, NoEncontrado, Validacion
from .contexto import Contexto


def _enriquecer(p: dict, ctx: Contexto) -> dict:
    horas = paradas.duracion_h(p, ctx.ahora)
    salida = {
        **p,
        "abierta": not p.get("fecha_hora_fin"),
        "duracion_h": horas,
        "costos_usd": paradas.costos(horas, ctx.params),
        "alerta_previa": paradas.alerta_previa(p, ctx.alertas),
    }
    if salida["abierta"]:
        registros = sorted(ctx.repo.listar(COL_PATIO), key=lambda r: r["fecha_hora"], reverse=True)
        ultimo = registros[0] if registros else None
        if ultimo:
            calc = patio.calcular(ultimo["cantidad_carros"], ultimo["condicion"], ctx.params)
            salida["patio"] = {"ultimo": ultimo, "carros_faltantes": calc["carros_faltantes"], "carros_minimos": calc["carros_minimos"]}
        else:
            salida["patio"] = {"ultimo": None, "carros_faltantes": int(ctx.params["carros_minimos_patio"]),
                               "carros_minimos": int(ctx.params["carros_minimos_patio"])}
    return salida


def listar(repo, desde=None, hasta=None, causa=None):
    ctx = Contexto(repo)
    salida = []
    for p in repo.listar(COL_PARADAS):
        dia = p["fecha_hora_inicio"][:10]
        if desde and (p.get("fecha_hora_fin") or "9999")[:10] < desde:
            continue
        if hasta and dia > hasta:
            continue
        if causa and p.get("causa") != causa:
            continue
        salida.append(_enriquecer(p, ctx))
    salida.sort(key=lambda p: p["fecha_hora_inicio"], reverse=True)
    total_h = round(sum(p["duracion_h"] for p in salida), 2)
    return {"paradas": salida, "total_horas": total_h, "costos_total_usd": paradas.costos(total_h, ctx.params)}


def detalle(repo, id_parada):
    ctx = Contexto(repo)
    p = repo.obtener(COL_PARADAS, id_parada)
    if not p:
        raise NoEncontrado("La parada no existe.")
    return _enriquecer(p, ctx)


def _parsear(texto, campo):
    try:
        return fechas.de_iso(texto)
    except (TypeError, ValueError):
        raise Validacion("Fecha y hora inválidas.", {"campos": {campo: "Fecha y hora inválidas."}})


def registrar(repo, usuario, fecha_hora_inicio: str, fecha_hora_fin: str | None, causa: str, observacion: str | None):
    ctx = Contexto(repo)
    if causa not in CAUSAS_PARADA:
        raise Validacion("Causa inválida.", {"campos": {"causa": "Elegí una de las causas de la lista."}})
    inicio = _parsear(fecha_hora_inicio, "fecha_hora_inicio")
    fin = _parsear(fecha_hora_fin, "fecha_hora_fin") if fecha_hora_fin else None
    if inicio > ctx.ahora:
        raise Validacion("El inicio no puede ser futuro.", {"campos": {"fecha_hora_inicio": "No puede ser futuro."}})
    if fin is not None:
        if fin <= inicio:
            raise Validacion("El fin debe ser posterior al inicio.", {"campos": {"fecha_hora_fin": "Debe ser posterior al inicio."}})
        if fin > ctx.ahora:
            raise Validacion("El fin no puede ser futuro.", {"campos": {"fecha_hora_fin": "No puede ser futuro."}})
    existentes = repo.listar(COL_PARADAS)
    choque = paradas.buscar_superposicion(inicio, fin, existentes)
    if choque:
        raise Conflicto(
            "Se superpone con otra parada: "
            f"{choque['causa']} desde {choque['fecha_hora_inicio'][:16].replace('T', ' ')}"
            + (f" hasta {choque['fecha_hora_fin'][:16].replace('T', ' ')}." if choque.get("fecha_hora_fin") else " (sigue abierta)."),
            {"parada": choque},
        )
    datos = {
        "fecha_hora_inicio": fechas.a_iso(inicio),
        "fecha_hora_fin": fechas.a_iso(fin) if fin else None,
        "causa": causa,
        "observacion": (observacion or "").strip() or None,
        "id_usuario": usuario["uid"],
        "usuario_nombre": f"{usuario.get('nombre', '')} {usuario.get('apellido', '')}".strip(),
        "fecha_hora_carga": fechas.a_iso(ctx.ahora),
    }
    id_doc = repo.agregar(COL_PARADAS, datos)
    return _enriquecer({**datos, "id": id_doc}, Contexto(repo))


def cerrar(repo, usuario, id_parada: str, fecha_hora_fin: str):
    ctx = Contexto(repo)
    p = repo.obtener(COL_PARADAS, id_parada)
    if not p:
        raise NoEncontrado("La parada no existe.")
    if p.get("fecha_hora_fin"):
        raise Conflicto("La parada ya está cerrada.")
    fin = _parsear(fecha_hora_fin, "fecha_hora_fin")
    inicio = fechas.de_iso(p["fecha_hora_inicio"])
    if fin <= inicio:
        raise Validacion("El fin debe ser posterior al inicio.", {"campos": {"fecha_hora_fin": "Debe ser posterior al inicio."}})
    if fin > ctx.ahora:
        raise Validacion("El fin no puede ser futuro.", {"campos": {"fecha_hora_fin": "No puede ser futuro."}})
    choque = paradas.buscar_superposicion(inicio, fin, repo.listar(COL_PARADAS), excluir_id=id_parada)
    if choque:
        raise Conflicto("Con ese fin se superpone con otra parada.", {"parada": choque})
    cambios = {"fecha_hora_fin": fechas.a_iso(fin), "id_usuario_cierre": usuario["uid"]}
    repo.actualizar(COL_PARADAS, id_parada, cambios)
    return _enriquecer({**p, **cambios}, Contexto(repo))
