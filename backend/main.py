"""Servidor FastAPI para TrazaPlato (Las Vertientes S.R.L. / El Unquillar).

Integra todos los casos de uso (CU-01 a CU-14), sincronización con Cloud Firestore
y canal de eventos en tiempo real (SSE + Firestore onSnapshot).
"""
import asyncio
import json
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from app.config import origenes_permitidos
from app.errores import ApiError
from app.repositorio import repositorio
from app.servicios import (
    agregar_adicion,
    anular_comanda,
    buscar_comandas_servicio,
    cambiar_activo_maestro,
    cerrar_cuenta_corriente,
    cobrar_comandas,
    completar_facturas,
    generar_informe_servicio,
    guardar_maestro,
    importar_trabajadores,
    iniciar_sesion,
    marcar_entregado,
    marcar_listo,
    registrar_comanda,
    registrar_desperdicio,
    registrar_movimiento,
    restablecer_datos,
)

app = FastAPI(
    title="TrazaPlato API",
    description="API de gestión de comandas, convenios mineros, facturación y depósito (Las Vertientes S.R.L.)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origenes_permitidos(),
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ApiError)
async def manejar_error_negocio(_request: Request, exc: ApiError):
    return JSONResponse(status_code=exc.estado_http, content=exc.a_json())


def obtener_sesion(
    x_usuario_id: Optional[str] = Header(default=None),
    x_usuario_rol: Optional[str] = Header(default=None),
    x_sucursal_id: Optional[str] = Header(default=None),
) -> Dict[str, Optional[str]]:
    return {
        "idUsuario": x_usuario_id or None,
        "rol": x_usuario_rol or None,
        "idSucursal": x_sucursal_id or None,
    }


def _con_estado(resultado: Any) -> Dict[str, Any]:
    return {
        "resultado": resultado,
        "datos": repositorio.obtener_datos_publicos(),
    }


# ---------------------------------------------------------------------------
# Esquemas Pydantic de entrada
# ---------------------------------------------------------------------------


class LoginInput(BaseModel):
    nombreUsuario: Optional[str] = ""
    password: Optional[str] = ""


class ComandaInput(BaseModel):
    tipoCliente: Optional[str] = None
    idTrabajador: Optional[str] = None
    mesa: Optional[Any] = None
    cantidades: Dict[str, Any] = Field(default_factory=dict)
    observaciones: Optional[str] = ""
    generarAparte: Optional[bool] = False


class AdicionInput(BaseModel):
    cantidades: Dict[str, Any] = Field(default_factory=dict)
    generarAparte: Optional[bool] = False


class CuentaCorrienteInput(BaseModel):
    firmoControlDiario: Optional[bool] = False


class CobroInput(BaseModel):
    idsComandas: List[str] = Field(default_factory=list)
    pagos: List[Dict[str, Any]] = Field(default_factory=list)
    facturas: List[Dict[str, Any]] = Field(default_factory=list)
    confirmarCompartida: Optional[bool] = False


class CompletarFacturasInput(BaseModel):
    idsComandas: List[str] = Field(default_factory=list)
    facturas: List[Dict[str, Any]] = Field(default_factory=list)
    confirmarCompartida: Optional[bool] = False


class AnularInput(BaseModel):
    motivo: Optional[str] = ""


class MovimientoInput(BaseModel):
    tipo: Optional[str] = None
    turno: Optional[str] = None
    detalle: List[Dict[str, Any]] = Field(default_factory=list)


class DesperdicioInput(BaseModel):
    tipo: Optional[str] = None
    idInsumo: Optional[str] = None
    idProducto: Optional[str] = None
    cantidad: Optional[Any] = None
    idMotivo: Optional[str] = None
    observacion: Optional[str] = ""


class ActivoMaestroInput(BaseModel):
    activo: bool


class ImportarTrabajadoresInput(BaseModel):
    idEmpresa: Optional[str] = None
    filas: List[Dict[str, Any]] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Endpoints de Estado, Salud y Tiempo Real
# ---------------------------------------------------------------------------


@app.get("/")
def inicio():
    repositorio.inicializar()
    return {
        "estado": "backend funcionando",
        "firestoreActivo": repositorio.firestore_activo,
    }


@app.get("/comandas")
def listar_comandas():
    return repositorio.obtener_datos_publicos()["comandas"]


@app.get("/api/datos")
def obtener_todos_los_datos():
    return repositorio.obtener_datos_publicos()


@app.get("/api/eventos")
async def stream_eventos(request: Request):
    """Canal Server-Sent Events (SSE) para sincronización instantánea entre pestañas/clientes."""
    loop = asyncio.get_running_loop()
    par = repositorio.registrar_cliente_sse(loop)
    _, cola = par

    async def generador():
        try:
            yield f"data: {json.dumps({'tipo': 'conectado', 'firestoreActivo': repositorio.firestore_activo})}\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    evento = await asyncio.wait_for(cola.get(), timeout=20.0)
                    yield f"data: {json.dumps(evento)}\n\n"
                except asyncio.TimeoutError:
                    yield ": latido\n\n"
        finally:
            repositorio.desregistrar_cliente_sse(par)

    return StreamingResponse(
        generador(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ---------------------------------------------------------------------------
# CU-01 Autenticación
# ---------------------------------------------------------------------------


@app.post("/api/auth/login")
def endpoint_login(cuerpo: LoginInput):
    usuario = iniciar_sesion(cuerpo.nombreUsuario, cuerpo.password)
    return _con_estado(usuario)


# ---------------------------------------------------------------------------
# CU-03 a CU-09 Comandas, Cocina, Salón, Caja y Facturación
# ---------------------------------------------------------------------------


@app.post("/api/comandas")
def endpoint_registrar_comanda(cuerpo: ComandaInput, sesion: dict = Depends(obtener_sesion)):
    creadas = registrar_comanda(cuerpo.model_dump(), sesion)
    return _con_estado(creadas)


@app.patch("/api/comandas/{id_comanda}/listo")
def endpoint_marcar_listo(id_comanda: str, sesion: dict = Depends(obtener_sesion)):
    comanda = marcar_listo(id_comanda, sesion)
    return _con_estado(comanda)


@app.patch("/api/comandas/{id_comanda}/entregado")
def endpoint_marcar_entregado(id_comanda: str, sesion: dict = Depends(obtener_sesion)):
    comanda = marcar_entregado(id_comanda, sesion)
    return _con_estado(comanda)


@app.post("/api/comandas/{id_comanda}/adiciones")
def endpoint_agregar_adicion(id_comanda: str, cuerpo: AdicionInput, sesion: dict = Depends(obtener_sesion)):
    resultado = agregar_adicion(id_comanda, cuerpo.model_dump(), sesion)
    return _con_estado(resultado)


@app.post("/api/comandas/{id_comanda}/cuenta-corriente")
def endpoint_cerrar_cuenta_corriente(
    id_comanda: str, cuerpo: CuentaCorrienteInput, sesion: dict = Depends(obtener_sesion)
):
    comanda = cerrar_cuenta_corriente(id_comanda, cuerpo.model_dump(), sesion)
    return _con_estado(comanda)


@app.post("/api/cobros")
def endpoint_cobrar_comandas(cuerpo: CobroInput, sesion: dict = Depends(obtener_sesion)):
    resultado = cobrar_comandas(cuerpo.model_dump(), sesion)
    return _con_estado(resultado)


@app.post("/api/facturas/completar")
def endpoint_completar_facturas(cuerpo: CompletarFacturasInput, sesion: dict = Depends(obtener_sesion)):
    comandas = completar_facturas(cuerpo.model_dump(), sesion)
    return _con_estado(comandas)


@app.post("/api/comandas/{id_comanda}/anular")
def endpoint_anular_comanda(id_comanda: str, cuerpo: AnularInput, sesion: dict = Depends(obtener_sesion)):
    comanda = anular_comanda(id_comanda, cuerpo.motivo, sesion)
    return _con_estado(comanda)


# ---------------------------------------------------------------------------
# CU-10 y CU-11 Depósito y Desperdicios
# ---------------------------------------------------------------------------


@app.post("/api/deposito/movimientos")
def endpoint_registrar_movimiento(cuerpo: MovimientoInput, sesion: dict = Depends(obtener_sesion)):
    movimiento = registrar_movimiento(cuerpo.model_dump(), sesion)
    return _con_estado(movimiento)


@app.post("/api/desperdicios")
def endpoint_registrar_desperdicio(cuerpo: DesperdicioInput, sesion: dict = Depends(obtener_sesion)):
    desperdicio = registrar_desperdicio(cuerpo.model_dump(), sesion)
    return _con_estado(desperdicio)


# ---------------------------------------------------------------------------
# CU-12 y CU-13 Informes y Consultas
# ---------------------------------------------------------------------------


@app.post("/api/informes/{id_informe}")
def endpoint_generar_informe(id_informe: str, filtros: Dict[str, Any], sesion: dict = Depends(obtener_sesion)):
    resultado = generar_informe_servicio(id_informe, filtros, sesion)
    return {"resultado": resultado}


@app.post("/api/comandas/buscar")
def endpoint_buscar_comandas(filtros: Dict[str, Any], sesion: dict = Depends(obtener_sesion)):
    ids = buscar_comandas_servicio(filtros, sesion)
    return {"resultado": ids}


# ---------------------------------------------------------------------------
# CU-14 Administración de Maestros y Semilla
# ---------------------------------------------------------------------------


@app.post("/api/maestros/{coleccion}")
def endpoint_guardar_maestro(coleccion: str, registro: Dict[str, Any], sesion: dict = Depends(obtener_sesion)):
    guardado = guardar_maestro(coleccion, registro, sesion)
    return _con_estado(guardado)


@app.patch("/api/maestros/{coleccion}/{id_registro}/activo")
def endpoint_cambiar_activo_maestro(
    coleccion: str, id_registro: str, cuerpo: ActivoMaestroInput, sesion: dict = Depends(obtener_sesion)
):
    actualizado = cambiar_activo_maestro(coleccion, id_registro, cuerpo.activo, sesion)
    return _con_estado(actualizado)


@app.post("/api/trabajadores/importar")
def endpoint_importar_trabajadores(cuerpo: ImportarTrabajadoresInput, sesion: dict = Depends(obtener_sesion)):
    resultado = importar_trabajadores(cuerpo.idEmpresa, cuerpo.filas, sesion)
    return _con_estado(resultado)


@app.post("/api/admin/restablecer")
def endpoint_restablecer_datos(sesion: dict = Depends(obtener_sesion)):
    ok = restablecer_datos(sesion)
    return _con_estado(ok)
