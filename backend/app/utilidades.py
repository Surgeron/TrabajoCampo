"""Utilidades de fechas, números y textos. Equivalen a src/utils/fechas.js y formato.js."""
import math
import random
import re
import string
import time
import unicodedata
from datetime import datetime, timedelta

from .config import ZONA_HORARIA

# ---------------------------------------------------------------------------
# Fechas (texto local sin zona, igual que el prototipo)
# ---------------------------------------------------------------------------


def ahora():
    return datetime.now(ZONA_HORARIA).replace(tzinfo=None, microsecond=0)


def fecha_hora_iso(momento=None):
    return (momento or ahora()).strftime("%Y-%m-%dT%H:%M:%S")


def fecha_iso(momento=None):
    return (momento or ahora()).strftime("%Y-%m-%d")


def leer_fecha_hora(texto):
    return datetime.strptime(texto[:19], "%Y-%m-%dT%H:%M:%S")


def sumar_dias(fecha, dias):
    return (datetime.strptime(fecha[:10], "%Y-%m-%d") + timedelta(days=dias)).strftime("%Y-%m-%d")


# ---------------------------------------------------------------------------
# Números con la semántica de Number() de JavaScript
# ---------------------------------------------------------------------------


def a_numero(valor):
    """Number(valor) de JS: None→0, ""→0, texto inválido→NaN."""
    if isinstance(valor, bool):
        return 1.0 if valor else 0.0
    if valor is None:
        return 0.0
    if isinstance(valor, (int, float)):
        return float(valor)
    texto = str(valor).strip()
    if texto == "":
        return 0.0
    try:
        return float(texto)
    except ValueError:
        return math.nan


def es_entero(valor):
    return isinstance(valor, (int, float)) and not isinstance(valor, bool) and math.isfinite(valor) and float(valor).is_integer()


def numero_limpio(valor):
    """Entero si no tiene decimales (para que Firestore guarde 14500 y no 14500.0)."""
    numero = a_numero(valor)
    if not math.isfinite(numero):
        return 0
    return int(numero) if numero.is_integer() else round(numero, 2)


def solo_digitos(valor=""):
    return re.sub(r"\D", "", str(valor or ""))


# ---------------------------------------------------------------------------
# Textos
# ---------------------------------------------------------------------------


def vacio(valor):
    return valor is None or str(valor).strip() == ""


def normalizar(texto=""):
    sin_tildes = "".join(c for c in unicodedata.normalize("NFD", str(texto or "")) if not unicodedata.combining(c))
    return sin_tildes.lower().strip()


def format_numero_comanda(numero):
    return f"N° {str(numero).zfill(4)}"


def format_comprobante(factura):
    if not factura:
        return "—"
    pv = str(int(a_numero(factura.get("puntoVenta")))).zfill(4)
    numero = str(int(a_numero(factura.get("numero")))).zfill(8)
    return f"{factura.get('tipoComprobante')} {pv}-{numero}"


def format_cuit(valor):
    d = solo_digitos(valor)
    if len(d) != 11:
        return valor
    return f"{d[:2]}-{d[2:10]}-{d[10:]}"


_BASE36 = string.digits + string.ascii_lowercase


def _base36(numero):
    if numero == 0:
        return "0"
    salida = ""
    while numero:
        numero, resto = divmod(numero, 36)
        salida = _BASE36[resto] + salida
    return salida


def generar_id(prefijo):
    """Mismo formato que generarId() del frontend: prefijo-<tiempo base36><6 al azar>."""
    aleatorio = "".join(random.choices(_BASE36, k=6))
    return f"{prefijo}-{_base36(int(time.time() * 1000))}{aleatorio}"
