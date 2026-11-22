"""Rutas HTTP del prototipo. Son finas: validan la entrada, controlan el rol y llaman al servicio.

Prefijo /api. Roles: tecnico (Equipo técnico agrícola), jefe_lote, bascula y fabrica.
"""
from datetime import date

from fastapi import APIRouter, Depends, Query, status

from ..auth import TODOS, requiere, usuario_actual
from ..deps import get_repo
from ..domain.constantes import NOMBRE_ROL
from ..schemas import (
    BrixEntrada,
    CosechaEntrada,
    EstadoPisoEntrada,
    LecturaCorreccion,
    LecturaEntrada,
    LoteCambios,
    ParadaCierre,
    ParadaEntrada,
    PatioEntrada,
    PronosticoManual,
    ReservaEntrada,
    SimulacionEntrada,
)
from ..services import alertas, campo, gerencia, lotes, paradas, patio, priorizacion, pronostico

router = APIRouter(prefix="/api")

TEC = requiere("tecnico")
TEC_JEFE = requiere("tecnico", "jefe_lote")
JEFE = requiere("jefe_lote")
BASCULA = requiere("bascula")
FABRICA = requiere("fabrica")
TEC_FAB = requiere("tecnico", "fabrica")
PATIO_LECTURA = requiere("tecnico", "fabrica", "bascula")
CUALQUIERA = requiere(*TODOS)


def _txt(d: date | None):
    return d.isoformat() if d else None


# ---------- CU01 ----------
@router.get("/me")
def yo(usuario=Depends(usuario_actual)):
    return {**usuario, "rol_nombre": NOMBRE_ROL[usuario["rol"]]}


# ---------- Catálogos (CU03 y CU07 solo datos) ----------
@router.get("/parametros")
def ver_parametros(_=Depends(CUALQUIERA), repo=Depends(get_repo)):
    return lotes.listar_parametros(repo)


@router.get("/fincas")
def ver_fincas(_=Depends(CUALQUIERA), repo=Depends(get_repo)):
    return lotes.listar_fincas(repo)


@router.get("/pluviometros")
def ver_pluviometros(_=Depends(TEC_JEFE), repo=Depends(get_repo)):
    return lotes.listar_pluviometros(repo)


# ---------- CU04 ----------
@router.get("/lotes")
def ver_lotes(
    id_finca: str | None = None,
    tipo_cultivo: str | None = None,
    zona: str | None = None,
    drenaje: str | None = None,
    estado_lote: str | None = None,
    texto: str | None = Query(None, max_length=60),
    _=Depends(TEC_JEFE),
    repo=Depends(get_repo),
):
    return lotes.listar_lotes(repo, id_finca, tipo_cultivo, zona, drenaje, estado_lote, texto)


@router.get("/lotes/{id_unico}")
def ver_lote(id_unico: str, _=Depends(TEC), repo=Depends(get_repo)):
    return lotes.ficha_lote(repo, id_unico)


@router.put("/lotes/{id_unico}")
def editar_lote(id_unico: str, cambios: LoteCambios, usuario=Depends(TEC), repo=Depends(get_repo)):
    return lotes.actualizar_lote(repo, usuario, id_unico, cambios.model_dump(exclude_unset=True))


# ---------- CU08 ----------
@router.post("/lecturas", status_code=status.HTTP_201_CREATED)
def cargar_lectura(datos: LecturaEntrada, usuario=Depends(JEFE), repo=Depends(get_repo)):
    return campo.registrar_lectura(repo, usuario, datos.id_pluviometro, _txt(datos.fecha), datos.mm)


@router.put("/lecturas/{id_lectura}")
def corregir_lectura(id_lectura: str, datos: LecturaCorreccion, usuario=Depends(JEFE), repo=Depends(get_repo)):
    return campo.corregir_lectura(repo, usuario, id_lectura, datos.mm)


@router.get("/lecturas")
def ver_lecturas(
    mias: bool = False,
    id_pluviometro: str | None = None,
    desde: date | None = None,
    hasta: date | None = None,
    usuario=Depends(TEC_JEFE),
    repo=Depends(get_repo),
):
    return campo.listar_lecturas(repo, usuario, mias, id_pluviometro, _txt(desde), _txt(hasta))


# ---------- CU09 ----------
@router.post("/estados-piso", status_code=status.HTTP_201_CREATED)
def cargar_estado_piso(datos: EstadoPisoEntrada, usuario=Depends(TEC_JEFE), repo=Depends(get_repo)):
    return campo.registrar_estado_piso(repo, usuario, datos.id_unico, datos.estado, datos.observacion)


@router.get("/estados-piso")
def ver_estados_piso(mias: bool = False, id_unico: str | None = None, usuario=Depends(TEC_JEFE), repo=Depends(get_repo)):
    return campo.listar_estados_piso(repo, usuario, mias, id_unico)


# ---------- CU10 ----------
@router.post("/brix", status_code=status.HTTP_201_CREATED)
def cargar_brix(datos: BrixEntrada, usuario=Depends(TEC), repo=Depends(get_repo)):
    return campo.registrar_brix(repo, usuario, datos.id_unico, _txt(datos.fecha), datos.valor_brix, datos.origen)


# ---------- CU16 ----------
@router.post("/cosechas", status_code=status.HTTP_201_CREATED)
def cargar_cosecha(datos: CosechaEntrada, usuario=Depends(TEC), repo=Depends(get_repo)):
    return campo.registrar_cosecha(repo, usuario, datos.id_unico, _txt(datos.fecha), datos.toneladas, datos.lote_terminado)


@router.get("/cosechas")
def ver_cosechas(desde: date | None = None, hasta: date | None = None, _=Depends(TEC), repo=Depends(get_repo)):
    return campo.listar_cosechas(repo, _txt(desde), _txt(hasta))


# ---------- CU11 ----------
@router.get("/pronosticos")
def ver_pronosticos(_=Depends(TEC), repo=Depends(get_repo)):
    return pronostico.listar(repo)


@router.post("/pronosticos/actualizar")
def actualizar_pronostico(_=Depends(TEC), repo=Depends(get_repo)):
    return pronostico.actualizar_automatico(repo, origen="a pedido")


@router.put("/pronosticos")
def cargar_pronostico_manual(datos: PronosticoManual, usuario=Depends(TEC), repo=Depends(get_repo)):
    return pronostico.registrar_manual(repo, usuario, datos.id_finca, _txt(datos.fecha), datos.prob_lluvia_pct, datos.mm_previstos)


# ---------- CU13, CU21 y CU23 ----------
@router.get("/ranking")
def ver_ranking(_=Depends(TEC), repo=Depends(get_repo)):
    return priorizacion.consultar_ranking(repo)


@router.get("/reserva")
def ver_reserva(_=Depends(TEC), repo=Depends(get_repo)):
    return priorizacion.vista_reserva(repo)


@router.put("/reserva/{id_unico}")
def cambiar_reserva(id_unico: str, datos: ReservaEntrada, usuario=Depends(TEC), repo=Depends(get_repo)):
    return priorizacion.marcar_reserva(repo, usuario, id_unico, datos.en_reserva)


@router.post("/simulaciones")
def simular(datos: SimulacionEntrada, _=Depends(TEC), repo=Depends(get_repo)):
    return priorizacion.simular(repo, [l.model_dump() for l in datos.lluvias], datos.pedido_organico)


# ---------- CU17 y CU22 ----------
@router.post("/patio", status_code=status.HTTP_201_CREATED)
def cargar_patio(datos: PatioEntrada, usuario=Depends(BASCULA), repo=Depends(get_repo)):
    return patio.registrar(repo, usuario, datos.cantidad_carros, datos.condicion)


@router.get("/patio")
def ver_patio(desde: date | None = None, hasta: date | None = None, _=Depends(PATIO_LECTURA), repo=Depends(get_repo)):
    return patio.listar(repo, _txt(desde), _txt(hasta))


@router.get("/abastecimiento")
def ver_abastecimiento(_=Depends(PATIO_LECTURA), repo=Depends(get_repo)):
    return patio.tablero(repo)


# ---------- CU18 ----------
@router.get("/alertas")
def ver_alertas(
    tipo: str | None = None,
    activas: bool = False,
    desde: date | None = None,
    hasta: date | None = None,
    _=Depends(TEC_FAB),
    repo=Depends(get_repo),
):
    return alertas.listar(repo, tipo, activas, _txt(desde), _txt(hasta))


@router.get("/alertas/{id_alerta}")
def ver_alerta(id_alerta: str, _=Depends(TEC_FAB), repo=Depends(get_repo)):
    return alertas.detalle(repo, id_alerta)


@router.put("/alertas/{id_alerta}/vista")
def marcar_alerta_vista(id_alerta: str, usuario=Depends(FABRICA), repo=Depends(get_repo)):
    return alertas.marcar_vista(repo, usuario, id_alerta)


# ---------- CU19 ----------
@router.get("/paradas")
def ver_paradas(
    desde: date | None = None,
    hasta: date | None = None,
    causa: str | None = None,
    _=Depends(TEC_FAB),
    repo=Depends(get_repo),
):
    return paradas.listar(repo, _txt(desde), _txt(hasta), causa)


@router.get("/paradas/{id_parada}")
def ver_parada(id_parada: str, _=Depends(TEC_FAB), repo=Depends(get_repo)):
    return paradas.detalle(repo, id_parada)


@router.post("/paradas", status_code=status.HTTP_201_CREATED)
def cargar_parada(datos: ParadaEntrada, usuario=Depends(FABRICA), repo=Depends(get_repo)):
    fin = datos.fecha_hora_fin.isoformat() if datos.fecha_hora_fin else None
    return paradas.registrar(repo, usuario, datos.fecha_hora_inicio.isoformat(), fin, datos.causa, datos.observacion)


@router.put("/paradas/{id_parada}/cerrar")
def cerrar_parada(id_parada: str, datos: ParadaCierre, usuario=Depends(FABRICA), repo=Depends(get_repo)):
    return paradas.cerrar(repo, usuario, id_parada, datos.fecha_hora_fin.isoformat())


# ---------- CU20 ----------
@router.get("/panel")
def ver_panel(
    desde: date | None = None,
    hasta: date | None = None,
    id_finca: str | None = None,
    zona: str | None = None,
    tipo_cultivo: str | None = None,
    _=Depends(TEC_FAB),
    repo=Depends(get_repo),
):
    return gerencia.panel(repo, desde=_txt(desde), hasta=_txt(hasta), id_finca=id_finca, zona=zona, tipo_cultivo=tipo_cultivo)


@router.get("/informes")
def ver_informes_disponibles(usuario=Depends(TEC_FAB)):
    return [{"tipo": t, "titulo": gerencia.INFORMES[t]} for t in gerencia.INFORMES_POR_ROL[usuario["rol"]]]


@router.get("/informes/{tipo}")
def ver_informe(
    tipo: str,
    desde: date | None = None,
    hasta: date | None = None,
    id_finca: str | None = None,
    zona: str | None = None,
    tipo_cultivo: str | None = None,
    usuario=Depends(TEC_FAB),
    repo=Depends(get_repo),
):
    return gerencia.informe(repo, tipo, usuario["rol"], desde=_txt(desde), hasta=_txt(hasta),
                            id_finca=id_finca, zona=zona, tipo_cultivo=tipo_cultivo)
