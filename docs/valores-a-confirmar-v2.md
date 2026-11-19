# PluviaZafra: Valores y puntos a confirmar (v2)

Lista consolidada de lo que **todavía no está confirmado** en los documentos [casos-de-uso-v2.md](casos-de-uso-v2.md), [especificaciones-casos-de-uso-v2.md](especificaciones-casos-de-uso-v2.md), [casos-de-uso-por-rol-v2.md](casos-de-uso-por-rol-v2.md) y [modelado-v2-datos-reales.md](modelado-v2-datos-reales.md). Los números conservan su numeración original.

## Ya resuelto

| Tema | Decisión |
|---|---|
| Zonas de distancia | Cercana 1–6 km, media 7–12 km, lejana 13–19 km, según `DIST ILE` del inventario 2025 |
| Área neta | Está en `AREA_N` del inventario (9.307,40 ha netas) |
| Quién carga el patio | Supervisor de Fábrica |
| Roles por cuenta | Una cuenta puede tener más de un rol |
| Zona del Jefe de Lote | Equivale a su finca |
| Mapa | Se mantiene (CU21). Coordenadas aproximadas desde las del ingenio y `DIST ILE`. Se resuelve en la implementación |
| #1 Brix mínimo | **8.** Se empieza a cortar en Brix 8, y a fines de zafra se llegó a 10,31 |
| #2 Categorías de madurez | **Temprana, media y tardía** (es el ciclo de la variedad) |
| #3 Suelos mal drenados | **Hay que tener foco en ellos.** Se les da seguimiento prioritario ante la lluvia |
| #14 Lotes sin datos en el inventario | Son lotes en preparación, que funcionarán más adelante como lotes cañeros. No entran al ranking hasta completarse |
| #16 "Cuando termine el 227" | Era **2027** (el año). Se refiere a una entrega futura del técnico, fuera del alcance de esta entrega |
| #6 Registro de inaccesibilidad | **No se registra actualmente.** No hay historial. El sistema empieza a registrarlo (CU08) y, hasta tener datos, se usan valores iniciales por criterio experto |
| #7 Umbral de alerta de pronóstico | **70 % de probabilidad**: a partir de ahí se toman precauciones. Con 20–30 % casi nunca llueve y con 50–60 % es más probable, pero la alerta formal es en 70 % |
| #8 Toneladas de caña por carro | **30 t de carga bruta por carro. El % que no es caña oscila entre 2 % y 14 %** (el máximo, después de lluvias). Caña neta por carro: de 25,8 a 29,4 t. Valor inicial: **28 t** (promedio aproximado, 6 % no caña) |
| #9 Umbral de reinicio de fábrica | **30 carros.** Pedro dio 15 a 20 como mínimo, pero para asegurar la reanudación se toman 30. Mientras se muelen, siguen llegando carros que reponen el colchón |

## A. Para confirmar con el ingenio (entrevista)

| # | Valor o punto | Propuesta actual | Dónde aparece | Fuente / duda |
|---|---|---|---|---|
| 4 | **Días de ventana de lluvia acumulada** | 3 | CU06, CU11 | No hay umbral fijo en mm. Depende de cuándo llueve y de cuántas lluvias seguidas. |
| 5 | **Días sin acceso según drenaje** | Tabla inicial por criterio experto (ver abajo) | CU06, CU11 | No se registra actualmente, así que no hay historial para calibrar. El ingenio solo dijo que depende del drenaje del suelo. |
| 10 | **Cobertura mínima de reserva** | 1 día de molienda | CU14 | Propuesta nuestra. |
| 11 | **Soca = ciclo actual − año de plantación** | Cálculo propuesto | CU03 | Validar con el técnico. En el inventario `PLANT` es el año de plantación. |
| 12 | **Ciclo de cada variedad** (temprana, media, tardía) | Sin tabla | CU03, CU12 | El inventario trae la variedad pero no su ciclo. Pedir qué variedad es de cada ciclo. |
| 13 | **Lotes sin clasificar en drenaje** | Se tratan como imperfectamente drenados | CU04 | Criterio prudente nuestro. Coherente con el foco en suelos mal drenados. |
| 15 | **Costo de la hora de parada (salario)** | Aproximación con rangos, ver abajo | CU19 | El ingenio no tiene el dato. Se aproxima con un salario mensual de 1.250 USD y dispersión. |

### Colchón de patio para reanudar (valores confirmados)

Al reanudar tras una parada, la fábrica necesita un colchón de carros en el patio. Durante esas horas mínimas de molienda siguen llegando carros, que se mandan a molienda y reponen el colchón. Por eso las horas del colchón son una cobertura **mínima, sin contar las llegadas**, y no una autonomía fija.

Con 28 t netas por carro y 312,5 t/h:

| Carros en el patio | Toneladas netas | Horas de molienda sin nuevas llegadas |
|---|---|---|
| 20 (mínimo dicho por Pedro, referencia) | 560 | 1,8 |
| 30 (umbral de reinicio adoptado) | 840 | 2,7 |

Con el rango de 2 % a 14 % de no caña (25,8 a 29,4 t por carro), 30 carros dan entre 2,5 y 2,8 h, coherente con las "2 o 3 horas" de Pedro. Después de lluvias el porcentaje de no caña sube y la cobertura real baja, por lo que el sistema usa el valor conservador en esa época. El ciclo del camión es de alrededor de 1 hora, y ese tiempo marca cuándo vuelven a llegar los carros.

### Tabla inicial de días sin acceso por drenaje (punto 5, a ajustar)

No hay historial. Se propone una tabla inicial como punto de partida, a validar con el técnico y a recalibrar con los registros que el sistema vaya acumulando. Son días estimados hasta que el lote vuelva a ser transitable tras una lluvia relevante.

| Drenaje | Lluvia moderada | Lluvia fuerte o varias seguidas |
|---|---|---|
| Bien drenado | 0 días | 1 día |
| Medianamente drenado | 1 día | 2–3 días |
| Imperfectamente drenado | 2 días | 4 días o más |

El caso Ciénaga (3 a 4 días de lluvia seguidos y caña sin cosechar) sirve de referencia para la última columna. Estos números son una propuesta nuestra [a confirmar].

### Aproximación del costo de una hora de parada (punto 15)

Salario mensual aproximado de **1.250 USD**, con dispersión para obtener un rango. Es solo mano de obra ociosa. No incluye materiales si la causa es una rotura.

| Supuesto | Bajo | Central | Alto |
|---|---|---|---|
| Obreros presentes (Pedro: 200 a 300) | 200 | 250 | 300 |
| Salario mensual (USD, ±20 %) | 1.000 | 1.250 | 1.500 |
| Horas pagas por mes [asumido: 200] | 200 | 200 | 200 |
| Salario por hora (USD) | 5,00 | 6,25 | 7,50 |
| **Costo por hora de parada (USD)** | **1.000** | **1.563** | **2.250** |
| Costo por hora a 1.570 pesos por dólar (millones de pesos) | 1,57 | 2,45 | 3,53 |

- Fórmula: `costo/hora = obreros × (salario mensual ÷ horas por mes)`.
- Con los 12 días de parada por lluvia de 2026 (288 h), el costo sería de unos **450.000 USD** (central), en un rango de 288.000 a 648.000 USD. Es solo mano de obra.
- Se propone mostrar siempre el rango y avisar que es una estimación.
- A confirmar: horas pagas por mes (asumidas 200), cantidad real de obreros por turno y tipo de cambio.

## B. Decisiones internas del equipo

| # | Punto | Propuesta actual | Dónde aparece |
|---|---|---|---|
| 17 | **Dirección de Agrotecnia: ¿rol aparte de solo lectura?** | Sin definir todavía. Por ahora queda dentro del Equipo Técnico | Casos de uso por rol |
| 18 | **Pluviómetro de cada lote** | Hay 16–17 pluviómetros y 5 fincas. Falta definir cómo se asigna cada lote a un pluviómetro | CU05, CU11 |
| 19 | **Auditoría: ¿el Equipo Técnico ve quién cargó cada dato?** | Sí | Permisos sobre los datos |
| 20 | **Pesos del ranking** | Sin valores iniciales | CU06, CU12 |
| 21 | **Método para ubicar los lotes en el mapa** | Aproximado desde el ingenio y `DIST ILE` | CU21, implementación |
| 22 | **Formato de la cátedra** | Revisar consigna | Todos |

## C. Fechas

- Entrega: **2 de diciembre**.
- Base de datos a usar: **2025**, porque la de 2026 todavía no está.
