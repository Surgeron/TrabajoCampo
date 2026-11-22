"""Registros de campo: CU08 lecturas, CU09 estado de piso, CU10 Brix y CU16 cosecha."""
from ..domain import fechas
from ..domain.riesgo import periodos_sin_piso
from ..domain.constantes import (
    COL_BRIX,
    COL_COSECHAS,
    COL_ESTADOS_PISO,
    COL_LECTURAS,
    COL_LOTES_CAMPANIA,
    ESTADO_PREPARACION,
    ESTADOS_PISO,
    HABILITADO,
    INHABILITADO,
    ORIGENES_BRIX,
)
from ..errors import Conflicto, NoEncontrado, Validacion
from .contexto import Contexto
from ..domain.formato import num


def _nombre(usuario):
    return f"{usuario.get('nombre', '')} {usuario.get('apellido', '')}".strip() or usuario.get("email")


def _validar_fecha_pasada(fecha: str, ctx: Contexto, campo="fecha"):
    try:
        f = fechas.de_fecha(fecha)
    except ValueError:
        raise Validacion("Fecha inválida.", {"campos": {campo: "Usá el formato AAAA-MM-DD."}})
    if f > ctx.hoy:
        raise Validacion("La fecha no puede ser futura.", {"campos": {campo: "La fecha no puede ser futura."}})
    return f


# ---------- CU08 ----------
def registrar_lectura(repo, usuario, id_pluviometro: str, fecha: str, mm: float):
    ctx = Contexto(repo)
    pluv = ctx.pluviometros.get(id_pluviometro)
    if not pluv:
        raise NoEncontrado("El pluviómetro no existe.")
    _validar_fecha_pasada(fecha, ctx)
    if mm is None or float(mm) < 0:
        raise Validacion("Los milímetros deben ser un número mayor o igual a cero.", {"campos": {"mm": "Debe ser mayor o igual a cero."}})
    id_doc = f"{id_pluviometro}_{fecha}"
    existente = repo.obtener(COL_LECTURAS, id_doc)
    if existente:
        raise Conflicto(
            f"Ya hay una lectura de {pluv.get('nombre')} para el {fechas.fecha_corta(fecha)} ({existente['mm']} mm). Podés corregirla.",
            {"lectura": existente},
        )
    datos = {
        "id_pluviometro": id_pluviometro,
        "id_finca": pluv.get("id_finca"),
        "fecha": fecha,
        "mm": round(float(mm), 1),
        "fecha_hora_carga": fechas.a_iso(ctx.ahora),
        "id_usuario": usuario["uid"],
        "usuario_nombre": _nombre(usuario),
    }
    repo.agregar(COL_LECTURAS, datos, id_doc)
    return {**datos, "id": id_doc, "pluviometro": pluv.get("nombre"), "lotes_recalculados": _lotes_de_pluviometro(ctx, id_pluviometro)}


def corregir_lectura(repo, usuario, id_lectura: str, mm: float):
    ctx = Contexto(repo)
    actual = repo.obtener(COL_LECTURAS, id_lectura)
    if not actual:
        raise NoEncontrado("La lectura no existe.")
    if mm is None or float(mm) < 0:
        raise Validacion("Los milímetros deben ser un número mayor o igual a cero.", {"campos": {"mm": "Debe ser mayor o igual a cero."}})
    cambios = {
        "mm": round(float(mm), 1),
        "mm_anterior": actual["mm"],
        "fecha_hora_correccion": fechas.a_iso(ctx.ahora),
        "id_usuario_correccion": usuario["uid"],
        "usuario_correccion_nombre": _nombre(usuario),
    }
    repo.actualizar(COL_LECTURAS, id_lectura, cambios)
    return {**actual, **cambios, "lotes_recalculados": _lotes_de_pluviometro(ctx, actual["id_pluviometro"])}


def _lotes_de_pluviometro(ctx, id_pluviometro):
    return len([l for l in ctx.lotes if l.get("id_pluviometro") == id_pluviometro])


def listar_lecturas(repo, usuario=None, solo_mias=False, id_pluviometro=None, desde=None, hasta=None):
    ctx = Contexto(repo)
    filtros = {}
    if id_pluviometro:
        filtros["id_pluviometro"] = id_pluviometro
    if solo_mias and usuario:
        filtros["id_usuario"] = usuario["uid"]
    salida = []
    for l in repo.listar(COL_LECTURAS, **filtros):
        if desde and l["fecha"] < desde:
            continue
        if hasta and l["fecha"] > hasta:
            continue
        pluv = ctx.pluviometros.get(l["id_pluviometro"], {})
        salida.append({**l, "pluviometro": pluv.get("nombre"), "finca": ctx.fincas.get(pluv.get("id_finca"), {}).get("nombre")})
    return sorted(salida, key=lambda l: (l["fecha"], l.get("fecha_hora_carga") or ""), reverse=True)


# ---------- CU09 ----------
def registrar_estado_piso(repo, usuario, id_unico: str, estado: str, observacion: str | None):
    ctx = Contexto(repo)
    lote = ctx.lote(id_unico)
    if estado not in ESTADOS_PISO:
        raise Validacion("Estado de piso inválido.", {"campos": {"estado": "Elegí Habilitado, Con restricciones o Inhabilitado."}})
    ahora = fechas.a_iso(ctx.ahora)
    anteriores = ctx.estados_por_lote.get(id_unico, [])
    abierto = next((e for e in reversed(anteriores) if not e.get("fecha_hora_hasta")), None)
    if abierto:
        repo.actualizar(COL_ESTADOS_PISO, abierto["id"], {"fecha_hora_hasta": ahora})
    datos = {
        "id_unico": id_unico,
        "id_finca": lote.get("id_finca"),
        "estado": estado,
        "fecha_hora_desde": ahora,
        "fecha_hora_hasta": None,
        "observacion": (observacion or "").strip() or None,
        "id_usuario": usuario["uid"],
        "usuario_nombre": _nombre(usuario),
    }
    id_doc = repo.agregar(COL_ESTADOS_PISO, datos)
    resultado = {**datos, "id": id_doc, "lote": lote.get("nombre"), "finca": lote.get("finca")}

    # Período sin piso: se abre al pasar a Inhabilitado y se cierra al volver a Habilitado
    previo = lote.get("estado_piso")
    if estado == INHABILITADO and previo != INHABILITADO:
        resultado["mensaje"] = "Se abrió un período sin piso. El lote sale del ranking hasta que se habilite."
    elif estado == HABILITADO and previo == INHABILITADO:
        periodos = periodos_sin_piso(anteriores + [datos], ctx.ahora)
        cerrado = next((p for p in reversed(periodos) if not p["abierto"]), None)
        if cerrado:
            resultado["dias_sin_piso"] = cerrado["dias"]
            resultado["mensaje"] = f"Se cerró el período sin piso: {num(cerrado['dias'], 1)} días."
    # Un lote de reserva que se inhabilita sale de la reserva (CU21)
    from .priorizacion import depurar_reserva

    resultado["avisos_reserva"] = depurar_reserva(repo)
    return resultado


def listar_estados_piso(repo, usuario=None, solo_mias=False, id_unico=None):
    ctx = Contexto(repo)
    filtros = {}
    if id_unico:
        filtros["id_unico"] = id_unico
    if solo_mias and usuario:
        filtros["id_usuario"] = usuario["uid"]
    salida = []
    for e in repo.listar(COL_ESTADOS_PISO, **filtros):
        l = ctx.lotes_por_id.get(e["id_unico"], {})
        salida.append({**e, "lote": l.get("nombre"), "finca": l.get("finca"), "nro_lote": l.get("nro_lote")})
    return sorted(salida, key=lambda e: e["fecha_hora_desde"], reverse=True)


# ---------- CU10 ----------
def registrar_brix(repo, usuario, id_unico: str, fecha: str, valor_brix: float, origen: str):
    ctx = Contexto(repo)
    lote = ctx.lote(id_unico)
    _validar_fecha_pasada(fecha, ctx)
    if valor_brix is None or float(valor_brix) <= 0:
        raise Validacion("El Brix debe ser un número positivo.", {"campos": {"valor_brix": "Debe ser mayor a cero."}})
    if origen not in ORIGENES_BRIX:
        raise Validacion("Origen inválido.", {"campos": {"origen": "Elegí muestreo en campo, laboratorio o imagen satelital."}})
    if not lote.get("id_lote_campania"):
        raise Conflicto("El lote no tiene registro en la campaña activa.")
    datos = {
        "id_lote_campania": lote["id_lote_campania"],
        "id_unico": id_unico,
        "fecha": fecha,
        "valor_brix": round(float(valor_brix), 2),
        "origen": origen,
        "fecha_hora_carga": fechas.a_iso(ctx.ahora),
        "id_usuario": usuario["uid"],
        "usuario_nombre": _nombre(usuario),
    }
    id_doc = repo.agregar(COL_BRIX, datos)
    minimo = float(ctx.params["brix_minimo"])
    habilitado = float(valor_brix) >= minimo
    from .priorizacion import depurar_reserva

    return {
        **datos,
        "id": id_doc,
        "habilitado_por_madurez": habilitado,
        "mensaje": f"El lote queda habilitado por madurez (≥ {minimo:g} °Bx)." if habilitado
        else f"Con menos de {minimo:g} °Bx el lote no entra al ranking.",
        "avisos_reserva": depurar_reserva(repo),
    }


# ---------- CU16 ----------
def registrar_cosecha(repo, usuario, id_unico: str, fecha: str, toneladas: float | None, lote_terminado: bool):
    ctx = Contexto(repo)
    lote = ctx.lote(id_unico)
    f = _validar_fecha_pasada(fecha, ctx)
    inicio = ctx.campania.get("fecha_inicio")
    if inicio and f < fechas.de_fecha(inicio):
        raise Validacion("La fecha es anterior al inicio de la campaña.", {"campos": {"fecha": f"Debe ser desde el {inicio}."}})
    if lote.get("estado_lote") == ESTADO_PREPARACION:
        raise Conflicto("No se puede registrar cosecha en un lote En preparación.")
    if lote.get("terminado"):
        raise Conflicto(f"El lote {lote.get('nombre')} ya tiene la cosecha terminada.")
    if toneladas is not None and float(toneladas) <= 0:
        raise Validacion("Las toneladas deben ser mayores a cero.", {"campos": {"toneladas": "Debe ser mayor a cero."}})
    datos = {
        "id_lote_campania": lote["id_lote_campania"],
        "id_unico": id_unico,
        "id_finca": lote.get("id_finca"),
        "fecha": fecha,
        "toneladas": round(float(toneladas), 1) if toneladas is not None else None,
        "lote_terminado": bool(lote_terminado),
        "fecha_hora_carga": fechas.a_iso(ctx.ahora),
        "id_usuario": usuario["uid"],
        "usuario_nombre": _nombre(usuario),
    }
    id_doc = repo.agregar(COL_COSECHAS, datos)
    avisos = []
    if lote_terminado and lote.get("en_reserva"):
        repo.actualizar(COL_LOTES_CAMPANIA, lote["id_lote_campania"], {"en_reserva": False, "fecha_reserva": None})
        avisos.append(f"{lote.get('nombre')} salió de la reserva porque se terminó su cosecha.")
    mensaje = "Lote terminado: sale del ranking y de la reserva." if lote_terminado else "Lote en cosecha: aparece arriba del ranking."
    return {**datos, "id": id_doc, "mensaje": mensaje, "avisos_reserva": avisos}


def listar_cosechas(repo, desde=None, hasta=None):
    ctx = Contexto(repo)
    salida = []
    for c in repo.listar(COL_COSECHAS):
        if desde and c["fecha"] < desde:
            continue
        if hasta and c["fecha"] > hasta:
            continue
        l = ctx.lotes_por_id.get(c["id_unico"], {})
        salida.append({**c, "lote": l.get("nombre"), "finca": l.get("finca"), "zona": l.get("zona")})
    return sorted(salida, key=lambda c: (c["fecha"], c.get("fecha_hora_carga") or ""), reverse=True)
