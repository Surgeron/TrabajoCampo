"""Conexión con Firebase y repositorio compartido por todas las rutas."""
from functools import lru_cache

import firebase_admin
from firebase_admin import credentials, firestore

from . import config
from .repositories.cache_repo import RepositorioConCache
from .repositories.firestore_repo import RepositorioFirestore


@lru_cache
def app_firebase():
    if firebase_admin._apps:
        return firebase_admin.get_app()
    return firebase_admin.initialize_app(credentials.Certificate(config.FIREBASE_KEY_PATH))


@lru_cache
def repositorio() -> RepositorioConCache:
    app_firebase()
    return RepositorioConCache(RepositorioFirestore(firestore.client()), config.CACHE_TTL_SEGUNDOS)


def get_repo():
    return repositorio()
