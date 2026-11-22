"""Configuración por variables de entorno (las mismas que usaba la v1, más las nuevas)."""
import os


def _lista(valor: str | None) -> list[str]:
    return [v.strip() for v in (valor or "").split(",") if v.strip()]


FIREBASE_KEY_PATH = os.getenv("FIREBASE_KEY_PATH", "serviceAccountKey.json")

ORIGENES_CORS = ["http://localhost:5173", "http://127.0.0.1:5173"] + _lista(os.getenv("ALLOWED_ORIGIN"))

# Pronóstico automático cada hora (CU11). Poné PRONOSTICO_AUTOMATICO=0 para apagarlo.
PRONOSTICO_AUTOMATICO = os.getenv("PRONOSTICO_AUTOMATICO", "1") != "0"

# Tiempo de vida de la caché de lecturas de Firestore, en segundos. Las escrituras del back end
# la invalidan al instante; el tiempo solo cubre cambios hechos por fuera (script de carga, consola).
CACHE_TTL_SEGUNDOS = int(os.getenv("CACHE_TTL_SEGUNDOS", "1800"))
