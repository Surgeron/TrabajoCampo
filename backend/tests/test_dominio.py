"""Pruebas de las reglas de negocio puras (sin base de datos)."""
import unittest
from datetime import date, datetime

from app.domain import fechas, paradas, parametros, patio, ranking, reserva, riesgo, zonas
from app.domain.constantes import CAUSA_LLUVIA

P = parametros.valores_defaults()


def lote(**kw):
    base = {
        "id_unico": kw.get("id_unico", "1"), "id_finca": "330", "finca": "Miraflores", "nombre": kw.get("nombre", "L"),
        "estado_lote": "En producción", "zona": "Media", "drenaje": "bien", "brix": 9.0, "estado_piso": "Habilitado",
        "terminado": False, "en_cosecha": False, "tipo_cultivo": "Convencional", "area_neta_ha": 10.0,
        "riesgo": {"nivel": "Bajo", "justificacion": "x"},
    }
    base.update(kw)
    return base


class TestZonas(unittest.TestCase):
    def test_limites(self):
        self.assertEqual(zonas.calcular_zona(1, P), "Cercana")
        self.assertEqual(zonas.calcular_zona(6, P), "Cercana")
        self.assertEqual(zonas.calcular_zona(6.5, P), "Media")
        self.assertEqual(zonas.calcular_zona(7, P), "Media")
        self.assertEqual(zonas.calcular_zona(12, P), "Media")
        self.assertEqual(zonas.calcular_zona(13, P), "Lejana")
        self.assertEqual(zonas.calcular_zona(19, P), "Lejana")
        self.assertIsNone(zonas.calcular_zona(None, P))

    def test_madurez(self):
        self.assertEqual(zonas.madurez("Lejana"), "Temprana")
        self.assertEqual(zonas.madurez("Media"), "Media")
        self.assertEqual(zonas.madurez("Cercana"), "Tardía")


class TestRiesgo(unittest.TestCase):
    def test_niveles_propuesta(self):
        self.assertEqual(riesgo.nivel_riesgo("imperfecto", 70, P), "Alto")
        self.assertEqual(riesgo.nivel_riesgo("imperfecto", 69, P), "Medio")
        self.assertEqual(riesgo.nivel_riesgo("imperfecto", 50, P), "Medio")
        self.assertEqual(riesgo.nivel_riesgo("imperfecto", 49, P), "Bajo")
        self.assertEqual(riesgo.nivel_riesgo("medio", 70, P), "Medio")
        self.assertEqual(riesgo.nivel_riesgo("medio", 69, P), "Bajo")
        self.assertEqual(riesgo.nivel_riesgo("bien", 100, P), "Bajo")
        self.assertEqual(riesgo.nivel_riesgo(None, 100, P), "Sin datos")

    def test_lluvia_acumulada_ventana(self):
        lect = [{"fecha": "2026-11-21", "mm": 5}, {"fecha": "2026-11-19", "mm": 10}, {"fecha": "2026-11-18", "mm": 50}]
        self.assertEqual(riesgo.lluvia_acumulada(lect, date(2026, 11, 21), 3), 15.0)

    def test_pronostico_relevante_toma_el_maximo_del_horizonte(self):
        pr = [
            {"fecha_pronosticada": "2026-11-21", "prob_lluvia_pct": 30},
            {"fecha_pronosticada": "2026-11-23", "prob_lluvia_pct": 80},
            {"fecha_pronosticada": "2026-11-24", "prob_lluvia_pct": 95},  # fuera del horizonte de 3 días
        ]
        self.assertEqual(riesgo.pronostico_relevante(pr, date(2026, 11, 21), 3)["prob_lluvia_pct"], 80)

    def test_periodos_y_dias_estimados(self):
        est = [
            {"estado": "Inhabilitado", "fecha_hora_desde": "2026-11-01T08:00:00-03:00"},
            {"estado": "Inhabilitado", "fecha_hora_desde": "2026-11-02T08:00:00-03:00"},
            {"estado": "Con restricciones", "fecha_hora_desde": "2026-11-04T08:00:00-03:00"},
            {"estado": "Habilitado", "fecha_hora_desde": "2026-11-05T08:00:00-03:00"},
            {"estado": "Inhabilitado", "fecha_hora_desde": "2026-11-20T08:00:00-03:00"},
        ]
        ahora = datetime(2026, 11, 21, 8, tzinfo=fechas.TZ)
        per = riesgo.periodos_sin_piso(est, ahora)
        self.assertEqual(len(per), 2)
        self.assertEqual(per[0]["dias"], 3.0)
        self.assertTrue(per[1]["abierto"])
        self.assertEqual(riesgo.dias_estimados("imperfecto", per, P), (3.0, "Historial del lote"))
        self.assertEqual(riesgo.dias_estimados("imperfecto", [], P), (4.0, "Criterio experto por drenaje"))

    def test_tabla_de_prueba_por_lluvia(self):
        self.assertEqual(riesgo.dias_por_lluvia("imperfecto", 14.9, P), 0)
        self.assertEqual(riesgo.dias_por_lluvia("imperfecto", 15, P), 2)
        self.assertEqual(riesgo.dias_por_lluvia("imperfecto", 35, P), 2)
        self.assertEqual(riesgo.dias_por_lluvia("imperfecto", 36, P), 4)
        self.assertEqual(riesgo.dias_por_lluvia("bien", 30, P), 0)
        self.assertEqual(riesgo.dias_por_lluvia("bien", 40, P), 1)
        self.assertEqual(riesgo.dias_por_lluvia("medio", 20, P), 1)


class TestRanking(unittest.TestCase):
    def test_orden_y_exclusiones(self):
        lotes = [
            lote(id_unico="a", zona="Cercana", brix=11),
            lote(id_unico="b", zona="Lejana", brix=9),
            lote(id_unico="c", zona="Lejana", brix=10),
            lote(id_unico="d", zona="Cercana", drenaje="imperfecto", brix=8.5, riesgo={"nivel": "Alto", "justificacion": "j"}),
            lote(id_unico="e", zona="Media", brix=7.9),
            lote(id_unico="f", estado_piso="Inhabilitado"),
            lote(id_unico="g", estado_lote="En preparación"),
            lote(id_unico="h", terminado=True),
            lote(id_unico="i", en_cosecha=True),
            lote(id_unico="j", brix=None),
            lote(id_unico="k", zona=None),
            lote(id_unico="m", zona="Media", estado_piso="Con restricciones", brix=9),
        ]
        r = ranking.calcular(lotes, P)
        self.assertEqual([x["id_unico"] for x in r["ranking"]], ["d", "c", "b", "m", "a"])
        self.assertEqual([x["id_unico"] for x in r["en_cosecha"]], ["i"])
        motivos = {x["id_unico"]: x["motivo"] for x in r["excluidos"]}
        self.assertEqual(motivos["e"], "Brix menor a 8 °Bx")
        self.assertEqual(motivos["f"], "Inhabilitado (sin piso)")
        self.assertEqual(motivos["g"], "En preparación")
        self.assertEqual(motivos["h"], "Cosecha terminada")
        self.assertEqual(motivos["j"], "Sin medición de Brix")
        self.assertIn("Sin distancia", motivos["k"])
        m = next(x for x in r["ranking"] if x["id_unico"] == "m")
        self.assertTrue(any("Con restricciones" in a for a in m["avisos"]))
        self.assertIn("adelantar", r["ranking"][0]["motivo"])

    def test_prioridad_organica(self):
        lotes = [lote(id_unico="a", zona="Lejana"), lote(id_unico="b", zona="Cercana", tipo_cultivo="Orgánico")]
        self.assertEqual([x["id_unico"] for x in ranking.calcular(lotes, P)["ranking"]], ["a", "b"])
        self.assertEqual([x["id_unico"] for x in ranking.calcular(lotes, P, prioridad_organica=True)["ranking"]], ["b", "a"])


class TestReserva(unittest.TestCase):
    def test_candidatos(self):
        self.assertTrue(reserva.es_candidato(lote(), P))
        self.assertFalse(reserva.es_candidato(lote(zona="Lejana"), P))
        self.assertFalse(reserva.es_candidato(lote(drenaje="medio"), P))
        self.assertFalse(reserva.es_candidato(lote(brix=7.5), P))
        self.assertFalse(reserva.es_candidato(lote(estado_piso="Con restricciones"), P))
        self.assertFalse(reserva.es_candidato(lote(terminado=True), P))

    def test_baja_y_sugerencia(self):
        self.assertIn("inhabilitado", reserva.motivo_baja(lote(estado_piso="Inhabilitado"), P))
        self.assertIsNone(reserva.motivo_baja(lote(), P))
        sug = reserva.sugerencia_adelantar([lote(drenaje="imperfecto"), lote(drenaje="imperfecto", brix=7)], {"330"}, P)
        self.assertEqual(len(sug), 1)


class TestPatio(unittest.TestCase):
    def test_umbral_30_carros(self):
        c = patio.calcular(30, "Normal", P)
        self.assertEqual(c["t_netas"], 840.0)
        self.assertAlmostEqual(c["horas_cobertura"], 2.69, places=2)
        self.assertFalse(c["bajo_umbral"])
        c = patio.calcular(20, "Post-lluvia", P)
        self.assertEqual(c["t_netas"], 516.0)
        self.assertTrue(c["bajo_umbral"])
        self.assertEqual(c["carros_faltantes"], 10)
        self.assertEqual(c["merma_pct"], 14.0)


class TestParadas(unittest.TestCase):
    def test_costos_y_superposicion(self):
        self.assertEqual(paradas.costos(2, P), {"bajo": 2000, "central": 3126, "alto": 4500})
        ex = [{"id": "1", "fecha_hora_inicio": "2026-11-05T10:00:00-03:00", "fecha_hora_fin": "2026-11-05T12:00:00-03:00"},
              {"id": "2", "fecha_hora_inicio": "2026-11-10T10:00:00-03:00", "fecha_hora_fin": None}]
        t = fechas.de_iso
        self.assertIsNotNone(paradas.buscar_superposicion(t("2026-11-05T11:00:00-03:00"), t("2026-11-05T13:00:00-03:00"), ex))
        self.assertIsNone(paradas.buscar_superposicion(t("2026-11-05T12:00:00-03:00"), t("2026-11-05T13:00:00-03:00"), ex))
        self.assertIsNotNone(paradas.buscar_superposicion(t("2026-11-12T10:00:00-03:00"), None, ex))

    def test_alerta_previa(self):
        p = {"causa": CAUSA_LLUVIA, "fecha_hora_inicio": "2026-11-10T06:00:00-03:00"}
        al = [{"tipo": "Lluvia", "fecha_hora": "2026-11-08T18:00:00-03:00"},
              {"tipo": "Lluvia", "fecha_hora": "2026-11-01T18:00:00-03:00"}]
        r = paradas.alerta_previa(p, al)
        self.assertTrue(r["hubo_alerta"])
        self.assertEqual(r["horas_anticipacion"], 36.0)
        self.assertIsNone(paradas.alerta_previa({**p, "causa": "Otra"}, al))


if __name__ == "__main__":
    unittest.main()
