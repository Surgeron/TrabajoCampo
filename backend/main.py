from __future__ import annotations

import copy
import json
import math
import urllib.request
from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ==============================================================================
# PLUVIAZAFRA BACKEND API — MODELO BCE + DATASHEETS JSON (SIN SQL, SIN FIREBASE)
# Ingenio La Esperanza — Alineado con docs/ y src/services/gestores.js
# ==============================================================================

BASE_DIR = Path(__file__).resolve().parent
SEED_PATH = BASE_DIR / "seed" / "pluviazafra_datasheets.json"
RUNTIME_PATH = BASE_DIR / "seed" / "pluviazafra_datasheets_runtime.json"

ROLES_VALIDOS = {"ADMINISTRADOR", "JEFE_COSECHA", "OPERADOR_CAMPO", "SUPERVISOR_FABRICA"}
ESTADOS_LOTE_VALIDOS = {"PENDIENTE", "ANEGADO", "EN_COSECHA", "COSECHADO", "EN_DESCANSO"}
CAUSAS_PARADA_VALIDAS = {
    "LLUVIA",
    "FALTA_CANA_EN_PATIO",
    "AVERIA_EQUIPOS",
    "MANTENIMIENTO_PROGRAMADO",
    "OTRA",
}

app = FastAPI(
    title="PluviaZafra API (Datasheets JSON)",
    version="2.0.0",
    description="API de dominio PluviaZafra basada en el modelado UML BCE y datasheets JSON sin SQL/Firebase.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------------------
# Almacenamiento en Datasheets JSON (Memoria + Archivo)
# ------------------------------------------------------------------------------
def _round_half_up(valor: float, decimales: int = 1) -> float:
    fmt = Decimal(10) ** -decimales
    return float(Decimal(str(valor)).quantize(fmt, rounding=ROUND_HALF_UP))


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _now_iso() -> str:
    return _now_utc().isoformat().replace("+00:00", "Z")


def _parse_iso(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    txt = str(value).strip()
    if txt.endswith("Z"):
        txt = txt[:-1] + "+00:00"
    dt = datetime.fromisoformat(txt)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _cargar_seed() -> dict[str, Any]:
    if not SEED_PATH.exists():
        raise RuntimeError(f"No se encontró el datasheet inicial en {SEED_PATH}")
    with SEED_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def _cargar_datasheets() -> dict[str, Any]:
    fuente = RUNTIME_PATH if RUNTIME_PATH.exists() else SEED_PATH
    with fuente.open("r", encoding="utf-8") as f:
        return json.load(f)


def _guardar_datasheets(ds: dict[str, Any]) -> None:
    ds.setdefault("metadata", {})["actualizadoEn"] = _now_iso()
    RUNTIME_PATH.parent.mkdir(parents=True, exist_ok=True)
    with RUNTIME_PATH.open("w", encoding="utf-8") as f:
        json.dump(ds, f, ensure_ascii=False, indent=2)


# ------------------------------------------------------------------------------
# Helpers de Dominio y Fórmulas Matemáticas (Compendio Parte 4)
# ------------------------------------------------------------------------------
def _config_vigente(ds: dict[str, Any]) -> dict[str, Any]:
    cfgs = ds.get("configuraciones", [])
    if not cfgs:
        cfgs = _cargar_seed().get("configuraciones", [])
    return max(cfgs, key=lambda c: int(c.get("version", 1)))


def _atributos_vigentes(ds: dict[str, Any], lote_codigo: str) -> Optional[dict[str, Any]]:
    del_lote = [a for a in ds.get("atributosVulnerabilidad", []) if a.get("loteCodigo") == lote_codigo]
    if not del_lote:
        return None
    del_lote.sort(key=lambda a: _parse_iso(a.get("fechaHora")) or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    return del_lote[0]


def _lote_completo(attrs: Optional[dict[str, Any]]) -> bool:
    return bool(attrs and attrs.get("suelo") and attrs.get("drenaje") and attrs.get("camino"))


def _contar_anegamientos(ds: dict[str, Any], lote_codigo: str, inicio_zafra: str) -> tuple[int, int]:
    eventos = [a for a in ds.get("anegamientos", []) if a.get("loteCodigo") == lote_codigo]
    totales = len(eventos)
    fecha_zafra = _parse_iso(f"{inicio_zafra}T00:00:00Z")
    en_zafra = 0
    for ev in eventos:
        f_ini = _parse_iso(ev.get("fechaInicio"))
        if f_ini and fecha_zafra and f_ini >= fecha_zafra:
            en_zafra += 1
    return totales, en_zafra


def _calcular_indice_lote(ds: dict[str, Any], lote_codigo: str, cfg: dict[str, Any]) -> Optional[float]:
    vig = _atributos_vigentes(ds, lote_codigo)
    if not _lote_completo(vig):
        return None

    ps = float(cfg.get("puntajesSuelo", {}).get(vig["suelo"], 0))
    pd = float(cfg.get("puntajesDrenaje", {}).get(vig["drenaje"], 0))
    pc = float(cfg.get("puntajesCamino", {}).get(vig["camino"], 0))

    ev_tot, ev_zafra = _contar_anegamientos(ds, lote_codigo, cfg.get("inicioZafra", "2026-05-01"))
    ph = min(ev_tot / float(cfg["topeHistorial"]), 1.0) * 100.0
    pz = min(ev_zafra / float(cfg["topeUltimaZafra"]), 1.0) * 100.0

    ws = float(cfg["pesoSuelo"])
    wd = float(cfg["pesoDrenaje"])
    wc = float(cfg["pesoCamino"])
    wh = float(cfg["pesoHistorial"])
    wz = float(cfg["pesoUltimaZafra"])
    suma = ws + wd + wc + wh + wz
    if suma > 0 and abs(suma - 1.0) > 1e-4:
        ws, wd, wc, wh, wz = ws / suma, wd / suma, wc / suma, wh / suma, wz / suma

    indice = ws * ps + wd * pd + wc * pc + wh * ph + wz * pz
    return _round_half_up(indice, 1)


def _categorizar_ivl(indice: Optional[float], cfg: dict[str, Any]) -> Optional[str]:
    if indice is None:
        return None
    if indice < float(cfg["umbralCategoriaMedia"]):
        return "BAJA"
    if indice < float(cfg["umbralCategoriaAlta"]):
        return "MEDIA"
    return "ALTA"


def _acumulado_zona(ds: dict[str, Any], zona_codigo: str, horas: int) -> dict[str, Any]:
    ahora = _now_utc()
    limite_inf = ahora - timedelta(hours=horas)
    en_ventana = []
    for lec in ds.get("lecturas", []):
        if lec.get("zonaCodigo") != zona_codigo:
            continue
        f_lec = _parse_iso(lec.get("fechaHora"))
        if f_lec and limite_inf <= f_lec <= ahora:
            en_ventana.append(lec)
    mm = round(sum(float(x.get("milimetros", 0)) for x in en_ventana), 1)
    return {"mm": mm, "cantidadLecturas": len(en_ventana), "sinLecturas": len(en_ventana) == 0}


def _ultimo_pronostico(ds: dict[str, Any], zona_codigo: str) -> Optional[dict[str, Any]]:
    del_lugar = [p for p in ds.get("pronosticos", []) if p.get("zonaCodigo") == zona_codigo]
    if not del_lugar:
        return None
    del_lugar.sort(
        key=lambda p: _parse_iso(p.get("fechaConsulta")) or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    return del_lugar[0]


def _mm_previstos(pron: Optional[dict[str, Any]]) -> float:
    if not pron:
        return 0.0
    return round(sum(float(d.get("milimetros", 0)) for d in pron.get("dias", [])), 1)


def _asignar_semaforo(puntaje: float, cfg: dict[str, Any]) -> str:
    if puntaje >= float(cfg["umbralSemaforoRojo"]):
        return "ROJO"
    if puntaje >= float(cfg["umbralSemaforoAmarillo"]):
        return "AMARILLO"
    return "VERDE"


def _construir_ranking(
    ds: dict[str, Any],
    es_simulacion: bool = False,
    lluvias_simuladas: Optional[dict[str, dict[str, float]]] = None,
    usuario_id: Optional[str] = None,
) -> dict[str, Any]:
    cfg = _config_vigente(ds)
    lluvia_critica = float(cfg["lluviaCriticaMm"])
    ventana = int(cfg["ventanaLluviaHoras"])
    zonas_map = {z["codigo"]: z for z in ds.get("zonas", [])}

    items: list[dict[str, Any]] = []
    lotes_incompletos: list[dict[str, Any]] = []

    for lote in ds.get("lotes", []):
        if lote.get("estado") != "PENDIENTE":
            continue

        attrs = _atributos_vigentes(ds, lote["codigo"])
        if not _lote_completo(attrs):
            lotes_incompletos.append(
                {
                    "loteCodigo": lote["codigo"],
                    "loteNombre": lote["nombre"],
                    "zonaCodigo": lote["zonaCodigo"],
                    "hectareas": lote["hectareas"],
                    "toneladas": lote["toneladas"],
                    "motivo": "Faltan atributos físicos (suelo, drenaje o camino)",
                }
            )
            continue

        indice = _calcular_indice_lote(ds, lote["codigo"], cfg)
        categoria = _categorizar_ivl(indice, cfg)

        if es_simulacion and lluvias_simuladas and lote["zonaCodigo"] in lluvias_simuladas:
            sim = lluvias_simuladas[lote["zonaCodigo"]]
            lluvia_acum = max(0.0, float(sim.get("lluviaAcumulada", 0)))
            lluvia_prev = max(0.0, float(sim.get("lluviaPrevista", 0)))
            sin_lecturas = False
            pron_desact = False
        else:
            acum_info = _acumulado_zona(ds, lote["zonaCodigo"], ventana)
            pron = _ultimo_pronostico(ds, lote["zonaCodigo"])
            lluvia_acum = float(acum_info["mm"])
            lluvia_prev = _mm_previstos(pron) if pron else 0.0
            sin_lecturas = bool(acum_info["sinLecturas"])
            pron_desact = bool(pron.get("desactualizado")) if pron else True

        factor_exacto = min((lluvia_acum + lluvia_prev) / lluvia_critica, 1.0) if lluvia_critica > 0 else 1.0
        puntaje_riesgo = _round_half_up(float(indice) * factor_exacto, 1)
        factor_lluvia = _round_half_up(factor_exacto, 3)
        semaforo = _asignar_semaforo(puntaje_riesgo, cfg)

        zona = zonas_map.get(lote["zonaCodigo"], {})
        items.append(
            {
                "loteCodigo": lote["codigo"],
                "loteNombre": lote["nombre"],
                "zonaCodigo": lote["zonaCodigo"],
                "zonaNombre": zona.get("nombre", lote["zonaCodigo"]),
                "hectareas": lote["hectareas"],
                "toneladas": lote["toneladas"],
                "indiceVulnerabilidad": indice,
                "categoria": categoria,
                "lluviaAcumulada": round(lluvia_acum, 1),
                "lluviaPrevista": round(lluvia_prev, 1),
                "factorLluvia": factor_lluvia,
                "puntajeRiesgo": puntaje_riesgo,
                "semaforo": semaforo,
                "sinLecturas": sin_lecturas,
                "pronosticoDesactualizado": pron_desact,
                "suelo": attrs.get("suelo"),
                "drenaje": attrs.get("drenaje"),
                "camino": attrs.get("camino"),
            }
        )

    # Ordenamiento oficial: puntajeRiesgo desc -> IVL desc -> toneladas desc
    items.sort(
        key=lambda it: (
            -float(it["puntajeRiesgo"]),
            -float(it["indiceVulnerabilidad"]),
            -float(it["toneladas"]),
        )
    )
    for pos, it in enumerate(items, start=1):
        it["posicion"] = pos

    prefijo = "sim" if es_simulacion else "rnk"
    return {
        "id": f"{prefijo}-{int(_now_utc().timestamp() * 1000)}",
        "fechaHora": _now_iso(),
        "versionConfig": cfg.get("version", 1),
        "esSimulacion": es_simulacion,
        "usuarioId": usuario_id,
        "items": items,
        "lotesIncompletos": lotes_incompletos,
    }


def _duracion_horas(inicio_iso: Optional[str], fin_iso: Optional[str]) -> Optional[float]:
    f_ini = _parse_iso(inicio_iso)
    f_fin = _parse_iso(fin_iso)
    if not f_ini or not f_fin or f_fin < f_ini:
        return None
    return round((f_fin - f_ini).total_seconds() / 3600.0, 2)


# ------------------------------------------------------------------------------
# Modelos Pydantic de Entrada
# ------------------------------------------------------------------------------
class CambioEstadoLoteRequest(BaseModel):
    estado: str
    motivo: Optional[str] = "Cambio operativo vía API"
    usuarioId: Optional[str] = None


class LecturaRequest(BaseModel):
    zonaCodigo: str
    milimetros: float = Field(..., ge=0)
    fechaHora: Optional[str] = None
    usuarioId: Optional[str] = None


class SimularRequest(BaseModel):
    lluviasPorZona: dict[str, dict[str, float]] = Field(default_factory=dict)


class AnegamientoAbrirRequest(BaseModel):
    lotesCodigos: list[str]
    fechaInicio: Optional[str] = None
    observaciones: Optional[str] = ""
    usuarioId: Optional[str] = None


class AnegamientoCerrarRequest(BaseModel):
    fechaFin: Optional[str] = None
    usuarioId: Optional[str] = None


class ParadaAbrirRequest(BaseModel):
    causa: str
    detalle: Optional[str] = ""
    fechaInicio: Optional[str] = None
    toneladasPatio: Optional[float] = Field(default=None, ge=0)
    usuarioId: Optional[str] = None


class ParadaCerrarRequest(BaseModel):
    fechaFin: Optional[str] = None
    usuarioId: Optional[str] = None


# ------------------------------------------------------------------------------
# Endpoints REST
# ------------------------------------------------------------------------------
@app.get("/api/health")
def health() -> dict[str, Any]:
    ds = _cargar_datasheets()
    return {
        "status": "ok",
        "storage": "JSON Datasheets (sin SQL, sin Firebase)",
        "versionEsquema": ds.get("metadata", {}).get("versionEsquema", 1),
        "totalLotes": len(ds.get("lotes", [])),
        "totalZonas": len(ds.get("zonas", [])),
    }


@app.get("/api/datasheets")
def obtener_datasheets() -> dict[str, Any]:
    return _cargar_datasheets()


@app.post("/api/datasheets/reset")
def resetear_datasheets() -> dict[str, Any]:
    seed = _cargar_seed()
    _guardar_datasheets(copy.deepcopy(seed))
    return {"ok": True, "mensaje": "Datasheets restablecidos al seed inicial."}


@app.get("/api/zonas")
def listar_zonas() -> list[dict[str, Any]]:
    ds = _cargar_datasheets()
    cfg = _config_vigente(ds)
    ventana = int(cfg["ventanaLluviaHoras"])
    pluvs = ds.get("pluviometros", [])
    res = []
    for z in ds.get("zonas", []):
        activo = next((p for p in pluvs if p.get("zonaCodigo") == z["codigo"] and p.get("activo")), None)
        acum = _acumulado_zona(ds, z["codigo"], ventana)
        res.append({**z, "pluviometroActivo": activo, "acumulado": acum})
    return res


@app.get("/api/lotes")
def listar_lotes(zona: Optional[str] = None, estado: Optional[str] = None) -> list[dict[str, Any]]:
    ds = _cargar_datasheets()
    cfg = _config_vigente(ds)
    res = []
    for l in ds.get("lotes", []):
        if zona and zona != "TODAS" and l.get("zonaCodigo") != zona:
            continue
        if estado and estado != "TODOS" and l.get("estado") != estado:
            continue
        attrs = _atributos_vigentes(ds, l["codigo"])
        ivl = _calcular_indice_lote(ds, l["codigo"], cfg)
        res.append(
            {
                **l,
                "atributos": attrs,
                "completo": _lote_completo(attrs),
                "indiceVulnerabilidad": ivl,
                "categoria": _categorizar_ivl(ivl, cfg),
            }
        )
    return res


@app.patch("/api/lotes/{codigo}/estado")
def cambiar_estado_lote(codigo: str, body: CambioEstadoLoteRequest) -> dict[str, Any]:
    if body.estado not in ESTADOS_LOTE_VALIDOS:
        raise HTTPException(status_code=400, detail="Estado operativo inválido (RN07).")

    ds = _cargar_datasheets()
    lote = next((l for l in ds.get("lotes", []) if l["codigo"] == codigo), None)
    if not lote:
        raise HTTPException(status_code=404, detail="Lote no encontrado.")

    anterior = lote["estado"]
    lote["estado"] = body.estado
    if body.estado != "PENDIENTE":
        lote["semaforo"] = None

    ds.setdefault("cambiosEstadoLote", []).append(
        {
            "id": f"est-{int(_now_utc().timestamp() * 1000)}",
            "loteCodigo": codigo,
            "estadoAnterior": anterior,
            "estadoNuevo": body.estado,
            "fechaHora": _now_iso(),
            "usuarioId": body.usuarioId,
            "motivo": body.motivo,
        }
    )
    _guardar_datasheets(ds)
    return lote


@app.get("/api/configuracion")
def obtener_configuracion() -> dict[str, Any]:
    ds = _cargar_datasheets()
    return {"vigente": _config_vigente(ds), "historial": ds.get("configuraciones", [])}


@app.post("/api/configuracion")
def guardar_configuracion(nueva: dict[str, Any]) -> dict[str, Any]:
    ds = _cargar_datasheets()
    vigente = _config_vigente(ds)
    pesos = [
        float(nueva.get("pesoSuelo", vigente["pesoSuelo"])),
        float(nueva.get("pesoDrenaje", vigente["pesoDrenaje"])),
        float(nueva.get("pesoCamino", vigente["pesoCamino"])),
        float(nueva.get("pesoHistorial", vigente["pesoHistorial"])),
        float(nueva.get("pesoUltimaZafra", vigente["pesoUltimaZafra"])),
    ]
    if any(p < 0 for p in pesos) or abs(sum(pesos) - 1.0) > 1e-4:
        raise HTTPException(status_code=400, detail="Los pesos deben ser no negativos y sumar 1.0 (RN06).")

    u_cat_m = float(nueva.get("umbralCategoriaMedia", vigente["umbralCategoriaMedia"]))
    u_cat_a = float(nueva.get("umbralCategoriaAlta", vigente["umbralCategoriaAlta"]))
    if u_cat_m <= 0 or u_cat_m >= u_cat_a or u_cat_a > 100:
        raise HTTPException(status_code=400, detail="Umbrales de categoría inválidos.")

    u_sem_a = float(nueva.get("umbralSemaforoAmarillo", vigente["umbralSemaforoAmarillo"]))
    u_sem_r = float(nueva.get("umbralSemaforoRojo", vigente["umbralSemaforoRojo"]))
    if u_sem_a <= 0 or u_sem_a >= u_sem_r or u_sem_r > 100:
        raise HTTPException(status_code=400, detail="Umbrales de semáforo inválidos.")

    lc = float(nueva.get("lluviaCriticaMm", vigente["lluviaCriticaMm"]))
    if lc <= 0:
        raise HTTPException(status_code=400, detail="La lluvia crítica debe ser mayor a 0 mm.")

    registro = {
        **vigente,
        **nueva,
        "version": int(vigente["version"]) + 1,
        "fechaHora": _now_iso(),
    }
    ds.setdefault("configuraciones", []).append(registro)
    _guardar_datasheets(ds)
    return registro


@app.get("/api/lecturas")
def listar_lecturas(zona: Optional[str] = None) -> list[dict[str, Any]]:
    ds = _cargar_datasheets()
    lista = ds.get("lecturas", [])
    if zona and zona != "TODAS":
        lista = [l for l in lista if l.get("zonaCodigo") == zona]
    return sorted(
        lista,
        key=lambda l: _parse_iso(l.get("fechaHora")) or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )


@app.post("/api/lecturas")
def registrar_lectura(body: LecturaRequest) -> dict[str, Any]:
    ds = _cargar_datasheets()
    zona = next((z for z in ds.get("zonas", []) if z["codigo"] == body.zonaCodigo), None)
    if not zona:
        raise HTTPException(status_code=404, detail="Zona no encontrada.")

    pluv = next(
        (p for p in ds.get("pluviometros", []) if p.get("zonaCodigo") == body.zonaCodigo and p.get("activo")),
        None,
    )
    if not pluv:
        raise HTTPException(status_code=400, detail="La zona no posee pluviómetro activo.")

    f_dt = _parse_iso(body.fechaHora) if body.fechaHora else _now_utc()
    if not f_dt or f_dt > _now_utc():
        raise HTTPException(status_code=400, detail="La fecha de la lectura no puede ser futura (CU08).")

    nueva = {
        "id": f"lec-{int(_now_utc().timestamp() * 1000)}",
        "zonaCodigo": body.zonaCodigo,
        "pluviometroCodigo": pluv["codigo"],
        "fechaHora": f_dt.isoformat().replace("+00:00", "Z"),
        "milimetros": float(body.milimetros),
        "usuarioId": body.usuarioId,
    }
    ds.setdefault("lecturas", []).append(nueva)
    _guardar_datasheets(ds)
    cfg = _config_vigente(ds)
    return {"lectura": nueva, "acumulado": _acumulado_zona(ds, body.zonaCodigo, int(cfg["ventanaLluviaHoras"]))}


@app.get("/api/pronosticos/{zona_codigo}")
def consultar_pronostico(zona_codigo: str, forzar: bool = Query(default=False)) -> dict[str, Any]:
    ds = _cargar_datasheets()
    zona = next((z for z in ds.get("zonas", []) if z["codigo"] == zona_codigo), None)
    if not zona:
        raise HTTPException(status_code=404, detail="Zona no encontrada.")

    cfg = _config_vigente(ds)
    horizonte = int(cfg["horizontePronosticoHoras"])
    ultimo = _ultimo_pronostico(ds, zona_codigo)

    # Caché de 30 minutos (CU09 Extensión 3a)
    if not forzar and ultimo and int(ultimo.get("horizonteHoras", 48)) == horizonte:
        f_ult = _parse_iso(ultimo.get("fechaConsulta"))
        if f_ult and (_now_utc() - f_ult).total_seconds() < 1800 and not ultimo.get("desactualizado"):
            return ultimo

    dias_cant = max(1, math.ceil(horizonte / 24))
    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={zona['latitud']}&longitude={zona['longitud']}"
        f"&daily=precipitation_sum&timezone=auto&forecast_days={dias_cant}"
    )

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "PluviaZafra/2.0"})
        with urllib.request.urlopen(req, timeout=6) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        fechas = payload.get("daily", {}).get("time", [])
        precs = payload.get("daily", {}).get("precipitation_sum", [])
        dias = [
            {"fecha": f, "milimetros": round(float(precs[i] or 0), 1)}
            for i, f in enumerate(fechas[:dias_cant])
        ]
        nuevo = {
            "id": f"pro-{zona_codigo}-{int(_now_utc().timestamp() * 1000)}",
            "zonaCodigo": zona_codigo,
            "fechaConsulta": _now_iso(),
            "horizonteHoras": horizonte,
            "desactualizado": False,
            "dias": dias,
        }
        ds.setdefault("pronosticos", []).append(nuevo)
        _guardar_datasheets(ds)
        return nuevo
    except Exception:
        # CU09 Extensión 4a / 4b: fallback desactualizado
        if ultimo:
            return {**ultimo, "desactualizado": True}
        raise HTTPException(status_code=502, detail="No pudo obtenerse pronóstico de Open-Meteo ni respaldo previo.")


@app.get("/api/ranking")
def obtener_ranking() -> dict[str, Any]:
    ds = _cargar_datasheets()
    rankings = ds.get("rankings", [])
    if rankings:
        return rankings[-1]
    ranking = _construir_ranking(ds, es_simulacion=False)
    ds.setdefault("rankings", []).append(ranking)
    for it in ranking["items"]:
        lote = next((l for l in ds["lotes"] if l["codigo"] == it["loteCodigo"]), None)
        if lote:
            lote["semaforo"] = it["semaforo"]
    _guardar_datasheets(ds)
    return ranking


@app.post("/api/ranking/generar")
def generar_ranking(usuario_id: Optional[str] = None) -> dict[str, Any]:
    ds = _cargar_datasheets()
    ranking = _construir_ranking(ds, es_simulacion=False, usuario_id=usuario_id)
    ds.setdefault("rankings", []).append(ranking)
    for it in ranking["items"]:
        lote = next((l for l in ds["lotes"] if l["codigo"] == it["loteCodigo"]), None)
        if lote:
            lote["semaforo"] = it["semaforo"]
    _guardar_datasheets(ds)
    return ranking


@app.post("/api/ranking/simular")
def simular_ranking(body: SimularRequest) -> dict[str, Any]:
    # CU16: Simulación en memoria, nunca persiste en datasheets
    ds = _cargar_datasheets()
    return _construir_ranking(ds, es_simulacion=True, lluvias_simuladas=body.lluviasPorZona)


@app.get("/api/anegamientos")
def listar_anegamientos(abiertos: bool = False) -> list[dict[str, Any]]:
    ds = _cargar_datasheets()
    lista = ds.get("anegamientos", [])
    if abiertos:
        lista = [a for a in lista if not a.get("fechaFin")]
    return sorted(
        lista,
        key=lambda a: _parse_iso(a.get("fechaInicio")) or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )


@app.post("/api/anegamientos")
def abrir_anegamiento(body: AnegamientoAbrirRequest) -> list[dict[str, Any]]:
    if not body.lotesCodigos:
        raise HTTPException(status_code=400, detail="Seleccioná al menos un lote.")

    ds = _cargar_datasheets()
    abiertos_actuales = {a["loteCodigo"] for a in ds.get("anegamientos", []) if not a.get("fechaFin")}
    for cod in body.lotesCodigos:
        if cod in abiertos_actuales:
            raise HTTPException(status_code=400, detail=f"El lote {cod} ya tiene un anegamiento abierto (RN14).")

    f_ini = _parse_iso(body.fechaInicio) if body.fechaInicio else _now_utc()
    if not f_ini or f_ini > _now_utc():
        raise HTTPException(status_code=400, detail="La fecha de inicio no puede ser futura.")

    creados = []
    for i, cod in enumerate(body.lotesCodigos):
        lote = next((l for l in ds.get("lotes", []) if l["codigo"] == cod), None)
        if not lote:
            raise HTTPException(status_code=404, detail=f"Lote {cod} no encontrado.")
        nuevo = {
            "id": f"ang-{int(_now_utc().timestamp() * 1000)}-{i}",
            "loteCodigo": cod,
            "fechaInicio": f_ini.isoformat().replace("+00:00", "Z"),
            "fechaFin": None,
            "observaciones": (body.observaciones or "").strip(),
            "usuarioId": body.usuarioId,
        }
        ds.setdefault("anegamientos", []).append(nuevo)
        creados.append(nuevo)
        lote["estado"] = "ANEGADO"
        lote["semaforo"] = None

    _guardar_datasheets(ds)
    return creados


@app.post("/api/anegamientos/{aneg_id}/cerrar")
def cerrar_anegamiento(aneg_id: str, body: AnegamientoCerrarRequest) -> dict[str, Any]:
    ds = _cargar_datasheets()
    ev = next((a for a in ds.get("anegamientos", []) if a["id"] == aneg_id), None)
    if not ev:
        raise HTTPException(status_code=404, detail="Anegamiento no encontrado.")
    if ev.get("fechaFin"):
        raise HTTPException(status_code=400, detail="El anegamiento ya se encuentra cerrado.")

    f_fin = _parse_iso(body.fechaFin) if body.fechaFin else _now_utc()
    f_ini = _parse_iso(ev["fechaInicio"])
    if not f_fin or (f_ini and f_fin < f_ini):
        raise HTTPException(status_code=400, detail="La fecha de fin no puede ser anterior al inicio (RN15).")

    ev["fechaFin"] = f_fin.isoformat().replace("+00:00", "Z")
    lote = next((l for l in ds.get("lotes", []) if l["codigo"] == ev["loteCodigo"]), None)
    if lote and lote.get("estado") == "ANEGADO":
        lote["estado"] = "PENDIENTE"

    _guardar_datasheets(ds)
    return ev


@app.get("/api/paradas")
def listar_paradas(causa: Optional[str] = None) -> dict[str, Any]:
    ds = _cargar_datasheets()
    paradas = ds.get("paradas", [])
    if causa and causa != "TODAS":
        paradas = [p for p in paradas if p.get("causa") == causa]

    enriquecidas = []
    for p in paradas:
        dur = _duracion_horas(p.get("fechaInicio"), p.get("fechaFin"))
        enriquecidas.append({**p, "duracionHoras": dur})

    enriquecidas.sort(
        key=lambda p: (
            0 if p.get("estado") == "ABIERTA" else 1,
            -(_parse_iso(p.get("fechaInicio")) or datetime.min.replace(tzinfo=timezone.utc)).timestamp(),
        )
    )
    return {"paradas": enriquecidas, "abierta": next((p for p in enriquecidas if p["estado"] == "ABIERTA"), None)}


@app.post("/api/paradas")
def abrir_parada(body: ParadaAbrirRequest) -> dict[str, Any]:
    if body.causa not in CAUSAS_PARADA_VALIDAS:
        raise HTTPException(status_code=400, detail="Causa de parada inválida.")
    detalle = (body.detalle or "").strip()
    if body.causa == "OTRA" and not detalle:
        raise HTTPException(status_code=400, detail="Para la causa OTRA el detalle es obligatorio (RN13).")

    ds = _cargar_datasheets()
    if any(p.get("estado") == "ABIERTA" for p in ds.get("paradas", [])):
        raise HTTPException(status_code=400, detail="Ya existe una parada abierta (RN12).")

    f_ini = _parse_iso(body.fechaInicio) if body.fechaInicio else _now_utc()
    if not f_ini or f_ini > _now_utc():
        raise HTTPException(status_code=400, detail="La fecha de inicio no puede ser futura (RN12).")

    id_num = len(ds.get("paradas", [])) + 1
    nueva = {
        "id": f"PAR-{id_num:02d}",
        "causa": body.causa,
        "detalle": detalle,
        "fechaInicio": f_ini.isoformat().replace("+00:00", "Z"),
        "fechaFin": None,
        "toneladasPatio": body.toneladasPatio,
        "estado": "ABIERTA",
        "abiertaPorId": body.usuarioId,
        "cerradaPorId": None,
        "modificadaPorId": None,
        "fechaModificacion": None,
    }
    ds.setdefault("paradas", []).append(nueva)
    _guardar_datasheets(ds)
    return nueva


@app.post("/api/paradas/{parada_id}/cerrar")
def cerrar_parada(parada_id: str, body: ParadaCerrarRequest) -> dict[str, Any]:
    ds = _cargar_datasheets()
    parada = next((p for p in ds.get("paradas", []) if p["id"] == parada_id), None)
    if not parada:
        raise HTTPException(status_code=404, detail="Parada no encontrada.")
    if parada.get("estado") == "CERRADA":
        raise HTTPException(status_code=400, detail="La parada ya se encuentra cerrada.")

    f_fin = _parse_iso(body.fechaFin) if body.fechaFin else _now_utc()
    f_ini = _parse_iso(parada["fechaInicio"])
    if not f_fin or f_fin > _now_utc() or (f_ini and f_fin < f_ini):
        raise HTTPException(status_code=400, detail="Fecha de cierre inválida respecto al inicio o al futuro (RN12).")

    parada["fechaFin"] = f_fin.isoformat().replace("+00:00", "Z")
    parada["estado"] = "CERRADA"
    parada["cerradaPorId"] = body.usuarioId
    _guardar_datasheets(ds)
    return {**parada, "duracionHoras": _duracion_horas(parada["fechaInicio"], parada["fechaFin"])}
