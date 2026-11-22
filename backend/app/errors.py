"""Excepciones de negocio. El back end las traduce a respuestas HTTP en main.py."""


class ErrorNegocio(Exception):
    status = 400

    def __init__(self, mensaje: str, datos: dict | None = None):
        super().__init__(mensaje)
        self.mensaje = mensaje
        self.datos = datos or {}


class Validacion(ErrorNegocio):
    status = 422


class NoEncontrado(ErrorNegocio):
    status = 404


class Conflicto(ErrorNegocio):
    status = 409


class NoAutorizado(ErrorNegocio):
    status = 401


class Prohibido(ErrorNegocio):
    status = 403


class ServicioExterno(ErrorNegocio):
    status = 502
