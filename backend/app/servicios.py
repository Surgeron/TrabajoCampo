"""Servicios transaccionales de negocio (CU-01 a CU-14).

Implementa exactamente el contrato de `src/services/mockApi.js` sobre el repositorio
híbrido (Cloud Firestore + memoria/respaldo local).
"""
import math
from datetime import timedelta

from .dominio import (
    ADICION,
    ADMINISTRADOR,
    ANULADO,
    COBRADO_SIN_FACTURAR,
    COCINERO,
    CONVENIO,
    CUENTA_CORRIENTE,
    ENTREGADO,
    ESTADOS_ACTIVOS,
    ESTADOS_LABEL,
    FACTURADO,
    FINANZAS,
    INICIADO,
    LISTO,
    MAX_INTENTOS_LOGIN,
    MINUTOS_BLOQUEO_LOGIN,
    MOZO,
    PARTICULAR,
    SUPERVISOR,
    VALIDADORES_MAESTROS,
    armar_items,
    calcular_total,
    convenio_vigente,
    determinar_turno,
    distribuir_pagos,
    es_entero,
    evaluar_cobertura,
    misma_factura,
    motivo_no_anulable,
    por_id,
    precio_en_sucursal,
    primer_error,
    puede_agregar_adicion,
    puede_anular,
    puede_cobrar,
    puede_completar_factura,
    puede_marcar_entregado,
    puede_marcar_listo,
    validar_comanda,
    validar_desperdicio,
    validar_factura,
    validar_movimiento,
    validar_pago,
)
from .errores import ApiError
from .informes import buscar_comandas, generar_informe
from .repositorio import repositorio
from .utilidades import (
    a_numero,
    ahora,
    fecha_hora_iso,
    fecha_iso,
    format_comprobante,
    format_cuit,
    format_numero_comanda,
    generar_id,
    leer_fecha_hora,
    numero_limpio,
    solo_digitos,
)

COLECCIONES_MAESTRAS = [
    "usuarios",
    "sucursales",
    "empresas",
    "trabajadores",
    "convenios",
    "productos",
    "insumos",
    "motivosDesperdicio",
]

PREFIJOS = {
    "usuarios": "usr",
    "sucursales": "suc",
    "empresas": "emp",
    "trabajadores": "trab",
    "convenios": "conv",
    "productos": "prod",
    "insumos": "ins",
    "motivosDesperdicio": "mot",
}


# ---------------------------------------------------------------------------
# Ayudantes de permisos y entidades
# ---------------------------------------------------------------------------


def exigir_rol(sesion, roles):
    if not sesion or sesion.get("rol") not in roles:
        raise ApiError("PERMISO", "Tu rol no tiene permiso para esta operación.")


def exigir_sucursal(sesion):
    if not sesion or not sesion.get("idSucursal"):
        raise ApiError("SUCURSAL", "Elegí una sucursal antes de operar.")


def buscar_comanda(datos, id_comanda, sesion):
    comanda = por_id(datos["comandas"], id_comanda)
    if not comanda:
        raise ApiError("NO_ENCONTRADO", "La comanda no existe.")
    if (
        sesion.get("idSucursal")
        and comanda.get("idSucursal") != sesion.get("idSucursal")
        and sesion.get("rol") in (MOZO, COCINERO)
    ):
        raise ApiError("PERMISO", "La comanda pertenece a otra sucursal.")
    return comanda


def error_de_estado(comanda, accion):
    etiqueta = ESTADOS_LABEL.get(comanda["estado"], comanda["estado"])
    return ApiError(
        "ESTADO",
        f"No se puede {accion}: la comanda {format_numero_comanda(comanda['numero'])} está en «{etiqueta}».",
    )


def cambiar_estado(comanda, estado_nuevo, sesion, motivo=None):
    comanda["historial"].append(
        {
            "estadoAnterior": comanda["estado"],
            "estadoNuevo": estado_nuevo,
            "fechaHora": fecha_hora_iso(),
            "idUsuario": sesion["idUsuario"],
            "motivo": motivo,
        }
    )
    comanda["estado"] = estado_nuevo


def siguiente_numero(datos, id_sucursal, tipo):
    if id_sucursal not in datos["contadores"]:
        datos["contadores"][id_sucursal] = {"comanda": 0, "movimiento": 0}
    datos["contadores"][id_sucursal][tipo] += 1
    return datos["contadores"][id_sucursal][tipo]


def items_con_id(items, id_adicion=None):
    return [
        {
            **item,
            "cantidad": int(a_numero(item["cantidad"])),
            "precioUnitario": numero_limpio(item["precioUnitario"]),
            "id": generar_id("it"),
            "idAdicion": id_adicion,
        }
        for item in items
    ]


def nueva_comanda(datos, sesion, campos):
    fecha_hora = fecha_hora_iso()
    comanda = {
        "id": generar_id("com"),
        "numero": siguiente_numero(datos, sesion["idSucursal"], "comanda"),
        "idSucursal": sesion["idSucursal"],
        "idMozo": sesion["idUsuario"],
        "fechaHora": fecha_hora,
        "turno": determinar_turno(datos, campos["items"], fecha_hora),
        "firmoControlDiario": False,
        "adiciones": [],
        "observaciones": "",
        "idComandaOrigen": None,
        "idConvenio": None,
        "idTrabajador": None,
        **campos,
        "estado": INICIADO,
        "historial": [
            {
                "estadoAnterior": None,
                "estadoNuevo": INICIADO,
                "fechaHora": fecha_hora,
                "idUsuario": sesion["idUsuario"],
                "motivo": None,
            }
        ],
    }
    comanda["total"] = calcular_total(comanda["items"])
    datos["comandas"].append(comanda)
    return comanda


def error_no_cubierto(no_cubiertos):
    return ApiError(
        "NO_CUBIERTO",
        "Hay consumos que el convenio no cubre.",
        {"noCubiertos": no_cubiertos},
    )


def validar_items_vendibles(datos, cantidades, id_sucursal):
    for id_producto, cantidad in (cantidades or {}).items():
        num_cant = a_numero(cantidad)
        if not (num_cant > 0):
            continue
        producto = por_id(datos["productos"], id_producto)
        if not producto or not producto.get("activo") or not precio_en_sucursal(producto, id_sucursal):
            nombre = producto["nombre"] if producto else id_producto
            raise ApiError("PRODUCTO", f"«{nombre}» no está disponible en esta sucursal.")
        if not es_entero(num_cant) or num_cant > 50:
            raise ApiError("CANTIDAD", "Las cantidades deben ser enteras y no mayores a 50.")


def trabajador_con_convenio(datos, id_trabajador, fecha):
    trabajador = por_id(datos["trabajadores"], id_trabajador)
    if not trabajador or not trabajador.get("activo"):
        raise ApiError("TRABAJADOR", "El trabajador no está activo en el listado.")
    convenio = convenio_vigente(datos, trabajador["idEmpresa"], fecha)
    if not convenio:
        raise ApiError(
            "SIN_CONVENIO",
            "La empresa del trabajador no tiene un convenio vigente. Registrá el pedido como particular.",
        )
    return trabajador, convenio


# ---------------------------------------------------------------------------
# CU-01 Iniciar sesión
# ---------------------------------------------------------------------------


def iniciar_sesion(nombre_usuario, password):
    clave = str(nombre_usuario or "").strip().lower()
    if not clave or not password:
        raise ApiError("DATOS", "Ingresá usuario y contraseña.")

    registro = repositorio.obtener_intento_login(clave)
    bloqueado_hasta = registro.get("bloqueadoHasta")
    momento_actual = ahora()
    if bloqueado_hasta:
        try:
            dt_bloqueo = leer_fecha_hora(bloqueado_hasta)
            if dt_bloqueo > momento_actual:
                minutos = max(1, math.ceil((dt_bloqueo - momento_actual).total_seconds() / 60))
                raise ApiError(
                    "BLOQUEADO",
                    f"Usuario bloqueado por {MAX_INTENTOS_LOGIN} intentos fallidos. Probá de nuevo en {minutos} min.",
                )
        except ValueError:
            pass

    datos = repositorio.obtener_datos_internos()
    usuario = next((u for u in datos["usuarios"] if u.get("nombreUsuario") == clave), None)
    if not usuario or usuario.get("password") != password:
        registro["fallidos"] = int(registro.get("fallidos") or 0) + 1
        if registro["fallidos"] >= MAX_INTENTOS_LOGIN:
            dt_hasta = momento_actual + timedelta(minutes=MINUTOS_BLOQUEO_LOGIN)
            registro["bloqueadoHasta"] = fecha_hora_iso(dt_hasta)
            registro["fallidos"] = 0
        else:
            registro["bloqueadoHasta"] = None
        repositorio.guardar_intento_login(clave, registro)
        restantes = MAX_INTENTOS_LOGIN - registro["fallidos"]
        plural = "" if restantes == 1 else "s"
        mensaje = (
            f"Usuario bloqueado por {MINUTOS_BLOQUEO_LOGIN} minutos."
            if registro.get("bloqueadoHasta")
            else f"Usuario o contraseña incorrectos. Te quedan {restantes} intento{plural}."
        )
        raise ApiError("CREDENCIALES", mensaje)

    if not usuario.get("activo"):
        raise ApiError("INACTIVO", "El usuario está desactivado. Consultá con el administrador.")

    repositorio.limpiar_intento_login(clave)
    return {k: v for k, v in usuario.items() if k != "password"}


# ---------------------------------------------------------------------------
# CU-03 Registrar comanda
# ---------------------------------------------------------------------------


def registrar_comanda(pedido, sesion):
    def op(datos):
        exigir_rol(sesion, [MOZO])
        exigir_sucursal(sesion)
        cantidades = {k: int(a_numero(v)) for k, v in (pedido.get("cantidades") or {}).items() if a_numero(v) > 0}
        validar_items_vendibles(datos, pedido.get("cantidades") or {}, sesion["idSucursal"])
        items = armar_items(datos, cantidades, sesion["idSucursal"])
        errores = validar_comanda({**pedido, "items": items}, items)
        if errores:
            raise ApiError("VALIDACION", primer_error(errores), errores)

        base = {
            "mesa": int(a_numero(pedido.get("mesa"))),
            "observaciones": str(pedido.get("observaciones") or "").strip(),
        }

        if pedido.get("tipoCliente") == PARTICULAR:
            return [
                nueva_comanda(
                    datos,
                    sesion,
                    {**base, "tipoCliente": PARTICULAR, "items": items_con_id(items)},
                )
            ]

        hoy = fecha_iso()
        trabajador, convenio = trabajador_con_convenio(datos, pedido.get("idTrabajador"), hoy)
        _, cubiertos, no_cubiertos = evaluar_cobertura(
            datos, datos["comandas"], trabajador["id"], items, hoy
        )
        if no_cubiertos and not pedido.get("generarAparte"):
            raise error_no_cubierto(no_cubiertos)

        creadas = []
        principal = None
        if cubiertos:
            principal = nueva_comanda(
                datos,
                sesion,
                {
                    **base,
                    "tipoCliente": CONVENIO,
                    "idTrabajador": trabajador["id"],
                    "idConvenio": convenio["id"],
                    "items": items_con_id(cubiertos),
                },
            )
            creadas.append(principal)
        if no_cubiertos:
            items_aparte = [{k: v for k, v in item.items() if k != "motivo"} for item in no_cubiertos]
            creadas.append(
                nueva_comanda(
                    datos,
                    sesion,
                    {
                        **base,
                        "tipoCliente": PARTICULAR,
                        "idTrabajador": trabajador["id"],
                        "idComandaOrigen": principal["id"] if principal else None,
                        "items": items_con_id(items_aparte),
                    },
                )
            )
        return creadas

    return repositorio.transaccion(op)


# ---------------------------------------------------------------------------
# CU-04 / CU-05 Cambios de estado en cocina y salón
# ---------------------------------------------------------------------------


def marcar_listo(id_comanda, sesion):
    def op(datos):
        exigir_rol(sesion, [COCINERO])
        comanda = buscar_comanda(datos, id_comanda, sesion)
        if not puede_marcar_listo(comanda):
            raise error_de_estado(comanda, "marcarla como lista")
        cambiar_estado(comanda, LISTO, sesion)
        return comanda

    return repositorio.transaccion(op)


def marcar_entregado(id_comanda, sesion):
    def op(datos):
        exigir_rol(sesion, [MOZO])
        comanda = buscar_comanda(datos, id_comanda, sesion)
        if not puede_marcar_entregado(comanda):
            raise error_de_estado(comanda, "marcarla como entregada")
        cambiar_estado(comanda, ENTREGADO, sesion)
        return comanda

    return repositorio.transaccion(op)


# ---------------------------------------------------------------------------
# CU-06 Agregar adición
# ---------------------------------------------------------------------------


def agregar_adicion(id_comanda, payload, sesion):
    def op(datos):
        exigir_rol(sesion, [MOZO])
        comanda = buscar_comanda(datos, id_comanda, sesion)
        if not puede_agregar_adicion(comanda):
            etiqueta = ESTADOS_LABEL.get(comanda["estado"], comanda["estado"])
            raise ApiError("ESTADO", f"La comanda está en «{etiqueta}»: registrá una comanda nueva.")

        cantidades_raw = (payload or {}).get("cantidades") or {}
        validar_items_vendibles(datos, cantidades_raw, comanda["idSucursal"])
        cantidades = {k: int(a_numero(v)) for k, v in cantidades_raw.items() if a_numero(v) > 0}
        items = armar_items(datos, cantidades, comanda["idSucursal"])
        if not items:
            raise ApiError("VALIDACION", "Agregá al menos un ítem.")

        cubiertos = items
        no_cubiertos = []
        if comanda.get("tipoCliente") == CONVENIO:
            fecha = comanda["fechaHora"][:10]
            trabajador_con_convenio(datos, comanda.get("idTrabajador"), fecha)
            _, cubiertos, no_cubiertos = evaluar_cobertura(
                datos, datos["comandas"], comanda["idTrabajador"], items, fecha
            )
            if no_cubiertos and not (payload or {}).get("generarAparte"):
                raise error_no_cubierto(no_cubiertos)

        resultado = {"comanda": None, "aparte": None}
        if cubiertos:
            adicion = {
                "id": generar_id("adi"),
                "fechaHora": fecha_hora_iso(),
                "idUsuario": sesion["idUsuario"],
            }
            comanda["adiciones"].append(adicion)
            comanda["items"].extend(items_con_id(cubiertos, adicion["id"]))
            comanda["total"] = calcular_total(comanda["items"])
            cambiar_estado(comanda, ADICION, sesion)
            resultado["comanda"] = comanda
        if no_cubiertos:
            items_aparte = [{k: v for k, v in item.items() if k != "motivo"} for item in no_cubiertos]
            resultado["aparte"] = nueva_comanda(
                datos,
                {**sesion, "idSucursal": comanda["idSucursal"]},
                {
                    "mesa": comanda["mesa"],
                    "tipoCliente": PARTICULAR,
                    "idTrabajador": comanda.get("idTrabajador"),
                    "idComandaOrigen": comanda["id"],
                    "items": items_con_id(items_aparte),
                },
            )
        return resultado

    return repositorio.transaccion(op)


# ---------------------------------------------------------------------------
# CU-07 Cobrar comanda / Cerrar cuenta corriente
# ---------------------------------------------------------------------------


def cerrar_cuenta_corriente(id_comanda, payload, sesion):
    def op(datos):
        exigir_rol(sesion, [MOZO])
        comanda = buscar_comanda(datos, id_comanda, sesion)
        if comanda.get("tipoCliente") != CONVENIO:
            raise ApiError("TIPO", "Solo las comandas de convenio se cierran en cuenta corriente.")
        if not puede_cobrar(comanda):
            raise error_de_estado(comanda, "cerrarla")
        if not (payload or {}).get("firmoControlDiario"):
            raise ApiError("FIRMA", "Confirmá que el trabajador firmó el Control diario de servicio.")
        comanda["firmoControlDiario"] = True
        cambiar_estado(comanda, CUENTA_CORRIENTE, sesion)
        return comanda

    return repositorio.transaccion(op)


def _vincular_facturas(datos, comandas, facturas, confirmar_compartida, exigir_importe, sesion):
    total = sum(c["total"] for c in comandas)
    for i, factura in enumerate(facturas):
        errores = validar_factura(factura)
        if errores:
            raise ApiError(
                "VALIDACION",
                f"Factura {i + 1}: {primer_error(errores)}",
                {"indice": i, "errores": errores},
            )
        if any(j != i and misma_factura(otra, factura) for j, otra in enumerate(facturas)):
            raise ApiError(
                "VALIDACION",
                f"La factura {format_comprobante(factura)} está repetida en el formulario.",
            )

    existentes = []
    for factura in facturas:
        existente = next((f for f in datos["facturas"] if misma_factura(f, factura)), None)
        if existente:
            existentes.append((factura, existente))

    if existentes and not confirmar_compartida:
        factura, existente = existentes[0]
        numeros = []
        for id_com in existente.get("comandas", []):
            com = por_id(datos["comandas"], id_com)
            if com:
                numeros.append(format_numero_comanda(com["numero"]))
        raise ApiError(
            "FACTURA_DUPLICADA",
            f"La factura {format_comprobante(factura)} ya está vinculada a la comanda {', '.join(numeros)}.",
            {"comprobante": format_comprobante(factura), "comandas": numeros},
        )

    nuevas = [f for f in facturas if not any(misma_factura(ex, f) for ex in datos["facturas"])]
    if exigir_importe and not existentes:
        suma_facturas = numero_limpio(sum(a_numero(f.get("importe")) for f in nuevas))
        if abs(suma_facturas - total) > 0.5:
            raise ApiError(
                "IMPORTE",
                f"La suma de las facturas ({suma_facturas}) no coincide con el total de las comandas ({total}).",
            )

    ids_comandas = [c["id"] for c in comandas]
    for _, existente in existentes:
        registro = por_id(datos["facturas"], existente["id"])
        if registro:
            combinadas = list(registro.get("comandas", []))
            for id_c in ids_comandas:
                if id_c not in combinadas:
                    combinadas.append(id_c)
            registro["comandas"] = combinadas

    for f in nuevas:
        datos["facturas"].append(
            {
                "id": generar_id("fac"),
                "tipoComprobante": f["tipoComprobante"],
                "puntoVenta": int(a_numero(f["puntoVenta"])),
                "numero": int(a_numero(f["numero"])),
                "fecha": f["fecha"],
                "clienteFacturado": str(f["clienteFacturado"]).strip(),
                "cuitCliente": format_cuit(f["cuitCliente"]) if f.get("cuitCliente") else "",
                "importe": numero_limpio(f["importe"]),
                "idUsuario": sesion["idUsuario"],
                "comandas": ids_comandas,
            }
        )


def cobrar_comandas(cobro, sesion):
    def op(datos):
        exigir_rol(sesion, [MOZO])
        ids_comandas = (cobro or {}).get("idsComandas") or []
        comandas = [buscar_comanda(datos, id_c, sesion) for id_c in ids_comandas]
        if not comandas:
            raise ApiError("VALIDACION", "Elegí al menos una comanda.")
        for c in comandas:
            if c.get("tipoCliente") != PARTICULAR:
                raise ApiError(
                    "TIPO",
                    f"La comanda {format_numero_comanda(c['numero'])} es de convenio: se cierra en cuenta corriente.",
                )
            if not puede_cobrar(c):
                raise error_de_estado(c, "cobrarla")

        total = numero_limpio(sum(c["total"] for c in comandas))
        pagos_in = (cobro or {}).get("pagos") or []
        if not pagos_in:
            raise ApiError("VALIDACION", "Registrá al menos un pago.")
        for i, pago in enumerate(pagos_in):
            errores = validar_pago(pago)
            if errores:
                raise ApiError("VALIDACION", f"Pago {i + 1}: {primer_error(errores)}")

        pagado = numero_limpio(sum(a_numero(p.get("monto")) for p in pagos_in))
        if abs(pagado - total) > 0.5:
            raise ApiError("IMPORTE", f"Los pagos suman {pagado} y el total a cobrar es {total}.")

        facturas = (cobro or {}).get("facturas") or []
        if facturas:
            _vincular_facturas(
                datos,
                comandas,
                facturas,
                bool(cobro.get("confirmarCompartida")),
                True,
                sesion,
            )

        fecha_hora = fecha_hora_iso()
        pagos = distribuir_pagos(
            [
                {
                    "id": generar_id("pago"),
                    "fechaHora": fecha_hora,
                    "medio": p["medio"],
                    "monto": numero_limpio(p["monto"]),
                    "ordenante": str(p.get("ordenante") or "").strip(),
                    "numeroOperacion": str(p.get("numeroOperacion") or "").strip(),
                    "idUsuario": sesion["idUsuario"],
                }
                for p in pagos_in
            ],
            comandas,
        )
        datos["pagos"].extend(pagos)

        estado_final = FACTURADO if facturas else COBRADO_SIN_FACTURAR
        for c in comandas:
            cambiar_estado(c, estado_final, sesion)
        return {"comandas": comandas, "estado": estado_final}

    return repositorio.transaccion(op)


# ---------------------------------------------------------------------------
# CU-08 Completar datos de factura
# ---------------------------------------------------------------------------


def completar_facturas(payload, sesion):
    def op(datos):
        exigir_rol(sesion, [MOZO, FINANZAS])
        ids_comandas = (payload or {}).get("idsComandas") or []
        comandas = [buscar_comanda(datos, id_c, sesion) for id_c in ids_comandas]
        if not comandas:
            raise ApiError("VALIDACION", "Elegí al menos una comanda.")
        for c in comandas:
            if not puede_completar_factura(c):
                raise error_de_estado(c, "cargarle la factura")
        facturas = (payload or {}).get("facturas") or []
        if not facturas:
            raise ApiError("VALIDACION", "Cargá los datos de la factura.")
        _vincular_facturas(
            datos,
            comandas,
            facturas,
            bool((payload or {}).get("confirmarCompartida")),
            True,
            sesion,
        )
        for c in comandas:
            cambiar_estado(c, FACTURADO, sesion)
        return comandas

    return repositorio.transaccion(op)


# ---------------------------------------------------------------------------
# CU-09 Anular comanda
# ---------------------------------------------------------------------------


def anular_comanda(id_comanda, motivo, sesion):
    def op(datos):
        exigir_rol(sesion, [MOZO, SUPERVISOR])
        comanda = buscar_comanda(datos, id_comanda, sesion)
        texto = str(motivo or "").strip()
        if len(texto) < 5:
            raise ApiError("VALIDACION", "El motivo es obligatorio (mínimo 5 caracteres).")
        if not puede_anular(comanda, sesion.get("rol")):
            raise ApiError("ESTADO", motivo_no_anulable(comanda, sesion.get("rol")))
        cambiar_estado(comanda, ANULADO, sesion, texto)
        return comanda

    return repositorio.transaccion(op)


# ---------------------------------------------------------------------------
# CU-10 Registrar retiro de depósito
# ---------------------------------------------------------------------------


def registrar_movimiento(movimiento, sesion):
    def op(datos):
        exigir_rol(sesion, [COCINERO])
        exigir_sucursal(sesion)
        errores = validar_movimiento(movimiento or {})
        if errores:
            raise ApiError("VALIDACION", primer_error(errores), errores)
        for linea in movimiento.get("detalle", []):
            insumo = por_id(datos["insumos"], linea.get("idInsumo"))
            if not insumo or not insumo.get("activo"):
                raise ApiError("INSUMO", "Hay un insumo que ya no está activo.")
        registro = {
            "id": generar_id("mov"),
            "numero": siguiente_numero(datos, sesion["idSucursal"], "movimiento"),
            "tipo": movimiento["tipo"],
            "idSucursal": sesion["idSucursal"],
            "idUsuario": sesion["idUsuario"],
            "fechaHora": fecha_hora_iso(),
            "turno": movimiento.get("turno") or None,
            "detalle": [
                {"idInsumo": l["idInsumo"], "cantidad": numero_limpio(l["cantidad"])}
                for l in movimiento["detalle"]
            ],
        }
        datos["movimientos"].append(registro)
        return registro

    return repositorio.transaccion(op)


# ---------------------------------------------------------------------------
# CU-11 Registrar desperdicio
# ---------------------------------------------------------------------------


def registrar_desperdicio(desperdicio, sesion):
    def op(datos):
        exigir_rol(sesion, [COCINERO])
        exigir_sucursal(sesion)
        desp = desperdicio or {}
        motivo = por_id(datos["motivosDesperdicio"], desp.get("idMotivo"))
        errores = validar_desperdicio(desp, motivo)
        if errores:
            raise ApiError("VALIDACION", primer_error(errores), errores)
        insumo = por_id(datos["insumos"], desp.get("idInsumo")) if desp.get("tipo") == "insumo" else None
        registro = {
            "id": generar_id("desp"),
            "idSucursal": sesion["idSucursal"],
            "idUsuario": sesion["idUsuario"],
            "fechaHora": fecha_hora_iso(),
            "tipo": desp["tipo"],
            "idInsumo": desp.get("idInsumo") if desp["tipo"] == "insumo" else None,
            "idProducto": desp.get("idProducto") if desp["tipo"] == "plato" else None,
            "cantidad": numero_limpio(desp["cantidad"]),
            "unidad": insumo["unidad"] if insumo else "unidad",
            "idMotivo": desp["idMotivo"],
            "observacion": str(desp.get("observacion") or "").strip(),
        }
        datos["desperdicios"].append(registro)
        return registro

    return repositorio.transaccion(op)


# ---------------------------------------------------------------------------
# CU-12 Generar informe y CU-13 Consultar comanda
# ---------------------------------------------------------------------------


def generar_informe_servicio(id_informe, filtros, sesion):
    exigir_rol(sesion, [FINANZAS, SUPERVISOR])
    datos = repositorio.obtener_datos_internos()
    return generar_informe(datos, id_informe, filtros or {})


def buscar_comandas_servicio(filtros, sesion):
    exigir_rol(sesion, [FINANZAS, SUPERVISOR])
    datos = repositorio.obtener_datos_internos()
    return buscar_comandas(datos, filtros or {})


# ---------------------------------------------------------------------------
# CU-14 Administrar maestros
# ---------------------------------------------------------------------------


def _normalizar_maestro(coleccion, registro):
    r = {**(registro or {})}
    for clave, valor in list(r.items()):
        if isinstance(valor, str):
            r[clave] = valor.strip()
    if coleccion == "usuarios":
        r["nombreUsuario"] = str(r.get("nombreUsuario") or "").lower()
    if coleccion == "empresas":
        r["cuit"] = format_cuit(r.get("cuit") or "")
    if coleccion == "trabajadores":
        r["dni"] = solo_digitos(r.get("dni") or "")
    if coleccion == "sucursales":
        r["capacidadComedor"] = numero_limpio(r.get("capacidadComedor"))
    if coleccion == "convenios":
        r["diaCorte"] = numero_limpio(r.get("diaCorte"))
        r["fechaHasta"] = r.get("fechaHasta") or None
        r["coberturas"] = [
            {
                "idProducto": c.get("idProducto"),
                "cubierto": bool(c.get("cubierto")),
                "cantidadMaximaPorDia": numero_limpio(c["cantidadMaximaPorDia"])
                if c.get("cantidadMaximaPorDia")
                else None,
            }
            for c in (r.get("coberturas") or [])
        ]
    if coleccion == "productos":
        precios = {}
        for id_suc, p in (r.get("precios") or {}).items():
            precios[id_suc] = {
                "precio": numero_limpio(p.get("precio")) or 0,
                "codigoTango": str(p.get("codigoTango") or "").strip(),
                "activo": bool(p.get("activo")),
            }
        r["precios"] = precios
    return r


def guardar_maestro(coleccion, registro, sesion):
    def op(datos):
        exigir_rol(sesion, [ADMINISTRADOR])
        if coleccion not in COLECCIONES_MAESTRAS:
            raise ApiError("COLECCION", "Colección desconocida.")
        normalizado = _normalizar_maestro(coleccion, registro)
        anterior = por_id(datos[coleccion], normalizado.get("id")) if normalizado.get("id") else None
        if normalizado.get("id") and not anterior:
            raise ApiError("NO_ENCONTRADO", "El registro ya no existe.")

        errores = VALIDADORES_MAESTROS[coleccion](datos, normalizado)
        if errores:
            raise ApiError("VALIDACION", primer_error(errores), errores)

        if coleccion == "usuarios" and anterior and anterior.get("id") == sesion.get("idUsuario"):
            if ADMINISTRADOR not in (normalizado.get("roles") or []):
                raise ApiError("PROPIO", "No podés quitarte el rol de administrador a vos mismo.")
            if normalizado.get("activo") is False:
                raise ApiError("PROPIO", "No podés desactivar tu propio usuario.")

        if anterior:
            actualizado = {**anterior, **normalizado}
            if coleccion == "usuarios" and not normalizado.get("password"):
                actualizado["password"] = anterior.get("password", "")
            anterior.clear()
            anterior.update(actualizado)
            if coleccion == "usuarios":
                return {k: v for k, v in anterior.items() if k != "password"}
            return anterior

        nuevo = {"activo": True, **normalizado, "id": generar_id(PREFIJOS[coleccion])}
        if coleccion == "sucursales":
            datos["contadores"][nuevo["id"]] = {"comanda": 0, "movimiento": 0}
        datos[coleccion].append(nuevo)
        if coleccion == "usuarios":
            return {k: v for k, v in nuevo.items() if k != "password"}
        return nuevo

    return repositorio.transaccion(op)


def cambiar_activo_maestro(coleccion, id_registro, activo, sesion):
    def op(datos):
        exigir_rol(sesion, [ADMINISTRADOR])
        if coleccion not in COLECCIONES_MAESTRAS:
            raise ApiError("COLECCION", "Colección desconocida.")
        registro = por_id(datos.get(coleccion, []), id_registro)
        if not registro:
            raise ApiError("NO_ENCONTRADO", "El registro ya no existe.")
        activo_bool = bool(activo)
        if not activo_bool:
            if coleccion == "usuarios" and id_registro == sesion.get("idUsuario"):
                raise ApiError("PROPIO", "No podés desactivar tu propio usuario.")
            if (
                coleccion == "usuarios"
                and ADMINISTRADOR in (registro.get("roles") or [])
                and sum(
                    1
                    for u in datos["usuarios"]
                    if u.get("activo") and ADMINISTRADOR in (u.get("roles") or [])
                )
                <= 1
            ):
                raise ApiError("ULTIMO_ADMIN", "Tiene que quedar al menos un administrador activo.")
            if coleccion == "sucursales":
                abiertas = sum(
                    1
                    for c in datos["comandas"]
                    if c.get("idSucursal") == id_registro and c.get("estado") in ESTADOS_ACTIVOS
                )
                if abiertas > 0:
                    raise ApiError(
                        "EN_USO",
                        f"La sucursal tiene {abiertas} comanda(s) abierta(s). Cerralas antes de desactivarla.",
                    )
        elif coleccion == "convenios":
            errores = VALIDADORES_MAESTROS["convenios"](datos, {**registro, "activo": True})
            if errores.get("fechaDesde"):
                raise ApiError("VALIDACION", errores["fechaDesde"])
        registro["activo"] = activo_bool
        if coleccion == "usuarios":
            return {k: v for k, v in registro.items() if k != "password"}
        return registro

    return repositorio.transaccion(op)


def importar_trabajadores(id_empresa, filas, sesion):
    def op(datos):
        exigir_rol(sesion, [ADMINISTRADOR])
        if not any(e.get("id") == id_empresa for e in datos["empresas"]):
            raise ApiError("VALIDACION", "Elegí la empresa.")
        if not filas:
            raise ApiError("VALIDACION", "El archivo no tiene filas para importar.")
        importados = []
        omitidos = []
        for i, fila in enumerate(filas):
            candidato = _normalizar_maestro(
                "trabajadores",
                {
                    "nombre": (fila or {}).get("nombre") or "",
                    "apellido": (fila or {}).get("apellido") or "",
                    "dni": (fila or {}).get("dni") or "",
                    "idEmpresa": id_empresa,
                    "activo": True,
                },
            )
            errores = VALIDADORES_MAESTROS["trabajadores"](datos, candidato)
            if errores:
                omitidos.append(
                    {
                        "fila": i + 2,
                        "motivo": primer_error(errores),
                        "nombre": f"{candidato['apellido']}, {candidato['nombre']}",
                    }
                )
                continue
            nuevo = {**candidato, "id": generar_id("trab")}
            datos["trabajadores"].append(nuevo)
            importados.append(nuevo)
        return {"importados": len(importados), "omitidos": omitidos}

    return repositorio.transaccion(op)


def restablecer_datos(sesion):
    exigir_rol(sesion, [ADMINISTRADOR])
    return repositorio.restablecer_semilla(sincronizar_firestore=True)
