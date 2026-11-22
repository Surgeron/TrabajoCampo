# Datos de la carga inicial

El script `backend/scripts/seed_firestore.py` reemplaza a CU05 en el prototipo. Lee `lotes_coordenadas_aproximadas.json` (planilla ZAFRA 2025 limpia, con coordenadas aproximadas) y escribe en Firestore. Los ids son fijos: si se corre otra vez, sobrescribe los mismos documentos.

## Lo que viene de la planilla

| Dato | Resultado |
|---|---|
| Fincas | 5: El Quemado (310), Parapeti (320), Miraflores (330), San Antonio (340), Meguida (350), con la ubicación aproximada de su cabecera |
| Lotes | 219 (sin las 2 filas duplicadas ni las vacías): 18.290,84 ha brutas y 9.232,90 ha netas |
| Zonas | 62 cercanos, 88 medios, 56 lejanos y 13 sin distancia (los 12 potreros de Meguida y La Chivas), que quedan sin zona y fuera del ranking |
| Estado | 153 En producción y 66 En preparación (Descepe 2024, Vacío, Monte o sin variedad; la leyenda queda en observaciones) |
| Ubicación | Punto y polígono aproximados de cada lote (marcados como aproximados) |

Hallazgo nuevo: el lote **3201050 de Parapeti** tiene el nombre dañado en la planilla original (“Ca�ita”, probablemente “Cañita”). Se cargó como está; se corrige desde Editar lote cuando se confirme.

## Lo que es de prueba (a confirmar con el ingenio)

| Dato | Valor de prueba |
|---|---|
| Campaña | “Zafra 2026 (base inventario 2025)”, desde el 01/06/2026, plan de 1.024.000 t |
| Drenaje | Parapeti: bien drenado. El Quemado y Meguida: medianamente drenado. Miraflores y San Antonio (críticas según la entrevista): imperfectamente drenado en zona media y medianamente drenado en el resto. Cada lote queda con `drenaje_dato_prueba = true` |
| Pluviómetros | 16 (`PLV-01` a `PLV-16`): uno por finca y zona, partidos en dos por rumbo cuando el grupo tiene 18 lotes o más en producción; Meguida tiene uno. Ubicación = promedio de sus lotes |
| Brix | Una medición por lote en producción, entre 7,00 y 12,00 °Bx (118 de 153 llegan a 8 °Bx), con origen “Dato de prueba” |
| Paradas 2026 | 2 bloques de 6 días por lluvia (13 al 19/07 y 24 al 30/08: 288 h) y 5 paradas por lotes lejanos o corte lento entre el 20/10 y el 12/11 (dos el mismo día, 05/11) |
| Parámetros “A confirmar” | Riesgo Medio desde 50 %, horizonte de 3 días, ventana de lluvia de 3 días, días sin piso por drenaje y tabla de lluvia moderada/fuerte de la simulación |
| Usuarios | `tecnico@nexozafra.test`, `jefe.lote@nexozafra.test`, `bascula@nexozafra.test` y `fabrica@nexozafra.test`, con la clave de `SEED_PASSWORD` |

Lecturas, estados de piso, cosechas, pronósticos, registros de patio y alertas empiezan vacíos: se generan al usar el sistema. El pronóstico automático se carga solo a la hora de iniciar el back end.
