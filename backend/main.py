import os
from typing import List, Optional
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests

app = FastAPI(
    title="PluviaZafra API — Ingenio La Esperanza",
    description="API para el Sistema de Apoyo a la Priorización de Cosecha por Vulnerabilidad Hídrica",
    version="2.0.0"
)

origenes = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://surgeron.github.io"
]
if os.getenv("ALLOWED_ORIGIN"):
    origenes.append(os.getenv("ALLOWED_ORIGIN"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origenes,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelos
class LecturaPluviometroIn(BaseModel):
    finca: str
    milimetros: float
    observaciones: Optional[str] = None

class ParadaFabricaIn(BaseModel):
    causa: str
    duracionHoras: float
    toneladasNoMolidas: float
    observaciones: Optional[str] = None

# Datos en memoria / Prototipo
LOTES_CATASTRO = [
  {"id": "ESP-00", "codigo": "ESP-00", "finca": "La Esperanza Central", "estado": "COSECHADO", "has": 35, "toneladas": 2800, "suelo": "Franco", "drenaje": "Bueno", "camino": "Ripio consolidado / RP 56", "distanciaKm": 2.5, "ivlEstatico": 1.5, "lat": -24.2280, "lng": -64.8690},
  {"id": "MF-01", "codigo": "MF-01", "finca": "Miraflores", "estado": "COSECHADO", "has": 40, "toneladas": 3200, "suelo": "Arcilloso", "drenaje": "Medio", "camino": "Ripio secundario", "distanciaKm": 8.5, "ivlEstatico": 3.2, "lat": -24.2520, "lng": -64.8480},
  {"id": "MF-11", "codigo": "MF-11", "finca": "Miraflores Loma", "estado": "EN_COSECHA", "has": 45, "toneladas": 3600, "suelo": "Franco-arenoso", "drenaje": "Excelente", "camino": "Ripio secundario", "distanciaKm": 11.0, "ivlEstatico": 1.8, "lat": -24.2650, "lng": -64.8310},
  {"id": "MF-03", "codigo": "MF-03", "finca": "Miraflores Bajo", "estado": "PENDIENTE", "has": 50, "toneladas": 4100, "suelo": "Arcilloso pesado", "drenaje": "Deficiente (Bajo)", "camino": "Callejón de tierra virgen", "distanciaKm": 9.8, "ivlEstatico": 4.8, "lat": -24.2580, "lng": -64.8420},
  {"id": "PUE-12", "codigo": "PUE-12", "finca": "El Puesto (Zanja)", "estado": "PENDIENTE", "has": 55, "toneladas": 4400, "suelo": "Arcilloso", "drenaje": "Deficiente", "camino": "Tierra virgen (2 km a ripio)", "distanciaKm": 16.0, "ivlEstatico": 4.6, "lat": -24.2050, "lng": -64.8080},
  {"id": "ESP-08", "codigo": "ESP-08", "finca": "La Esperanza Fondo", "estado": "PENDIENTE", "has": 35, "toneladas": 2800, "suelo": "Arcilloso", "drenaje": "Medio", "camino": "Callejón mejorado", "distanciaKm": 5.5, "ivlEstatico": 3.6, "lat": -24.2420, "lng": -64.8760},
  {"id": "PUE-05", "codigo": "PUE-05", "finca": "El Puesto", "estado": "PENDIENTE", "has": 38, "toneladas": 3000, "suelo": "Franco-limoso", "drenaje": "Medio", "camino": "Callejón de tierra", "distanciaKm": 14.0, "ivlEstatico": 3.5, "lat": -24.2120, "lng": -64.8190},
  {"id": "ESP-01", "codigo": "ESP-01", "finca": "La Esperanza Central", "estado": "PENDIENTE", "has": 40, "toneladas": 3200, "suelo": "Franco", "drenaje": "Bueno", "camino": "Ripio pesado / Pavimento", "distanciaKm": 3.0, "ivlEstatico": 1.2, "lat": -24.2330, "lng": -64.8640},
  {"id": "ARR-02", "codigo": "ARR-02", "finca": "Arrayanal", "estado": "PENDIENTE", "has": 60, "toneladas": 4800, "suelo": "Franco", "drenaje": "Excelente", "camino": "Ripio consolidado (RP 56)", "distanciaKm": 11.5, "ivlEstatico": 1.4, "lat": -24.1920, "lng": -64.8380}
]

PARADAS_REGISTRADAS = [
    {
        "id": "PAR-01",
        "fecha": "2026-10-24",
        "duracionHoras": 8.5,
        "causa": "FALTA_CANA_LLUVIA",
        "toneladasNoMolidas": 4200,
        "costoARS": 25000000,
        "observaciones": "Lluvia de 55 mm cortó callejón de Miraflores"
    },
    {
        "id": "PAR-02",
        "fecha": "2026-11-02",
        "duracionHoras": 6.0,
        "causa": "FALTA_CANA_LLUVIA",
        "toneladasNoMolidas": 2900,
        "costoARS": 17500000,
        "observaciones": "Barro pesado en El Puesto, camiones varados"
    }
]

LECTURAS_PLUV = []

@app.get("/")
def inicio():
    return {
        "sistema": "PluviaZafra API",
        "organizacion": "Ingenio La Esperanza",
        "estado": "operativo",
        "version": "2.0.0"
    }

@app.get("/api/v1/lotes")
def listar_lotes():
    return LOTES_CATASTRO

@app.get("/api/v1/clima/pronostico")
def obtener_pronostico(lat: float = -24.2255, lon: float = -64.8638):
    try:
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=precipitation_sum,precipitation_probability_max&timezone=America%2FArgentina%2FJujuy"
        r = requests.get(url, timeout=5)
        if r.ok:
            return r.json()
    except Exception as e:
        pass
    return {
        "fuente": "offline_fallback",
        "daily": {
            "precipitation_sum": [2.0],
            "precipitation_probability_max": [15]
        }
    }

@app.get("/api/v1/priorizacion/ranking")
def calcular_ranking(lluvia_prevista_mm: float = 2.0, prob_lluvia: float = 0.15, lluvia_caida_mm: float = 0.0):
    ranking = []
    r_met = min(10.0, ((lluvia_caida_mm * 0.4) + (lluvia_prevista_mm * prob_lluvia * 0.6)) / 3.0)

    for lote in LOTES_CATASTRO:
        if lote["estado"] == "COSECHADO":
            semaforo = "COSECHADO"
            puntaje = 0.0
            rec = "Lote ya cosechado. Caña entregada a fábrica."
        elif lote["estado"] == "EN_COSECHA":
            semaforo = "EN_COSECHA"
            puntaje = 8.5
            rec = "Cuadrilla activa cortando. No interrumpir frente."
        else:
            puntaje = (lote["ivlEstatico"] * 1.0) + (r_met * 0.9)
            if puntaje >= 6.5:
                semaforo = "ROJO"
                rec = f"🚨 URGENTE: Cosechar antes de que lluevan {lluvia_prevista_mm} mm."
            elif puntaje >= 4.0:
                semaforo = "AMARILLO"
                rec = "⚠️ PRECAUCIÓN: Monitorear accesos."
            else:
                semaforo = "VERDE"
                rec = "🟢 SEGURO: Reserva con piso de ripio para días de lluvia."

        ranking.append({
            **lote,
            "puntaje": round(puntaje, 2),
            "semaforo": semaforo,
            "recomendacion": rec
        })

    ranking.sort(key=lambda x: x["puntaje"], reverse=True)
    return ranking

@app.post("/api/v1/pluviometros/lecturas")
def registrar_pluviometro(data: LecturaPluviometroIn):
    LECTURAS_PLUV.append(data.dict())
    return {
        "status": "ok",
        "mensaje": f"Lectura de {data.milimetros} mm registrada en {data.finca}."
    }

@app.get("/api/v1/paradas")
def listar_paradas():
    return PARADAS_REGISTRADAS

@app.post("/api/v1/paradas")
def registrar_parada(data: ParadaFabricaIn):
    PARADAS_REGISTRADAS.append(data.dict())
    return {
        "status": "ok",
        "mensaje": "Parada de fábrica registrada con éxito."
    }
