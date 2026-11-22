"""Caché en memoria sobre el repositorio de Firestore.

Todas las escrituras pasan por este back end, así que al escribir en una colección
se invalida su caché y las lecturas siguientes ven el dato nuevo. El tiempo de vida
(por defecto 30 minutos) cubre cambios hechos por fuera, como el script de carga.
Reduce mucho las lecturas de Firestore (el plan gratuito permite 50.000 por día).
"""
import copy
import threading
import time


class RepositorioConCache:
    def __init__(self, base, ttl_segundos: int = 300):
        self.base = base
        self.ttl = ttl_segundos
        self._cache: dict[tuple, tuple[float, list]] = {}
        self._lock = threading.Lock()

    def _clave(self, coleccion, igual):
        return (coleccion, tuple(sorted(igual.items())))

    def _invalidar(self, coleccion):
        with self._lock:
            for clave in [c for c in self._cache if c[0] == coleccion]:
                del self._cache[clave]

    def obtener(self, coleccion, id_doc):
        return self.base.obtener(coleccion, id_doc)

    def listar(self, coleccion, **igual):
        clave = self._clave(coleccion, igual)
        with self._lock:
            hit = self._cache.get(clave)
            if hit and time.monotonic() - hit[0] < self.ttl:
                return copy.deepcopy(hit[1])
        datos = self.base.listar(coleccion, **igual)
        with self._lock:
            self._cache[clave] = (time.monotonic(), datos)
        return copy.deepcopy(datos)

    def agregar(self, coleccion, datos, id_doc=None):
        try:
            return self.base.agregar(coleccion, datos, id_doc)
        finally:
            self._invalidar(coleccion)

    def guardar(self, coleccion, id_doc, datos, combinar=False):
        try:
            self.base.guardar(coleccion, id_doc, datos, combinar)
        finally:
            self._invalidar(coleccion)

    def actualizar(self, coleccion, id_doc, datos):
        try:
            self.base.actualizar(coleccion, id_doc, datos)
        finally:
            self._invalidar(coleccion)

    def limpiar(self):
        with self._lock:
            self._cache.clear()
