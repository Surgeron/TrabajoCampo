"""Repositorio sobre Cloud Firestore (firebase-admin)."""
from google.cloud.firestore_v1.base_query import FieldFilter


class RepositorioFirestore:
    def __init__(self, db):
        self.db = db

    def obtener(self, coleccion, id_doc):
        snap = self.db.collection(coleccion).document(id_doc).get()
        return {**snap.to_dict(), "id": snap.id} if snap.exists else None

    def listar(self, coleccion, **igual):
        consulta = self.db.collection(coleccion)
        for campo, valor in igual.items():
            consulta = consulta.where(filter=FieldFilter(campo, "==", valor))
        return [{**d.to_dict(), "id": d.id} for d in consulta.stream()]

    def agregar(self, coleccion, datos, id_doc=None):
        limpio = {k: v for k, v in datos.items() if k != "id"}
        if id_doc:
            self.db.collection(coleccion).document(id_doc).set(limpio)
            return id_doc
        _, ref = self.db.collection(coleccion).add(limpio)
        return ref.id

    def guardar(self, coleccion, id_doc, datos, combinar=False):
        limpio = {k: v for k, v in datos.items() if k != "id"}
        self.db.collection(coleccion).document(id_doc).set(limpio, merge=combinar)

    def actualizar(self, coleccion, id_doc, datos):
        limpio = {k: v for k, v in datos.items() if k != "id"}
        self.db.collection(coleccion).document(id_doc).update(limpio)
