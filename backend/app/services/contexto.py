"""Carga y arma los datos que usan los casos de uso en una consulta.

Junta cada lote con su registro de campaña, su último Brix, su estado de piso,
su cosecha y su riesgo (CU12). Todo se calcula en el momento y no se guarda.
"""
from collections import defaultdict
from datetime import datetime
from functools import cached_property

from ..domain import fechas, parametros, riesgo, zonas
from ..domain.constantes import (
    COL_ALERTAS,
    COL_BRIX,
    COL_CAMPANIAS,
    COL_COSECHAS,
    COL_ESTADOS_PISO,
    COL_FINCAS,
    COL_LECTURAS,
    COL_LOTES,
    COL_LOTES_CAMPANIA,
    COL_PARAMETROS,
    COL_PLUVIOMETROS,
    COL_PRONOSTICOS,
    ESTADO_PRODUCCION,
    HABILITADO,
    INHABILITADO,
)
from ..errors import ErrorNegocio


class Contexto:
    def __init__(self, repo, ahora: datetime | None = None):
        self.repo = repo
        self.ahora = ahora or fechas.ahora()
        self.hoy = self.ahora.date()

    # ---------- catálogos ----------
    @cached_property
    def campania(self) -> dict:
        activas = [c for c in self.repo.listar(COL_CAMPANIAS) if c.get("activa")]
        if not activas:
            raise ErrorNegocio("No hay una campaña activa. Ejecutá el script de carga inicial.")
        return sorted(activas, key=lambda c: c.get("anio") or 0)[-1]

    @cached_property
    def registros_parametros(self) -> list[dict]:
        return self.repo.listar(COL_PARAMETROS, id_campania=self.campania["id"])

    @cached_property
    def params(self) -> dict:
        return parametros.combinar(self.registros_parametros)

    @cached_property
    def fincas(self) -> dict:
        return {f["id"]: f for f in self.repo.listar(COL_FINCAS)}

    @cached_property
    def pluviometros(self) -> dict:
        return {p["id"]: p for p in self.repo.listar(COL_PLUVIOMETROS)}

    # ---------- registros ----------
    @cached_property
    def lecturas_por_pluviometro(self) -> dict:
        grupos = defaultdict(list)
        for l in self.repo.listar(COL_LECTURAS):
            grupos[l["id_pluviometro"]].append(l)
        return grupos

    @cached_property
    def pronosticos_por_finca(self) -> dict:
        grupos = defaultdict(list)
        for p in self.repo.listar(COL_PRONOSTICOS):
            grupos[p["id_finca"]].append(p)
        return grupos

    @cached_property
    def estados_por_lote(self) -> dict:
        grupos = defaultdict(list)
        for e in self.repo.listar(COL_ESTADOS_PISO):
            grupos[e["id_unico"]].append(e)
        for lista in grupos.values():
            lista.sort(key=lambda e: e["fecha_hora_desde"])
        return grupos

    @cached_property
    def brix_por_lote_campania(self) -> dict:
        grupos = defaultdict(list)
        for b in self.repo.listar(COL_BRIX):
            grupos[b["id_lote_campania"]].append(b)
        for lista in grupos.values():
            lista.sort(key=lambda b: (b["fecha"], b.get("fecha_hora_carga") or ""))
        return grupos

    @cached_property
    def cosechas_por_lote_campania(self) -> dict:
        grupos = defaultdict(list)
        for c in self.repo.listar(COL_COSECHAS):
            grupos[c["id_lote_campania"]].append(c)
        for lista in grupos.values():
            lista.sort(key=lambda c: (c["fecha"], c.get("fecha_hora_carga") or ""))
        return grupos

    @cached_property
    def alertas(self) -> list[dict]:
        return sorted(self.repo.listar(COL_ALERTAS), key=lambda a: a["fecha_hora"], reverse=True)

    # ---------- lotes enriquecidos ----------
    @cached_property
    def lotes_campania_por_lote(self) -> dict:
        return {lc["id_unico"]: lc for lc in self.repo.listar(COL_LOTES_CAMPANIA, id_campania=self.campania["id"])}

    @cached_property
    def lotes(self) -> list[dict]:
        salida = []
        for base in self.repo.listar(COL_LOTES):
            salida.append(self.enriquecer(base))
        salida.sort(key=lambda l: (l.get("finca") or "", l.get("nombre") or ""))
        return salida

    @cached_property
    def lotes_por_id(self) -> dict:
        return {l["id_unico"]: l for l in self.lotes}

    def lote(self, id_unico: str) -> dict:
        from ..errors import NoEncontrado

        l = self.lotes_por_id.get(id_unico)
        if not l:
            raise NoEncontrado(f"No existe el lote {id_unico}.")
        return l

    def enriquecer(self, base: dict) -> dict:
        p = self.params
        id_unico = base.get("id_unico") or base["id"]
        finca = self.fincas.get(base.get("id_finca"), {})
        lc = self.lotes_campania_por_lote.get(id_unico, {})
        zona = zonas.calcular_zona(base.get("dist_ingenio_km"), p)
        lote = {
            **base,
            "id_unico": id_unico,
            "finca": finca.get("nombre"),
            "zona": zona,
            "madurez": zonas.madurez(zona),
            "id_lote_campania": lc.get("id"),
            "variedad": lc.get("variedad"),
            "anio_plantacion": lc.get("anio_plantacion"),
            "estado_lote": lc.get("estado_lote"),
            "cantidad_cortes": lc.get("cantidad_cortes"),
            "en_reserva": bool(lc.get("en_reserva")),
            "fecha_reserva": lc.get("fecha_reserva"),
            "observaciones": lc.get("observaciones"),
        }
        pluv = self.pluviometros.get(base.get("id_pluviometro"))
        lote["pluviometro"] = pluv.get("nombre") if pluv else None

        # Brix: la última medición de la campaña
        mediciones = self.brix_por_lote_campania.get(lc.get("id"), [])
        ultima = mediciones[-1] if mediciones else None
        lote["brix"] = float(ultima["valor_brix"]) if ultima else None
        lote["fecha_brix"] = ultima["fecha"] if ultima else None
        lote["origen_brix"] = ultima.get("origen") if ultima else None

        # Estado de piso: el último registro (sin registros se toma como Habilitado)
        estados = self.estados_por_lote.get(id_unico, [])
        ultimo = estados[-1] if estados else None
        lote["estado_piso"] = ultimo["estado"] if ultimo else HABILITADO
        lote["estado_piso_desde"] = ultimo["fecha_hora_desde"] if ultimo else None
        lote["observacion_piso"] = ultimo.get("observacion") if ultimo else None

        # Cosecha
        cosechas = self.cosechas_por_lote_campania.get(lc.get("id"), [])
        lote["terminado"] = any(c.get("lote_terminado") for c in cosechas)
        lote["en_cosecha"] = bool(cosechas) and not lote["terminado"]
        lote["fecha_ultima_cosecha"] = cosechas[-1]["fecha"] if cosechas else None
        lote["toneladas_cosechadas"] = round(sum(float(c.get("toneladas") or 0) for c in cosechas), 1)
        lote["fecha_terminado"] = next((c["fecha"] for c in cosechas if c.get("lote_terminado")), None)

        lote["datos_incompletos"] = lote["estado_lote"] == ESTADO_PRODUCCION and not base.get("drenaje")

        # Riesgo (CU12): lotes en producción, no terminados ni inhabilitados
        if lote["estado_lote"] == ESTADO_PRODUCCION and not lote["terminado"] and lote["estado_piso"] != INHABILITADO:
            lote["riesgo"] = self.riesgo_de(lote)
        else:
            lote["riesgo"] = None
        return lote

    def riesgo_de(self, lote: dict, pronostico_forzado=None, mm_extra: float = 0.0) -> dict:
        p = self.params
        lecturas = self.lecturas_por_pluviometro.get(lote.get("id_pluviometro"), [])
        acum = riesgo.lluvia_acumulada(lecturas, self.hoy, p["ventana_lluvia_dias"]) + mm_extra
        if pronostico_forzado is not None:
            pron = pronostico_forzado
        else:
            pron = riesgo.pronostico_relevante(
                self.pronosticos_por_finca.get(lote.get("id_finca"), []), self.hoy, p["horizonte_pronostico_dias"]
            )
        periodos = riesgo.periodos_sin_piso(self.estados_por_lote.get(lote["id_unico"], []), self.ahora)
        return riesgo.evaluar(lote, pron, round(acum, 1), periodos, p)

    # ---------- utilidades ----------
    def alertas_lluvia_vigentes(self) -> list[dict]:
        """Alertas de lluvia con fecha prevista de hoy en adelante y probabilidad >= umbral."""
        umbral = float(self.params["prob_lluvia_alerta"])
        hoy = fechas.fecha_txt(self.hoy)
        return [
            a
            for a in self.alertas
            if a.get("tipo") == "Lluvia"
            and (a.get("fecha_prevista") or "") >= hoy
            and float(a.get("prob_lluvia_pct") or 0) >= umbral
        ]
