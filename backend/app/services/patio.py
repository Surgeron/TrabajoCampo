"""CU17 – Registrar carros en patio y CU22 – Monitorear abastecimiento de patio."""
from ..domain import fechas, patio
from ..domain.constantes import COL_PARADAS, COL_PATIO, CONDICIONES_CARGA, ORDEN_ZONA
from ..errors import Validacion
from .alertas import actualizar_alerta_colchon, es_activa
from .contexto import Contexto
from ..domain.formato import num

MAX_CARROS = 1000  # tope técnico para evitar errores de tipeo


def _parada_abierta(repo):
    return next((p for p in repo.listar(COL_PARADAS) if not p.get("fecha_hora_fin")), None)


def registrar(repo, usuario, cantidad_carros: int, condicion: str):
    ctx = Contexto(repo)
    if cantidad_carros is None or int(cantidad_carros) != cantidad_carros or cantidad_carros < 0:
        raise Validacion("La cantidad de carros es un número entero mayor o igual a cero.",
                         {"campos": {"cantidad_carros": "Entero mayor o igual a cero."}})
    if cantidad_carros > MAX_CARROS:
        raise Validacion(f"Revisá la cantidad: más de {MAX_CARROS} carros no es posible.",
                         {"campos": {"cantidad_carros": f"Máximo {MAX_CARROS}."}})
    if condicion not in CONDICIONES_CARGA:
        raise Validacion("Condición inválida.", {"campos": {"condicion": "Elegí Normal o Post-lluvia."}})
    calc = patio.calcular(int(cantidad_carros), condicion, ctx.params)
    datos = {
        "fecha_hora": fechas.a_iso(ctx.ahora),
        "cantidad_carros": int(cantidad_carros),
        "condicion": condicion,
        "t_netas": calc["t_netas"],
        "horas_cobertura": calc["horas_cobertura"],
        "id_usuario": usuario["uid"],
        "usuario_nombre": f"{usuario.get('nombre', '')} {usuario.get('apellido', '')}".strip(),
    }
    id_doc = repo.agregar(COL_PATIO, datos)
    registro = {**datos, "id": id_doc}
    alerta = actualizar_alerta_colchon(repo, ctx, registro, calc)
    parada = _parada_abierta(repo)
    return {
        "registro": registro,
        "calculo": calc,
        "alerta": alerta,
        "fabrica_parada": bool(parada),
        "mensaje": (
            f"Faltan {calc['carros_faltantes']} carros para llegar a {calc['carros_minimos']}: se avisó a Fábrica."
            if calc["bajo_umbral"] else f"Colchón suficiente: {num(calc['horas_cobertura'], 1)} h de molienda asegurada."
        ),
    }


def listar(repo, desde=None, hasta=None):
    salida = []
    for r in repo.listar(COL_PATIO):
        dia = r["fecha_hora"][:10]
        if desde and dia < desde:
            continue
        if hasta and dia > hasta:
            continue
        salida.append(r)
    return sorted(salida, key=lambda r: r["fecha_hora"], reverse=True)


def tablero(repo):
    ctx = Contexto(repo)
    p = ctx.params
    registros = listar(repo)
    ultimo = registros[0] if registros else None
    calc = patio.calcular(ultimo["cantidad_carros"], ultimo["condicion"], p) if ultimo else None
    hoy = fechas.fecha_txt(ctx.hoy)
    del_dia = sorted([r for r in registros if r["fecha_hora"][:10] == hoy], key=lambda r: r["fecha_hora"])
    if not del_dia and ultimo:
        dia = ultimo["fecha_hora"][:10]
        del_dia = sorted([r for r in registros if r["fecha_hora"][:10] == dia], key=lambda r: r["fecha_hora"])
    parada = _parada_abierta(repo)
    en_cosecha = sorted([l for l in ctx.lotes if l.get("en_cosecha")],
                        key=lambda l: (ORDEN_ZONA.get(l.get("zona"), 9), -(float(l.get("dist_ingenio_km") or 0))))
    return {
        "ultimo": ultimo,
        "calculo": calc,
        "parametros": {
            "carros_minimos": p["carros_minimos_patio"],
            "capacidad_molienda_th": p["capacidad_molienda_th"],
            "carga_neta_carro_t": p["carga_neta_carro_t"],
            "carga_neta_post_lluvia_t": p["carga_neta_post_lluvia_t"],
            "carga_bruta_carro_t": p["carga_bruta_carro_t"],
            "merma_min_pct": p["merma_min_pct"],
            "merma_max_pct": p["merma_max_pct"],
            "ciclo_camion_h": p["ciclo_camion_h"],
        },
        "fabrica_parada": bool(parada),
        "parada_abierta": parada,
        "carros_para_reanudar": calc["carros_faltantes"] if (calc and parada) else (p["carros_minimos_patio"] if parada else None),
        "evolucion": [
            {"fecha_hora": r["fecha_hora"], "cantidad_carros": r["cantidad_carros"], "horas_cobertura": r["horas_cobertura"]}
            for r in del_dia
        ],
        "lotes_en_cosecha": [
            {k: l.get(k) for k in ("id_unico", "nombre", "finca", "zona", "dist_ingenio_km", "area_neta_ha", "fecha_ultima_cosecha")}
            for l in en_cosecha
        ],
        "alertas_activas": [a for a in ctx.alertas if es_activa(a, hoy)],
    }
