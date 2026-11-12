"""Configuración: credenciales de Firebase, cliente de Firestore y zona horaria."""
import json
import os
from datetime import timedelta, timezone
from functools import lru_cache

import firebase_admin
from firebase_admin import credentials, firestore

DIRECTORIO_BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Argentina no tiene horario de verano: UTC-3 todo el año.
# Las fechas se guardan como texto local "AAAA-MM-DDTHH:mm:ss", igual que en el prototipo.
ZONA_HORARIA = timezone(timedelta(hours=-3))


def _credenciales():
    """FIREBASE_CREDENTIALS (JSON en una variable, útil en Render) o el archivo serviceAccountKey.json."""
    contenido = os.getenv("FIREBASE_CREDENTIALS")
    if contenido:
        return credentials.Certificate(json.loads(contenido))
    ruta = os.getenv("FIREBASE_KEY_PATH", os.path.join(DIRECTORIO_BACKEND, "serviceAccountKey.json"))
    return credentials.Certificate(ruta)


@lru_cache(maxsize=1)
def app_firebase():
    if firebase_admin._apps:
        return firebase_admin.get_app()
    return firebase_admin.initialize_app(_credenciales())


def db():
    app_firebase()
    return firestore.client()


def origenes_permitidos():
    origenes = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:4173"]
    extra = os.getenv("ALLOWED_ORIGIN", "")
    origenes.extend(o.strip() for o in extra.split(",") if o.strip())
    return origenes
