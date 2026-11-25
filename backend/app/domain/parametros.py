"""Parámetros del sistema (entidad Parametro, CU03 solo datos).

Los valores se precargan en Firestore con el script de carga inicial y el back end
los lee de la base. Esta tabla es la fuente de la carga inicial y el respaldo si
falta alguna clave en la base. 'estado' indica si el valor está confirmado por el
ingenio o es un valor de prueba a confirmar.
"""

CONFIRMADO = "Confirmado"
A_CONFIRMAR = "A confirmar"

DEFAULTS = [
    # clave, valor, unidad, descripción, estado, casos de uso
    ("zona_cercana_km", [1, 6], "km", "Zona cercana (madurez Tardía)", CONFIRMADO, "CU04, CU13, CU21"),
    ("zona_media_km", [7, 12], "km", "Zona media (madurez Media)", CONFIRMADO, "CU04, CU13, CU21"),
    ("zona_lejana_km", [13, 19], "km", "Zona lejana (madurez Temprana)", CONFIRMADO, "CU04, CU13"),
    ("brix_minimo", 8, "°Bx", "Brix mínimo para cortar", CONFIRMADO, "CU10, CU13, CU21"),
    ("prob_lluvia_alerta", 70, "%", "Probabilidad de lluvia para alertar y para riesgo Alto/Medio", CONFIRMADO, "CU11, CU12, CU18, CU21"),
    ("prob_lluvia_media", 50, "%", "Probabilidad desde la que un lote imperfectamente drenado pasa a riesgo Medio (propuesta)", A_CONFIRMAR, "CU12"),
    ("horizonte_pronostico_dias", 3, "días", "Días de pronóstico que cuentan para el riesgo y la alerta (hoy incluido)", A_CONFIRMAR, "CU11, CU12, CU18"),
    ("frecuencia_pronostico_min", 60, "min", "Frecuencia del pronóstico automático", CONFIRMADO, "CU11"),
    ("capacidad_molienda_th", 312.5, "t/h", "Capacidad de molienda (7.500 t/día)", CONFIRMADO, "CU17, CU19, CU22"),
    ("carga_bruta_carro_t", 30, "t", "Carga bruta por carro", CONFIRMADO, "CU17, CU22"),
    ("merma_min_pct", 2, "%", "Merma mínima (lo que no es caña)", CONFIRMADO, "CU17, CU22"),
    ("merma_max_pct", 14, "%", "Merma máxima, después de lluvia", CONFIRMADO, "CU17, CU22"),
    ("carga_neta_carro_t", 28, "t", "Carga neta por carro en condición normal", CONFIRMADO, "CU17, CU22"),
    ("carga_neta_post_lluvia_t", 25.8, "t", "Carga neta por carro después de lluvia", CONFIRMADO, "CU17, CU22"),
    ("carros_minimos_patio", 30, "carros", "Carros en patio para reanudar y alertar (840 t = 2,7 h)", CONFIRMADO, "CU17, CU18, CU19, CU22"),
    ("ciclo_camion_h", 1, "h", "Ciclo del camión", CONFIRMADO, "CU22"),
    ("costo_hora_parada_bajo", 1000, "USD/h", "Costo por hora de parada, escenario bajo", CONFIRMADO, "CU19, CU20"),
    ("costo_hora_parada_central", 1563, "USD/h", "Costo por hora de parada, escenario central", CONFIRMADO, "CU19, CU20"),
    ("costo_hora_parada_alto", 2250, "USD/h", "Costo por hora de parada, escenario alto", CONFIRMADO, "CU19, CU20"),
    ("dias_sin_piso_bien", 1, "días", "Días sin piso estimados si llueve fuerte, bien drenado (valor de prueba)", A_CONFIRMAR, "CU09, CU12, CU23"),
    ("dias_sin_piso_medio", 3, "días", "Días sin piso estimados si llueve fuerte, medianamente drenado (valor de prueba)", A_CONFIRMAR, "CU09, CU12, CU23"),
    ("dias_sin_piso_imperfecto", 4, "días", "Días sin piso estimados si llueve fuerte, imperfectamente drenado (valor de prueba)", A_CONFIRMAR, "CU09, CU12, CU23"),
    ("dias_sin_piso_moderada_bien", 0, "días", "Días sin piso con lluvia moderada, bien drenado (valor de prueba)", A_CONFIRMAR, "CU23"),
    ("dias_sin_piso_moderada_medio", 1, "días", "Días sin piso con lluvia moderada, medianamente drenado (valor de prueba)", A_CONFIRMAR, "CU23"),
    ("dias_sin_piso_moderada_imperfecto", 2, "días", "Días sin piso con lluvia moderada, imperfectamente drenado (valor de prueba)", A_CONFIRMAR, "CU23"),
    ("lluvia_moderada_min_mm", 15, "mm", "Lluvia acumulada desde la que se considera moderada (valor de prueba)", A_CONFIRMAR, "CU23"),
    ("lluvia_fuerte_min_mm", 35, "mm", "Lluvia acumulada a partir de la cual (más de) se considera fuerte (valor de prueba)", A_CONFIRMAR, "CU23"),
    ("ventana_lluvia_dias", 3, "días", "Días de lecturas que se suman como lluvia acumulada", A_CONFIRMAR, "CU12, CU23"),
    ("rendimiento_estimado_tha", 85, "t/ha", "Rendimiento promedio estimado por hectárea para calcular la producción del lote (valor de prueba)", A_CONFIRMAR, "CU04, CU16"),
]

CLAVES = [c[0] for c in DEFAULTS]


def lista_defaults(id_campania: str | None = None):
    salida = []
    for clave, valor, unidad, descripcion, estado, usado_en in DEFAULTS:
        salida.append({
            "id_campania": id_campania,
            "clave": clave,
            "valor": valor,
            "unidad": unidad,
            "descripcion": descripcion,
            "estado": estado,
            "usado_en": usado_en,
        })
    return salida


def valores_defaults() -> dict:
    return {c[0]: c[1] for c in DEFAULTS}


def combinar(registros: list[dict]) -> dict:
    """Devuelve clave -> valor: lo de la base pisa a los valores por defecto."""
    valores = valores_defaults()
    for r in registros:
        if r.get("clave") in valores and r.get("valor") is not None:
            valores[r["clave"]] = r["valor"]
    return valores
