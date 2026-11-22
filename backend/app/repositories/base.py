"""Contrato del repositorio: cada colección de Firestore es una entidad del DER.

Los documentos se devuelven como dict con su id en la clave "id".
`listar` solo filtra por igualdad para no exigir índices compuestos en Firestore;
los rangos y órdenes se resuelven en la capa de servicios.
"""
from typing import Protocol


class Repositorio(Protocol):
    def obtener(self, coleccion: str, id_doc: str) -> dict | None: ...

    def listar(self, coleccion: str, **igual) -> list[dict]: ...

    def agregar(self, coleccion: str, datos: dict, id_doc: str | None = None) -> str: ...

    def guardar(self, coleccion: str, id_doc: str, datos: dict, combinar: bool = False) -> None: ...

    def actualizar(self, coleccion: str, id_doc: str, datos: dict) -> None: ...
