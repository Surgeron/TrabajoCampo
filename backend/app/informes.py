"""Generación de informes (CU-12) y consulta histórica de comandas (CU-13).

Equivale a src/domain/informes.js y buscarComandas de src/services/mockApi.js.
"""
import re

from .dominio import (
    ANULADO,
    COBRADO_SIN_FACTURAR,
    CONVENIO,
    CUENTA_CORRIENTE,
    ENTREGADO,
    ESTADOS_LABEL,
    FACTURADO,
    PARTICULAR,
    por_id,
)
from .errores import ApiError
from .utilidades import a_numero, format_comprobante, format_numero_comanda, numero_limpio, sumar_dias

TURNOS_LABEL = {
    "desayuno": "Desayuno",
    "almuerzo": "Almuerzo",
    "merienda": "Merienda",
    "cena": "Cena",
}

MEDIOS_PAGO_INFO = {
    "efectivo": "Efectivo",
    "transferencia": "Transferencia",
    "cuenta_corriente": "Cuenta corriente",
}


def _dia(fecha_hora):
    return (fecha_hora or "")[:10]


def _en_rango(fecha, filtros):
    return filtros["desde"] <= fecha <= filtros["hasta"]


def _rango_de_fechas(desde, hasta):
    fechas = []
    actual = desde
    while actual <= hasta:
        fechas.append(actual)
        actual = sumar_dias(actual, 1)
    return fechas


def _sumar(filas, clave):
    return numero_limpio(sum(a_numero(f.get(clave)) for f in filas))


def _columna(clave, titulo, tipo="texto", **extra):
    return {"clave": clave, "titulo": titulo, "tipo": tipo, **extra}


def _es_comida(datos, id_producto):
    producto = por_id(datos["productos"], id_producto)
    categoria = por_id(datos["categorias"], producto.get("idCategoria")) if producto else None
    return (categoria or {}).get("tipo") == "comida"


def _pagos_de_comanda(datos, id_comanda):
    return [
        p
        for p in datos["pagos"]
        if any(a.get("idComanda") == id_comanda for a in p.get("aplicaciones", []))
    ]


def _facturas_de_comanda(datos, id_comanda):
    return [f for f in datos["facturas"] if id_comanda in (f.get("comandas") or [])]


def _medios_de_pago(datos, comanda):
    if comanda.get("estado") == CUENTA_CORRIENTE:
        return ["cuenta_corriente"]
    vistos = []
    for p in _pagos_de_comanda(datos, comanda["id"]):
        m = p.get("medio")
        if m and m not in vistos:
            vistos.append(m)
    return vistos


def _empresa_de_comanda(datos, comanda):
    id_trab = comanda.get("idTrabajador")
    trabajador = por_id(datos["trabajadores"], id_trab) if id_trab else None
    return por_id(datos["empresas"], trabajador.get("idEmpresa")) if trabajador else None


def _nombre_usuario(datos, id_usuario):
    u = por_id(datos["usuarios"], id_usuario) if id_usuario else None
    return f"{u['nombre']} {u['apellido']}" if u else "—"


def _comandas_filtradas(datos, filtros, incluir_anuladas=False):
    id_sucursal = filtros.get("idSucursal")
    turno = filtros.get("turno")
    return [
        c
        for c in datos["comandas"]
        if _en_rango(_dia(c.get("fechaHora", "")), filtros)
        and (not id_sucursal or c.get("idSucursal") == id_sucursal)
        and (not turno or c.get("turno") == turno)
        and (incluir_anuladas or c.get("estado") != ANULADO)
    ]


def _cumple_medio_pago(datos, comanda, medio):
    return not medio or medio in _medios_de_pago(datos, comanda)


def _monto_por_medio(datos, comanda):
    montos = {"efectivo": 0, "transferencia": 0, "cuenta_corriente": 0}
    if comanda.get("tipoCliente") == CONVENIO:
        montos["cuenta_corriente"] = comanda.get("total", 0) if comanda.get("estado") == CUENTA_CORRIENTE else 0
        return montos
    for p in _pagos_de_comanda(datos, comanda["id"]):
        medio = p.get("medio")
        aplicacion = next((a for a in p.get("aplicaciones", []) if a.get("idComanda") == comanda["id"]), None)
        if medio in montos and aplicacion:
            montos[medio] = numero_limpio(montos[medio] + a_numero(aplicacion.get("montoAplicado")))
    return montos


def _saltos_de_numeracion(numeros):
    if not numeros:
        return []
    ordenados = sorted(numeros)
    conjunto = set(ordenados)
    return [n for n in range(ordenados[0], ordenados[-1] + 1) if n not in conjunto]


# ---------------------------------------------------------------------------
# Generadores de cada informe
# ---------------------------------------------------------------------------


def _informe_ventas(datos, filtros):
    grupos = {}
    for c in _comandas_filtradas(datos, filtros):
        if not _cumple_medio_pago(datos, c, filtros.get("medioPago")):
            continue
        fecha = _dia(c["fechaHora"])
        clave = f"{fecha}|{c['idSucursal']}|{c['turno']}"
        if clave not in grupos:
            suc = por_id(datos["sucursales"], c["idSucursal"])
            grupos[clave] = {
                "id": clave,
                "fecha": fecha,
                "sucursal": suc["nombre"] if suc else "",
                "turno": TURNOS_LABEL.get(c.get("turno"), "—"),
                "comandas": 0,
                "platos": 0,
                "bebidas": 0,
                "efectivo": 0,
                "transferencia": 0,
                "cuentaCorriente": 0,
                "importe": 0,
            }
        g = grupos[clave]
        g["comandas"] += 1
        for item in c.get("items", []):
            if _es_comida(datos, item["idProducto"]):
                g["platos"] += item["cantidad"]
            else:
                g["bebidas"] += item["cantidad"]
        montos = _monto_por_medio(datos, c)
        g["efectivo"] = numero_limpio(g["efectivo"] + montos["efectivo"])
        g["transferencia"] = numero_limpio(g["transferencia"] + montos["transferencia"])
        g["cuentaCorriente"] = numero_limpio(g["cuentaCorriente"] + montos["cuenta_corriente"])
        g["importe"] = numero_limpio(g["importe"] + c.get("total", 0))

    filas = sorted(grupos.values(), key=lambda x: x["sucursal"])
    filas.sort(key=lambda x: x["fecha"], reverse=True)
    columnas = [
        _columna("fecha", "Fecha", "fecha", principal=True),
        _columna("sucursal", "Sucursal"),
        _columna("turno", "Turno"),
        _columna("comandas", "Comandas", "numero"),
        _columna("platos", "Platos", "numero"),
        _columna("bebidas", "Bebidas", "numero"),
        _columna("efectivo", "Efectivo", "moneda"),
        _columna("transferencia", "Transferencia", "moneda"),
        _columna("cuentaCorriente", "Cuenta corriente", "moneda"),
        _columna("importe", "Importe total", "moneda"),
    ]
    claves_totales = ["comandas", "platos", "bebidas", "efectivo", "transferencia", "cuentaCorriente", "importe"]
    totales = {k: _sumar(filas, k) for k in claves_totales}
    return {"columnas": columnas, "filas": filas, "totales": totales}


def _informe_sin_facturar(datos, filtros):
    filas = []
    for c in _comandas_filtradas(datos, filtros):
        if c.get("tipoCliente") != PARTICULAR or c.get("estado") not in (COBRADO_SIN_FACTURAR, ENTREGADO):
            continue
        suc = por_id(datos["sucursales"], c["idSucursal"])
        medios = [MEDIOS_PAGO_INFO.get(m, m) for m in _medios_de_pago(datos, c)]
        ordenantes = [p.get("ordenante") for p in _pagos_de_comanda(datos, c["id"]) if p.get("ordenante")]
        filas.append(
            {
                "id": c["id"],
                "comanda": format_numero_comanda(c["numero"]),
                "fecha": c["fechaHora"],
                "sucursal": suc["nombre"] if suc else "",
                "estado": ESTADOS_LABEL.get(c["estado"], c["estado"]),
                "medio": " + ".join(medios) or "Sin cobrar",
                "ordenante": ", ".join(ordenantes),
                "total": c["total"],
            }
        )
    filas.sort(key=lambda x: x["fecha"])
    return {
        "columnas": [
            _columna("comanda", "Comanda", "texto", principal=True),
            _columna("fecha", "Fecha", "fechaHora"),
            _columna("sucursal", "Sucursal"),
            _columna("estado", "Estado"),
            _columna("medio", "Medio de pago"),
            _columna("ordenante", "Quién transfirió"),
            _columna("total", "Total", "moneda"),
        ],
        "filas": filas,
        "totales": {"total": _sumar(filas, "total")},
    }


def _informe_comandas_facturas(datos, filtros):
    filas = []
    for c in _comandas_filtradas(datos, filtros):
        if (
            c.get("tipoCliente") != PARTICULAR
            or c.get("estado") not in (FACTURADO, COBRADO_SIN_FACTURAR)
            or not _cumple_medio_pago(datos, c, filtros.get("medioPago"))
        ):
            continue
        pagos = _pagos_de_comanda(datos, c["id"])
        facturas = _facturas_de_comanda(datos, c["id"])
        suc = por_id(datos["sucursales"], c["idSucursal"])
        filas.append(
            {
                "id": c["id"],
                "comanda": format_numero_comanda(c["numero"]),
                "fecha": c["fechaHora"],
                "sucursal": suc["nombre"] if suc else "",
                "medio": " + ".join(MEDIOS_PAGO_INFO.get(m, m) for m in _medios_de_pago(datos, c)),
                "ordenante": ", ".join(p["ordenante"] for p in pagos if p.get("ordenante")),
                "operacion": ", ".join(p["numeroOperacion"] for p in pagos if p.get("numeroOperacion")),
                "factura": ", ".join(format_comprobante(f) for f in facturas) or "Sin factura",
                "cliente": ", ".join(f["clienteFacturado"] for f in facturas if f.get("clienteFacturado")),
                "total": c["total"],
            }
        )
    filas.sort(key=lambda x: x["fecha"], reverse=True)
    return {
        "columnas": [
            _columna("comanda", "Comanda", "texto", principal=True),
            _columna("fecha", "Fecha", "fechaHora"),
            _columna("sucursal", "Sucursal"),
            _columna("medio", "Medio de pago"),
            _columna("ordenante", "Ordenante"),
            _columna("operacion", "N° operación"),
            _columna("factura", "Factura"),
            _columna("cliente", "Facturado a"),
            _columna("total", "Total", "moneda"),
        ],
        "filas": filas,
        "totales": {"total": _sumar(filas, "total")},
    }


def _informe_consumo_empresa(datos, filtros):
    comandas = [
        c
        for c in _comandas_filtradas(datos, {**filtros, "turno": None})
        if c.get("tipoCliente") == CONVENIO
        and c.get("estado") != ANULADO
        and (_empresa_de_comanda(datos, c) or {}).get("id") == filtros.get("idEmpresa")
    ]
    ids_productos = []
    for c in comandas:
        for item in c.get("items", []):
            if item["idProducto"] not in ids_productos:
                ids_productos.append(item["idProducto"])
    productos = [p for p in datos["productos"] if p["id"] in ids_productos]

    filas = []
    for fecha in _rango_de_fechas(filtros["desde"], filtros["hasta"]):
        del_dia = [c for c in comandas if _dia(c["fechaHora"]) == fecha]
        importe = numero_limpio(sum(c.get("total", 0) for c in del_dia))
        if importe <= 0:
            continue
        fila = {"id": fecha, "fecha": fecha, "importe": importe}
        for p in productos:
            fila[p["id"]] = sum(
                item["cantidad"]
                for c in del_dia
                for item in c.get("items", [])
                if item["idProducto"] == p["id"]
            )
        filas.append(fila)

    columnas = [
        _columna("fecha", "Fecha", "fecha", principal=True),
        *[_columna(p["id"], p["nombre"], "numero") for p in productos],
        _columna("importe", "Importe (precio de lista)", "moneda"),
    ]
    totales = {k: _sumar(filas, k) for k in [*[p["id"] for p in productos], "importe"]}
    return {
        "columnas": columnas,
        "filas": filas,
        "totales": totales,
        "nota": f"Período {filtros['desde']} al {filtros['hasta']}. Los precios del certificado los define Comercial según el contrato.",
    }


def _informe_fuera_convenio(datos, filtros):
    id_empresa = filtros.get("idEmpresa")
    filas = []
    for c in _comandas_filtradas(datos, filtros):
        if c.get("tipoCliente") != PARTICULAR or not c.get("idTrabajador"):
            continue
        trabajador = por_id(datos["trabajadores"], c["idTrabajador"])
        if id_empresa and (trabajador or {}).get("idEmpresa") != id_empresa:
            continue
        empresa = por_id(datos["empresas"], trabajador.get("idEmpresa")) if trabajador else None
        filas.append(
            {
                "id": c["id"],
                "comanda": format_numero_comanda(c["numero"]),
                "fecha": c["fechaHora"],
                "empresa": empresa["razonSocial"] if empresa else "",
                "trabajador": f"{trabajador['apellido']}, {trabajador['nombre']}" if trabajador else "—",
                "items": ", ".join(f"{i['cantidad']}× {i['nombre']}" for i in c.get("items", [])),
                "estado": ESTADOS_LABEL.get(c["estado"], c["estado"]),
                "total": c["total"],
            }
        )
    filas.sort(key=lambda x: x["fecha"], reverse=True)
    return {
        "columnas": [
            _columna("comanda", "Comanda", "texto", principal=True),
            _columna("fecha", "Fecha", "fechaHora"),
            _columna("empresa", "Empresa"),
            _columna("trabajador", "Trabajador"),
            _columna("items", "Consumo"),
            _columna("estado", "Estado"),
            _columna("total", "Total", "moneda"),
        ],
        "filas": filas,
        "totales": {"total": _sumar(filas, "total")},
    }


def _informe_numeracion(datos, filtros):
    filas = []
    resumen = []
    id_sucursal = filtros.get("idSucursal")
    sucursales = [s for s in datos["sucursales"] if not id_sucursal or s["id"] == id_sucursal]
    for s in sucursales:
        comandas = _comandas_filtradas(datos, {**filtros, "idSucursal": s["id"], "turno": None}, incluir_anuladas=True)
        if not comandas:
            continue
        numeros = [c["numero"] for c in comandas]
        saltos = _saltos_de_numeracion(numeros)
        detalle_saltos = f"{len(saltos)} salto(s)" if saltos else "sin saltos"
        resumen.append(f"{s['nombre']}: N° {min(numeros)} a {max(numeros)}, {detalle_saltos}.")
        for n in saltos:
            filas.append(
                {
                    "id": f"{s['id']}-salto-{n}",
                    "sucursal": s["nombre"],
                    "numero": format_numero_comanda(n),
                    "tipo": "Salto",
                    "fecha": "",
                    "usuario": "—",
                    "motivo": "Número faltante",
                }
            )
        for c in comandas:
            if c.get("estado") != ANULADO:
                continue
            anulacion = next((h for h in c.get("historial", []) if h.get("estadoNuevo") == ANULADO), None)
            filas.append(
                {
                    "id": c["id"],
                    "sucursal": s["nombre"],
                    "numero": format_numero_comanda(c["numero"]),
                    "tipo": "Anulada",
                    "fecha": (anulacion or {}).get("fechaHora") or c["fechaHora"],
                    "usuario": _nombre_usuario(datos, (anulacion or {}).get("idUsuario")),
                    "motivo": (anulacion or {}).get("motivo") or "—",
                }
            )
    return {
        "columnas": [
            _columna("numero", "Comanda", "texto", principal=True),
            _columna("sucursal", "Sucursal"),
            _columna("tipo", "Tipo"),
            _columna("fecha", "Fecha", "fechaHora"),
            _columna("usuario", "Usuario"),
            _columna("motivo", "Motivo"),
        ],
        "filas": filas,
        "nota": " ".join(resumen),
        "sinFilasEsValido": len(resumen) > 0,
    }


def _informe_desperdicio(datos, filtros):
    grupos = {}
    id_sucursal = filtros.get("idSucursal")
    for d in datos["desperdicios"]:
        if not _en_rango(_dia(d.get("fechaHora", "")), filtros):
            continue
        if id_sucursal and d.get("idSucursal") != id_sucursal:
            continue
        if d.get("tipo") == "insumo":
            entidad = por_id(datos["insumos"], d.get("idInsumo"))
        else:
            entidad = por_id(datos["productos"], d.get("idProducto"))
        nombre = entidad["nombre"] if entidad else ""
        clave = f"{d.get('tipo')}|{nombre}|{d.get('idMotivo')}|{d.get('idSucursal')}"
        if clave not in grupos:
            motivo = por_id(datos["motivosDesperdicio"], d.get("idMotivo"))
            suc = por_id(datos["sucursales"], d.get("idSucursal"))
            grupos[clave] = {
                "id": clave,
                "producto": nombre,
                "tipo": "Insumo" if d.get("tipo") == "insumo" else "Plato",
                "motivo": motivo["descripcion"] if motivo else "",
                "sucursal": suc["nombre"] if suc else "",
                "registros": 0,
                "cantidad": 0,
                "unidad": d.get("unidad", ""),
            }
        g = grupos[clave]
        g["registros"] += 1
        g["cantidad"] = numero_limpio(g["cantidad"] + a_numero(d.get("cantidad")))

    filas = sorted(grupos.values(), key=lambda x: x["cantidad"], reverse=True)
    return {
        "columnas": [
            _columna("producto", "Producto", "texto", principal=True),
            _columna("tipo", "Tipo"),
            _columna("motivo", "Motivo"),
            _columna("sucursal", "Sucursal"),
            _columna("registros", "Registros", "numero"),
            _columna("cantidad", "Cantidad", "numero"),
            _columna("unidad", "Unidad"),
        ],
        "filas": filas,
        "totales": {"registros": _sumar(filas, "registros")},
    }


def _informe_retiros(datos, filtros):
    platos = sum(
        item["cantidad"]
        for c in _comandas_filtradas(datos, {**filtros, "turno": None})
        for item in c.get("items", [])
        if _es_comida(datos, item["idProducto"])
    )
    netos = {}
    id_sucursal = filtros.get("idSucursal")
    for m in datos["movimientos"]:
        if not _en_rango(_dia(m.get("fechaHora", "")), filtros):
            continue
        if id_sucursal and m.get("idSucursal") != id_sucursal:
            continue
        signo = 1 if m.get("tipo") == "retiro" else -1
        for linea in m.get("detalle", []):
            id_ins = linea["idInsumo"]
            netos[id_ins] = netos.get(id_ins, 0) + signo * a_numero(linea.get("cantidad"))

    filas = []
    for id_insumo, cantidad in netos.items():
        insumo = por_id(datos["insumos"], id_insumo)
        filas.append(
            {
                "id": id_insumo,
                "insumo": insumo["nombre"] if insumo else "",
                "unidad": insumo["unidad"] if insumo else "",
                "retirado": numero_limpio(round(cantidad * 10) / 10),
                "platos": platos,
                "porPlato": numero_limpio(round((cantidad / platos) * 1000) / 1000) if platos else 0,
            }
        )
    filas.sort(key=lambda x: x["insumo"])
    return {
        "columnas": [
            _columna("insumo", "Insumo", "texto", principal=True),
            _columna("retirado", "Retirado neto", "numero"),
            _columna("unidad", "Unidad"),
            _columna("platos", "Platos servidos", "numero"),
            _columna("porPlato", "Retiro por plato", "numero"),
        ],
        "filas": filas,
        "nota": f"{platos} platos servidos en el período. Cuando se carguen las recetas (etapa 3), se podrá comparar con el consumo teórico.",
    }


def _informe_historico(datos, filtros):
    comandas = _comandas_filtradas(datos, {**filtros, "turno": None})
    id_sucursal = filtros.get("idSucursal")
    filas = []
    for fecha in _rango_de_fechas(filtros["desde"], filtros["hasta"]):
        del_dia = [c for c in comandas if _dia(c["fechaHora"]) == fecha]
        platos = sum(
            item["cantidad"]
            for c in del_dia
            for item in c.get("items", [])
            if _es_comida(datos, item["idProducto"])
        )
        desperdicios = sum(
            1
            for d in datos["desperdicios"]
            if _dia(d.get("fechaHora", "")) == fecha and (not id_sucursal or d.get("idSucursal") == id_sucursal)
        )
        filas.append(
            {
                "id": fecha,
                "fecha": fecha,
                "comandas": len(del_dia),
                "platos": platos,
                "importe": numero_limpio(sum(c.get("total", 0) for c in del_dia)),
                "desperdicio": desperdicios,
            }
        )
    return {
        "columnas": [
            _columna("fecha", "Fecha", "fecha", principal=True),
            _columna("comandas", "Comandas", "numero"),
            _columna("platos", "Platos servidos", "numero"),
            _columna("importe", "Importe", "moneda"),
            _columna("desperdicio", "Registros de desperdicio", "numero"),
        ],
        "filas": list(reversed(filas)),
        "totales": {k: _sumar(filas, k) for k in ["comandas", "platos", "importe", "desperdicio"]},
        "grafico": {"serie": filas, "valor": "platos", "etiqueta": "Platos servidos por día"},
        "sinFilasEsValido": False,
        "vacio": all(f["comandas"] == 0 for f in filas),
    }


INFORMES = {
    "ventas": {"generar": _informe_ventas, "requiere": []},
    "sinFacturar": {"generar": _informe_sin_facturar, "requiere": []},
    "comandasFacturas": {"generar": _informe_comandas_facturas, "requiere": []},
    "consumoEmpresa": {"generar": _informe_consumo_empresa, "requiere": ["idEmpresa"]},
    "fueraConvenio": {"generar": _informe_fuera_convenio, "requiere": []},
    "numeracion": {"generar": _informe_numeracion, "requiere": []},
    "desperdicio": {"generar": _informe_desperdicio, "requiere": []},
    "retiros": {"generar": _informe_retiros, "requiere": []},
    "historico": {"generar": _informe_historico, "requiere": []},
}


def generar_informe(datos, id_informe, filtros):
    informe = INFORMES.get(id_informe)
    if not informe:
        raise ApiError("INFORME", "El tipo de informe no existe.")
    desde = (filtros or {}).get("desde")
    hasta = (filtros or {}).get("hasta")
    if not desde or not hasta:
        raise ApiError("VALIDACION", "Indicá el rango de fechas.")
    if desde > hasta:
        raise ApiError("VALIDACION", "La fecha «desde» es posterior a «hasta».")
    for campo in informe["requiere"]:
        if not filtros.get(campo):
            raise ApiError("VALIDACION", "Completá los filtros obligatorios.")
    return informe["generar"](datos, filtros)


def buscar_comandas(datos, filtros):
    filtros = filtros or {}
    desde = filtros.get("desde")
    hasta = filtros.get("hasta")
    if desde and hasta and desde > hasta:
        raise ApiError("VALIDACION", "La fecha «desde» es posterior a «hasta».")

    numero = int(a_numero(filtros.get("numero"))) if filtros.get("numero") else 0
    trabajador_txt = str(filtros.get("trabajador") or "").strip().lower()
    digitos_fac = re.sub(r"\D", "", str(filtros.get("factura") or ""))
    factura_num = int(digitos_fac) if digitos_fac else 0

    resultados = []
    for c in datos["comandas"]:
        fecha = _dia(c.get("fechaHora", ""))
        if numero and c.get("numero") != numero:
            continue
        if desde and fecha < desde:
            continue
        if hasta and fecha > hasta:
            continue
        if filtros.get("idSucursal") and c.get("idSucursal") != filtros["idSucursal"]:
            continue
        if filtros.get("estado") and c.get("estado") != filtros["estado"]:
            continue
        if trabajador_txt:
            t = por_id(datos["trabajadores"], c.get("idTrabajador")) if c.get("idTrabajador") else None
            if not t or trabajador_txt not in f"{t.get('apellido', '')} {t.get('nombre', '')}".lower():
                continue
        if factura_num:
            vinculada = any(
                c["id"] in (f.get("comandas") or []) and int(a_numero(f.get("numero"))) == factura_num
                for f in datos["facturas"]
            )
            if not vinculada:
                continue
        resultados.append(c)

    resultados.sort(key=lambda x: x.get("fechaHora", ""), reverse=True)
    return [c["id"] for c in resultados]
