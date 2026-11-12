"""Repositorio de datos con sincronización en Cloud Firestore y caché en memoria.

Arquitectura híbrida:
- Mantiene el estado en memoria para lecturas instantáneas y para no agotar la cuota
  diaria de lecturas de Firestore (50.000 lecturas/día en el plan gratuito).
- Cada operación de escritura calcula exactamente qué documentos cambiaron y los
  persiste en Firestore mediante WriteBatch (colecciones raíz: sucursales, usuarios,
  empresas, convenios, trabajadores, categorias, productos, insumos, motivosDesperdicio,
  comandas, pagos, facturas, movimientos, desperdicios y contadores), lo que dispara
  los listeners `onSnapshot` del frontend en tiempo real.
- Además emite eventos SSE (`/api/eventos`) y guarda respaldo local para que el sistema
  funcione incluso si la API de Firestore aún no fue habilitada en Google Cloud Console.
"""
import asyncio
import copy
import json
import logging
import os
import threading
from datetime import datetime, timedelta

from .config import DIRECTORIO_BACKEND, db as obtener_firestore
from .utilidades import ahora, fecha_hora_iso

logger = logging.getLogger("trazaplato.repositorio")

COLECCIONES_LISTA = [
    "sucursales",
    "usuarios",
    "empresas",
    "convenios",
    "trabajadores",
    "categorias",
    "productos",
    "insumos",
    "motivosDesperdicio",
    "comandas",
    "pagos",
    "facturas",
    "movimientos",
    "desperdicios",
]

RUTA_SEMILLA = os.path.join(DIRECTORIO_BACKEND, "seed", "datos_iniciales.json")
RUTA_RESPALDO_LOCAL = os.path.join(DIRECTORIO_BACKEND, "seed", "estado_actual.json")
LIMITE_LOTE_FIRESTORE = 450


def _desplazar_fecha_texto(valor, delta_dias):
    if not valor or not isinstance(valor, str) or delta_dias == 0:
        return valor
    try:
        if len(valor) >= 19 and valor[10] == "T":
            dt = datetime.strptime(valor[:19], "%Y-%m-%dT%H:%M:%S") + timedelta(days=delta_dias)
            return dt.strftime("%Y-%m-%dT%H:%M:%S")
        if len(valor) == 10 and valor[4] == "-" and valor[7] == "-":
            dt = datetime.strptime(valor, "%Y-%m-%d") + timedelta(days=delta_dias)
            return dt.strftime("%Y-%m-%d")
    except ValueError:
        pass
    return valor


def cargar_datos_semilla(desplazar_a_hoy=True):
    """Lee backend/seed/datos_iniciales.json y ajusta las fechas operativas al día actual."""
    with open(RUTA_SEMILLA, "r", encoding="utf-8") as archivo:
        bruto = json.load(archivo)

    generado_en = bruto.get("generadoEn", "")
    delta_dias = 0
    if desplazar_a_hoy and generado_en:
        try:
            fecha_gen = datetime.strptime(generado_en[:10], "%Y-%m-%d").date()
            delta_dias = (ahora().date() - fecha_gen).days
        except ValueError:
            delta_dias = 0

    datos = {
        "version": bruto.get("version", 1),
        "contadores": copy.deepcopy(bruto.get("contadores", {})),
    }
    for col in COLECCIONES_LISTA:
        datos[col] = copy.deepcopy(bruto.get(col, []))

    if delta_dias != 0:
        for comanda in datos["comandas"]:
            comanda["fechaHora"] = _desplazar_fecha_texto(comanda.get("fechaHora"), delta_dias)
            for ad in comanda.get("adiciones", []):
                ad["fechaHora"] = _desplazar_fecha_texto(ad.get("fechaHora"), delta_dias)
            for h in comanda.get("historial", []):
                h["fechaHora"] = _desplazar_fecha_texto(h.get("fechaHora"), delta_dias)
        for pago in datos["pagos"]:
            pago["fechaHora"] = _desplazar_fecha_texto(pago.get("fechaHora"), delta_dias)
        for factura in datos["facturas"]:
            factura["fecha"] = _desplazar_fecha_texto(factura.get("fecha"), delta_dias)
        for mov in datos["movimientos"]:
            mov["fechaHora"] = _desplazar_fecha_texto(mov.get("fechaHora"), delta_dias)
        for desp in datos["desperdicios"]:
            desp["fechaHora"] = _desplazar_fecha_texto(desp.get("fechaHora"), delta_dias)

    return datos


def sanitizar_datos_publicos(datos):
    """Oculta el campo password de los usuarios al enviar el estado al cliente."""
    copia = copy.deepcopy(datos)
    copia["usuarios"] = [{k: v for k, v in u.items() if k != "password"} for u in copia.get("usuarios", [])]
    return copia


class RepositorioDatos:
    def __init__(self):
        self._lock = threading.RLock()
        self._datos = None
        self._intentos_login = {}
        self._firestore_activo = False
        self._ultimo_error_firestore = None
        self._clientes_sse = set()
        self._version_cambio = 0

    @property
    def firestore_activo(self):
        return self._firestore_activo

    @property
    def ultimo_error_firestore(self):
        return self._ultimo_error_firestore

    def inicializar(self):
        with self._lock:
            if self._datos is not None:
                return
            if self._intentar_cargar_desde_firestore():
                return
            if os.path.exists(RUTA_RESPALDO_LOCAL):
                try:
                    with open(RUTA_RESPALDO_LOCAL, "r", encoding="utf-8") as f:
                        guardado = json.load(f)
                    if all(c in guardado for c in COLECCIONES_LISTA):
                        self._datos = guardado
                        self._guardar_respaldo_local()
                        return
                except Exception:
                    pass
            self._datos = cargar_datos_semilla(desplazar_a_hoy=True)
            self._guardar_respaldo_local()

    def _intentar_cargar_desde_firestore(self):
        if os.getenv("DISABLE_FIRESTORE") == "1":
            self._firestore_activo = False
            self._ultimo_error_firestore = "Firestore deshabilitado por variable DISABLE_FIRESTORE=1"
            return False
        try:
            cliente = obtener_firestore()
            docs_suc = list(cliente.collection("sucursales").stream(timeout=4.0, retry=None))
            if not docs_suc:
                # Firestore está habilitado pero vacío: volcamos los datos iniciales.
                logger.info("Firestore está vacío. Cargando datos iniciales...")
                semilla = cargar_datos_semilla(desplazar_a_hoy=True)
                self._volcar_todo_a_firestore(cliente, semilla)
                self._datos = semilla
                self._firestore_activo = True
                self._ultimo_error_firestore = None
                self._guardar_respaldo_local()
                return True

            datos = {"version": 1, "contadores": {}}
            for col in COLECCIONES_LISTA:
                docs = cliente.collection(col).stream(timeout=8.0, retry=None)
                lista = []
                for d in docs:
                    item = d.to_dict() or {}
                    item.setdefault("id", d.id)
                    lista.append(item)
                datos[col] = lista

            for d in cliente.collection("contadores").stream(timeout=4.0, retry=None):
                datos["contadores"][d.id] = d.to_dict() or {"comanda": 0, "movimiento": 0}

            # Orden estable para comandas y movimientos
            datos["comandas"].sort(key=lambda c: c.get("numero", 0))
            datos["movimientos"].sort(key=lambda m: m.get("numero", 0))

            self._datos = datos
            self._firestore_activo = True
            self._ultimo_error_firestore = None
            self._guardar_respaldo_local()
            logger.info("Datos cargados desde Cloud Firestore correctamente.")
            return True
        except Exception as exc:
            self._firestore_activo = False
            self._ultimo_error_firestore = str(exc)
            logger.warning("Firestore no disponible aún (%s). Usando almacenamiento local.", exc)
            return False

    def _volcar_todo_a_firestore(self, cliente, datos, limpiar_antes=False):
        operaciones = []

        if limpiar_antes:
            for col in [*COLECCIONES_LISTA, "contadores"]:
                for doc_snap in cliente.collection(col).list_documents(timeout=5.0, retry=None):
                    operaciones.append(("delete", doc_snap, None))

        for col in COLECCIONES_LISTA:
            for item in datos.get(col, []):
                doc_id = str(item["id"])
                ref = cliente.collection(col).document(doc_id)
                operaciones.append(("set", ref, item))

        for id_suc, cont in (datos.get("contadores") or {}).items():
            ref = cliente.collection("contadores").document(str(id_suc))
            operaciones.append(("set", ref, cont))

        for inicio in range(0, len(operaciones), LIMITE_LOTE_FIRESTORE):
            lote = cliente.batch()
            for accion, ref, contenido in operaciones[inicio : inicio + LIMITE_LOTE_FIRESTORE]:
                if accion == "delete":
                    lote.delete(ref)
                else:
                    lote.set(ref, contenido)
            lote.commit(timeout=10.0, retry=None)

    def _sincronizar_diferencias_firestore(self, anterior, nuevo):
        if not self._firestore_activo:
            return
        try:
            cliente = obtener_firestore()
            operaciones = []

            for col in COLECCIONES_LISTA:
                mapa_ant = {item["id"]: item for item in anterior.get(col, [])}
                mapa_nvo = {item["id"]: item for item in nuevo.get(col, [])}

                for doc_id, item in mapa_nvo.items():
                    if doc_id not in mapa_ant or mapa_ant[doc_id] != item:
                        ref = cliente.collection(col).document(str(doc_id))
                        operaciones.append(("set", ref, item))

                for doc_id in mapa_ant:
                    if doc_id not in mapa_nvo:
                        ref = cliente.collection(col).document(str(doc_id))
                        operaciones.append(("delete", ref, None))

            cont_ant = anterior.get("contadores") or {}
            cont_nvo = nuevo.get("contadores") or {}
            for id_suc, valores in cont_nvo.items():
                if cont_ant.get(id_suc) != valores:
                    ref = cliente.collection("contadores").document(str(id_suc))
                    operaciones.append(("set", ref, valores))

            if not operaciones:
                return

            for inicio in range(0, len(operaciones), LIMITE_LOTE_FIRESTORE):
                lote = cliente.batch()
                for accion, ref, contenido in operaciones[inicio : inicio + LIMITE_LOTE_FIRESTORE]:
                    if accion == "delete":
                        lote.delete(ref)
                    else:
                        lote.set(ref, contenido)
                lote.commit(timeout=8.0, retry=None)

            self._firestore_activo = True
            self._ultimo_error_firestore = None
        except Exception as exc:
            self._firestore_activo = False
            self._ultimo_error_firestore = str(exc)
            logger.warning("No se pudo sincronizar lote en Firestore: %s", exc)

    def _guardar_respaldo_local(self):
        try:
            os.makedirs(os.path.dirname(RUTA_RESPALDO_LOCAL), exist_ok=True)
            with open(RUTA_RESPALDO_LOCAL, "w", encoding="utf-8") as f:
                json.dump(self._datos, f, ensure_ascii=False)
        except Exception as exc:
            logger.warning("No se pudo escribir respaldo local: %s", exc)

    def obtener_datos_internos(self):
        self.inicializar()
        with self._lock:
            return self._datos

    def obtener_datos_publicos(self):
        self.inicializar()
        with self._lock:
            return sanitizar_datos_publicos(self._datos)

    def transaccion(self, operacion):
        """Ejecuta `operacion(borrador)` de forma atómica, persiste cambios y notifica SSE/Firestore."""
        self.inicializar()
        with self._lock:
            borrador = copy.deepcopy(self._datos)
            resultado = operacion(borrador)
            anterior = self._datos
            self._datos = borrador
            self._version_cambio += 1
            self._guardar_respaldo_local()
            self._sincronizar_diferencias_firestore(anterior, borrador)
            self._notificar_sse()
            return copy.deepcopy(resultado)

    def restablecer_semilla(self, sincronizar_firestore=True):
        """Restaura el estado inicial desde datos_iniciales.json (y en Firestore si está activo)."""
        with self._lock:
            nuevos = cargar_datos_semilla(desplazar_a_hoy=True)
            self._datos = nuevos
            self._intentos_login.clear()
            self._version_cambio += 1
            self._guardar_respaldo_local()
            if sincronizar_firestore and os.getenv("DISABLE_FIRESTORE") != "1":
                try:
                    cliente = obtener_firestore()
                    self._volcar_todo_a_firestore(cliente, nuevos, limpiar_antes=True)
                    self._firestore_activo = True
                    self._ultimo_error_firestore = None
                except Exception as exc:
                    self._firestore_activo = False
                    self._ultimo_error_firestore = str(exc)
            self._notificar_sse()
            return True

    def sincronizar_ahora_con_firestore(self, limpiar_antes=False):
        """Fuerza el volcado del estado actual a Cloud Firestore."""
        self.inicializar()
        with self._lock:
            cliente = obtener_firestore()
            self._volcar_todo_a_firestore(cliente, self._datos, limpiar_antes=limpiar_antes)
            self._firestore_activo = True
            self._ultimo_error_firestore = None
            return {col: len(self._datos.get(col, [])) for col in COLECCIONES_LISTA}

    # --- Control de intentos de inicio de sesión ---

    def obtener_intento_login(self, clave):
        with self._lock:
            return copy.deepcopy(self._intentos_login.get(clave, {"fallidos": 0, "bloqueadoHasta": None}))

    def guardar_intento_login(self, clave, registro):
        with self._lock:
            self._intentos_login[clave] = copy.deepcopy(registro)

    def limpiar_intento_login(self, clave):
        with self._lock:
            self._intentos_login.pop(clave, None)

    # --- Suscripción en tiempo real (Server-Sent Events) ---

    def registrar_cliente_sse(self, loop):
        cola = asyncio.Queue(maxsize=10)
        par = (loop, cola)
        with self._lock:
            self._clientes_sse.add(par)
        return par

    def desregistrar_cliente_sse(self, par):
        with self._lock:
            self._clientes_sse.discard(par)

    def _notificar_sse(self):
        evento = {"version": self._version_cambio, "fechaHora": fecha_hora_iso()}
        for loop, cola in list(self._clientes_sse):
            try:
                loop.call_soon_threadsafe(self._empujar_cola, cola, evento)
            except Exception:
                self._clientes_sse.discard((loop, cola))

    @staticmethod
    def _empujar_cola(cola, evento):
        if cola.full():
            try:
                cola.get_nowait()
            except asyncio.QueueEmpty:
                pass
        try:
            cola.put_nowait(evento)
        except asyncio.QueueFull:
            pass


repositorio = RepositorioDatos()
