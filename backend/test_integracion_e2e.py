"""Pruebas de integración E2E de los 14 Casos de Uso contra los endpoints HTTP de FastAPI.

Uso (desde la carpeta backend):
    venv\\Scripts\\python.exe test_integracion_e2e.py
"""
import json
import os
import re

os.environ["DISABLE_FIRESTORE"] = "1"

import main as api  # noqa: E402
from app.errores import ApiError  # noqa: E402


def http_json(metodo, ruta, cuerpo=None, sesion=None):
    """Invoca las rutas de FastAPI validando los esquemas Pydantic y el manejo de ApiError."""
    sesion = sesion or {"idUsuario": None, "rol": None, "idSucursal": None}
    cuerpo = cuerpo or {}
    try:
        if metodo == "GET" and ruta == "/":
            return 200, api.inicio()
        if metodo == "GET" and ruta == "/api/datos":
            return 200, api.obtener_todos_los_datos()
        if metodo == "POST" and ruta == "/api/auth/login":
            return 200, api.endpoint_login(api.LoginInput(**cuerpo))
        if metodo == "POST" and ruta == "/api/comandas":
            return 200, api.endpoint_registrar_comanda(api.ComandaInput(**cuerpo), sesion)
        if metodo == "POST" and ruta == "/api/comandas/buscar":
            return 200, api.endpoint_buscar_comandas(cuerpo, sesion)
        if metodo == "POST" and ruta == "/api/cobros":
            return 200, api.endpoint_cobrar_comandas(api.CobroInput(**cuerpo), sesion)
        if metodo == "POST" and ruta == "/api/facturas/completar":
            return 200, api.endpoint_completar_facturas(api.CompletarFacturasInput(**cuerpo), sesion)
        if metodo == "POST" and ruta == "/api/deposito/movimientos":
            return 200, api.endpoint_registrar_movimiento(api.MovimientoInput(**cuerpo), sesion)
        if metodo == "POST" and ruta == "/api/desperdicios":
            return 200, api.endpoint_registrar_desperdicio(api.DesperdicioInput(**cuerpo), sesion)
        if metodo == "POST" and ruta == "/api/trabajadores/importar":
            return 200, api.endpoint_importar_trabajadores(api.ImportarTrabajadoresInput(**cuerpo), sesion)
        if metodo == "POST" and ruta == "/api/admin/restablecer":
            return 200, api.endpoint_restablecer_datos(sesion)

        m = re.fullmatch(r"/api/comandas/([^/]+)/listo", ruta)
        if metodo == "PATCH" and m:
            return 200, api.endpoint_marcar_listo(m.group(1), sesion)

        m = re.fullmatch(r"/api/comandas/([^/]+)/entregado", ruta)
        if metodo == "PATCH" and m:
            return 200, api.endpoint_marcar_entregado(m.group(1), sesion)

        m = re.fullmatch(r"/api/comandas/([^/]+)/adiciones", ruta)
        if metodo == "POST" and m:
            return 200, api.endpoint_agregar_adicion(m.group(1), api.AdicionInput(**cuerpo), sesion)

        m = re.fullmatch(r"/api/comandas/([^/]+)/cuenta-corriente", ruta)
        if metodo == "POST" and m:
            return 200, api.endpoint_cerrar_cuenta_corriente(
                m.group(1), api.CuentaCorrienteInput(**cuerpo), sesion
            )

        m = re.fullmatch(r"/api/comandas/([^/]+)/anular", ruta)
        if metodo == "POST" and m:
            return 200, api.endpoint_anular_comanda(m.group(1), api.AnularInput(**cuerpo), sesion)

        m = re.fullmatch(r"/api/informes/([^/]+)", ruta)
        if metodo == "POST" and m:
            return 200, api.endpoint_generar_informe(m.group(1), cuerpo, sesion)

        m = re.fullmatch(r"/api/maestros/([^/]+)", ruta)
        if metodo == "POST" and m:
            return 200, api.endpoint_guardar_maestro(m.group(1), cuerpo, sesion)

        m = re.fullmatch(r"/api/maestros/([^/]+)/([^/]+)/activo", ruta)
        if metodo == "PATCH" and m:
            return 200, api.endpoint_cambiar_activo_maestro(
                m.group(1), m.group(2), api.ActivoMaestroInput(**cuerpo), sesion
            )

        raise RuntimeError(f"Ruta no mapeada en test: {metodo} {ruta}")
    except ApiError as exc:
        return exc.estado_http, json.loads(json.dumps(exc.a_json()))


def ejecutar_pruebas():
    mozo_unq = {"idUsuario": "usr-1", "rol": "mozo", "idSucursal": "suc-unq"}
    cocinero_unq = {"idUsuario": "usr-1", "rol": "cocinero", "idSucursal": "suc-unq"}
    finanzas = {"idUsuario": "usr-4", "rol": "finanzas", "idSucursal": None}
    supervisor = {"idUsuario": "usr-5", "rol": "supervisor", "idSucursal": None}
    admin = {"idUsuario": "usr-6", "rol": "administrador", "idSucursal": None}

    # 0. Restablecer semilla limpia
    st, _ = http_json("POST", "/api/admin/restablecer", sesion=admin)
    assert st == 200, f"Fallo al restablecer: {st}"

    # 1. Salud y carga inicial
    st, salud = http_json("GET", "/")
    assert st == 200 and salud["estado"] == "backend funcionando"

    st, datos = http_json("GET", "/api/datos")
    assert st == 200
    assert len(datos["sucursales"]) == 2
    assert all("password" not in u for u in datos["usuarios"])
    print("[OK] Carga inicial /api/datos y sanitización de usuarios")

    # 2. CU-01 Iniciar sesión
    st, r = http_json("POST", "/api/auth/login", {"nombreUsuario": "operario.unquillar", "password": "wrong"})
    assert st == 401 and r["codigo"] == "CREDENCIALES"

    st, r = http_json("POST", "/api/auth/login", {"nombreUsuario": "ex.empleada", "password": "1234"})
    assert st == 403 and r["codigo"] == "INACTIVO"

    st, r = http_json("POST", "/api/auth/login", {"nombreUsuario": "operario.unquillar", "password": "1234"})
    assert st == 200 and r["resultado"]["id"] == "usr-1"
    print("[OK] CU-01 Iniciar sesión (credenciales, inactivo, exitoso)")

    # 3. CU-03 Registrar comanda particular y de convenio (con bifurcación por tope diario)
    st, r = http_json(
        "POST",
        "/api/comandas",
        {
            "tipoCliente": "particular",
            "mesa": 10,
            "cantidades": {"prod-almuerzo": 1, "prod-gaseosa": 1},
            "observaciones": "Sin sal",
        },
        sesion=mozo_unq,
    )
    assert st == 200 and len(r["resultado"]) == 1
    com_part = r["resultado"][0]
    assert com_part["estado"] == "iniciado" and com_part["total"] == 17000

    # Convenio Sales de Jujuy cubre máx 2 aguas de 500 ml por día y NO cubre gaseosa.
    st, r = http_json(
        "POST",
        "/api/comandas",
        {
            "tipoCliente": "convenio",
            "idTrabajador": "trab-sdj-8",
            "mesa": 11,
            "cantidades": {"prod-almuerzo": 1, "prod-gaseosa": 1},
            "generarAparte": False,
        },
        sesion=mozo_unq,
    )
    assert st == 409 and r["codigo"] == "NO_CUBIERTO"
    assert len(r["detalles"]["noCubiertos"]) == 1

    st, r = http_json(
        "POST",
        "/api/comandas",
        {
            "tipoCliente": "convenio",
            "idTrabajador": "trab-sdj-8",
            "mesa": 11,
            "cantidades": {"prod-almuerzo": 1, "prod-gaseosa": 1},
            "generarAparte": True,
        },
        sesion=mozo_unq,
    )
    assert st == 200 and len(r["resultado"]) == 2
    com_conv, com_aparte = r["resultado"][0], r["resultado"][1]
    assert com_conv["tipoCliente"] == "convenio" and com_aparte["tipoCliente"] == "particular"
    assert com_aparte["idComandaOrigen"] == com_conv["id"]
    print("[OK] CU-03 Registrar comanda (particular, convenio y desglose fuera de convenio)")

    # 4. CU-04 / CU-05 / CU-06 Cocina, Entrega y Adiciones
    st, r = http_json("PATCH", f"/api/comandas/{com_conv['id']}/listo", sesion=cocinero_unq)
    assert st == 200 and r["resultado"]["estado"] == "listo"

    st, r = http_json("PATCH", f"/api/comandas/{com_conv['id']}/entregado", sesion=mozo_unq)
    assert st == 200 and r["resultado"]["estado"] == "entregado"

    st, r = http_json(
        "POST",
        f"/api/comandas/{com_conv['id']}/adiciones",
        {"cantidades": {"prod-agua500": 1}, "generarAparte": False},
        sesion=mozo_unq,
    )
    assert st == 200 and r["resultado"]["comanda"]["estado"] == "adicion"

    st, r = http_json("PATCH", f"/api/comandas/{com_conv['id']}/listo", sesion=cocinero_unq)
    assert st == 200 and r["resultado"]["estado"] == "listo"
    st, r = http_json("PATCH", f"/api/comandas/{com_conv['id']}/entregado", sesion=mozo_unq)
    assert st == 200 and r["resultado"]["estado"] == "entregado"
    print("[OK] CU-04, CU-05 y CU-06 Cocina, entrega y adición")

    # 5. CU-07 Cerrar cuenta corriente y cobrar particular
    st, r = http_json(
        "POST",
        f"/api/comandas/{com_conv['id']}/cuenta-corriente",
        {"firmoControlDiario": True},
        sesion=mozo_unq,
    )
    assert st == 200 and r["resultado"]["estado"] == "cuenta_corriente"

    # Avanzar com_part a entregado para cobrarla
    http_json("PATCH", f"/api/comandas/{com_part['id']}/listo", sesion=cocinero_unq)
    http_json("PATCH", f"/api/comandas/{com_part['id']}/entregado", sesion=mozo_unq)

    st, r = http_json(
        "POST",
        "/api/cobros",
        {
            "idsComandas": [com_part["id"]],
            "pagos": [{"medio": "efectivo", "monto": com_part["total"], "ordenante": "", "numeroOperacion": ""}],
            "facturas": [],
        },
        sesion=mozo_unq,
    )
    assert st == 200 and r["resultado"]["estado"] == "cobrado_sin_facturar"
    print("[OK] CU-07 Cierre en cuenta corriente y cobro de contado")

    # 6. CU-08 Completar factura
    st, r = http_json(
        "POST",
        "/api/facturas/completar",
        {
            "idsComandas": [com_part["id"]],
            "facturas": [
                {
                    "tipoComprobante": "Factura B",
                    "puntoVenta": 3,
                    "numero": 99999,
                    "fecha": com_part["fechaHora"][:10],
                    "clienteFacturado": "Consumidor Final",
                    "cuitCliente": "",
                    "importe": com_part["total"],
                }
            ],
            "confirmarCompartida": False,
        },
        sesion=mozo_unq,
    )
    assert st == 200 and r["resultado"][0]["estado"] == "facturado"
    print("[OK] CU-08 Completar datos de factura")

    # 7. CU-09 Anular comanda (mozo en iniciado, supervisor después de cocina)
    http_json("PATCH", f"/api/comandas/{com_aparte['id']}/listo", sesion=cocinero_unq)
    st, r = http_json(
        "POST",
        f"/api/comandas/{com_aparte['id']}/anular",
        {"motivo": "Error de carga"},
        sesion=mozo_unq,
    )
    assert st == 400 and r["codigo"] == "ESTADO"

    st, r = http_json(
        "POST",
        f"/api/comandas/{com_aparte['id']}/anular",
        {"motivo": "Cliente se retiró antes de recibir bebida"},
        sesion=supervisor,
    )
    assert st == 200 and r["resultado"]["estado"] == "anulado"
    print("[OK] CU-09 Anulación de comanda con validación de rol Mozo vs Supervisor")

    # 8. CU-10 y CU-11 Depósito y Desperdicios
    st, r = http_json(
        "POST",
        "/api/deposito/movimientos",
        {"tipo": "retiro", "turno": "almuerzo", "detalle": [{"idInsumo": "ins-papa", "cantidad": 5}]},
        sesion=cocinero_unq,
    )
    assert st == 200 and r["resultado"]["numero"] > 0

    st, r = http_json(
        "POST",
        "/api/desperdicios",
        {"tipo": "insumo", "idInsumo": "ins-tomate", "cantidad": 1.5, "idMotivo": "mot-otro", "observacion": ""},
        sesion=cocinero_unq,
    )
    assert st == 400 and r["codigo"] == "VALIDACION"

    st, r = http_json(
        "POST",
        "/api/desperdicios",
        {
            "tipo": "insumo",
            "idInsumo": "ins-tomate",
            "cantidad": 1.5,
            "idMotivo": "mot-otro",
            "observacion": "Golpeado en traslado",
        },
        sesion=cocinero_unq,
    )
    assert st == 200 and r["resultado"]["unidad"] == "kg"
    print("[OK] CU-10 y CU-11 Movimientos de depósito y desperdicios")

    # 9. CU-12 y CU-13 Informes y búsqueda
    hoy = com_part["fechaHora"][:10]
    for id_inf in ["ventas", "sinFacturar", "comandasFacturas", "fueraConvenio", "numeracion", "desperdicio", "retiros", "historico"]:
        st, r = http_json("POST", f"/api/informes/{id_inf}", {"desde": "2026-01-01", "hasta": hoy}, sesion=finanzas)
        assert st == 200 and "columnas" in r["resultado"], f"Fallo informe {id_inf}"

    st, r = http_json(
        "POST",
        "/api/informes/consumoEmpresa",
        {"desde": "2026-01-01", "hasta": hoy, "idEmpresa": "emp-sdj"},
        sesion=finanzas,
    )
    assert st == 200 and "columnas" in r["resultado"]

    st, r = http_json("POST", "/api/comandas/buscar", {"numero": com_part["numero"]}, sesion=supervisor)
    assert st == 200 and com_part["id"] in r["resultado"]
    print("[OK] CU-12 (8 informes) y CU-13 Consulta de comandas")

    # 10. CU-14 Maestros e importación
    st, r = http_json(
        "POST",
        "/api/maestros/insumos",
        {"nombre": "Cebolla", "unidad": "kg", "codigoTango": "INS-099"},
        sesion=admin,
    )
    assert st == 200 and r["resultado"]["id"].startswith("ins-")
    id_ins = r["resultado"]["id"]

    st, r = http_json("PATCH", f"/api/maestros/insumos/{id_ins}/activo", {"activo": False}, sesion=admin)
    assert st == 200 and r["resultado"]["activo"] is False

    st, r = http_json(
        "POST",
        "/api/trabajadores/importar",
        {
            "idEmpresa": "emp-sdj",
            "filas": [
                {"nombre": "Raúl", "apellido": "Mamani", "dni": "35111222"},
                {"nombre": "", "apellido": "Incompleto", "dni": ""},
            ],
        },
        sesion=admin,
    )
    assert st == 200 and r["resultado"]["importados"] == 1 and len(r["resultado"]["omitidos"]) == 1

    # Dejar los datos limpios en su estado semilla original
    st, _ = http_json("POST", "/api/admin/restablecer", sesion=admin)
    assert st == 200
    print("[OK] CU-14 Administración de maestros, importación y restablecimiento")
    print("\n=== TODAS LAS PRUEBAS E2E PASARON EXITOSAMENTE ===")


def main():
    ejecutar_pruebas()


if __name__ == "__main__":
    main()
