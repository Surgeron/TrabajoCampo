"""Repositorio en memoria: se usa en las pruebas automáticas."""
import copy
import itertools


class RepositorioMemoria:
    def __init__(self):
        self._datos: dict[str, dict[str, dict]] = {}
        self._contador = itertools.count(1)

    def _col(self, coleccion):
        return self._datos.setdefault(coleccion, {})

    def obtener(self, coleccion, id_doc):
        doc = self._col(coleccion).get(id_doc)
        return {**copy.deepcopy(doc), "id": id_doc} if doc is not None else None

    def listar(self, coleccion, **igual):
        salida = []
        for id_doc, doc in self._col(coleccion).items():
            if all(doc.get(k) == v for k, v in igual.items()):
                salida.append({**copy.deepcopy(doc), "id": id_doc})
        return salida

    def agregar(self, coleccion, datos, id_doc=None):
        id_doc = id_doc or f"{coleccion[:3]}{next(self._contador):06d}"
        self._col(coleccion)[id_doc] = copy.deepcopy({k: v for k, v in datos.items() if k != "id"})
        return id_doc

    def guardar(self, coleccion, id_doc, datos, combinar=False):
        limpio = copy.deepcopy({k: v for k, v in datos.items() if k != "id"})
        if combinar and id_doc in self._col(coleccion):
            self._col(coleccion)[id_doc].update(limpio)
        else:
            self._col(coleccion)[id_doc] = limpio

    def actualizar(self, coleccion, id_doc, datos):
        if id_doc not in self._col(coleccion):
            raise KeyError(f"{coleccion}/{id_doc} no existe")
        self._col(coleccion)[id_doc].update(copy.deepcopy({k: v for k, v in datos.items() if k != "id"}))
