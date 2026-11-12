"""Errores de negocio. Mismo formato que ApiError del frontend: código, mensaje y detalles."""

ESTADOS_HTTP = {
    "SESION": 401,
    "CREDENCIALES": 401,
    "PERMISO": 403,
    "INACTIVO": 403,
    "NO_ENCONTRADO": 404,
    "BLOQUEADO": 429,
    "FACTURA_DUPLICADA": 409,
    "NO_CUBIERTO": 409,
    "EN_USO": 409,
    "ULTIMO_ADMIN": 409,
}


class ApiError(Exception):
    def __init__(self, codigo, mensaje, detalles=None):
        super().__init__(mensaje)
        self.codigo = codigo
        self.mensaje = mensaje
        self.detalles = detalles

    @property
    def estado_http(self):
        return ESTADOS_HTTP.get(self.codigo, 400)

    def a_json(self):
        return {"codigo": self.codigo, "mensaje": self.mensaje, "detalles": self.detalles}
