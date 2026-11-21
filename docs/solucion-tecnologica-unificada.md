# NexoZafra: Solución tecnológica – Sistema de priorización de cosecha (Ingenio La Esperanza) [Versión Unificada]

Unifica el documento original de **@Jairo** con los parámetros confirmados y los casos de uso `CU21`, `CU22` y `CU23`.

---

## 1. Actores

El sistema tiene cinco actores humanos y un actor externo. Todos los actores humanos heredan de un actor abstracto **Usuario**, que es el que inicia sesión. Una cuenta puede tener más de un rol asignado si una persona cumple más de una función.

| Actor | Tipo | Quién es en el ingenio | Qué hace en el sistema |
|---|---|---|---|
| **Equipo técnico agrícola (Agrotecnia)** | Principal | Gerente agrícola, responsable de logística de cosecha (Javier Tapia en 2026) y técnicos del área | Mantiene fincas, lotes (incluido su drenaje), variedades y pluviómetros; importa la planilla; registra Brix y estado de piso; consulta el ranking y el mapa; activa la prioridad orgánica; gestiona lotes de reserva; monitorea el patio; simula escenarios; registra la cosecha realizada; carga o corrige el pronóstico; genera informes |
| **Jefe de lote** | Principal | Los 5 jefes de lote que recorren el campo | Carga la lectura diaria de los pluviómetros y el estado de piso de los lotes de su finca |
| **Fábrica** | Principal | Jefe de área de fábrica (Pedro) | Recibe la alerta temprana, monitorea el abastecimiento de patio, registra las paradas de fábrica y consulta informes de paradas |
| **Personal de báscula** | Principal | Personal que recibe y coordina el ingreso de camiones | Registra la cantidad de carros en patio (colchón de caña) |
| **Administrador del sistema** | Principal | Persona de sistemas designada por el ingenio | Gestiona usuarios y roles; configura los parámetros de priorización (umbral de Brix, km de cada zona, carros/horas de colchón para alertar, probabilidad de lluvia y costo hora de parada) |
| **Servicio de pronóstico** | Secundario (sistema externo) | API meteorológica gratuita (Open-Meteo) | Entrega al sistema el pronóstico de lluvia por ubicación de cada finca |

*Nota:* El jefe de cosecha también registra estado de piso, porque hoy él mismo va a verificar si hay piso antes de mover máquinas.

---

## 2. Descripción textual de los casos de uso (`CU01` a `CU23`)

Son **23 casos de uso** (los 20 originales de Jairo `CU01`–`CU20` más `CU21`–`CU23`).
Origen: `[TCI]` = alcance funcional del informe, `[Entrevista]` = ajuste surgido de la entrevista, `[Sugerencia]` = propuesta del equipo.

**Tecnología:** front end en React + Vite + Tailwind + React Router; back end en Python (FastAPI); base de datos y autenticación en Google Firebase (Firestore + Firebase Auth).

### CU01 – Iniciar sesión `[TCI]`
El usuario ingresa su correo y su contraseña. El sistema valida los datos con Firebase Auth y, si coinciden y el usuario está activo, le concede acceso y muestra la pantalla de inicio de su rol (o roles).
- **Alternativa:** si los datos no coinciden o el usuario está desactivado, el sistema informa el error y no da acceso.

### CU02 – Gestionar usuarios `[Sugerencia]`
El Administrador, con la sesión iniciada, administra quién usa el sistema.
1. Ve el listado de usuarios con su rol (o roles), finca asignada (para Jefe de lote) y estado.
2. Para dar de alta, carga nombre, apellido, correo y uno o más roles (`Equipo técnico agrícola`, `Jefe de lote`, `Fábrica`, `Báscula`, `Administrador`).
3. Puede cambiar el rol o desactivar al usuario.
4. El sistema crea o actualiza la cuenta en Firebase Auth.
- **Validaciones:** el correo no puede repetirse. Los usuarios no se borran, se desactivan, para conservar quién cargó cada registro.

### CU03 – Configurar parámetros de priorización `[Entrevista]`
El Administrador, con la sesión iniciada, define los valores que usa el sistema para calcular el riesgo, el ranking y las alertas:
- **Brix mínimo para habilitar un lote:** **8 °Bx** (confirmado; a fin de zafra el Brix cerró en **10,31 °Bx**). Categorías de madurez: **Temprana**, **Media (Intermedia)** y **Tardía**.
- **Kilómetros que separan las zonas (`DIST ILE` de 1 a 19 km):**
  - **Cercana:** **1 a 6 km** (63 lotes – 30,3 %, madurez tardía).
  - **Media / Intermedia:** **7 a 12 km** (89 lotes – 42,8 %, madurez media).
  - **Lejana:** **13 a 19 km** (56 lotes – 26,9 %, madurez temprana).
- **Ritmo de molienda y carga por carro:** **312,5 t/h** (7.000–7.500 t/día). Cada camión lleva **30 t brutas**, de las cuales entre **2 % y 14 % no es caña** (llega a 14 % luego de lluvias), dando **28 t netas promedio** (y **25,8 t netas** post-lluvia).
- **Colchón mínimo en patio para alertar y reanudar:** **30 carros en patio** (~2,7 horas de molienda mínima asegurada sin contar nuevas llegadas; mientras se muelen siguen entrando camiones con ciclo de ~1 h).
- **Probabilidad de lluvia para alerta:** **70 %** (confirmado para tomar precauciones; con 20–30 % casi nunca llueve y con 50–60 % es probable).
- **Costo estimado por hora de parada (mano de obra ociosa):** calculado sobre un salario mensual aproximado de **1.250 USD (±20 %: 1.000 a 1.500 USD)** para **200 a 300 obreros** (200 h/mes) → **1.000 a 2.250 USD/h** (valor central: **1.563 USD/h**).

El sistema guarda los valores con la fecha y el usuario que los cambió, y recalcula el ranking.

### CU04 – Gestionar fincas y lotes `[TCI]`
El Equipo técnico agrícola, con la sesión iniciada, mantiene los datos de cada finca y lote.
1. Ve el listado de lotes y lo filtra por finca, tipo de cultivo, zona o drenaje.
2. Selecciona un lote y ve su ficha: datos de la planilla (`AREA_B` total **18.386,42 ha**, `AREA_N` total **9.307,40 ha**, surcos, `DIST ILE`, tipo de cultivo) y datos de la campaña (variedad, año de plantación, cantidad de cortes).
3. Completa o corrige los datos que la planilla no trae: **tipo de drenaje** (`Bien drenado`, `Medianamente drenado`, `Imperfectamente drenado`), **pluviómetro de referencia**, **ubicación en el mapa** y **estado del lote** (`En producción`, `Descepe`, `Vacío`, `Monte`, `En preparación`).
4. El sistema calcula la zona de distancia a partir de `DIST ILE` y los límites de `CU03`.
- **Alternativa:** puede dar de alta un lote nuevo a mano o importarlo con `CU05`.
- **Validaciones:** el par finca + número de lote (`ID_UNICO`) es único. El área neta no puede superar al área bruta. Los lotes sin variedad o sin distancia en la planilla 2025 son **lotes en preparación** para entrar en producción en próximas campañas y no entran al ranking hasta completarse.

### CU05 – Importar planilla de campaña `[Sugerencia]`
Extiende a `CU04`. Sirve para cargar la planilla `inv2025_ile_oficial` y las de campañas siguientes.
1. El usuario elige la campaña y sube el archivo Excel.
2. El sistema lee las filas y muestra un resumen: lotes nuevos, lotes que cambian y filas con error (filas vacías, ID repetido, variedad desconocida).
3. El usuario revisa y confirma.
4. El sistema guarda los lotes y los datos de campaña. La columna `VARIEDAD` se separa en variedad y estado del lote (por ejemplo, `"Descepe 2024"` pasa a estado `Descepe`).

### CU06 – Gestionar variedades `[Entrevista]`
El Equipo técnico agrícola carga cada variedad de caña (`LCP 85-384`, `TUC 03-12`, `TUC 06-7`, `CP 65-350`, `NA 97-3152`, etc.) con su época de maduración: **Temprana**, **Media (Intermedia)** o **Tardía**. En la planificación del ingenio, en los lotes lejanos se utiliza madurez temprana, en los intermedios media y en los cercanos tardía.
- **Validación:** no se puede desactivar una variedad que tenga lotes en la campaña vigente.

### CU07 – Gestionar pluviómetros `[Sugerencia]`
El Equipo técnico agrícola carga los 16 o 17 pluviómetros fijos: nombre, finca y ubicación. Luego indica qué lotes toman la lluvia de cada pluviómetro (en la ficha del lote, `CU04`).

### CU08 – Registrar lectura de pluviómetro `[TCI]`
El Jefe de lote, con la sesión iniciada desde el celular, carga la lluvia medida en su finca.
1. A la mañana, después de llover, mide el pluviómetro.
2. Selecciona el pluviómetro, confirma la fecha y carga los milímetros (`>= 0`).
3. El sistema guarda la lectura con fecha, hora y usuario, y recalcula el riesgo de los lotes asociados (`CU12`).
- **Alternativas:** permite corregir una lectura del día dejando registro de quién la corrigió. Si no hay señal en campo, se guarda en el dispositivo y se sincroniza al recuperar conexión.

### CU09 – Registrar estado de piso `[TCI]`
El Jefe de lote o el Equipo técnico agrícola (el jefe de cosecha que verifica el campo), con la sesión iniciada, informa si se puede entrar a cosechar un lote.
1. Busca el lote por finca y nombre, o lo toca en el mapa.
2. Elige el estado: **Habilitado**, **Con restricciones** o **Inhabilitado (sin piso)**, y agrega una observación (por ejemplo, aguada o surgente).
3. El sistema guarda el registro con fecha, hora y usuario.
4. Si el lote pasa a **Inhabilitado**, el sistema abre un período de inhabilitación; cuando vuelve a **Habilitado**, lo cierra y calcula los días. *(Hoy el ingenio no lleva registro formal de los días de inaccesibilidad; el sistema empieza a construirlo con estos períodos).*
5. Un lote inhabilitado sale del ranking hasta que se habilite.

### CU10 – Registrar medición de Brix `[Entrevista]`
El Equipo técnico agrícola registra la madurez de un lote: fecha, valor de Brix (`> 0`) y origen del dato (`Muestreo en campo`, `Laboratorio` o `Imagen satelital`). Si el Brix es menor a **8 °Bx** (`CU03`), el lote queda *"no habilitado por madurez"* y no entra al ranking.

### CU11 – Actualizar pronóstico de lluvia `[TCI]`
Actores: Servicio de pronóstico (automático) y Equipo técnico agrícola (manual).
1. Al menos una vez por día, el sistema consulta al Servicio de pronóstico la lluvia prevista para la ubicación de cada finca.
2. Guarda, por finca y por día, la probabilidad de lluvia y los milímetros previstos, con fuente `"API"`.
3. Recalcula el riesgo de los lotes (`CU12`) y verifica si corresponde emitir una alerta (`CU18`, cuando la probabilidad es **≥ 70 %**).
- **Alternativas:** carga o corrección manual por el Equipo técnico (fuente `"Manual"`, prevalece sobre `"API"`). Si la API no responde, conserva el último pronóstico.

### CU12 – Calcular riesgo de los lotes `[TCI]`
Lo ejecuta el sistema; está incluido en `CU13` y `CU21` y se dispara tras `CU08`, `CU09` y `CU11`.
1. Para cada lote en producción, combina: tipo de drenaje (con **foco prioritario en los suelos mal drenados**), lluvia acumulada en su pluviómetro en los últimos días (ventana inicial: 3 días), pronóstico de su finca y estado de piso actual.
2. Asigna un nivel de riesgo de quedar sin piso: **Alto**, **Medio** o **Bajo**, los días estimados de espera y una justificación en texto.

### CU13 – Consultar ranking de cosecha `[TCI]`
El Equipo técnico agrícola consulta qué lotes conviene cosechar primero.
1. El sistema calcula el riesgo (incluye `CU12`) y excluye los lotes sin caña o en preparación (`Descepe`, `Vacío`, `Monte`, `En preparación`), los ya cosechados, los inhabilitados y los que tienen **Brix < 8 °Bx**.
2. Ordena los restantes con los criterios del ingenio: **zona de distancia** (`Lejana 13–19 km`, `Intermedia 7–12 km`, `Cercana 1–6 km`), **época de maduración** (temprana en lejanos, media en intermedios, tardía en cercanos), **cantidad de cortes (soca)** y **riesgo de lluvia / foco en suelos mal drenados** (adelantar lotes mal drenados maduros antes de las lluvias).
3. Muestra posición, finca, lote, zona, variedad, Brix, drenaje, nivel de riesgo y justificación. Permite abrir el mapa (`CU14`), guardar la recomendación del día y exportarla.

### CU14 – Consultar mapa de lotes `[TCI]`
El Equipo técnico agrícola ve los lotes en un mapa, coloreados por nivel de riesgo o por estado de piso. Puede filtrar por finca, zona o tipo de cultivo y tocar un lote para ver su ficha. *(Las coordenadas iniciales se aproximan a partir de la ubicación del ingenio y la distancia `DIST ILE`).*

### CU15 – Activar prioridad orgánica `[Entrevista]`
Extiende a `CU13`. Cuando aparece un comprador de azúcar orgánica, el Equipo técnico registra el pedido (fecha, toneladas requeridas y fecha límite opcionales). El sistema recalcula el ranking poniendo primero los lotes orgánicos habilitados (111 lotes en la planilla 2025), aunque no estén en su edad ideal, y lo marca como **"Modo prioridad orgánica"** hasta que el pedido se cierre.

### CU16 – Registrar cosecha realizada `[Sugerencia]`
El Equipo técnico agrícola registra en qué lotes se está cosechando (fecha, toneladas del día opcionales y si el lote quedó terminado). Un lote terminado sale del ranking. Los lotes en curso sirven para saber en qué fincas afecta un pronóstico de lluvia (`CU18`).

### CU17 – Registrar carros en patio `[Entrevista]`
El Personal de báscula informa el colchón de caña.
1. Registra la cantidad de carros esperando afuera, con fecha y hora.
2. El sistema calcula las horas mínimas de cobertura de molienda a **312,5 t/h** considerando **30 t brutas por carro** menos la merma de **2 % a 14 %** (28 t netas promedio; 25,8 t netas post-lluvia). Con **30 carros** son **~2,7 horas** mínimas aseguradas mientras siguen llegando camiones (ciclo de ~1 h).
3. Si el colchón baja de **30 carros** (o del mínimo configurado en `CU03`), dispara `CU18`.

### CU18 – Emitir alerta temprana a Fábrica `[Entrevista]`
Lo ejecuta el sistema; el actor receptor es Fábrica.
1. Genera una alerta cuando: **(a)** el pronóstico alcanza **≥ 70 % de probabilidad** en una finca donde hay cosecha en curso (`CU16`), o **(b)** el colchón en patio baja de **30 carros** (`CU17` / `CU22`).
2. Fábrica la ve en su pantalla de inicio para programar mantenimiento en calderas o equipos y la marca como vista.

### CU19 – Registrar parada de fábrica `[TCI]`
Fábrica registra cada parada: inicio, causa (`Falta de caña por lluvia`, `Falta de caña por lotes lejanos o corte lento`, `Rotura mecánica`, `Otra`), observación y, al reanudar (una vez reunidos los **30 carros** en patio), la fecha y hora de fin. El sistema calcula la duración y el costo estimado en rango (**1.000 a 2.250 USD/h**, central **1.563 USD/h**).

### CU20 – Generar informes `[TCI]`
El Equipo técnico agrícola o Fábrica genera y exporta a Excel/PDF los 6 informes:
1. **Lotes afectados** (períodos de inhabilitación por lote, días y drenaje).
2. **Lluvias** (mm por pluviómetro, finca y día).
3. **Paradas de fábrica** (cantidad, horas por causa y rango de costo en USD/ARS).
4. **Avance de cosecha** (cosechados vs. pendientes por zona y cultivo).
5. **Recomendado vs. realizado** (ranking vs. `CU16`).
6. **Alertas vs. lluvia real** (`CU18` vs. `CU08`).

### CU21 – Gestionar lotes de reserva `[Entrevista]` *(Agregado unificado)*
Incluye `CU12`. El Equipo técnico agrícola mantiene identificados los **lotes de reserva**: lotes maduros (**Brix ≥ 8 °Bx**), **bien drenados**, con piso **Habilitado** y cercanos/intermedios al ingenio, listos para recibir las máquinas cuando llueve y no interrumpir el flujo a fábrica. Muestra las toneladas disponibles y cuántas horas de molienda cubren. Si hay alerta de lluvia (**≥ 70 %**), sugiere además adelantar el corte de lotes mal drenados que ya están maduros.

### CU22 – Monitorear abastecimiento de patio `[Entrevista]` *(Agregado unificado)*
El Equipo técnico agrícola y Fábrica consultan en tiempo real el tablero de abastecimiento: carros actuales en patio (`CU17`) frente a los **30 carros** necesarios para sostener/reanudar la molienda, merma vigente (2 % en seco a 14 % post-lluvia), horas mínimas de molienda asegurada a **312,5 t/h** y distancia de las fincas actualmente en cosecha (`CU16`). Si el colchón cae del umbral, extiende a `CU18`.

### CU23 – Simular escenarios `[Sugerencia]` *(Agregado unificado)*
Incluye `CU13`. El Equipo técnico agrícola prueba en la reunión matutina escenarios hipotéticos (*"¿qué pasa si llueven X mm en tal finca?"*, *"¿qué pasa si la merma sube al 14 %?"*, *"¿qué pasa si entra un pedido orgánico?"*). El sistema recalcula en memoria el riesgo (`CU12`), el ranking (`CU13`), los lotes de reserva (`CU21`) y el mapa (`CU14`) con un aviso de `"Modo simulación: los cambios no se guardan"`.

---

## 3. Modelo entidad-relación (ajustes incorporados)

Se mantiene íntegro el modelo entidad-relación de Jairo (`Finca`, `Lote`, `Campaña`, `Lote_campaña`, `Variedad`, `Lote_campaña_variedad`, `Tipo_drenaje`, `Zona_distancia`, `Pluviometro`, `Lectura_pluviometro`, `Pronostico`, `Estado_piso`, `Medicion_brix`, `Registro_cosecha`, `Parametro`, `Recomendacion`, `Detalle_recomendacion`, `Pedido_organico`, `Registro_patio`, `Alerta`, `Parada_fabrica`, `Causa_parada`, `Usuario`, `Rol`) con dos atributos adicionales para soportar los nuevos casos y parámetros confirmados:

- **`Lote_campaña.es_reserva` (booleano):** marca si el lote forma parte de la reserva activa bien drenada para días de lluvia (`CU21`).
- **`Registro_patio.porcentaje_merma_no_cania` (decimal, 2 % a 14 %):** permite calcular las toneladas netas reales por carro según haya llovido o no (`CU17`, `CU22`).
- **`Parametro` (valores semilla confirmados):**
  - `brix_minimo = 8`
  - `zona_cercana_km = 1..6`, `zona_intermedia_km = 7..12`, `zona_lejana_km = 13..19`
  - `molienda_t_h = 312.5`
  - `carga_bruta_carro_t = 30`, `merma_no_cania_min = 2%`, `merma_no_cania_max = 14%`
  - `carros_minimos_reinicio = 30`
  - `probabilidad_alerta_lluvia = 70%`
  - `costo_hora_parada_usd_bajo = 1000`, `central = 1563`, `alto = 2250`

---

## 4. Mapa de navegación unificado (39 pantallas)

Se mantienen las **36 pantallas de Jairo** y se agregan **3 pantallas** en el rol **Equipo técnico agrícola** (`T18`, `T19`, `T20`) para los casos `CU21`, `CU22` y `CU23` (y acceso a la vista del monitor de patio desde Fábrica):

| Rol | Pantallas |
|---|---|
| **Administrador** | `A01` Inicio, `A02` Usuarios, `A03` Alta/edición de usuario, `A04` Parámetros |
| **Equipo técnico agrícola** | `T01` Inicio, `T02` Ranking, `T03` Ficha de lote, `T04` Mapa, `T05` Pedido orgánico, `T06` Lotes, `T07` Editar lote, `T08` Importar planilla, `T09` Estado de piso, `T10` Brix, `T11` Cosecha, `T12` Pronóstico, `T13` Pronóstico manual, `T14` Variedades, `T15` Pluviómetros, `T16` Informes, `T17` Vista de informe, **`T18` Lotes de reserva (`CU21`)**, **`T19` Monitor de patio (`CU22`)**, **`T20` Simulador de escenarios (`CU23`)** |
| **Jefe de lote** | `J01` Inicio, `J02` Lectura de pluviómetro, `J03` Estado de piso, `J04` Mis registros |
| **Personal de báscula** | `B01` Inicio, `B02` Registrar carros, `B03` Historial del patio |
| **Fábrica** | `F01` Inicio (con widget de Monitor de patio `CU22`), `F02` Alertas, `F03` Detalle de alerta, `F04` Paradas, `F05` Registrar/cerrar parada, `F06` Informes, `F07` Vista de informe |
