"""Validación de los datos de entrada (Pydantic). Las reglas de negocio están en los servicios."""
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from .domain.constantes import CAUSAS_PARADA, CONDICIONES_CARGA, ESTADOS_LOTE, ESTADOS_PISO, ORIGENES_BRIX

EstadoPiso = Literal[ESTADOS_PISO]
OrigenBrix = Literal[ORIGENES_BRIX]
Condicion = Literal[CONDICIONES_CARGA]
Causa = Literal[CAUSAS_PARADA]
EstadoLote = Literal[ESTADOS_LOTE]


class Entrada(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class LoteCambios(Entrada):
    nombre: str | None = Field(None, min_length=1, max_length=80)
    nro_lote: str | None = Field(None, min_length=1, max_length=20)
    tipo_cultivo: Literal["Convencional", "Orgánico"] | None = None
    certificacion: Literal["Orgánico Full", "Orgánico NOP"] | None = None
    area_bruta_ha: float | None = Field(None, gt=0, le=5000)
    area_neta_ha: float | None = Field(None, ge=0, le=5000)
    dist_ingenio_km: float | None = Field(None, ge=0, le=100)
    drenaje: Literal["bien", "medio", "imperfecto"] | None = None
    id_pluviometro: str | None = Field(None, max_length=20)
    variedad: str | None = Field(None, max_length=60)
    anio_plantacion: int | None = Field(None, ge=1950, le=2100)
    cantidad_cortes: int | None = Field(None, ge=0, le=30)
    estado_lote: EstadoLote | None = None
    observaciones: str | None = Field(None, max_length=500)


class LecturaEntrada(Entrada):
    id_pluviometro: str = Field(min_length=1, max_length=20)
    fecha: date
    mm: float = Field(ge=0, le=500)


class LecturaCorreccion(Entrada):
    mm: float = Field(ge=0, le=500)


class EstadoPisoEntrada(Entrada):
    id_unico: str = Field(min_length=1, max_length=20)
    estado: EstadoPiso
    observacion: str | None = Field(None, max_length=300)


class BrixEntrada(Entrada):
    id_unico: str = Field(min_length=1, max_length=20)
    fecha: date
    valor_brix: float = Field(gt=0, le=30)
    origen: OrigenBrix


class CosechaEntrada(Entrada):
    id_unico: str = Field(min_length=1, max_length=20)
    fecha: date
    toneladas: float | None = Field(None, gt=0, le=100000)
    lote_terminado: bool = False


class PronosticoManual(Entrada):
    id_finca: str = Field(min_length=1, max_length=10)
    fecha: date
    prob_lluvia_pct: float = Field(ge=0, le=100)
    mm_previstos: float = Field(ge=0, le=500)


class ReservaEntrada(Entrada):
    en_reserva: bool


class LluviaSupuesta(Entrada):
    id_finca: str = Field(min_length=1, max_length=10)
    mm: float = Field(gt=0, le=500)


class SimulacionEntrada(Entrada):
    lluvias: list[LluviaSupuesta] = Field(default_factory=list, max_length=5)
    pedido_organico: bool = False


class PatioEntrada(Entrada):
    cantidad_carros: int = Field(ge=0, le=1000)
    condicion: Condicion


class ParadaEntrada(Entrada):
    fecha_hora_inicio: datetime
    fecha_hora_fin: datetime | None = None
    causa: Causa
    observacion: str | None = Field(None, max_length=500)


class ParadaCierre(Entrada):
    fecha_hora_fin: datetime
