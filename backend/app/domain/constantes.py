"""Listas cerradas del dominio (documento de solución tecnológica v3)."""

ROLES = ("tecnico", "jefe_lote", "bascula", "fabrica")
NOMBRE_ROL = {
    "tecnico": "Equipo técnico agrícola",
    "jefe_lote": "Jefe de lote",
    "bascula": "Personal de báscula",
    "fabrica": "Fábrica",
}

# CU04
ESTADO_PRODUCCION = "En producción"
ESTADO_PREPARACION = "En preparación"
ESTADOS_LOTE = (ESTADO_PRODUCCION, ESTADO_PREPARACION)

TIPOS_CULTIVO = ("Convencional", "Orgánico")
CERTIFICACIONES = ("Orgánico Full", "Orgánico NOP")

# Drenaje: se guarda el código; la etiqueta es para mostrar
DRENAJES = ("bien", "medio", "imperfecto")
NOMBRE_DRENAJE = {
    "bien": "Bien drenado",
    "medio": "Medianamente drenado",
    "imperfecto": "Imperfectamente drenado",
}

# Zonas por distancia al ingenio y su madurez (CU04)
ZONAS = ("Cercana", "Media", "Lejana")
MADUREZ_POR_ZONA = {"Cercana": "Tardía", "Media": "Media", "Lejana": "Temprana"}
# Orden de cosecha recomendado: lejana -> media -> cercana (CU13)
ORDEN_ZONA = {"Lejana": 0, "Media": 1, "Cercana": 2}

# CU09
HABILITADO = "Habilitado"
CON_RESTRICCIONES = "Con restricciones"
INHABILITADO = "Inhabilitado"
ESTADOS_PISO = (HABILITADO, CON_RESTRICCIONES, INHABILITADO)

# CU10 (el script de carga usa además "Dato de prueba")
ORIGENES_BRIX = ("Muestreo en campo", "Laboratorio", "Imagen satelital")
ORIGEN_PRUEBA = "Dato de prueba"

# CU11
FUENTE_API = "API"
FUENTE_MANUAL = "Manual"

# CU12
RIESGO_ALTO = "Alto"
RIESGO_MEDIO = "Medio"
RIESGO_BAJO = "Bajo"
RIESGO_SIN_DATOS = "Sin datos"
NIVELES_RIESGO = (RIESGO_ALTO, RIESGO_MEDIO, RIESGO_BAJO, RIESGO_SIN_DATOS)

# CU17
CONDICION_NORMAL = "Normal"
CONDICION_POST_LLUVIA = "Post-lluvia"
CONDICIONES_CARGA = (CONDICION_NORMAL, CONDICION_POST_LLUVIA)

# CU18
ALERTA_LLUVIA = "Lluvia"
ALERTA_COLCHON = "Colchón bajo"
TIPOS_ALERTA = (ALERTA_LLUVIA, ALERTA_COLCHON)

# CU19
CAUSA_LLUVIA = "Falta de caña por lluvia"
CAUSA_LEJANIA = "Falta de caña por lotes lejanos o corte lento"
CAUSA_ROTURA = "Rotura mecánica"
CAUSA_OTRA = "Otra"
CAUSAS_PARADA = (CAUSA_LLUVIA, CAUSA_LEJANIA, CAUSA_ROTURA, CAUSA_OTRA)
CAUSAS_FALTA_CANA = (CAUSA_LLUVIA, CAUSA_LEJANIA)

# Colecciones de Firestore (una por entidad del DER)
COL_USUARIOS = "usuarios"
COL_FINCAS = "fincas"
COL_LOTES = "lotes"
COL_CAMPANIAS = "campanias"
COL_LOTES_CAMPANIA = "lotes_campania"
COL_PLUVIOMETROS = "pluviometros"
COL_LECTURAS = "lecturas_pluviometro"
COL_PRONOSTICOS = "pronosticos"
COL_ESTADOS_PISO = "estados_piso"
COL_BRIX = "mediciones_brix"
COL_COSECHAS = "registros_cosecha"
COL_PARAMETROS = "parametros"
COL_PATIO = "registros_patio"
COL_ALERTAS = "alertas"
COL_PARADAS = "paradas_fabrica"
