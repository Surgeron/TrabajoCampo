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
from datetime import timedelta, timezone

from ..domain import fechas
from ..domain.constantes import COL_PRONOSTICOS, FUENTE_API, FUENTE_MANUAL
from ..errors import NoEncontrado, ServicioExterno, Validacion
from .alertas import generar_alertas_lluvia
from .contexto import Contexto

log = logging.getLogger("pronostico")

URL_OPEN_METEO = "https://api.open-meteo.com/v1/forecast"
URL_MET_NO = "https://api.met.no/weatherapi/locationforecast/2.0/compact"
USER_AGENT = "NexoZafra-IngenioLaEsperanza/2.0 (+https://surgeron.github.io/TrabajoCampo/)"
DIAS_CONSULTA = 7
MAX_DIAS_MANUAL = 15

# Estado de la última consulta automática (en memoria del proceso)
ESTADO_SERVICIO = {"ultimo_intento": None, "ultimo_ok": None, "ultimo_error": None}
_lock = threading.Lock()


def _pedir_json(url: str, timeout: int = 15):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _parsear_diario_open_meteo(diario: dict) -> list[dict]:
    salida = []
    for fecha, mm, prob in zip(
        diario.get("time", []),
        diario.get("precipitation_sum", []),
        diario.get("precipitation_probability_max", []),
    ):
        salida.append({"fecha": fecha, "mm": float(mm or 0), "prob": float(prob or 0)})
    return salida


def consultar_open_meteo_lote(
    coordenadas: list[tuple[float, float]], dias: int = DIAS_CONSULTA, timeout: int = 15
) -> list[list[dict]]:
    """Consulta varias ubicaciones en una sola petición HTTP a Open-Meteo."""
    if not coordenadas:
        return []
    consulta = urllib.parse.urlencode({
        "latitude": ",".join(str(lat) for lat, _ in coordenadas),
        "longitude": ",".join(str(lon) for _, lon in coordenadas),
        "daily": "precipitation_sum,precipitation_probability_max",
        "timezone": "America/Argentina/Jujuy",
        "forecast_days": dias,
    })
    datos = _pedir_json(f"{URL_OPEN_METEO}?{consulta}", timeout=timeout)
    if isinstance(datos, list):
        salida = [_parsear_diario_open_meteo((item or {}).get("daily") or {}) for item in datos]
    else:
        salida = [_parsear_diario_open_meteo((datos or {}).get("daily") or {})]
    if len(salida) != len(coordenadas):
        raise ValueError("Respuesta incompleta de Open-Meteo")
    return salida


def consultar_open_meteo(latitud: float, longitud: float, dias: int = DIAS_CONSULTA, timeout: int = 15) -> list[dict]:
    return consultar_open_meteo_lote([(latitud, longitud)], dias=dias, timeout=timeout)[0]


def _estimar_prob_por_mm(mm: float) -> float:
    if mm == 0:
        return 0.0
    if mm < 1:
        return 25.0
    return min(95.0, round(40.0 + mm * 3.0, 1))


def consultar_met_no(latitud: float, longitud: float, dias: int = DIAS_CONSULTA, timeout: int = 15) -> list[dict]:
    """Respaldo gratuito (api.met.no) cuando Open-Meteo limita por IP compartida (HTTP 429)."""
    consulta = urllib.parse.urlencode({"lat": round(latitud, 4), "lon": round(longitud, 4)})
    datos = _pedir_json(f"{URL_MET_NO}?{consulta}", timeout=timeout)
    series = (datos.get("properties") or {}).get("timeseries") or []
    hoy = fechas.hoy()
    limite = hoy + timedelta(days=dias - 1)
    por_dia: dict[str, dict] = {}
    for entrada in series:
        tiempo = entrada.get("time")
        if not tiempo:
            continue
        dt_local = fechas.de_iso(tiempo)
        fecha_local = dt_local.date()
        if fecha_local < hoy or fecha_local > limite:
            continue
        dt_utc = dt_local.astimezone(timezone.utc)
        data = entrada.get("data") or {}
        if "next_1_hours" in data:
            bloque = data["next_1_hours"]
        elif "next_6_hours" in data and dt_utc.hour % 6 == 0:
            bloque = data["next_6_hours"]
        else:
            continue
        det = (bloque or {}).get("details") or {}
        mm = float(det.get("precipitation_amount") or 0)
        prob_raw = det.get("probability_of_precipitation")
        clave = fechas.fecha_txt(fecha_local)
        acum = por_dia.setdefault(clave, {"mm": 0.0, "prob_api": None})
        acum["mm"] += mm
        if prob_raw is not None:
            prob_val = float(prob_raw)
            acum["prob_api"] = prob_val if acum["prob_api"] is None else max(acum["prob_api"], prob_val)
    salida = []
    for fecha_str in sorted(por_dia):
        acum = por_dia[fecha_str]
        mm_total = round(acum["mm"], 1)
        prob = round(acum["prob_api"], 1) if acum["prob_api"] is not None else _estimar_prob_por_mm(mm_total)
        salida.append({"fecha": fecha_str, "mm": mm_total, "prob": prob})
    if not salida:
        raise ValueError("Respuesta vacía de met.no")
    return salida


def _ultima_actualizacion_api(ctx: Contexto) -> str | None:
    ultima = None
    for lista in ctx.pronosticos_por_finca.values():
        for p in lista:
            fecha_act = p.get("fecha_hora_actualizacion")
            if p.get("fuente") == FUENTE_API and fecha_act and (ultima is None or fecha_act > ultima):
                ultima = fecha_act
    return ultima


def segundos_vigencia_restantes(repo) -> int:
    """Segundos que faltan para vencer el último pronóstico automático (0 si ya venció)."""
    ctx = Contexto(repo)
    ultima = _ultima_actualizacion_api(ctx)
    if not ultima:
        return 0
    if ESTADO_SERVICIO["ultimo_ok"] is None:
        ESTADO_SERVICIO["ultimo_ok"] = ultima
    frecuencia_seg = int(ctx.params["frecuencia_pronostico_min"]) * 60
    transcurrido = (ctx.ahora - fechas.de_iso(ultima)).total_seconds()
    if transcurrido < 0:
        return 0
    return max(0, int(frecuencia_seg - transcurrido))


def actualizar_automatico(repo, consultar=consultar_open_meteo, origen="automático") -> dict:
    """Consulta el servicio para cada finca con ubicación, guarda y dispara las alertas."""
    with _lock:
        ctx = Contexto(repo)
        ahora = fechas.a_iso(ctx.ahora)
        ESTADO_SERVICIO["ultimo_intento"] = ahora
        actualizados, omitidos_manual, errores, sin_ubicacion = 0, 0, [], []
        fincas_con_ubicacion = []
        for id_finca, finca in sorted(ctx.fincas.items()):
            if finca.get("latitud") is None or finca.get("longitud") is None:
                sin_ubicacion.append(finca.get("nombre"))
                continue
            fincas_con_ubicacion.append((id_finca, finca))

        dias_por_finca: dict[str, list[dict]] = {}
        if fincas_con_ubicacion:
            if consultar is consultar_open_meteo:
                coords = [(float(f["latitud"]), float(f["longitud"])) for _, f in fincas_con_ubicacion]
                try:
                    lote = consultar_open_meteo_lote(coords)
                    dias_por_finca = {
                        id_finca: dias for (id_finca, _), dias in zip(fincas_con_ubicacion, lote)
                    }
                except Exception as e_lote:
                    log.info("Open-Meteo falló (%s); usando respaldo api.met.no", e_lote)
                    for id_finca, finca in fincas_con_ubicacion:
                        try:
                            dias_por_finca[id_finca] = consultar_met_no(float(finca["latitud"]), float(finca["longitud"]))
                        except Exception as e_met:
                            errores.append(f"{finca.get('nombre')}: {e_lote} / met.no: {e_met}")
            else:
                for id_finca, finca in fincas_con_ubicacion:
                    try:
                        dias_por_finca[id_finca] = consultar(float(finca["latitud"]), float(finca["longitud"]))
                    except Exception as e:  # el servicio no responde: se conserva el último pronóstico
                        errores.append(f"{finca.get('nombre')}: {e}")

        for id_finca, dias in dias_por_finca.items():
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
