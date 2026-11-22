"""CU11 – Actualizar pronóstico de lluvia.

Servicio de pronóstico: Open-Meteo (gratuito, sin clave). Se consulta la lluvia
diaria prevista (probabilidad máxima y milímetros) en la ubicación de cada finca.
Se guarda un registro por finca y día (id = <finca>_<fecha>); cada consulta
actualiza ese mismo registro. La carga manual prevalece sobre la automática.
"""
import json
import logging
import threading
import urllib.parse
import urllib.request
from datetime import timedelta

from ..domain import fechas
from ..domain.constantes import COL_PRONOSTICOS, FUENTE_API, FUENTE_MANUAL
from ..errors import NoEncontrado, ServicioExterno, Validacion
from .alertas import generar_alertas_lluvia
from .contexto import Contexto

log = logging.getLogger("pronostico")

URL_OPEN_METEO = "https://api.open-meteo.com/v1/forecast"
DIAS_CONSULTA = 7
MAX_DIAS_MANUAL = 15

# Estado de la última consulta automática (en memoria del proceso)
ESTADO_SERVICIO = {"ultimo_intento": None, "ultimo_ok": None, "ultimo_error": None}
_lock = threading.Lock()


def consultar_open_meteo(latitud: float, longitud: float, dias: int = DIAS_CONSULTA, timeout: int = 15) -> list[dict]:
    consulta = urllib.parse.urlencode({
        "latitude": latitud,
        "longitude": longitud,
        "daily": "precipitation_sum,precipitation_probability_max",
        "timezone": "America/Argentina/Jujuy",
        "forecast_days": dias,
    })
    with urllib.request.urlopen(f"{URL_OPEN_METEO}?{consulta}", timeout=timeout) as resp:
        datos = json.loads(resp.read().decode("utf-8"))
    diario = datos.get("daily") or {}
    salida = []
    for fecha, mm, prob in zip(diario.get("time", []), diario.get("precipitation_sum", []),
                               diario.get("precipitation_probability_max", [])):
        salida.append({"fecha": fecha, "mm": float(mm or 0), "prob": float(prob or 0)})
    return salida


def actualizar_automatico(repo, consultar=consultar_open_meteo, origen="automático") -> dict:
    """Consulta el servicio para cada finca con ubicación, guarda y dispara las alertas."""
    with _lock:
        ctx = Contexto(repo)
        ahora = fechas.a_iso(ctx.ahora)
        ESTADO_SERVICIO["ultimo_intento"] = ahora
        actualizados, omitidos_manual, errores, sin_ubicacion = 0, 0, [], []
        for id_finca, finca in sorted(ctx.fincas.items()):
            if finca.get("latitud") is None or finca.get("longitud") is None:
                sin_ubicacion.append(finca.get("nombre"))
                continue
            try:
                dias = consultar(float(finca["latitud"]), float(finca["longitud"]))
            except Exception as e:  # el servicio no responde: se conserva el último pronóstico
                errores.append(f"{finca.get('nombre')}: {e}")
                continue
            previos = {p["fecha_pronosticada"]: p for p in ctx.pronosticos_por_finca.get(id_finca, [])}
            for d in dias:
                previo = previos.get(d["fecha"])
                if previo and previo.get("fuente") == FUENTE_MANUAL:
                    omitidos_manual += 1
                    continue
                repo.guardar(COL_PRONOSTICOS, f"{id_finca}_{d['fecha']}", {
                    "id_finca": id_finca,
                    "fecha_pronosticada": d["fecha"],
                    "prob_lluvia_pct": round(d["prob"], 1),
                    "mm_previstos": round(d["mm"], 1),
                    "fuente": FUENTE_API,
                    "fecha_hora_actualizacion": ahora,
                    "id_usuario": None,
                })
                actualizados += 1
        if errores and not actualizados:
            ESTADO_SERVICIO["ultimo_error"] = "; ".join(errores)
            log.warning("Pronóstico %s sin respuesta: %s", origen, errores)
            raise ServicioExterno(
                "El servicio de pronóstico no responde. Se conserva el último pronóstico.",
                {"errores": errores, "ultima_actualizacion": ESTADO_SERVICIO["ultimo_ok"]},
            )
        ESTADO_SERVICIO["ultimo_ok"] = ahora
        ESTADO_SERVICIO["ultimo_error"] = "; ".join(errores) or None
        alertas = generar_alertas_lluvia(repo)
        return {
            "fecha_hora": ahora,
            "registros_actualizados": actualizados,
            "dias_con_carga_manual": omitidos_manual,
            "fincas_sin_ubicacion": sin_ubicacion,
            "errores": errores,
            "alertas": [{k: a.get(k) for k in ("id", "finca", "fecha_prevista", "prob_lluvia_pct")} for a in alertas],
        }


def registrar_manual(repo, usuario, id_finca: str, fecha: str, prob_lluvia_pct: float, mm_previstos: float):
    ctx = Contexto(repo)
    finca = ctx.fincas.get(id_finca)
    if not finca:
        raise NoEncontrado("La finca no existe.")
    try:
        f = fechas.de_fecha(fecha)
    except ValueError:
        raise Validacion("Fecha inválida.", {"campos": {"fecha": "Usá el formato AAAA-MM-DD."}})
    if f < ctx.hoy or f > ctx.hoy + timedelta(days=MAX_DIAS_MANUAL):
        raise Validacion(
            f"El pronóstico manual va de hoy a {MAX_DIAS_MANUAL} días.",
            {"campos": {"fecha": f"Elegí una fecha entre hoy y {MAX_DIAS_MANUAL} días adelante."}},
        )
    if not (0 <= float(prob_lluvia_pct) <= 100):
        raise Validacion("La probabilidad va de 0 a 100 %.", {"campos": {"prob_lluvia_pct": "Entre 0 y 100."}})
    if float(mm_previstos) < 0:
        raise Validacion("Los milímetros no pueden ser negativos.", {"campos": {"mm_previstos": "Mayor o igual a cero."}})
    datos = {
        "id_finca": id_finca,
        "fecha_pronosticada": fecha,
        "prob_lluvia_pct": round(float(prob_lluvia_pct), 1),
        "mm_previstos": round(float(mm_previstos), 1),
        "fuente": FUENTE_MANUAL,
        "fecha_hora_actualizacion": fechas.a_iso(ctx.ahora),
        "id_usuario": usuario["uid"],
        "usuario_nombre": f"{usuario.get('nombre', '')} {usuario.get('apellido', '')}".strip(),
    }
    id_doc = f"{id_finca}_{fecha}"
    repo.guardar(COL_PRONOSTICOS, id_doc, datos)
    alertas = generar_alertas_lluvia(repo)
    return {**datos, "id": id_doc, "finca": finca.get("nombre"),
            "alertas": [{k: a.get(k) for k in ("id", "finca", "fecha_prevista", "prob_lluvia_pct")} for a in alertas]}


def listar(repo, dias: int = DIAS_CONSULTA):
    ctx = Contexto(repo)
    hasta = fechas.fecha_txt(ctx.hoy + timedelta(days=max(dias, MAX_DIAS_MANUAL)))
    hoy = fechas.fecha_txt(ctx.hoy)
    filas = []
    ultima_api = None
    for id_finca, lista in ctx.pronosticos_por_finca.items():
        for p in lista:
            if p.get("fuente") == FUENTE_API and (ultima_api is None or p["fecha_hora_actualizacion"] > ultima_api):
                ultima_api = p["fecha_hora_actualizacion"]
            if hoy <= p["fecha_pronosticada"] <= hasta:
                filas.append({**p, "finca": ctx.fincas.get(id_finca, {}).get("nombre")})
    filas.sort(key=lambda p: (p["finca"] or "", p["fecha_pronosticada"]))
    return {
        "umbral_alerta": ctx.params["prob_lluvia_alerta"],
        "horizonte_dias": ctx.params["horizonte_pronostico_dias"],
        "frecuencia_min": ctx.params["frecuencia_pronostico_min"],
        "ultima_actualizacion_api": ultima_api,
        "servicio": dict(ESTADO_SERVICIO),
        "fincas": [{"id": f["id"], "nombre": f.get("nombre"), "latitud": f.get("latitud"), "longitud": f.get("longitud")}
                   for f in sorted(ctx.fincas.values(), key=lambda f: f["id"])],
        "pronosticos": filas,
    }
