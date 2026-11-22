"""Zona y madurez del lote según los km al ingenio (CU04)."""
from .constantes import MADUREZ_POR_ZONA


def calcular_zona(dist_km, params: dict):
    """Devuelve 'Cercana', 'Media', 'Lejana' o None si no hay distancia.

    Los límites vienen de Parametro: cercana 1-6, media 7-12, lejana 13-19 km.
    Una distancia con decimales se asigna al rango cuyo máximo no supera.
    Una distancia mayor al máximo de la zona lejana se toma como lejana.
    """
    if dist_km is None or dist_km == "":
        return None
    d = float(dist_km)
    if d < 0:
        return None
    if d <= float(params["zona_cercana_km"][1]):
        return "Cercana"
    if d <= float(params["zona_media_km"][1]):
        return "Media"
    return "Lejana"


def madurez(zona):
    return MADUREZ_POR_ZONA.get(zona) if zona else None
