"""CU11 – Consulta automática del pronóstico cada `frecuencia_pronostico_min` minutos."""
import asyncio
import logging

from .deps import repositorio
from .domain import parametros
from .errors import ErrorNegocio
from .services import pronostico
from .services.contexto import Contexto

log = logging.getLogger("scheduler")


def _frecuencia_min(repo) -> int:
    try:
        return int(Contexto(repo).params["frecuencia_pronostico_min"])
    except Exception:
        return int(parametros.valores_defaults()["frecuencia_pronostico_min"])


async def ciclo_pronostico(espera_inicial: int = 10):
    await asyncio.sleep(espera_inicial)
    while True:
        repo = repositorio()
        try:
            restantes = await asyncio.to_thread(pronostico.segundos_vigencia_restantes, repo)
            if restantes > 0:
                log.info("Pronóstico automático vigente; próxima actualización en %d min", max(1, restantes // 60))
                await asyncio.sleep(restantes)
                continue
            resultado = await asyncio.to_thread(pronostico.actualizar_automatico, repo, origen="automático")
            log.info("Pronóstico actualizado: %s registros, %s alertas",
                     resultado["registros_actualizados"], len(resultado["alertas"]))
        except ErrorNegocio as e:
            log.warning("Pronóstico automático: %s", e.mensaje)
        except Exception:
            log.exception("Error inesperado en el pronóstico automático")
        await asyncio.sleep(_frecuencia_min(repo) * 60)
