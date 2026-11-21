# NexoZafra: Especificación de casos de uso unificada (`CU01` a `CU23`)

Especifica los **23 casos de uso** del [modelo de casos de uso unificado (v2)](casos-de-uso-v2.md): mantiene los **20 casos de @Jairo con su numeración exacta (`CU01`–`CU20`)** y suma nuestros **3 casos al final (`CU21`–`CU23`)**, integrando todos los valores reales ya confirmados.

---

## CU01 – Iniciar sesión `[TCI]`

| Campo | Contenido |
|---|---|
| **Actor principal** | `Usuario` (heredan: Equipo técnico agrícola, Jefe de lote, Fábrica, Personal de báscula, Administrador del sistema). |
| **Objetivo** | Autenticar al usuario y darle acceso a las funciones de su(s) rol(es). |

**Escenario principal**
1. El usuario ingresa su correo y su contraseña.
2. El sistema valida los datos con Firebase Auth y verifica que el usuario esté activo.
3. El sistema concede acceso y muestra la pantalla de inicio de su rol (si la cuenta tiene más de un rol, habilita las opciones de ambos).

**Alternativas**
- Si los datos no coinciden o el usuario está desactivado, el sistema informa el error y no da acceso.

---

## CU02 – Gestionar usuarios `[Sugerencia]`

| Campo | Contenido |
|---|---|
| **Actor principal** | Administrador del sistema. |
| **Objetivo** | Administrar quién usa el sistema, sus roles y su estado. |

**Escenario principal**
1. El Administrador ve el listado de usuarios con su rol (o roles), finca asignada (si es Jefe de lote) y estado.
2. Para dar de alta, carga nombre, apellido, correo y uno o más roles (`Equipo técnico agrícola`, `Jefe de lote`, `Fábrica`, `Personal de báscula`, `Administrador`).
3. Puede cambiar roles o desactivar al usuario.
4. El sistema crea o actualiza la cuenta en Firebase Auth y Firestore.

**Validaciones**
- El correo no puede repetirse.
- Los usuarios no se borran: se desactivan para conservar quién cargó cada registro.
- No se puede desactivar al último Administrador activo.

---

## CU03 – Configurar parámetros de priorización `[Entrevista]`

| Campo | Contenido |
|---|---|
| **Actor principal** | Administrador del sistema. |
| **Objetivo** | Definir los valores que usa el sistema para calcular el riesgo, el ranking y las alertas. |

**Parámetros y valores confirmados**

| Parámetro | Valor confirmado / inicial |
|---|---|
| **Brix mínimo para habilitar un lote** | **8 °Bx** (confirmado; a fin de zafra 2026 llegó a 10,31 °Bx) |
| **Zonas de distancia (`DIST ILE`)** | **Cercana: 1 a 6 km** (63 lotes) · **Media/Intermedia: 7 a 12 km** (89 lotes) · **Lejana: 13 a 19 km** (56 lotes) |
| **Ritmo de molienda de fábrica** | **312,5 t/h** (7.000 a 7.500 t/día) |
| **Carga por carro y merma (no caña)** | **30 t brutas por carro**, con merma de **2 % a 14 %** (14 % tras lluvias) → **28 t netas promedio** (25,8 t netas tras lluvia) |
| **Colchón mínimo en patio / reinicio** | **30 carros** (~2,7 h de molienda asegurada sin contar nuevas llegadas; ciclo de camión ~1 h) |
| **Probabilidad de lluvia para alerta** | **70 %** (confirmado para tomar precauciones; con 20–30 % casi nunca llueve, con 50–60 % es probable) |
| **Ventana de lluvia acumulada** | 3 días *(propuesta inicial)* |
| **Costo estimado de hora de parada** | Salario base **1.250 USD/mes (±20 %)** × **200 a 300 obreros** ÷ 200 h/mes = **1.000 a 2.250 USD/h** (valor central: **1.563 USD/h**) |

**Escenario principal**
1. El Administrador abre la pantalla de parámetros de la campaña.
2. Carga o modifica los valores.
3. El sistema guarda los valores con fecha y usuario, y recalcula el ranking.

---

## CU04 – Gestionar fincas y lotes `[TCI]`

| Campo | Contenido |
|---|---|
| **Actor principal** | Equipo técnico agrícola. |
| **Objetivo** | Mantener los datos maestros y de campaña de cada finca y lote, incluyendo su tipo de drenaje y pluviómetro de referencia. |

**Escenario principal**
1. El usuario ve el listado de lotes y lo filtra por finca, tipo de cultivo, zona o drenaje.
2. Selecciona un lote y ve su ficha:
   - **Datos fijos del lote:** `id_unico` (`ID_FINCA + ID_LOTE`), finca, número y nombre de lote, área bruta (`AREA_B`, total 18.386,42 ha) y neta (`AREA_N`, total 9.307,40 ha), surcos, distancia entre surcos (`DIST`, ~1,6 m), distancia al ingenio (`DIST ILE`, 1 a 19 km), tipo de cultivo (`Convencional`, `Orgánico Full`, `Orgánico NOP`) e `ID_OIA`.
   - **Datos de campaña (`Lote_campaña`):** variedad, año de plantación (`PLANT`), cantidad de cortes (soca) y estado del lote (`En producción`, `Descepe`, `Vacío`, `Monte`, `En preparación`).
3. Completa o corrige los datos que la planilla no trae: **tipo de drenaje** (`Bien drenado`, `Medianamente drenado`, `Imperfectamente drenado`), **pluviómetro de referencia** y **ubicación en el mapa**.
4. El sistema calcula automáticamente la zona de distancia (`Cercana`, `Intermedia`, `Lejana`) a partir de `DIST ILE` y los límites de `CU03`.

**Alternativas y validaciones**
- Puede dar de alta un lote nuevo a mano o importarlo con `CU05`.
- El par `finca + número de lote` (`id_unico`) es único.
- El área neta no puede superar al área bruta.
- Un lote sin datos o sin tipo de drenaje queda marcado como *"datos incompletos / en preparación"* (los lotes vacíos en la planilla están en preparación para funcionar próximamente como lotes cañeros) y no entra al ranking hasta completarse.

---

## CU05 – Importar planilla de campaña `[Sugerencia]`

| Campo | Contenido |
|---|---|
| **Relación** | `<<extend>>` de `CU04 – Gestionar fincas y lotes`. |
| **Actor principal** | Equipo técnico agrícola. |
| **Objetivo** | Cargar la planilla `inv2025_ile_oficial` y las de campañas siguientes sin pisar campañas anteriores. |

**Escenario principal**
1. El usuario elige la campaña (ej. 2025 o 2026) y sube el archivo Excel.
2. El sistema lee las filas y muestra un resumen: lotes nuevos, lotes que cambian y filas con error (filas vacías como `3102032` y `0000000`, `ID_UNICO` duplicados como `3202211` y `3301612`, variedad desconocida).
3. El usuario revisa y confirma.
4. El sistema guarda los lotes y los datos en `Lote_campaña`. La columna `VARIEDAD` se separa en variedad biológica y estado del lote (por ejemplo, `"Descepe 2024"` pasa a estado `Descepe`, `"Monte"` a `Monte`, `"Vacío"` a `Vacío`).

**Alternativa**
- Si las columnas del archivo no coinciden con el formato esperado, el sistema rechaza el archivo e indica qué columna falta.

---

## CU06 – Gestionar variedades `[Entrevista]`

| Campo | Contenido |
|---|---|
| **Actor principal** | Equipo técnico agrícola. |
| **Objetivo** | Mantener el catálogo de variedades de caña con su época/categoría de maduración. |

**Escenario principal**
1. El Equipo técnico agrícola carga o edita cada variedad de caña (`LCP 85-384`, `TUC 03-12`, `TUC 06-7`, `CP 65-350`, `NA 97-3152`, etc.) indicando su categoría de maduración: **Temprana**, **Media (Intermedia)** o **Tardía**.
2. El sistema guarda la variedad para ordenar el ranking según el momento de la zafra.

**Validación**
- No se puede desactivar una variedad que tenga lotes activos en la campaña vigente.

---

## CU07 – Gestionar pluviómetros `[Sugerencia]`

| Campo | Contenido |
|---|---|
| **Actor principal** | Equipo técnico agrícola. |
| **Objetivo** | Mantener los 16–17 pluviómetros manuales fijos y su asignación a fincas y lotes. |

**Escenario principal**
1. El Equipo técnico agrícola carga o edita los 16–17 pluviómetros fijos: código/nombre, finca y ubicación.
2. Indica qué lotes toman la lluvia de cada pluviómetro (o lo vincula desde la ficha del lote en `CU04`).

---

## CU08 – Registrar lectura de pluviómetro `[TCI]`

| Campo | Contenido |
|---|---|
| **Actor principal** | Jefe de lote (desde el celular). |
| **Objetivo** | Registrar la lluvia diaria medida en cada pluviómetro manual. |

**Escenario principal**
1. A la mañana, después de llover, el Jefe de lote mide el pluviómetro de su finca.
2. Selecciona el pluviómetro, confirma la fecha y carga los milímetros (`mm >= 0`).
3. El sistema guarda la lectura con fecha, hora y usuario.
4. El sistema recalcula el riesgo de los lotes asociados a ese pluviómetro (`CU12`).

**Alternativas**
- Si ya hay una lectura de ese pluviómetro para esa fecha, el sistema avisa y permite corregirla conservando quién la corrigió.
- **Modo sin conexión (offline):** si el celular no tiene señal en el campo, la lectura se guarda en el dispositivo y se sincroniza automáticamente cuando vuelve la conexión.

---

## CU09 – Registrar estado de piso `[TCI]`

| Campo | Contenido |
|---|---|
| **Actor principal** | Jefe de lote o Equipo técnico agrícola (el jefe de cosecha que verifica el campo antes de mover máquinas). |
| **Objetivo** | Informar si se puede entrar a cosechar un lote y construir el historial de días de inhabilitación. |

**Escenario principal**
1. El usuario busca el lote por finca y nombre, o lo toca en el mapa.
2. Elige el estado: **Habilitado**, **Con restricciones** o **Inhabilitado (sin piso)**, y agrega una observación (por ejemplo, aguada, surgente o máquina hundida).
3. El sistema guarda el registro con fecha, hora y usuario.
4. Si el lote pasa a **Inhabilitado**, el sistema abre un período de inhabilitación (`desde`); cuando vuelve a **Habilitado**, lo cierra (`hasta`) y calcula los días. *(Hoy el ingenio no registra formalmente cuántos días queda inaccesible un lote; este caso de uso empieza a generar ese historial).*
5. Un lote **Inhabilitado** sale del ranking hasta que vuelva a habilitarse.

---

## CU10 – Registrar medición de Brix `[Entrevista]`

| Campo | Contenido |
|---|---|
| **Actor principal** | Equipo técnico agrícola. |
| **Objetivo** | Registrar la madurez de un lote para habilitarlo al corte. |

**Escenario principal**
1. El usuario selecciona el lote y carga la fecha, el valor de Brix (`> 0`) y el origen del dato (`Muestreo en campo`, `Laboratorio` o `Imagen satelital`).
2. El sistema guarda la medición.
3. Si el Brix es menor a **8 °Bx** (umbral configurado en `CU03`), el lote queda *"no habilitado por madurez"* y no entra al ranking.

---

## CU11 – Actualizar pronóstico de lluvia `[TCI]`

| Campo | Contenido |
|---|---|
| **Actores** | Servicio de pronóstico (automático) y Equipo técnico agrícola (manual). |
| **Objetivo** | Mantener actualizado el pronóstico de lluvia por finca y día. |

**Escenario principal**
1. Al menos una vez por día, el sistema consulta al Servicio de pronóstico (Open-Meteo) la lluvia prevista para la ubicación de cada finca en los próximos días.
2. Guarda, por finca y por día, la probabilidad de lluvia (`%`) y los milímetros previstos, con fuente `"API"`.
3. Recalcula el riesgo de los lotes (`CU12`) y verifica si corresponde emitir una alerta temprana a Fábrica (`CU18`, cuando la probabilidad es **≥ 70 %** en una finca con cosecha en curso).

**Alternativas**
- **Carga manual:** el Equipo técnico carga o corrige el pronóstico de una finca y un día. Queda con fuente `"Manual"` y su usuario, y prevalece sobre el automático.
- Si el servicio externo no responde, el sistema conserva el último pronóstico y muestra la fecha/hora de última actualización.

---

## CU12 – Calcular riesgo de los lotes `[TCI]`

| Campo | Contenido |
|---|---|
| **Actor** | Interno del sistema (incluido en `CU13` y `CU21`, y disparado tras `CU08`, `CU09` y `CU11`). |
| **Objetivo** | Estimar el nivel de riesgo de piso de cada lote en producción y los días estimados de inaccesibilidad. |

**Escenario principal**
1. Para cada lote en producción, el sistema combina:
   - **Tipo de drenaje** (`Bien drenado`, `Medianamente drenado`, `Imperfectamente drenado`, con foco prioritario en los mal drenados).
   - **Lluvia acumulada** en su pluviómetro de referencia durante la ventana de días (`CU03`).
   - **Pronóstico** de su finca (`CU11`).
   - **Estado de piso actual** (`CU09`).
2. Asigna un nivel de riesgo de quedar sin piso: **Alto**, **Medio** o **Bajo**, los días estimados sin acceso según la matriz de drenaje y una justificación en texto.

---

## CU13 – Consultar ranking de cosecha `[TCI]`

| Campo | Contenido |
|---|---|
| **Actor principal** | Equipo técnico agrícola (Fábrica puede consultarlo en modo lectura). |
| **Objetivo** | Obtener la lista diaria priorizada de lotes a cosechar para sostener las 7.000–7.500 t/día de molienda. |

**Escenario principal**
1. El usuario abre el ranking del día.
2. El sistema ejecuta `CU12` (inclusión) y filtra dejando afuera:
   - Lotes sin caña o en preparación (`Descepe`, `Vacío`, `Monte`, `En preparación`).
   - Lotes ya cosechados (`CU16`).
   - Lotes con piso **Inhabilitado** (`CU09`).
   - Lotes con **Brix < 8 °Bx** (`CU10`).
3. Ordena los lotes habilitados aplicando la regla experta del ingenio:
   - **Zona de distancia (`DIST ILE`):** primero **Lejana (13–19 km)**, luego **Intermedia (7–12 km)** y al final **Cercana (1–6 km)**.
   - **Época de maduración de la variedad (`CU06`):** variedades tempranas primero (si se pasan de fecha se secan), luego medias y tardías según el mes de la zafra.
   - **Cantidad de cortes (soca)** y **foco en suelos mal drenados** ante alerta de lluvia (adelantar lotes maduros de drenaje imperfecto antes de que llueva).
4. Muestra la lista con posición, finca, lote, distancia (`km` y zona), variedad, Brix, drenaje, nivel de riesgo, área neta y el motivo de su posición.
5. El usuario puede ver los lotes en el mapa (`CU14`), abrir la ficha de un lote, guardar la recomendación del día y exportarla.

**Alternativas**
- Si hay un pedido de orgánico activo, se extiende con `CU15`.
- Si no queda ningún lote habilitado, el sistema lo informa y sugiere consultar los lotes de reserva (`CU21`).

---

## CU14 – Consultar mapa de lotes `[TCI]`

| Campo | Contenido |
|---|---|
| **Actor principal** | Equipo técnico agrícola. |
| **Objetivo** | Visualizar espacialmente los lotes coloreados por nivel de riesgo o por estado de piso. |

**Escenario principal**
1. El usuario abre el mapa interactivo.
2. El sistema muestra el ingenio y los lotes coloreados por nivel de riesgo (`Alto`, `Medio`, `Bajo`) o estado de piso (`Habilitado`, `Con restricciones`, `Inhabilitado`, `En reserva`).
3. El usuario puede filtrar por finca, zona de distancia o tipo de cultivo, y tocar un lote para ver su ficha.

*Nota de implementación:* como la planilla no trae polígonos GIS, las coordenadas iniciales se aproximan a partir de la ubicación del ingenio y la distancia `DIST ILE` de cada lote.

---

## CU15 – Activar prioridad orgánica `[Entrevista]`

| Campo | Contenido |
|---|---|
| **Relación** | `<<extend>>` de `CU13 – Consultar ranking de cosecha`. |
| **Actor principal** | Equipo técnico agrícola. |
| **Objetivo** | Reordenar de inmediato la cosecha cuando ingresa una venta de exportación de azúcar orgánica. |

**Escenario principal**
1. El Equipo técnico registra el pedido de orgánico: fecha, toneladas requeridas y fecha límite (opcionales).
2. El sistema recalcula el ranking ubicando primero los lotes orgánicos (`Orgánico Full` y `Orgánico NOP`, 111 lotes en la base 2025) que estén habilitados, aunque no estén en su edad ideal, y marca el tablero como **"Modo prioridad orgánica"**.
3. Cuando el usuario cierra el pedido (cumplido o cancelado), el ranking vuelve al modo normal.

---

## CU16 – Registrar cosecha realizada `[Sugerencia]`

| Campo | Contenido |
|---|---|
| **Actor principal** | Equipo técnico agrícola. |
| **Objetivo** | Registrar en qué lotes se está cosechando y cuáles terminaron. |

**Escenario principal**
1. El usuario busca el lote y registra la fecha y, si las tiene, las toneladas cosechadas ese día.
2. Indica si el lote sigue **En cosecha** o si quedó **Terminado**.
3. Un lote terminado sale del ranking. Los lotes en curso identifican en qué fincas hay máquinas trabajando para disparar alertas si se pronostica lluvia allí (`CU18`).

---

## CU17 – Registrar carros en patio `[Entrevista]`

| Campo | Contenido |
|---|---|
| **Actor principal** | Personal de báscula. |
| **Objetivo** | Informar la cantidad de carros esperando en el patio de caña. |

**Escenario principal**
1. El Personal de báscula registra la cantidad de carros que esperan afuera, con fecha y hora.
2. El sistema calcula las horas mínimas de cobertura de molienda:
   $$\text{Horas de cobertura} = \frac{\text{Carros} \times \text{Toneladas netas por carro}}{312{,}5\text{ t/h}}$$
   *(Con 30 carros × 28 t netas = 840 t → 2,7 h de molienda asegurada sin contar nuevas llegadas; tras lluvia, con 14 % de merma → 25,8 t netas → 2,5 h).*
3. Si la cobertura o la cantidad de carros queda por debajo del mínimo configurado en `CU03` (**30 carros / ~3 h**), el sistema dispara `CU18 – Emitir alerta temprana a Fábrica`.

---

## CU18 – Emitir alerta temprana a Fábrica `[Entrevista]`

| Campo | Contenido |
|---|---|
| **Actor** | Sistema (emisor) / Fábrica (receptor). Extiende a `CU11`, `CU17` y `CU22`. |
| **Objetivo** | Avisar con anticipación a Fábrica ante riesgo de corte de flujo para que programe mantenimiento o regule velocidad. |

**Escenario principal**
1. El sistema genera una alerta cuando:
   - **(a)** El pronóstico alcanza o supera el **70 % de probabilidad** (`CU03`) en una finca donde hay cosecha en curso (`CU16`), o
   - **(b)** El colchón en patio baja del umbral de seguridad (**menos de 30 carros / ~3 horas**).
2. La alerta guarda tipo, nivel, mensaje, fecha y hora.
3. Fábrica la ve en su pantalla de inicio y la marca como vista.

---

## CU19 – Registrar parada de fábrica `[TCI]`

| Campo | Contenido |
|---|---|
| **Actor principal** | Fábrica. |
| **Objetivo** | Registrar cada detención de molienda con su causa, duración y costo estimado. |

**Escenario principal**
1. Fábrica registra fecha y hora de inicio, causa y observación. Causas del catálogo:
   - `Falta de caña por lluvia` (en 2026: 12 días en dos tandas de 6 días)
   - `Falta de caña por lotes lejanos o corte lento` (en 2026: 4 a 6 paradas a fin de zafra)
   - `Rotura mecánica`
   - `Otra`
2. Al reanudar la molienda (una vez reunido el colchón de **30 carros** en patio), registra la fecha y hora de fin.
3. El sistema calcula la duración en horas y el rango de costo estimado por mano de obra ociosa (**1.000 a 2.250 USD/h**, central **1.563 USD/h**, más materiales si fue rotura).

**Alternativa y validación**
- Puede cargar una parada pasada con inicio y fin juntos. El fin debe ser posterior al inicio.

---

## CU20 – Generar informes `[TCI]`

| Campo | Contenido |
|---|---|
| **Actores principales** | Equipo técnico agrícola y Fábrica. |
| **Objetivo** | Emitir reportes de gestión y auditoría con exportación a Excel o PDF. |

**Escenario principal**
1. El usuario elige el tipo de informe y aplica filtros (rango de fechas, campaña, finca, zona o tipo de cultivo):
   - **Lotes afectados:** períodos de inhabilitación por lote, con días acumulados y tipo de drenaje.
   - **Lluvias:** milímetros por pluviómetro, finca y día, con acumulados.
   - **Paradas de fábrica:** cantidad, horas por causa y costo estimado (rango bajo/central/alto).
   - **Avance de cosecha:** lotes cosechados y pendientes por zona y tipo de cultivo.
   - **Recomendado vs. realizado:** orden del ranking comparado con la cosecha real registrada (`CU16`).
   - **Alertas vs. lluvia real:** alertas emitidas (`CU18`) y si efectivamente llovió después (`CU08`).
2. El sistema muestra el informe con totales y gráficos, y permite exportarlo a Excel o PDF.

---

## CU21 – Gestionar lotes de reserva `[Entrevista]` *(Agregado nuestro)*

| Campo | Contenido |
|---|---|
| **Relación** | Incluye `CU12 – Calcular riesgo de los lotes`. |
| **Actor principal** | Equipo técnico agrícola (Fábrica consulta). |
| **Objetivo** | Mantener identificados lotes maduros, bien drenados y cercanos para enviar las máquinas cuando llueve y evitar que la fábrica pare. |

**Escenario principal**
1. El Equipo técnico abre el panel de "Lotes de reserva".
2. El sistema filtra y propone lotes que cumplen simultáneamente: **Brix ≥ 8 °Bx**, **Bien drenados**, estado **Habilitado** y preferentemente en zona **Cercana (1–6 km)** o **Intermedia (7–12 km)**.
3. El sistema muestra las toneladas estimadas de la reserva y cuántos días/horas de molienda (a 312,5 t/h) permiten sostener.
4. Si hay alerta de lluvia (**≥ 70 %**, `CU11`), el sistema sugiere además **adelantar el corte de lotes mal drenados que ya están maduros** antes de que queden intransitables.
5. El usuario confirma o ajusta qué lotes quedan reservados como contingencia.

---

## CU22 – Monitorear abastecimiento de patio `[Entrevista]` *(Agregado nuestro)*

| Campo | Contenido |
|---|---|
| **Actores principales** | Equipo técnico agrícola y Fábrica (Personal de báscula consulta). |
| **Objetivo** | Visualizar en tiempo real el estado del colchón de caña en patio, la cobertura mínima de molienda y el cumplimiento del umbral de reanudación. |

**Escenario principal**
1. El usuario abre el monitor de abastecimiento.
2. El sistema toma el último registro de carros de Báscula (`CU17`), aplica la merma vigente (2 % en seco a 14 % post-lluvia) y muestra:
   - **Carros actuales en patio** frente al **colchón objetivo de 30 carros**.
   - **Horas mínimas de molienda asegurada** (a 312,5 t/h, sin contar nuevas llegadas; durante esas ~2,7 horas siguen llegando camiones cuyo ciclo es de ~1 h).
   - **Estado de reanudación:** si la fábrica está parada por falta de caña (`CU19`), indica cuántos carros faltan para alcanzar los **30 carros** requeridos para volver a arrancar.
   - **Fincas y lotes actualmente en cosecha (`CU16`)** y su distancia media a fábrica (si son todos lejanos, advierte a Fábrica para regular velocidad).
3. Si el colchón cae por debajo del umbral, se extiende con `CU18 – Emitir alerta temprana a Fábrica`.

---

## CU23 – Simular escenarios `[Sugerencia]` *(Agregado nuestro)*

| Campo | Contenido |
|---|---|
| **Relación** | Incluye `CU13 – Consultar ranking de cosecha`. |
| **Actor principal** | Equipo técnico agrícola. |
| **Objetivo** | Probar en la reunión matutina escenarios hipotéticos (*"¿qué pasa si llueven X mm?"*, *"¿qué pasa si entra una venta de orgánico?"*) viendo cómo cambian el riesgo, el ranking y el mapa sin alterar datos reales. |

**Escenario principal**
1. El Equipo técnico activa el "Modo simulación" desde el ranking o el mapa.
2. El sistema muestra un aviso visible (*"Simulación: los cambios no se guardan"*) y precarga los datos actuales del día.
3. El usuario modifica los milímetros de lluvia de una o más fincas, cambia el porcentaje de merma post-lluvia (2 % a 14 %) o activa un pedido hipotético de caña orgánica.
4. El sistema recalcula en memoria el riesgo (`CU12`) y el ranking (`CU13`), mostrando lado a lado qué lotes salen por falta de piso, qué lotes de reserva (`CU21`) se activan y cómo queda el mapa (`CU14`).
5. Al salir o pulsar "Restablecer", el sistema descarta la simulación sin modificar la base de datos.
