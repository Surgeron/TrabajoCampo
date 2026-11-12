"""Reglas de negocio puras. Equivalen a src/domain (constantes, estados, selectores, reglas, validaciones).

Las funciones reciben `datos`: un dict con las listas de cada colección
(sucursales, usuarios, productos, ...), igual que el objeto `db` del frontend.
"""
import re

from .utilidades import a_numero, es_entero, normalizar, solo_digitos, vacio

# ---------------------------------------------------------------------------
# Constantes (src/domain/constantes.js)
# ---------------------------------------------------------------------------

MOZO, COCINERO, FINANZAS, SUPERVISOR, ADMINISTRADOR = "mozo", "cocinero", "finanzas", "supervisor", "administrador"
ROLES = [MOZO, COCINERO, FINANZAS, SUPERVISOR, ADMINISTRADOR]

INICIADO = "iniciado"
ADICION = "adicion"
LISTO = "listo"
ENTREGADO = "entregado"
CUENTA_CORRIENTE = "cuenta_corriente"
COBRADO_SIN_FACTURAR = "cobrado_sin_facturar"
FACTURADO = "facturado"
ANULADO = "anulado"

ESTADOS_LABEL = {
    INICIADO: "Iniciado",
    ADICION: "Adición de pedido",
    LISTO: "Listo para entregar",
    ENTREGADO: "Entregado",
    CUENTA_CORRIENTE: "Cuenta corriente",
    COBRADO_SIN_FACTURAR: "Cobrado sin facturar",
    FACTURADO: "Facturado",
    ANULADO: "Anulado",
}

ESTADOS_ACTIVOS = [INICIADO, ADICION, LISTO, ENTREGADO]
ESTADOS_EN_COCINA = [INICIADO, ADICION]

CONVENIO, PARTICULAR = "convenio", "particular"
MEDIOS_PAGO = ["efectivo", "transferencia"]
TIPOS_COMPROBANTE = ["Factura A", "Factura B", "Factura C"]
UNIDADES = ["kg", "L", "unidad"]
TIPOS_MOVIMIENTO = ["retiro", "devolucion"]
TURNOS = ["desayuno", "almuerzo", "merienda", "cena"]

MAX_INTENTOS_LOGIN = 5
MINUTOS_BLOQUEO_LOGIN = 5
MESA_MAXIMA = 99

# ---------------------------------------------------------------------------
# Estados (src/domain/estados.js)
# ---------------------------------------------------------------------------


def puede_agregar_adicion(comanda):
    return comanda["estado"] in ESTADOS_ACTIVOS


def puede_marcar_listo(comanda):
    return comanda["estado"] in ESTADOS_EN_COCINA


def puede_marcar_entregado(comanda):
    return comanda["estado"] == LISTO


def puede_cobrar(comanda):
    return comanda["estado"] == ENTREGADO


def puede_completar_factura(comanda):
    return comanda["estado"] == COBRADO_SIN_FACTURAR and comanda.get("tipoCliente") == PARTICULAR


def puede_anular(comanda, rol):
    """CU-09: el mozo solo anula en Iniciado; después de pasar por cocina, solo el supervisor."""
    if rol == MOZO:
        return comanda["estado"] == INICIADO
    if rol == SUPERVISOR:
        return comanda["estado"] in ESTADOS_ACTIVOS
    return False


def motivo_no_anulable(comanda, rol):
    if puede_anular(comanda, rol):
        return None
    estado = comanda["estado"]
    if estado in (CUENTA_CORRIENTE, FACTURADO):
        return "Una comanda en cuenta corriente o facturada no se anula: la corrección es una nota de crédito en Tango."
    if estado == COBRADO_SIN_FACTURAR:
        return "La comanda ya tiene un pago registrado."
    if estado == ANULADO:
        return "La comanda ya está anulada."
    if rol == MOZO:
        return "Después de pasar por cocina, solo el supervisor puede anular."
    return "Tu rol no puede anular comandas."


# ---------------------------------------------------------------------------
# Selectores (src/domain/selectores.js)
# ---------------------------------------------------------------------------


def por_id(lista, id_buscado):
    return next((item for item in lista if item.get("id") == id_buscado), None)


def convenio_vigente(datos, id_empresa, fecha):
    return next(
        (
            c
            for c in datos["convenios"]
            if c.get("idEmpresa") == id_empresa
            and c.get("activo")
            and c.get("fechaDesde", "") <= fecha
            and (not c.get("fechaHasta") or c["fechaHasta"] >= fecha)
        ),
        None,
    )


def precio_en_sucursal(producto, id_sucursal):
    precio = (producto.get("precios") or {}).get(id_sucursal)
    return precio if precio and precio.get("activo") else None


# ---------------------------------------------------------------------------
# Reglas (src/domain/reglas.js)
# ---------------------------------------------------------------------------


def turno_por_hora(fecha_hora):
    hora = int(fecha_hora[11:13])
    if 5 <= hora < 11:
        return "desayuno"
    if 11 <= hora < 16:
        return "almuerzo"
    if 16 <= hora < 19:
        return "merienda"
    return "cena"


def determinar_turno(datos, items, fecha_hora):
    """El turno de la primera comida pedida; si solo hay bebidas, el de la hora de alta."""
    for item in items:
        producto = por_id(datos["productos"], item["idProducto"])
        categoria = por_id(datos["categorias"], producto["idCategoria"]) if producto else None
        if categoria and categoria.get("turno"):
            return categoria["turno"]
    return turno_por_hora(fecha_hora)


def calcular_total(items):
    total = sum(item["cantidad"] * item["precioUnitario"] for item in items)
    return int(total) if float(total).is_integer() else round(total, 2)


def armar_items(datos, cantidades, id_sucursal):
    """Convierte {idProducto: cantidad} en ítems con el precio de la sucursal."""
    items = []
    for id_producto, cantidad in cantidades.items():
        if not (a_numero(cantidad) > 0):
            continue
        producto = por_id(datos["productos"], id_producto)
        precio = precio_en_sucursal(producto, id_sucursal) if producto else None
        items.append(
            {
                "idProducto": id_producto,
                "nombre": producto["nombre"] if producto else "Producto",
                "cantidad": cantidad,
                "precioUnitario": (precio or {}).get("precio") or 0,
            }
        )
    return items


def consumos_del_dia(comandas_del_trabajador, id_trabajador, fecha):
    """Cantidad de cada producto que el trabajador ya consumió en el día (convenio, no anuladas)."""
    consumos = {}
    for c in comandas_del_trabajador:
        if (
            c.get("idTrabajador") == id_trabajador
            and c.get("tipoCliente") == CONVENIO
            and c.get("estado") != ANULADO
            and c.get("fechaHora", "")[:10] == fecha
        ):
            for item in c.get("items", []):
                consumos[item["idProducto"]] = consumos.get(item["idProducto"], 0) + item["cantidad"]
    return consumos


def evaluar_cobertura(datos, comandas_del_trabajador, id_trabajador, items, fecha):
    """Separa lo que cubre el convenio vigente de lo que queda fuera (y por qué)."""
    trabajador = por_id(datos["trabajadores"], id_trabajador)
    convenio = convenio_vigente(datos, trabajador["idEmpresa"], fecha) if trabajador else None
    cubiertos, no_cubiertos = [], []
    if not convenio:
        no_cubiertos = [{**item, "motivo": "La empresa no tiene un convenio vigente."} for item in items]
        return convenio, cubiertos, no_cubiertos

    consumidos = consumos_del_dia(comandas_del_trabajador, id_trabajador, fecha)
    for item in items:
        cobertura = next((c for c in convenio.get("coberturas", []) if c.get("idProducto") == item["idProducto"]), None)
        if not cobertura or not cobertura.get("cubierto"):
            no_cubiertos.append({**item, "motivo": "No está cubierto por el convenio."})
            continue
        maximo = cobertura.get("cantidadMaximaPorDia")
        if not maximo:
            cubiertos.append(item)
            continue
        ya_consumido = consumidos.get(item["idProducto"], 0)
        disponible = max(0, maximo - ya_consumido)
        cantidad_cubierta = min(disponible, item["cantidad"])
        if cantidad_cubierta > 0:
            cubiertos.append({**item, "cantidad": cantidad_cubierta})
        if item["cantidad"] > cantidad_cubierta:
            no_cubiertos.append(
                {
                    **item,
                    "cantidad": item["cantidad"] - cantidad_cubierta,
                    "motivo": f"Supera el máximo diario del convenio ({maximo} por día).",
                }
            )
        consumidos[item["idProducto"]] = ya_consumido + cantidad_cubierta
    return convenio, cubiertos, no_cubiertos


def distribuir_pagos(pagos, comandas):
    """Reparte los pagos entre las comandas en orden (una transferencia puede pagar varias)."""
    pendientes = [{"idComanda": c["id"], "saldo": c["total"]} for c in comandas]
    resultado = []
    for pago in pagos:
        restante = pago["monto"]
        aplicaciones = []
        for p in pendientes:
            if restante <= 0 or p["saldo"] <= 0:
                continue
            aplicado = min(restante, p["saldo"])
            aplicaciones.append({"idComanda": p["idComanda"], "montoAplicado": aplicado})
            p["saldo"] -= aplicado
            restante -= aplicado
        resultado.append({**pago, "aplicaciones": aplicaciones})
    return resultado


# ---------------------------------------------------------------------------
# Validaciones (src/domain/validaciones.js)
# ---------------------------------------------------------------------------

_PESOS_CUIT = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]


def cuit_valido(valor):
    digitos = solo_digitos(valor)
    if len(digitos) != 11:
        return False
    suma = sum(peso * int(digitos[i]) for i, peso in enumerate(_PESOS_CUIT))
    verificador = 11 - (suma % 11)
    if verificador == 11:
        verificador = 0
    if verificador == 10:
        verificador = 9
    return verificador == int(digitos[10])


def _existe_otro(lista, registro, comparar):
    return any(otro.get("id") != registro.get("id") and comparar(otro) for otro in lista)


def validar_comanda(pedido, items):
    errores = {}
    tipo = pedido.get("tipoCliente")
    if not tipo:
        errores["tipoCliente"] = "Indicá si el cliente tiene convenio."
    if tipo == CONVENIO and not pedido.get("idTrabajador"):
        errores["idTrabajador"] = "Elegí el trabajador."
    mesa = pedido.get("mesa")
    numero_mesa = a_numero(mesa)
    if vacio(mesa):
        errores["mesa"] = "Ingresá el número de mesa."
    elif not es_entero(numero_mesa) or numero_mesa < 1 or numero_mesa > MESA_MAXIMA:
        errores["mesa"] = f"La mesa debe ser un número entre 1 y {MESA_MAXIMA}."
    if not items:
        errores["items"] = "Agregá al menos un ítem al pedido."
    return errores


def validar_pago(pago):
    errores = {}
    if not pago.get("medio"):
        errores["medio"] = "Elegí el medio de pago."
    elif pago["medio"] not in MEDIOS_PAGO:
        errores["medio"] = "Medio de pago desconocido."
    if not (a_numero(pago.get("monto")) > 0):
        errores["monto"] = "El monto debe ser mayor a cero."
    ordenante = pago.get("ordenante")
    if ordenante and len(solo_digitos(ordenante)) == 11 and not cuit_valido(ordenante):
        errores["ordenante"] = "El CUIT del ordenante no es válido."
    return errores


def validar_factura(factura):
    errores = {}
    if not factura.get("tipoComprobante"):
        errores["tipoComprobante"] = "Elegí el tipo de comprobante."
    pv = a_numero(factura.get("puntoVenta"))
    if not es_entero(pv) or pv < 1 or pv > 9999:
        errores["puntoVenta"] = "Punto de venta: entre 1 y 9999."
    numero = a_numero(factura.get("numero"))
    if not es_entero(numero) or numero < 1 or numero > 99999999:
        errores["numero"] = "Número: entre 1 y 99999999."
    if vacio(factura.get("fecha")):
        errores["fecha"] = "Ingresá la fecha de la factura."
    if vacio(factura.get("clienteFacturado")):
        errores["clienteFacturado"] = "Ingresá a nombre de quién se facturó."
    cuit = factura.get("cuitCliente")
    if not vacio(cuit) and not cuit_valido(cuit):
        errores["cuitCliente"] = "CUIT inválido."
    if factura.get("tipoComprobante") == "Factura A" and vacio(cuit):
        errores["cuitCliente"] = "La factura A requiere el CUIT del cliente."
    if not (a_numero(factura.get("importe")) > 0):
        errores["importe"] = "El importe debe ser mayor a cero."
    return errores


def misma_factura(a, b):
    return (
        a.get("tipoComprobante") == b.get("tipoComprobante")
        and a_numero(a.get("puntoVenta")) == a_numero(b.get("puntoVenta"))
        and a_numero(a.get("numero")) == a_numero(b.get("numero"))
    )


def _validar_usuario(datos, u):
    e = {}
    if vacio(u.get("nombre")):
        e["nombre"] = "Ingresá el nombre."
    if vacio(u.get("apellido")):
        e["apellido"] = "Ingresá el apellido."
    nombre_usuario = u.get("nombreUsuario")
    if vacio(nombre_usuario):
        e["nombreUsuario"] = "Ingresá el nombre de usuario."
    elif not re.fullmatch(r"[a-z0-9._]{3,30}", nombre_usuario):
        e["nombreUsuario"] = "Solo minúsculas, números, punto o guion bajo (3 a 30)."
    elif _existe_otro(datos["usuarios"], u, lambda o: o.get("nombreUsuario") == nombre_usuario):
        e["nombreUsuario"] = "Ya existe un usuario con ese nombre."
    if not u.get("id") and vacio(u.get("password")):
        e["password"] = "Ingresá una contraseña."
    if not vacio(u.get("password")) and len(str(u["password"])) < 4:
        e["password"] = "Mínimo 4 caracteres."
    roles = u.get("roles") or []
    if not roles:
        e["roles"] = "Asigná al menos un rol."
    elif any(r not in ROLES for r in roles):
        e["roles"] = "Hay un rol desconocido."
    return e


def _validar_sucursal(datos, s):
    e = {}
    if vacio(s.get("nombre")):
        e["nombre"] = "Ingresá el nombre."
    elif _existe_otro(datos["sucursales"], s, lambda o: normalizar(o.get("nombre")) == normalizar(s["nombre"])):
        e["nombre"] = "Ya existe una sucursal con ese nombre."
    if vacio(s.get("ubicacion")):
        e["ubicacion"] = "Ingresá la ubicación."
    capacidad = a_numero(s.get("capacidadComedor"))
    if not es_entero(capacidad) or capacidad < 1:
        e["capacidadComedor"] = "Capacidad: número entero mayor a 0."
    return e


def _validar_empresa(datos, emp):
    e = {}
    if vacio(emp.get("razonSocial")):
        e["razonSocial"] = "Ingresá la razón social."
    elif _existe_otro(
        datos["empresas"], emp, lambda o: normalizar(o.get("razonSocial")) == normalizar(emp["razonSocial"])
    ):
        e["razonSocial"] = "Ya existe una empresa con esa razón social."
    if vacio(emp.get("cuit")):
        e["cuit"] = "Ingresá el CUIT."
    elif not cuit_valido(emp["cuit"]):
        e["cuit"] = "CUIT inválido (11 dígitos con dígito verificador)."
    elif _existe_otro(datos["empresas"], emp, lambda o: solo_digitos(o.get("cuit")) == solo_digitos(emp["cuit"])):
        e["cuit"] = "Ya existe una empresa con ese CUIT."
    return e


def _validar_trabajador(datos, t):
    e = {}
    if vacio(t.get("nombre")):
        e["nombre"] = "Ingresá el nombre."
    if vacio(t.get("apellido")):
        e["apellido"] = "Ingresá el apellido."
    if vacio(t.get("idEmpresa")):
        e["idEmpresa"] = "Elegí la empresa."
    dni = t.get("dni")
    if not vacio(dni) and not re.fullmatch(r"\d{7,8}", solo_digitos(dni)):
        e["dni"] = "El DNI tiene 7 u 8 dígitos."
    if (
        "nombre" not in e
        and "apellido" not in e
        and _existe_otro(
            datos["trabajadores"],
            t,
            lambda o: o.get("idEmpresa") == t.get("idEmpresa")
            and normalizar(o.get("nombre")) == normalizar(t["nombre"])
            and normalizar(o.get("apellido")) == normalizar(t["apellido"]),
        )
    ):
        e["apellido"] = "Ese trabajador ya está cargado en la empresa."
    if not vacio(dni) and _existe_otro(
        datos["trabajadores"], t, lambda o: o.get("dni") and solo_digitos(o["dni"]) == solo_digitos(dni)
    ):
        e["dni"] = "Ya existe un trabajador con ese DNI."
    return e


def _validar_convenio(datos, c):
    e = {}
    if vacio(c.get("idEmpresa")):
        e["idEmpresa"] = "Elegí la empresa."
    if vacio(c.get("fechaDesde")):
        e["fechaDesde"] = "Ingresá la fecha de inicio."
    if not vacio(c.get("fechaHasta")) and c["fechaHasta"] < (c.get("fechaDesde") or ""):
        e["fechaHasta"] = "Debe ser posterior al inicio."
    corte = a_numero(c.get("diaCorte"))
    if not es_entero(corte) or corte < 1 or corte > 28:
        e["diaCorte"] = "Día de corte entre 1 y 28."
    coberturas = c.get("coberturas") or []
    if not any(cob.get("cubierto") for cob in coberturas):
        e["coberturas"] = "El convenio debe cubrir al menos un producto."
    for cob in coberturas:
        maximo = cob.get("cantidadMaximaPorDia")
        if not vacio(maximo) and not (a_numero(maximo) >= 1):
            e["coberturas"] = "La cantidad máxima por día debe ser 1 o más."

    def hasta(conv):
        return conv.get("fechaHasta") or "9999-12-31"

    if (
        c.get("activo") is not False
        and "idEmpresa" not in e
        and "fechaDesde" not in e
        and _existe_otro(
            datos["convenios"],
            c,
            lambda o: o.get("activo")
            and o.get("idEmpresa") == c["idEmpresa"]
            and o.get("fechaDesde", "") <= hasta(c)
            and c["fechaDesde"] <= hasta(o),
        )
    ):
        e["fechaDesde"] = "Se superpone con otro convenio activo de la misma empresa."
    return e


def _validar_producto(datos, p):
    e = {}
    if vacio(p.get("nombre")):
        e["nombre"] = "Ingresá el nombre."
    elif _existe_otro(datos["productos"], p, lambda o: normalizar(o.get("nombre")) == normalizar(p["nombre"])):
        e["nombre"] = "Ya existe un producto con ese nombre."
    if vacio(p.get("idCategoria")):
        e["idCategoria"] = "Elegí la categoría."
    precios = p.get("precios") or {}
    for id_sucursal, precio in precios.items():
        if not precio.get("activo"):
            continue
        if not (a_numero(precio.get("precio")) > 0):
            e[f"precio_{id_sucursal}"] = "Precio mayor a cero."
        if vacio(precio.get("codigoTango")):
            e[f"codigo_{id_sucursal}"] = "Ingresá el código de Tango."
        elif any(
            o.get("id") != p.get("id")
            and ((o.get("precios") or {}).get(id_sucursal) or {}).get("codigoTango") == precio["codigoTango"]
            for o in datos["productos"]
        ):
            e[f"codigo_{id_sucursal}"] = "Ese código ya está usado en esta sucursal."
    if not any(precio.get("activo") for precio in precios.values()):
        e["precios"] = "Habilitá el producto en al menos una sucursal."
    return e


def _validar_insumo(datos, i):
    e = {}
    if vacio(i.get("nombre")):
        e["nombre"] = "Ingresá el nombre."
    elif _existe_otro(datos["insumos"], i, lambda o: normalizar(o.get("nombre")) == normalizar(i["nombre"])):
        e["nombre"] = "Ya existe un insumo con ese nombre."
    if vacio(i.get("unidad")):
        e["unidad"] = "Elegí la unidad de medida."
    if vacio(i.get("codigoTango")):
        e["codigoTango"] = "Ingresá el código de Tango."
    elif _existe_otro(datos["insumos"], i, lambda o: o.get("codigoTango") == i["codigoTango"]):
        e["codigoTango"] = "Ese código ya está usado."
    return e


def _validar_motivo(datos, m):
    e = {}
    if vacio(m.get("descripcion")):
        e["descripcion"] = "Ingresá la descripción."
    elif _existe_otro(
        datos["motivosDesperdicio"], m, lambda o: normalizar(o.get("descripcion")) == normalizar(m["descripcion"])
    ):
        e["descripcion"] = "Ese motivo ya existe."
    return e


VALIDADORES_MAESTROS = {
    "usuarios": _validar_usuario,
    "sucursales": _validar_sucursal,
    "empresas": _validar_empresa,
    "trabajadores": _validar_trabajador,
    "convenios": _validar_convenio,
    "productos": _validar_producto,
    "insumos": _validar_insumo,
    "motivosDesperdicio": _validar_motivo,
}


def validar_movimiento(mov):
    errores = {}
    if not mov.get("tipo"):
        errores["tipo"] = "Elegí retiro o devolución."
    elif mov["tipo"] not in TIPOS_MOVIMIENTO:
        errores["tipo"] = "Tipo de movimiento desconocido."
    lineas = mov.get("detalle") or []
    if not lineas:
        errores["detalle"] = "Agregá al menos un insumo."
    for i, linea in enumerate(lineas):
        if not linea.get("idInsumo"):
            errores[f"insumo_{i}"] = "Elegí el insumo."
        if not (a_numero(linea.get("cantidad")) > 0):
            errores[f"cantidad_{i}"] = "Cantidad mayor a cero."
    ids = [linea.get("idInsumo") for linea in lineas if linea.get("idInsumo")]
    if len(set(ids)) != len(ids):
        errores["detalle"] = "Hay un insumo repetido: sumá las cantidades en una sola línea."
    return errores


def validar_desperdicio(desp, motivo):
    errores = {}
    tipo = desp.get("tipo")
    if not tipo:
        errores["tipo"] = "Elegí insumo o plato."
    elif tipo not in ("insumo", "plato"):
        errores["tipo"] = "Tipo de desperdicio desconocido."
    if tipo == "insumo" and not desp.get("idInsumo"):
        errores["idInsumo"] = "Elegí el insumo."
    if tipo == "plato" and not desp.get("idProducto"):
        errores["idProducto"] = "Elegí el plato."
    if not (a_numero(desp.get("cantidad")) > 0):
        errores["cantidad"] = "Cantidad mayor a cero."
    if not desp.get("idMotivo"):
        errores["idMotivo"] = "Elegí el motivo."
    if motivo and normalizar(motivo.get("descripcion")) == "otro" and vacio(desp.get("observacion")):
        errores["observacion"] = "Con el motivo «Otro», la observación es obligatoria."
    return errores


def primer_error(errores):
    return next(iter(errores.values()))
