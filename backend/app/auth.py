"""CU01 – Iniciar sesión: verificación del token de Firebase Auth y acceso por rol.

El front end inicia sesión con Firebase Auth y manda el ID token en el
encabezado Authorization: Bearer <token>. El rol sale de la colección usuarios.
"""
import time

from fastapi import Depends, Header
from firebase_admin import auth as firebase_auth

from .deps import app_firebase, get_repo
from .domain.constantes import COL_USUARIOS, NOMBRE_ROL
from .errors import NoAutorizado, Prohibido

_cache_usuarios: dict[str, tuple[float, dict | None]] = {}
TTL_USUARIO = 120


def _buscar_usuario(repo, uid: str):
    hit = _cache_usuarios.get(uid)
    if hit and time.monotonic() - hit[0] < TTL_USUARIO:
        return hit[1]
    doc = repo.obtener(COL_USUARIOS, uid)
    _cache_usuarios[uid] = (time.monotonic(), doc)
    return doc


def usuario_actual(authorization: str | None = Header(default=None), repo=Depends(get_repo)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise NoAutorizado("Iniciá sesión para continuar.")
    token = authorization.split(" ", 1)[1].strip()
    try:
        datos = firebase_auth.verify_id_token(token, app=app_firebase())
    except Exception:
        raise NoAutorizado("La sesión venció o no es válida. Volvé a iniciar sesión.")
    doc = _buscar_usuario(repo, datos["uid"])
    if not doc or doc.get("rol") not in NOMBRE_ROL:
        raise Prohibido("Tu usuario no tiene un rol asignado en el sistema. Pedí el alta al equipo.")
    if not doc.get("activo", True):
        raise Prohibido("Tu usuario está desactivado.")
    return {**doc, "uid": datos["uid"], "email": doc.get("email") or datos.get("email")}


def requiere(*roles: str):
    def dependencia(usuario: dict = Depends(usuario_actual)) -> dict:
        if usuario["rol"] not in roles:
            raise Prohibido("Tu rol no tiene acceso a esta función.")
        return usuario

    return dependencia


TODOS = ("tecnico", "jefe_lote", "bascula", "fabrica")
