"""Back end del prototipo v2 – Sistema de priorización de cosecha (Ingenio La Esperanza).

FastAPI + Firebase Admin (Firestore y verificación de Firebase Auth).
Ejecutar desde la carpeta backend:  uvicorn main:app --reload
"""
import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import config
from app.errors import ErrorNegocio
from app.routers.api import router as api_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def ciclo_de_vida(app: FastAPI):
    if not os.path.exists(config.FIREBASE_KEY_PATH):
        logging.getLogger("inicio").error(
            "No encontré la credencial de Firebase en %s. Guardala en la carpeta backend como "
            "serviceAccountKey.json o indicá la ruta en FIREBASE_KEY_PATH.", os.path.abspath(config.FIREBASE_KEY_PATH)
        )
    tarea = None
    if config.PRONOSTICO_AUTOMATICO:
        from app.scheduler import ciclo_pronostico

        tarea = asyncio.create_task(ciclo_pronostico())
    yield
    if tarea:
        tarea.cancel()


app = FastAPI(title="Priorización de cosecha – Ingenio La Esperanza", version="2.0.0", lifespan=ciclo_de_vida)
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ORIGENES_CORS,
    allow_methods=["*"],
    allow_headers=["*"],
)

MENSAJES = {
    "missing": "Es obligatorio.",
    "greater_than_equal": "Debe ser mayor o igual a {ge}.",
    "greater_than": "Debe ser mayor a {gt}.",
    "less_than_equal": "Debe ser menor o igual a {le}.",
    "less_than": "Debe ser menor a {lt}.",
    "string_too_short": "Es obligatorio.",
    "string_too_long": "Máximo {max_length} caracteres.",
    "literal_error": "Valor no permitido.",
    "int_parsing": "Debe ser un número entero.",
    "int_from_float": "Debe ser un número entero.",
    "float_parsing": "Debe ser un número.",
    "date_from_datetime_parsing": "Fecha inválida.",
    "date_parsing": "Fecha inválida.",
    "datetime_parsing": "Fecha y hora inválidas.",
    "datetime_from_date_parsing": "Fecha y hora inválidas.",
    "bool_parsing": "Debe ser sí o no.",
    "extra_forbidden": "Campo no permitido.",
    "too_long": "Demasiados elementos.",
}


@app.exception_handler(ErrorNegocio)
async def manejar_error_negocio(_: Request, exc: ErrorNegocio):
    return JSONResponse(status_code=exc.status, content={"detail": exc.mensaje, **exc.datos})


@app.exception_handler(RequestValidationError)
async def manejar_validacion(_: Request, exc: RequestValidationError):
    campos = {}
    for err in exc.errors():
        loc = [str(x) for x in err.get("loc", []) if x not in ("body", "query", "path")]
        plantilla = MENSAJES.get(err.get("type"), "Valor inválido.")
        ctx = {k: (int(v) if isinstance(v, float) and v.is_integer() else v) for k, v in (err.get("ctx") or {}).items()}
        ctx = {k: (str(v).replace(".", ",") if isinstance(v, float) else v) for k, v in ctx.items()}
        try:
            texto = plantilla.format(**ctx)
        except (KeyError, IndexError):
            texto = plantilla
        campos[".".join(loc) or "general"] = texto
    return JSONResponse(status_code=422, content={"detail": "Revisá los datos ingresados.", "campos": campos})


@app.get("/")
def inicio():
    return {"estado": "backend funcionando", "version": "2.0.0"}


app.include_router(api_router)
