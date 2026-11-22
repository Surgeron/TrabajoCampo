"""Pruebas de los casos de uso con el repositorio en memoria y los datos reales de la planilla.

Necesitan lotes_coordenadas_aproximadas.json: se busca en DATOS_LOTES, en ../confidencial
o en ../informacion (relativo a la raíz del proyecto). Si no está, se saltean.
"""
import os
import unittest
from datetime import datetime, timedelta
from pathlib import Path
from unittest import mock

from app.domain import fechas
from app.domain.constantes import COL_ALERTAS, COL_LOTES_CAMPANIA, CAUSA_LLUVIA, CAUSA_OTRA
from app.errors import Conflicto, ErrorNegocio, Prohibido, ServicioExterno, Validacion
from app.repositories.memory_repo import RepositorioMemoria
from app.services import alertas, campo, gerencia, lotes, paradas, patio, priorizacion, pronostico
from app.services.contexto import Contexto
from scripts.seed_firestore import construir_datos

AHORA = datetime(2026, 11, 21, 10, 0, tzinfo=fechas.TZ)
TEC = {"uid": "u-tec", "nombre": "Ana", "apellido": "Técnica", "rol": "tecnico"}
JEFE = {"uid": "u-jefe", "nombre": "Juan", "apellido": "Jefe", "rol": "jefe_lote"}
BAS = {"uid": "u-bas", "nombre": "Bea", "apellido": "Báscula", "rol": "bascula"}
FAB = {"uid": "u-fab", "nombre": "Pedro", "apellido": "Fábrica", "rol": "fabrica"}


def _ruta_datos():
    candidatas = [os.getenv("DATOS_LOTES")]
    raiz = Path(__file__).resolve().parents[2]
    candidatas += [str(raiz / c / "lotes_coordenadas_aproximadas.json") for c in ("confidencial", "informacion")]
    return next((c for c in candidatas if c and Path(c).exists()), None)


RUTA = _ruta_datos()


@unittest.skipUnless(RUTA, "No se encontró lotes_coordenadas_aproximadas.json")
class Base(unittest.TestCase):
    def setUp(self):
        self.parche = mock.patch.object(fechas, "ahora", return_value=AHORA)
        self.parche.start()
        self.repo = RepositorioMemoria()
        for col, docs in construir_datos(RUTA, AHORA).items():
            for id_doc, doc in docs.items():
                self.repo.guardar(col, id_doc, doc)

    def tearDown(self):
        self.parche.stop()

    def lote_por(self, **cond):
        ctx = Contexto(self.repo)
        return next(l for l in ctx.lotes if all(l.get(k) == v for k, v in cond.items()))


class TestCatalogos(Base):
    def test_fincas_y_parametros(self):
        fincas = lotes.listar_fincas(self.repo)
        self.assertEqual(len(fincas), 5)
        self.assertEqual(sum(f["cantidad_lotes"] for f in fincas), 219)
        params = lotes.listar_parametros(self.repo)
        self.assertEqual(params["campania"]["fecha_inicio"], "2026-06-01")
        self.assertTrue(any(p["clave"] == "brix_minimo" and p["valor"] == 8 for p in params["parametros"]))
        self.assertEqual(len(lotes.listar_pluviometros(self.repo)), 16)

    def test_filtros_de_lotes(self):
        self.assertEqual(len(lotes.listar_lotes(self.repo, zona="Sin zona")), 13)
        self.assertTrue(all(l["finca"] == "Miraflores" for l in lotes.listar_lotes(self.repo, id_finca="330")))
        self.assertEqual(len(lotes.listar_lotes(self.repo, estado_lote="En producción")), 153)

    def test_editar_lote_valida(self):
        l = self.lote_por(id_finca="330", estado_lote="En producción")
        with self.assertRaises(Validacion) as e:
            lotes.actualizar_lote(self.repo, TEC, l["id_unico"], {"area_neta_ha": (l["area_bruta_ha"] or 1) + 1})
        self.assertIn("area_neta_ha", e.exception.datos["campos"])
        otro = self.lote_por(id_finca="330", estado_lote="En preparación")
        with self.assertRaises(Validacion) as e:
            lotes.actualizar_lote(self.repo, TEC, l["id_unico"], {"nro_lote": otro["nro_lote"]})
        self.assertIn("nro_lote", e.exception.datos["campos"])
        ficha = lotes.actualizar_lote(self.repo, TEC, l["id_unico"], {"drenaje": "bien", "cantidad_cortes": 3, "dist_ingenio_km": 15})
        self.assertEqual(ficha["lote"]["drenaje"], "bien")
        self.assertEqual(ficha["lote"]["cantidad_cortes"], 3)
        self.assertEqual(ficha["lote"]["zona"], "Lejana")


class TestRankingYCampo(Base):
    def test_ranking_inicial(self):
        r = priorizacion.consultar_ranking(self.repo)
        self.assertEqual(len(r["ranking"]), 118 - len([l for l in Contexto(self.repo).lotes
                                                       if l["estado_lote"] == "En producción" and not l["zona"]
                                                       and l["brix"] and l["brix"] >= 8]))
        zonas_orden = [x["zona"] for x in r["ranking"]]
        self.assertEqual(zonas_orden, sorted(zonas_orden, key=lambda z: {"Lejana": 0, "Media": 1, "Cercana": 2}[z]))
        self.assertTrue(all(x["brix"] >= 8 for x in r["ranking"]))

    def test_lectura_duplicada_y_correccion(self):
        lec = campo.registrar_lectura(self.repo, JEFE, "PLV-09", "2026-11-21", 12)
        self.assertEqual(lec["mm"], 12.0)
        with self.assertRaises(Conflicto):
            campo.registrar_lectura(self.repo, JEFE, "PLV-09", "2026-11-21", 15)
        corr = campo.corregir_lectura(self.repo, JEFE, lec["id"], 15)
        self.assertEqual((corr["mm"], corr["mm_anterior"]), (15.0, 12.0))
        with self.assertRaises(Validacion):
            campo.registrar_lectura(self.repo, JEFE, "PLV-09", "2026-11-22", 3)
        with self.assertRaises(Validacion):
            campo.registrar_lectura(self.repo, JEFE, "PLV-09", "2026-11-20", -1)
        self.assertEqual(len(campo.listar_lecturas(self.repo, JEFE, solo_mias=True)), 1)

    def test_estado_piso_saca_del_ranking_y_cierra_periodo(self):
        top = priorizacion.consultar_ranking(self.repo)["ranking"][0]
        r = campo.registrar_estado_piso(self.repo, JEFE, top["id_unico"], "Inhabilitado", "aguada")
        self.assertIn("período sin piso", r["mensaje"])
        ids = [x["id_unico"] for x in priorizacion.consultar_ranking(self.repo)["ranking"]]
        self.assertNotIn(top["id_unico"], ids)
        with mock.patch.object(fechas, "ahora", return_value=datetime(2026, 11, 23, 10, tzinfo=fechas.TZ)):
            r = campo.registrar_estado_piso(self.repo, TEC, top["id_unico"], "Habilitado", None)
        self.assertEqual(r["dias_sin_piso"], 2.0)
        ficha = lotes.ficha_lote(self.repo, top["id_unico"])
        self.assertEqual(ficha["periodos_sin_piso"][0]["dias"], 2.0)

    def test_brix_bajo_saca_de_reserva(self):
        cand = priorizacion.vista_reserva(self.repo)["candidatos"][0]
        priorizacion.marcar_reserva(self.repo, TEC, cand["id_unico"], True)
        with self.assertRaises(Conflicto):
            priorizacion.marcar_reserva(self.repo, TEC, cand["id_unico"], True)
        r = campo.registrar_brix(self.repo, TEC, cand["id_unico"], "2026-11-21", 7.5, "Laboratorio")
        self.assertFalse(r["habilitado_por_madurez"])
        self.assertEqual(len(r["avisos_reserva"]), 1)
        self.assertFalse(Contexto(self.repo).lote(cand["id_unico"])["en_reserva"])

    def test_reserva_rechaza_no_candidato(self):
        l = self.lote_por(estado_lote="En producción", drenaje="imperfecto")
        with self.assertRaises(Conflicto):
            priorizacion.marcar_reserva(self.repo, TEC, l["id_unico"], True)

    def test_cosecha(self):
        prep = self.lote_por(estado_lote="En preparación")
        with self.assertRaises(Conflicto):
            campo.registrar_cosecha(self.repo, TEC, prep["id_unico"], "2026-11-20", None, False)
        top = priorizacion.consultar_ranking(self.repo)["ranking"][0]
        campo.registrar_cosecha(self.repo, TEC, top["id_unico"], "2026-11-20", 350, False)
        r = priorizacion.consultar_ranking(self.repo)
        self.assertIn(top["id_unico"], [x["id_unico"] for x in r["en_cosecha"]])
        campo.registrar_cosecha(self.repo, TEC, top["id_unico"], "2026-11-21", None, True)
        r = priorizacion.consultar_ranking(self.repo)
        self.assertIn(top["id_unico"], [x["id_unico"] for x in r["excluidos"] if x["motivo"] == "Cosecha terminada"])
        with self.assertRaises(Conflicto):
            campo.registrar_cosecha(self.repo, TEC, top["id_unico"], "2026-11-21", None, True)
        with self.assertRaises(Validacion):
            campo.registrar_cosecha(self.repo, TEC, top["id_unico"], "2026-05-01", None, False)


class TestPronosticoYAlertas(Base):
    def _cosecha_en(self, id_finca):
        l = self.lote_por(id_finca=id_finca, estado_lote="En producción")
        campo.registrar_cosecha(self.repo, TEC, l["id_unico"], "2026-11-21", None, False)
        return l

    def test_alerta_lluvia_unica_por_finca_y_dia(self):
        self._cosecha_en("330")
        r = pronostico.registrar_manual(self.repo, TEC, "330", "2026-11-22", 80, 30)
        self.assertEqual(len(r["alertas"]), 1)
        pronostico.registrar_manual(self.repo, TEC, "330", "2026-11-22", 90, 40)
        lluvias = [a for a in self.repo.listar(COL_ALERTAS) if a["tipo"] == "Lluvia"]
        self.assertEqual(len(lluvias), 1)
        self.assertEqual(lluvias[0]["prob_lluvia_pct"], 90.0)
        # Sin cosecha en curso no hay alerta
        pronostico.registrar_manual(self.repo, TEC, "320", "2026-11-22", 95, 40)
        self.assertEqual(len([a for a in self.repo.listar(COL_ALERTAS) if a["tipo"] == "Lluvia"]), 1)
        # El riesgo sube a Alto en los imperfectamente drenados de Miraflores
        ctx = Contexto(self.repo)
        altos = [l for l in ctx.lotes if (l["riesgo"] or {}).get("nivel") == "Alto"]
        self.assertTrue(altos and all(l["id_finca"] == "330" and l["drenaje"] == "imperfecto" for l in altos))
        rk = priorizacion.consultar_ranking(self.repo)["ranking"]
        self.assertEqual(rk[0]["riesgo"], "Alto")
        # La vista de reserva sugiere adelantar
        self.assertTrue(priorizacion.vista_reserva(self.repo)["sugerencia_adelantar"])
        a = alertas.marcar_vista(self.repo, FAB, lluvias[0]["id"])
        self.assertTrue(a["vista"])
        with self.assertRaises(Conflicto):
            alertas.marcar_vista(self.repo, FAB, lluvias[0]["id"])

    def test_manual_valida_rango(self):
        with self.assertRaises(Validacion):
            pronostico.registrar_manual(self.repo, TEC, "330", "2026-11-20", 50, 1)
        with self.assertRaises(Validacion):
            pronostico.registrar_manual(self.repo, TEC, "330", "2026-11-22", 120, 1)

    def test_automatico_respeta_manual_y_tolera_falla(self):
        self._cosecha_en("310")
        pronostico.registrar_manual(self.repo, TEC, "310", "2026-11-21", 10, 0)

        def falso(lat, lon):
            return [{"fecha": f"2026-11-{d}", "mm": 20, "prob": 85} for d in range(21, 28)]

        r = pronostico.actualizar_automatico(self.repo, consultar=falso)
        self.assertEqual(r["dias_con_carga_manual"], 1)
        self.assertEqual(r["registros_actualizados"], 34)
        self.assertEqual(self.repo.obtener("pronosticos", "310_2026-11-21")["fuente"], "Manual")
        self.assertTrue(any(a["finca"] == "El Quemado" for a in r["alertas"]))

        def caido(lat, lon):
            raise OSError("sin conexión")

        with self.assertRaises(ServicioExterno):
            pronostico.actualizar_automatico(self.repo, consultar=caido)
        self.assertEqual(self.repo.obtener("pronosticos", "330_2026-11-22")["prob_lluvia_pct"], 85)

    def test_lote_open_meteo_y_respaldo_met_no(self):
        respuesta_lote = [
            {"daily": {"time": ["2026-11-21"], "precipitation_sum": [12.5], "precipitation_probability_max": [70]}},
            {"daily": {"time": ["2026-11-21"], "precipitation_sum": [0.0], "precipitation_probability_max": [10]}},
        ]
        with mock.patch.object(pronostico, "_pedir_json", return_value=respuesta_lote) as m_lote:
            res = pronostico.consultar_open_meteo_lote([(-24.1, -64.8), (-24.2, -64.9)])
        self.assertEqual(m_lote.call_count, 1)
        self.assertEqual(res[0][0], {"fecha": "2026-11-21", "mm": 12.5, "prob": 70.0})
        self.assertEqual(res[1][0], {"fecha": "2026-11-21", "mm": 0.0, "prob": 10.0})

        respuesta_met = {
            "properties": {
                "timeseries": [
                    {"time": "2026-11-21T15:00:00Z", "data": {"next_1_hours": {"details": {"precipitation_amount": 4.2}}}},
                    {"time": "2026-11-21T16:00:00Z", "data": {"next_1_hours": {"details": {"precipitation_amount": 5.8}}}},
                    {
                        "time": "2026-11-22T12:00:00Z",
                        "data": {"next_6_hours": {"details": {"precipitation_amount": 0.0, "probability_of_precipitation": 15}}},
                    },
                ]
            }
        }
        with mock.patch.object(pronostico, "_pedir_json", return_value=respuesta_met):
            met = pronostico.consultar_met_no(-24.1, -64.8)
        self.assertEqual(met[0], {"fecha": "2026-11-21", "mm": 10.0, "prob": 70.0})
        self.assertEqual(met[1], {"fecha": "2026-11-22", "mm": 0.0, "prob": 15.0})

        with mock.patch.object(pronostico, "consultar_open_meteo_lote", side_effect=OSError("429 Too Many Requests")), \
             mock.patch.object(pronostico, "consultar_met_no", return_value=[{"fecha": "2026-11-21", "mm": 3.0, "prob": 49.0}]) as m_met:
            r = pronostico.actualizar_automatico(self.repo)
        self.assertEqual(m_met.call_count, 5)
        self.assertEqual(r["registros_actualizados"], 5)
        self.assertEqual(self.repo.obtener("pronosticos", "330_2026-11-21")["fuente"], "API")

    def test_vigencia_pronostico_automatico(self):
        self.assertEqual(pronostico.segundos_vigencia_restantes(self.repo), 0)
        pronostico.actualizar_automatico(
            self.repo,
            consultar=lambda lat, lon: [{"fecha": "2026-11-21", "mm": 0, "prob": 0}],
        )
        with mock.patch.object(fechas, "ahora", return_value=AHORA + timedelta(minutes=10)):
            self.assertEqual(pronostico.segundos_vigencia_restantes(self.repo), 3000)
        with mock.patch.object(fechas, "ahora", return_value=AHORA + timedelta(minutes=61)):
            self.assertEqual(pronostico.segundos_vigencia_restantes(self.repo), 0)


class TestPatioYParadas(Base):
    def _a_las(self, hora):
        return mock.patch.object(fechas, "ahora", return_value=datetime(2026, 11, 21, hora, tzinfo=fechas.TZ))

    def test_alerta_de_colchon(self):
        with self._a_las(7):
            r = patio.registrar(self.repo, BAS, 20, "Normal")
        self.assertEqual(r["alerta"]["accion"], "creada")
        with self._a_las(8):
            r = patio.registrar(self.repo, BAS, 25, "Post-lluvia")
        self.assertEqual(r["alerta"]["accion"], "actualizada")
        self.assertEqual(len([a for a in self.repo.listar(COL_ALERTAS) if a["tipo"] == "Colchón bajo"]), 1)
        with self._a_las(9):
            r = patio.registrar(self.repo, BAS, 31, "Normal")
        self.assertEqual(r["alerta"]["accion"], "cerrada")
        with self.assertRaises(Validacion):
            patio.registrar(self.repo, BAS, -1, "Normal")
        with self.assertRaises(Validacion):
            patio.registrar(self.repo, BAS, 10, "Mojado")
        t = patio.tablero(self.repo)
        self.assertEqual(t["ultimo"]["cantidad_carros"], 31)
        self.assertEqual(len(t["evolucion"]), 3)

    def test_paradas(self):
        with self.assertRaises(Conflicto):  # se superpone con una parada de prueba
            paradas.registrar(self.repo, FAB, "2026-07-14T00:00:00-03:00", "2026-07-14T02:00:00-03:00", CAUSA_OTRA, None)
        with self.assertRaises(Validacion):
            paradas.registrar(self.repo, FAB, "2026-11-20T10:00:00-03:00", "2026-11-20T09:00:00-03:00", CAUSA_OTRA, None)
        abierta = paradas.registrar(self.repo, FAB, "2026-11-21T08:00:00-03:00", None, CAUSA_LLUVIA, "lluvia")
        self.assertTrue(abierta["abierta"])
        self.assertEqual(abierta["duracion_h"], 2.0)
        self.assertEqual(abierta["costos_usd"]["central"], 3126)
        self.assertEqual(abierta["patio"]["carros_faltantes"], 30)
        self.assertFalse(abierta["alerta_previa"]["hubo_alerta"])
        with self.assertRaises(Conflicto):
            paradas.registrar(self.repo, FAB, "2026-11-21T09:00:00-03:00", None, CAUSA_OTRA, None)
        cerrada = paradas.cerrar(self.repo, FAB, abierta["id"], "2026-11-21T09:30:00-03:00")
        self.assertEqual(cerrada["duracion_h"], 1.5)
        lista = paradas.listar(self.repo)
        self.assertEqual(len(lista["paradas"]), 8)


class TestSimulacionYGerencia(Base):
    def test_simulacion_no_modifica_datos(self):
        antes = {c: sorted(map(str, self.repo.listar(c))) for c in ("lotes", "lotes_campania", "estados_piso", "alertas")}
        r = priorizacion.simular(self.repo, [{"id_finca": "330", "mm": 50}], pedido_organico=True)
        despues = {c: sorted(map(str, self.repo.listar(c))) for c in antes}
        self.assertEqual(antes, despues)
        self.assertGreater(r["resumen"]["lotes_sin_piso"], 0)
        self.assertTrue(all(l["finca"] == "Miraflores" for l in r["quedarian_sin_piso"]))
        self.assertLess(r["resumen"]["lotes_ranking_simulado"], r["resumen"]["lotes_ranking_real"])
        self.assertEqual(r["ranking_simulado"][0]["tipo_cultivo"], "Orgánico")
        with self.assertRaises(Validacion):
            priorizacion.simular(self.repo, [], False)
        r2 = priorizacion.simular(self.repo, [{"id_finca": "330", "mm": 10}], False)
        self.assertGreater(r2["resumen"]["lotes_a_riesgo_alto"], 0)

    def test_panel_con_paradas_de_prueba(self):
        p = gerencia.panel(self.repo)
        horas = next(t for t in p["tarjetas"] if t["id"] == 1)["valor"]
        self.assertEqual(horas, 288 + 3.5 + 3 + 2.5 + 3 + 3.5)
        self.assertEqual(p["filtros"]["desde"], "2026-06-01")
        self.assertEqual(len(p["graficos"]["avance_zona"]), 3)
        self.assertLess(p["graficos"]["disponibilidad_pct"], 100)
        with self.assertRaises(Validacion):
            gerencia.panel(self.repo, desde="2026-11-21", hasta="2026-11-01")

    def test_informes(self):
        for tipo in gerencia.INFORMES:
            r = gerencia.informe(self.repo, tipo, "tecnico")
            self.assertTrue(r["columnas"])
        self.assertFalse(gerencia.informe(self.repo, "paradas", "fabrica")["sin_datos"])
        self.assertTrue(gerencia.informe(self.repo, "patio", "fabrica")["sin_datos"])
        with self.assertRaises(Prohibido):
            gerencia.informe(self.repo, "sin-piso", "fabrica")
        with self.assertRaises(ErrorNegocio):
            gerencia.informe(self.repo, "inexistente", "tecnico")


if __name__ == "__main__":
    unittest.main()
