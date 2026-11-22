"""CU17 / CU22 – Colchón de caña en patio."""
from .constantes import CONDICION_POST_LLUVIA


def carga_neta(condicion: str, params: dict) -> float:
    if condicion == CONDICION_POST_LLUVIA:
        return float(params["carga_neta_post_lluvia_t"])
    return float(params["carga_neta_carro_t"])


def calcular(cantidad_carros: int, condicion: str, params: dict) -> dict:
    neta = carga_neta(condicion, params)
    bruta = float(params["carga_bruta_carro_t"])
    t_netas = round(cantidad_carros * neta, 1)
    horas = round(t_netas / float(params["capacidad_molienda_th"]), 2)
    minimo = int(params["carros_minimos_patio"])
    return {
        "cantidad_carros": cantidad_carros,
        "condicion": condicion,
        "carga_neta_carro_t": neta,
        "merma_pct": round((1 - neta / bruta) * 100, 1),
        "t_netas": t_netas,
        "horas_cobertura": horas,
        "carros_minimos": minimo,
        "bajo_umbral": cantidad_carros < minimo,
        "carros_faltantes": max(0, minimo - cantidad_carros),
        "avance_pct": round(min(100.0, cantidad_carros / minimo * 100), 1) if minimo else 100.0,
        "horas_umbral": round(minimo * float(params["carga_neta_carro_t"]) / float(params["capacidad_molienda_th"]), 2),
    }
