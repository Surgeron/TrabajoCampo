# PluviaZafra: Datos provisorios y puntos a resolver en la entrevista

Reúne todo lo que hoy está entre corchetes en los documentos de [docs](.) y necesita confirmación del ingenio. Cada punto indica el valor que usamos por ahora, qué preguntar y en qué documento impacta.

Marcar con `[x]` al resolver y actualizar el documento afectado.

Referencias: **F** = [formulacion-proyecto-pluviazafra.md](formulacion-proyecto-pluviazafra.md), **E** = [especificaciones-casos-de-uso.md](especificaciones-casos-de-uso.md), **D** = [casos-de-uso-pluviazafra.md](casos-de-uso-pluviazafra.md).

## 1. Organización y personas

| Hecho | Valor provisorio | Qué preguntar | Impacta |
|---|---|---|---|
| [ ] Datos de la organización | Ingenio azucarero con lotes propios y de terceros. | Razón social, ubicación, tamaño de la zafra, cantidad de lotes y hectáreas. ¿Cosechan solo lotes propios o también de terceros? | F |
| [ ] Quién decide el orden de cosecha | "Jefe de cosecha". | ¿Qué cargo decide hoy? ¿Una persona o un comité? ¿Cómo lo decide? | Actores, F, D |
| [ ] Quién carga las lecturas del pluviómetro | "Operador de campo". | ¿Quién las toma? ¿Con qué frecuencia? ¿Cómo las anotan hoy? | CU08, CU05 |
| [ ] Quién registra las paradas | "Supervisor de fábrica", una sola persona. | ¿Quién las registra? ¿Son varias personas, por turno? | CU13 |
| [ ] Quién informa los anegamientos | Operador de campo y Jefe de cosecha. | ¿Hay capataces de cuadrilla u otros que lo reporten? | CU05 |
| [ ] Administrador | Hereda del Jefe de cosecha. | ¿Quién administraría el sistema? ¿Hay separación estricta de funciones? | D, usuarios |
| [ ] Visibilidad por rol | Operador y Supervisor no ven el mapa ni el ranking. | ¿Conviene que el operador vea el mapa? ¿Que la fábrica vea lo que viene del campo? | Casos por usuario |
| [ ] Fuente y fecha de la entrevista | Pendiente. | ¿Con quién y cuándo se hace? | F |

## 2. Situación actual del proceso

Confirman o descartan la hipótesis central del proyecto.

- [ ] ¿Hoy el orden de cosecha considera qué lotes se anegan más y el pronóstico? (Suposición: no, depende de la experiencia.)
- [ ] ¿Existe algún registro de qué lotes se anegan? ¿Dónde está (papel, planilla, memoria de alguien)?
- [ ] ¿Se registran hoy las paradas de fábrica, con causa y duración? ¿Dónde?
- [ ] ¿Cuántas paradas por lluvia o falta de caña hubo en las últimas zafras y cuánto costaron? Dato clave para medir beneficios.
- [ ] ¿Cuánta caña se pierde o se cosecha fuera de tiempo por lotes anegados?
- [ ] ¿Cómo se informa hoy el pronóstico y quién lo consulta?
- [ ] ¿Qué herramientas usan hoy (planillas, sistemas, mapas)? ¿Hay algo con lo que haya que convivir?

## 3. Lotes y zonas

| Hecho | Valor provisorio | Qué preguntar | Impacta |
|---|---|---|---|
| [ ] Datos del lote | Código, nombre, hectáreas, toneladas estimadas, zona y polígono. | ¿Hay un código oficial? ¿Qué otro dato usan (variedad, edad del cañaveral, productor)? | CU03 |
| [ ] Zonas | Cada lote pertenece a una zona con un pluviómetro. | ¿Cómo se dividen hoy las zonas? ¿Hay zonas definidas o hay que armarlas? ¿Cuántas? | CU07, modelo de datos |
| [ ] Un pluviómetro por zona | Uno por zona. | ¿Cuántos pluviómetros hay y dónde están? ¿Alguna zona no tiene? | CU07, CU11 |
| [ ] Hectáreas contra polígono | Aviso si difieren más de 10 %. Falta decidir si se autocalculan. | ¿Las hectáreas oficiales son confiables o conviene calcularlas del polígono? | CU03 |
| [ ] Superposición de polígonos | Aviso y confirmación. | ¿Puede haber lotes superpuestos? | CU03 |
| [ ] Lotes de terceros | No contemplados. | ¿Entran al sistema? ¿Se cosechan con el mismo criterio? | Alcance |

## 4. Estados del lote y semáforo

| Hecho | Valor provisorio | Qué preguntar | Impacta |
|---|---|---|---|
| [ ] Estados operativos | Anegado, En cosecha, Cosechado, En descanso. | ¿Falta algún estado real (por ejemplo, quemado, en espera de maquinaria, cortado parcialmente)? ¿Se cosecha un lote por partes? | CU03 |
| [ ] Colores | Azul, naranja, gris, gris claro. | ¿Hay alguna convención de colores en el ingenio? | CU03, CU12 |
| [ ] Cortes del semáforo | Rojo desde 67, amarillo de 34 a 66, verde hasta 33. | ¿Qué consideran "urgente"? Se calibra con lotes conocidos: ¿cuáles dirían que hay que cosechar primero con lluvia? | CU11, CU06 |
| [ ] Cierre de un anegamiento | Lo cierra una persona a mano. | ¿Quién avisa que el lote ya se puede transitar? ¿Cuánto tarda en recuperarse según el lote? | CU05 |

## 5. Índice de vulnerabilidad (CU10)

| Hecho | Valor provisorio | Qué preguntar |
|---|---|---|
| [ ] Escala de suelo | Arenoso 20, Franco 50, Arcilloso 90. | ¿Qué tipos de suelo hay realmente? ¿Cómo los clasifican? ¿Cuál se anega más? |
| [ ] Escala de drenaje | Bueno 10, Regular 50, Malo 100. | ¿Cómo evalúan el drenaje? ¿Hay un dato o es una apreciación? |
| [ ] Escala de camino de acceso | Consolidado 10, Enripiado 40, Tierra 90. | ¿Qué tipos de camino hay? ¿Cuál se vuelve intransitable antes? |
| [ ] Pesos de los factores | Suelo 0,20; drenaje 0,25; camino 0,20; historial total 0,15; última zafra 0,20. | ¿Qué pesa más al decidir si un lote se anega o queda intransitable? Pedir que ordenen los factores por importancia. |
| [ ] Tope de anegamientos | 5 totales y 2 en la última zafra. | ¿Cuántos anegamientos se considera "muy anegable"? |
| [ ] Categorías del índice | Baja 0 a 33, media 34 a 66, alta 67 a 100. | ¿Les sirve una categoría o prefieren solo el número? |
| [ ] Delimitación de una zafra | Fecha de inicio configurable (CU06). | ¿Cuándo empieza y termina una zafra? ¿Hay historial de anegamientos de zafras previas y desde qué año? |
| [ ] Otros factores | No considerados. | ¿Influye algo más (pendiente, cercanía a cauces, tipo de maquinaria)? |

## 6. Lluvia y pronóstico (CU08, CU09, CU11)

| Hecho | Valor provisorio | Qué preguntar |
|---|---|---|
| [ ] Lluvia crítica | 60 mm (acumulada más prevista). | ¿Con cuántos milímetros un lote queda intransitable? ¿Cambia según el lote o la zona? |
| [ ] Ventana de lluvia acumulada | 48 h (opciones 24, 48 y 72 h). | ¿Cuánto tiempo tarda en secarse un lote? ¿Cuántas horas de lluvia pesan en el estado de un camino? |
| [ ] Horizonte de pronóstico | 48 h (opciones 24, 48 y 72 h). | ¿Con cuánta anticipación necesitan decidir? |
| [ ] Umbral por lote o global | Global. | ¿La lluvia crítica es la misma para todos o depende del lote? |
| [ ] Lluvia máxima plausible en una lectura | 300 mm (pide confirmación). | ¿Cuál fue la lluvia más fuerte registrada en un día? |
| [ ] Datos de la lectura | Fecha, hora y milímetros. | ¿Necesitan algo más (observaciones, estado del camino)? |
| [ ] Frecuencia de lecturas | No definida. | ¿Una vez al día? ¿Cada vez que llueve? ¿Hay horario fijo? |
| [ ] Conectividad | Se asume internet. | ¿Hay señal donde están los pluviómetros? ¿Hace falta un modo sin conexión? |
| [ ] Caché del pronóstico | 30 minutos. | Sin pregunta directa, es decisión técnica. |
| [ ] Confianza en el pronóstico | Se usa Open-Meteo. | ¿Usan algún servicio de pronóstico? ¿Cuál es confiable en su zona? |

## 7. Fábrica y patio

| Hecho | Valor provisorio | Qué preguntar | Impacta |
|---|---|---|---|
| [ ] Catálogo de causas de parada | Lluvia, falta de caña en el patio, avería de equipos, mantenimiento programado, otra. | ¿Qué causas usan en la práctica? ¿Hay códigos de parada ya definidos? | CU13, CU14 |
| [ ] Estado del patio | Toneladas en patio, opcional en la parada. | ¿Cómo miden la caña en patio? ¿Quién lo sabe y cada cuánto? ¿Cuánto dura el stock típico sin cosecha? | CU13, posible CU16 |
| [ ] Stock de patio (CU16) | Fuera del alcance, pendiente de decidir. | ¿Les serviría registrar la caña del patio para saber cuánto tiempo pueden aguantar? | Alcance |
| [ ] Parada abierta y cerrada | Se abre y se cierra. | ¿Cómo se registran hoy? ¿Cuántas paradas por día pueden ocurrir? | CU13 |
| [ ] Paradas fuera de la lluvia | Se registran todas. | ¿Interesa registrar solo las que tienen que ver con caña o todas? | CU13 |

## 8. Sistemas, equipos y adopción

- [ ] ¿Qué dispositivos hay en el campo y en la oficina de cosecha (celulares, tablets, PCs)? Condiciona el diseño del mapa y la carga.
- [ ] ¿Hay restricciones de TI para usar un sistema web en la nube?
- [ ] ¿Quién da la aprobación final para implementar el sistema?
- [ ] ¿Qué resistencia se espera? ¿Confiarían en una recomendación automática frente a la experiencia propia?
- [ ] ¿Se pueden usar datos reales de zafras pasadas para calibrar? ¿Quién los tiene?
- [ ] ¿Quién daría soporte después de la entrega?

## 9. Beneficios y costos (para el análisis costo/beneficio)

- [ ] Costo de una hora de parada de fábrica.
- [ ] Cantidad de horas de parada por lluvia en la última zafra.
- [ ] Toneladas perdidas o mal cosechadas por lotes anegados.
- [ ] Tiempo que lleva hoy decidir el orden de cosecha en un día de lluvia.
- [ ] Equipamiento disponible y costo estimado de conectividad.

## 10. Con la cátedra, no con el ingenio

- [ ] Consigna oficial: estructura del informe, diagramas pedidos (clases, secuencia, actividad, estados) y formato de especificación de casos de uso.
- [ ] Cantidad de casos de uso que se espera especificar y nivel de detalle.

## Cómo usar este documento

1. Antes de la entrevista, revisar los puntos y pasar los que ya están cubiertos por el guion al principio.
2. Durante la entrevista, anotar la respuesta textual y quién la dio.
3. Después, actualizar los documentos afectados, reemplazar los corchetes por el dato confirmado y marcar el punto acá como resuelto.
4. Lo que el ingenio no sepa responder (por ejemplo, los pesos del índice) queda como valor de arranque y se calibra en el piloto. Hay que dejarlo escrito así en el informe.
