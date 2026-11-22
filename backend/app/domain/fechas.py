"""Fechas y horas en hora de Argentina (UTC-3, sin horario de verano).

Se usa un huso fijo para no depender del paquete tzdata (Windows no trae la base
de husos horarios). Las fechas se guardan como texto 'AAAA-MM-DD' y las fechas
con hora como ISO 8601 con desplazamiento '-03:00', así se ordenan bien como texto.
"""
from datetime import date, datetime, timedelta, timezone

TZ = timezone(timedelta(hours=-3), "ART")


def ahora() -> datetime:
    return datetime.now(TZ).replace(microsecond=0)


def hoy() -> date:
    return ahora().date()


def a_iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=TZ)
    return dt.astimezone(TZ).replace(microsecond=0).isoformat()


def de_iso(texto: str) -> datetime:
    dt = datetime.fromisoformat(texto)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=TZ)
    return dt.astimezone(TZ)


def fecha_txt(d: date) -> str:
    return d.isoformat()


def de_fecha(texto: str) -> date:
    return date.fromisoformat(texto[:10])


def horas_entre(inicio: datetime, fin: datetime) -> float:
    return (fin - inicio).total_seconds() / 3600.0


def dias_rango(desde: date, hasta: date):
    d = desde
    while d <= hasta:
        yield d
        d += timedelta(days=1)


def fecha_corta(d) -> str:
    if isinstance(d, str):
        d = de_fecha(d)
    return d.strftime("%d/%m")
