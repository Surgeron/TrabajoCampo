# PluviaZafra: Especificación de casos de uso (formato Cockburn)

Este documento especifica los 16 casos de uso del diagrama de [casos-de-uso-pluviazafra.md](casos-de-uso-pluviazafra.md). Los casos están en este orden: CU03, CU08, CU10, CU13, CU11, CU12, CU15, CU04, CU05, CU06, CU07, CU09, CU14, CU01, CU02 y CU16. Para verlos agrupados por usuario, ver [casos-de-uso-por-usuario.md](casos-de-uso-por-usuario.md).

Los valores entre corchetes son propuestas a confirmar en la entrevista con el ingenio.

## Decisiones de modelado

- **Zona:** cada lote pertenece a una zona y cada zona tiene un pluviómetro. La lluvia caída y el pronóstico de un lote son los de su zona. Esto agrega la entidad **Zona** (con coordenadas de referencia para consultar Open-Meteo) al modelo de datos.
- **Índice de vulnerabilidad:** suma ponderada de factores cualitativos cuantificados con una tabla de puntajes. Pesos y puntajes son configurables (CU06).
- **Ventanas configurables:** lluvia acumulada y horizonte de pronóstico, con valor inicial de [48 h] para ambos y opciones de 24, 48 y 72 horas.
- **Estados del lote:** semáforo (rojo urgente, amarillo atención, verde puede esperar) calculado por el sistema, más estados operativos manuales (anegado, en cosecha, cosechado, en descanso). Así se ven todos los lotes en el mapa, incluso los que no entran al ranking. Ver CU03.
- **Parada de fábrica:** se abre al empezar y se cierra al terminar. Causa de un catálogo cerrado y vínculo opcional con el estado del patio.

---

## CU03 Gestionar lotes

| Campo | Contenido |
|---|---|
| **Objetivo** | Mantener el inventario de lotes con su ubicación en el mapa, sus datos productivos y su estado, para que el sistema pueda calcular su vulnerabilidad y priorizar su cosecha. |
| **Alcance** | Sistema PluviaZafra. |
| **Nivel** | Objetivo de usuario. |
| **Actor principal** | Administrador. |
| **Interesados** | Jefe de cosecha (necesita ver todos los lotes y su estado actualizado), Operador de campo (reporta anegamientos que cambian el estado). |
| **Precondición** | Sesión iniciada con rol Administrador. Existe al menos una zona cargada. |
| **Garantía mínima** | Si la operación falla, no se pierde ni se altera ningún lote existente. |
| **Garantía de éxito** | El lote queda guardado con su polígono, sus datos y su estado, y aparece en el mapa. |
| **Disparador** | El administrador necesita dar de alta, modificar o cambiar el estado de un lote. |

**Datos del lote:** código (único), nombre, hectáreas, toneladas de caña estimadas, zona, polígono dibujado en el mapa y estado. Los atributos de vulnerabilidad se cargan en CU04.

**Estados del lote** [lista a validar con el ingenio]. Hay dos grupos: los estados semáforo, que calcula el sistema para los lotes con caña pendiente de cosecha, y los estados operativos, que se cambian a mano.

*Estados semáforo (automáticos, solo para lotes pendientes de cosecha):*

| Estado | Color | Significado | ¿Entra al ranking? |
|---|---|---|---|
| Urgente | Rojo | Si llueve como se espera, el lote quedaría inutilizable. Hay que cosecharlo primero. | Sí, en los primeros puestos |
| Atención | Amarillo | Riesgo moderado. Conviene cosecharlo si hay margen. | Sí |
| Puede esperar | Verde | Riesgo bajo. Se puede dejar para después. | Sí, al final |

*Estados operativos (manuales):*

| Estado | Color sugerido | Significado | ¿Entra al ranking? |
|---|---|---|---|
| Anegado | Azul | Ya está intransitable por lluvia. Se cosecha cuando vuelva a ser accesible. | No, pero se muestra en el mapa |
| En cosecha | Naranja | Cosecha iniciada. | No |
| Cosechado | Gris | Cosecha terminada. | No |
| En descanso | Gris claro | Fuera de la zafra actual (renovación, barbecho). | No |

**Cómo se asigna el semáforo:** lo determina CU11 a partir de un puntaje de riesgo que combina el índice de vulnerabilidad (CU10), la lluvia acumulada y el pronóstico de la zona. Rojo, amarillo y verde se definen con umbrales configurables en CU06 [propuesta: rojo desde 67, amarillo de 34 a 66, verde hasta 33]. Un lote en rojo dispara la alerta de CU15. Un lote en estado operativo no tiene semáforo. Cuando un lote vuelve a "pendiente" (por ejemplo, un lote anegado que ya se puede transitar), el semáforo se recalcula.

**Escenario principal (alta de lote)**

1. El administrador elige "Nuevo lote".
2. El sistema muestra el formulario y el mapa.
3. El administrador completa código, nombre, hectáreas, toneladas de caña y zona.
4. El administrador dibuja el polígono del lote en el mapa.
5. El sistema valida los datos y muestra el área del polígono como referencia.
6. El administrador confirma.
7. El sistema guarda el lote como pendiente de cosecha y lo muestra en el mapa. El semáforo se le asigna en el próximo ranking.

**Extensiones**

- 3a. El código ya existe: el sistema avisa y pide otro.
- 3b. Hectáreas o toneladas vacías, cero o negativas: el sistema marca el campo y no deja continuar.
- 4a. El polígono tiene menos de tres puntos o se cruza consigo mismo: el sistema lo rechaza y pide redibujarlo.
- 5a. El área del polígono difiere más de [10 %] de las hectáreas cargadas: el sistema avisa y deja elegir entre corregir o continuar. [decidir si las hectáreas se autocalculan]
- 5b. El polígono se superpone con otro lote: el sistema avisa y pide confirmación.
- 1a. **Modificar lote:** el administrador elige un lote existente y repite desde el paso 3 con los datos precargados. Si cambia la zona, el sistema recalcula el índice en el próximo ranking.
- 1b. **Cambiar estado:** el administrador elige un lote y un estado operativo (anegado, en cosecha, cosechado, en descanso) o lo devuelve a pendiente de cosecha. El semáforo no se edita a mano, lo calcula el sistema. El cambio se guarda con fecha, hora y usuario.
- 1c. **Dar de baja:** solo se permite si el lote no tiene lecturas ni anegamientos asociados. Si los tiene, el sistema ofrece pasarlo a "En descanso" para conservar el historial.
- 7a. Falla la conexión con la base de datos: el sistema avisa, conserva lo cargado en pantalla y permite reintentar.

**Requisitos especiales:** el mapa debe mostrar todos los lotes con un color por estado. El dibujo del polígono debe funcionar en pantalla táctil.

**Frecuencia:** alta al inicio de la zafra. Los cambios de estado son frecuentes durante la cosecha.

---

## CU08 Registrar lectura de pluviómetro

| Campo | Contenido |
|---|---|
| **Objetivo** | Registrar los milímetros de lluvia caídos en una zona para usarlos como lluvia acumulada en el ranking. |
| **Alcance** | Sistema PluviaZafra. |
| **Nivel** | Objetivo de usuario. |
| **Actor principal** | Operador de campo. |
| **Interesados** | Jefe de cosecha (depende de lecturas al día para confiar en el ranking). |
| **Precondición** | Sesión iniciada. La zona tiene un pluviómetro registrado (CU07). |
| **Garantía mínima** | Una lectura inválida no se guarda y el operador sabe por qué. |
| **Garantía de éxito** | La lectura queda guardada con zona, fecha, hora y milímetros, y se usa en el próximo cálculo de lluvia acumulada. |
| **Disparador** | El operador toma la lectura del pluviómetro. |

**Datos de la lectura:** zona (a través de su pluviómetro), fecha, hora y milímetros. Se guarda también el usuario que la cargó, aunque no lo ingrese el operador.

**Escenario principal**

1. El operador elige "Registrar lectura".
2. El sistema muestra el formulario con fecha y hora actuales por defecto.
3. El operador elige la zona e ingresa los milímetros. Puede corregir fecha y hora.
4. El sistema valida los datos.
5. El operador confirma.
6. El sistema guarda la lectura y muestra la lluvia acumulada de la zona en la ventana configurada.

**Extensiones**

- 3a. Milímetros negativos o no numéricos: el sistema rechaza el valor.
- 4a. La fecha y hora son futuras: el sistema rechaza la lectura.
- 4b. Los milímetros superan [300 mm]: el sistema pide confirmación expresa por si es un error de tipeo.
- 4c. Ya existe una lectura de esa zona con la misma fecha y hora: el sistema avisa y ofrece reemplazarla o cancelar.
- 6a. **Anegamiento observado:** si el operador marca que hay lotes intransitables, se ejecuta CU05 Registrar anegamiento para esos lotes (extensión).
- 6b. Falla la conexión: el sistema avisa y permite reintentar sin perder lo ingresado. [evaluar modo sin conexión como mejora]

**Frecuencia:** una o más veces por día por zona, y más seguido durante las lluvias.

---

## CU10 Calcular índice de vulnerabilidad

| Campo | Contenido |
|---|---|
| **Objetivo** | Obtener para cada lote un valor numérico que indique qué tan sensible es a quedar intransitable por la lluvia. |
| **Alcance** | Sistema PluviaZafra. |
| **Nivel** | Subfunción. |
| **Actor principal** | Sistema, invocado desde CU11. |
| **Interesados** | Jefe de cosecha (el ranking depende de este valor), Administrador (configura pesos y puntajes en CU06). |
| **Precondición** | El lote tiene cargados suelo, drenaje y camino de acceso (CU04). Hay pesos y tabla de puntajes configurados. |
| **Garantía mínima** | Si falta un dato, el lote no recibe un índice inventado: se marca como incompleto. |
| **Garantía de éxito** | Cada lote evaluado tiene un índice entre 0 y 100 y una categoría. |
| **Disparador** | CU11 solicita el ranking. |

**Factores y cuantificación** [valores iniciales a calibrar con el ingenio]

Cada factor cualitativo se convierte en puntaje de 0 a 100 con una tabla configurable:

| Factor | Valores y puntaje |
|---|---|
| Suelo | Arenoso 20, Franco 50, Arcilloso 90 |
| Drenaje | Bueno 10, Regular 50, Malo 100 |
| Camino de acceso | Consolidado 10, Enripiado 40, Tierra 90 |
| Anegamientos históricos | Se calcula con la cantidad de eventos totales del lote. |
| Anegamientos última zafra | Se calcula con la cantidad de eventos de la última zafra. |

Los dos factores de historial se normalizan así: `puntaje = min(eventos / tope, 1) × 100`, con un tope configurable por factor [por ejemplo 5 eventos totales y 2 en la última zafra].

**Fórmula:** `índice = Σ (peso_i × puntaje_i)`, con la suma de pesos igual a 1. [pesos iniciales propuestos: suelo 0,20; drenaje 0,25; camino 0,20; historial total 0,15; última zafra 0,20]

**Categorías** [umbrales configurables]: Baja (0 a 33), Media (34 a 66), Alta (67 a 100).

**Escenario principal**

1. El sistema recibe la lista de lotes a evaluar.
2. Para cada lote, obtiene suelo, drenaje y camino, y los convierte a puntaje con la tabla vigente.
3. El sistema cuenta los anegamientos totales y los de la última zafra, y los convierte a puntaje.
4. El sistema aplica los pesos vigentes y obtiene el índice.
5. El sistema asigna la categoría según los umbrales.
6. El sistema devuelve a CU11 el índice y la categoría de cada lote.

**Extensiones**

- 2a. Falta alguno de los tres atributos de CU04: el lote se marca como "Incompleto", no recibe índice y CU11 lo muestra aparte con una advertencia.
- 3a. El lote no tiene anegamientos registrados: el puntaje de historial es 0. Es un dato válido.
- 4a. Los pesos configurados no suman 1: el sistema los normaliza y deja registro del ajuste. [alternativa: CU06 no permite guardar pesos que no sumen 1]
- 3b. No está definida la última zafra: se usa el año calendario en curso. [definir cómo se delimita una zafra]

**Reglas de negocio:** el índice depende solo de características del lote y de su historial. No incluye lluvia ni pronóstico, que se combinan en CU11. Así el índice es estable y explicable.

---

## CU13 Registrar parada de fábrica

| Campo | Contenido |
|---|---|
| **Objetivo** | Dejar registro de cada parada de fábrica con su causa y duración, para medir cuánto afecta la lluvia y la falta de caña. |
| **Alcance** | Sistema PluviaZafra. |
| **Nivel** | Objetivo de usuario. |
| **Actor principal** | Supervisor de fábrica. |
| **Interesados** | Jefe de cosecha y Gerencia (usan el historial para evaluar la planificación). |
| **Precondición** | Sesión iniciada con rol Supervisor de fábrica. |
| **Garantía mínima** | Nunca quedan dos paradas abiertas a la vez, ni una parada con fin anterior al inicio. |
| **Garantía de éxito** | La parada queda registrada con causa, inicio, fin y duración calculada. |
| **Disparador** | La fábrica se detiene o vuelve a funcionar. |

**Catálogo de causas** [a validar con el ingenio]: lluvia, falta de caña en el patio, avería de equipos, mantenimiento programado, otra (con detalle obligatorio).

**Datos de la parada:** causa, detalle (obligatorio solo para "otra"), fecha y hora de inicio, fecha y hora de fin, duración (calculada por el sistema), usuario que la abrió y que la cerró, y toneladas en patio al momento de la parada (opcional).

**Escenario principal (apertura y cierre)**

1. El supervisor elige "Registrar parada".
2. El sistema muestra el formulario con fecha y hora de inicio actuales.
3. El supervisor elige la causa del catálogo.
4. El supervisor puede ingresar las toneladas en patio. [opcional]
5. El supervisor confirma y el sistema guarda la parada en estado Abierta.
6. Cuando la fábrica reanuda, el supervisor elige la parada abierta y selecciona "Cerrar parada".
7. El sistema propone la fecha y hora actuales como fin.
8. El supervisor confirma.
9. El sistema calcula la duración, guarda el cierre y deja la parada en estado Cerrada.

**Extensiones**

- 2a. Ya hay una parada abierta: el sistema la muestra y solo permite cerrarla antes de abrir otra.
- 3a. Causa "otra" sin detalle: el sistema exige completarlo.
- 3b. La causa es "falta de caña en el patio": el sistema sugiere cargar las toneladas en patio, sin hacerlo obligatorio.
- 4a. Toneladas negativas o no numéricas: el sistema rechaza el valor.
- 5a. **Carga retroactiva:** el supervisor puede indicar un inicio anterior. No puede ser futuro.
- 7a. El fin es anterior al inicio: el sistema rechaza el cierre.
- 9a. Falla la conexión: el sistema avisa y conserva la parada abierta localmente hasta poder guardar. [evaluar]
- 5b. **Corrección:** un supervisor o administrador puede editar una parada ya cerrada. El sistema guarda quién y cuándo la modificó.

**Requisitos especiales:** si hay una parada abierta, debe verse destacada en la pantalla principal para evitar olvidos de cierre.

**Frecuencia:** esporádica, pero de alto valor para el análisis.


---

## CU11 Generar ranking de prioridad de cosecha

| Campo | Contenido |
|---|---|
| **Objetivo** | Ordenar los lotes pendientes de cosecha según su riesgo de quedar inutilizables por la lluvia, y asignarles un semáforo. |
| **Alcance** | Sistema PluviaZafra. |
| **Nivel** | Objetivo de usuario. |
| **Actor principal** | Jefe de cosecha. |
| **Actor secundario** | Open-Meteo (a través de CU09). |
| **Interesados** | Gerencia y fábrica (dependen de que el patio no se quede sin caña). |
| **Precondición** | Sesión iniciada. Hay zonas con pluviómetro y lotes con atributos cargados. Parámetros configurados (CU06). |
| **Garantía mínima** | Si falta algún dato, el ranking se genera igual con lo disponible y avisa qué faltó. Nunca se muestra un valor inventado como si fuera real. |
| **Garantía de éxito** | Cada lote elegible tiene puntaje de riesgo, semáforo y posición. El ranking queda guardado con fecha y hora. |
| **Disparador** | El jefe de cosecha solicita el ranking o abre el mapa (CU12). |

**Lotes elegibles:** los que están pendientes de cosecha (con semáforo) y tienen atributos completos. Los lotes anegados, en cosecha, cosechados o en descanso no entran. Los lotes incompletos se listan aparte.

**Cálculo** [propuesta a calibrar con datos reales]:

- `lluvia acumulada` = suma de milímetros de las lecturas de la zona en la ventana de lluvia acumulada.
- `lluvia prevista` = milímetros pronosticados para la zona en el horizonte de pronóstico.
- `factor de lluvia` = `min((acumulada + prevista) / lluvia crítica, 1)`, con la lluvia crítica configurable en mm [por ejemplo 60 mm].
- `puntaje de riesgo` = `índice de vulnerabilidad × factor de lluvia`, de 0 a 100.
- **Semáforo:** rojo desde [67], amarillo de [34] a [66], verde hasta [33]. Umbrales configurables.
- **Orden:** por puntaje de riesgo descendente. Desempate por índice de vulnerabilidad y luego por toneladas de caña.

Si no llueve ni se pronostica lluvia, todos los lotes quedan en verde y el orden lo da el índice de vulnerabilidad.

**Escenario principal**

1. El jefe solicita el ranking.
2. El sistema lee los parámetros vigentes, incluidas las ventanas de lluvia acumulada y de pronóstico.
3. El sistema selecciona los lotes elegibles.
4. Para cada zona, el sistema obtiene la lluvia prevista (CU09) y suma la lluvia acumulada de las lecturas (CU08).
5. El sistema calcula el índice de cada lote (CU10).
6. El sistema calcula el puntaje de riesgo de cada lote y le asigna el semáforo.
7. El sistema ordena los lotes y guarda el ranking con fecha y hora.
8. El sistema muestra el ranking. Si hay lotes en rojo, se ejecuta CU15.

**Extensiones**

- 4a. Open-Meteo no responde: se usa el último pronóstico guardado de esa zona y se avisa que está desactualizado, indicando su fecha y hora.
- 4b. No hay pronóstico guardado: se calcula solo con la lluvia acumulada y se avisa.
- 4c. La zona no tiene lecturas en la ventana: se calcula solo con el pronóstico y se marca "sin lecturas recientes".
- 4d. Una zona no tiene pluviómetro asignado: sus lotes se calculan solo con el pronóstico y se marca el dato faltante.
- 5a. Hay lotes incompletos: se excluyen del cálculo y se listan aparte con el motivo.
- 3a. No hay lotes elegibles: el sistema informa que no hay lotes pendientes de cosecha.
- 8a. **Alerta (CU15):** hay al menos un lote en rojo.

**Regla de negocio:** el ranking es una recomendación. El jefe puede cosechar en otro orden, y el sistema no lo bloquea.

**Frecuencia:** varias veces por día en época de lluvias.

---

## CU12 Visualizar ranking en el mapa

| Campo | Contenido |
|---|---|
| **Objetivo** | Mostrar sobre un mapa todos los lotes con su color de estado, y el ranking de prioridad al lado. |
| **Alcance** | Sistema PluviaZafra. |
| **Nivel** | Objetivo de usuario. |
| **Actor principal** | Jefe de cosecha. |
| **Precondición** | Sesión iniciada. Hay lotes con polígono cargado. |
| **Garantía de éxito** | El jefe ve el mapa y el ranking actualizados, y puede consultar el detalle de cualquier lote. |
| **Disparador** | El jefe abre la pantalla principal o el mapa. |

**Escenario principal**

1. El jefe abre el mapa.
2. El sistema genera el ranking (CU11, inclusión).
3. El sistema dibuja los polígonos de todos los lotes con el color de su estado: rojo, amarillo o verde para los pendientes, y el color del estado operativo para el resto.
4. El sistema muestra la lista del ranking con posición, lote, semáforo, puntaje y toneladas.
5. El jefe selecciona un lote en el mapa o en la lista.
6. El sistema muestra el detalle: código, nombre, zona, hectáreas, toneladas, índice, lluvia acumulada y prevista, estado y fecha del último dato.

**Extensiones**

- 2a. El ranking no se pudo generar por completo: el sistema muestra el mapa con los datos disponibles y las advertencias de CU11.
- 4a. **Filtrar:** el jefe filtra por zona o por estado. El mapa y la lista se actualizan.
- 3a. Un lote no tiene polígono: aparece en la lista, sin dibujo en el mapa, con una advertencia.
- 1a. Hay una parada de fábrica abierta: el sistema la muestra destacada en la parte superior. [propuesta]

**Requisitos especiales:** leyenda de colores siempre visible. Legible en tablet.

---

## CU15 Alertar lote en riesgo

| Campo | Contenido |
|---|---|
| **Objetivo** | Avisar de manera visible que hay lotes en rojo, para que no pasen desapercibidos entre los demás. |
| **Alcance** | Sistema PluviaZafra. |
| **Nivel** | Subfunción (extiende CU11). |
| **Actor principal** | Jefe de cosecha (receptor). |
| **Precondición** | CU11 terminó y hay al menos un lote en rojo. |
| **Garantía de éxito** | El jefe ve cuáles lotes están en rojo, en qué zona y cuántas toneladas representan. |
| **Disparador** | El ranking tiene lotes en rojo. |

**Punto de extensión:** "lote con semáforo rojo" en CU11.

**Escenario principal**

1. El sistema detecta lotes en rojo en el ranking.
2. El sistema muestra una alerta destacada con la cantidad de lotes, su zona y el total de toneladas de caña en riesgo.
3. El jefe puede abrir el detalle de cualquier lote de la alerta.

**Extensiones**

- 2a. La alerta se calculó con un pronóstico desactualizado: el sistema lo indica en la alerta.
- 3a. El jefe cierra la alerta: vuelve a aparecer en el próximo ranking mientras sigan los lotes en rojo.

**Fuera de alcance:** notificaciones fuera de la aplicación (correo, mensajes). [trabajo futuro]

---

## CU04 Registrar atributos de vulnerabilidad del lote

| Campo | Contenido |
|---|---|
| **Objetivo** | Cargar o actualizar suelo, drenaje y camino de acceso de un lote. |
| **Alcance** | Sistema PluviaZafra. |
| **Nivel** | Objetivo de usuario. |
| **Actor principal** | Administrador. |
| **Precondición** | El lote existe (CU03). |
| **Garantía de éxito** | El lote tiene los tres atributos cargados y deja de figurar como incompleto. |
| **Disparador** | Se da de alta un lote o cambia una condición del terreno. |

**Escalas** [validar con el ingenio]: suelo (arenoso, franco, arcilloso), drenaje (bueno, regular, malo), camino de acceso (consolidado, enripiado, tierra).

**Escenario principal**

1. El administrador elige un lote.
2. El sistema muestra los atributos actuales, o vacíos si es la primera vez.
3. El administrador elige un valor para cada atributo.
4. El administrador confirma.
5. El sistema guarda los atributos con fecha, hora y usuario, y muestra el índice estimado del lote.

**Extensiones**

- 3a. Falta algún atributo: el sistema permite guardar, pero el lote sigue incompleto y se lo avisa.
- 5a. Se modifica un atributo que ya existía: el sistema conserva el valor anterior en el historial.

---

## CU05 Registrar anegamiento

| Campo | Contenido |
|---|---|
| **Objetivo** | Registrar que un lote quedó intransitable por lluvia, y cuándo volvió a estarlo. Alimenta el historial del índice. |
| **Alcance** | Sistema PluviaZafra. |
| **Nivel** | Objetivo de usuario. |
| **Actor principal** | Operador de campo. También puede hacerlo el Jefe de cosecha. |
| **Precondición** | Sesión iniciada. El lote existe. |
| **Garantía de éxito** | El anegamiento queda registrado con lote y fecha, y el lote pasa a estado Anegado. |
| **Disparador** | Se observa un lote intransitable, o ese lote vuelve a ser accesible. |

**Datos:** lote, fecha y hora de inicio, fecha y hora de fin (opcional hasta que se recupera) y observaciones.

**Escenario principal**

1. El actor elige "Registrar anegamiento" (desde CU08 o desde el lote).
2. El sistema pide el lote y propone fecha y hora actuales.
3. El actor puede cargar una observación.
4. El actor confirma.
5. El sistema guarda el anegamiento y pasa el lote a estado Anegado.

**Extensiones**

- 2a. Varios lotes anegados a la vez: el actor puede seleccionar más de uno y se registra un evento por lote.
- 2b. El lote ya está anegado con un evento abierto: el sistema avisa y no duplica el registro.
- 2c. El lote no está pendiente de cosecha (por ejemplo, ya cosechado): el sistema pide confirmación, porque no afecta la cosecha pero sí el historial.
- 1a. **Cerrar anegamiento:** el actor elige un evento abierto e indica fecha y hora de fin. El lote vuelve a pendiente de cosecha y el semáforo se recalcula.
- 4a. La fecha de inicio es futura o el fin es anterior al inicio: el sistema rechaza el dato.

**Regla de negocio:** cada evento cuenta para los anegamientos totales y, si ocurre en la última zafra, para los de la última zafra (CU10).

---

## CU06 Configurar parámetros del sistema

| Campo | Contenido |
|---|---|
| **Objetivo** | Ajustar los parámetros que determinan el índice, el semáforo y las ventanas de lluvia. |
| **Alcance** | Sistema PluviaZafra. |
| **Nivel** | Objetivo de usuario. |
| **Actor principal** | Administrador. |
| **Garantía mínima** | Los parámetros guardados siempre son válidos. Si hay error, se conservan los anteriores. |
| **Garantía de éxito** | Los nuevos parámetros se usan desde el próximo ranking. |
| **Disparador** | El ingenio quiere calibrar el modelo. |

**Parámetros:**

- Pesos de los cinco factores del índice (deben sumar 1).
- Tabla de puntajes de suelo, drenaje y camino.
- Topes de anegamientos (totales y de última zafra).
- Umbrales de categoría de vulnerabilidad (baja, media, alta).
- Umbrales del semáforo (rojo, amarillo, verde).
- Lluvia crítica en mm.
- Ventana de lluvia acumulada y horizonte de pronóstico (24, 48 o 72 horas).
- Fecha de inicio de la zafra vigente, para contar los anegamientos de la última zafra. [propuesta]

**Escenario principal**

1. El administrador abre la configuración.
2. El sistema muestra los valores vigentes.
3. El administrador modifica uno o más valores.
4. El sistema valida los cambios.
5. El administrador confirma.
6. El sistema guarda los parámetros con fecha, hora y usuario.

**Extensiones**

- 4a. Los pesos no suman 1: el sistema no permite guardar y muestra la suma actual.
- 4b. Los umbrales se superponen o están invertidos: el sistema los rechaza.
- 4c. Un valor es no numérico o negativo: el sistema lo marca.
- 3a. **Restaurar valores iniciales:** el administrador vuelve a la configuración por defecto.

**Regla de negocio:** los cambios no recalculan rankings anteriores. Cada ranking guardado conserva los parámetros con los que se generó. [propuesta]

---

## CU07 Gestionar zonas y pluviómetros

| Campo | Contenido |
|---|---|
| **Objetivo** | Mantener las zonas de la finca y el pluviómetro de cada una. |
| **Alcance** | Sistema PluviaZafra. |
| **Nivel** | Objetivo de usuario. |
| **Actor principal** | Administrador. |
| **Garantía de éxito** | La zona queda guardada con su pluviómetro y coordenadas de referencia para el pronóstico. |
| **Disparador** | Se incorpora una zona o un pluviómetro, o se reemplaza uno. |

**Datos de la zona:** código, nombre y coordenadas de referencia (para consultar Open-Meteo). **Datos del pluviómetro:** código y ubicación. Hay un pluviómetro por zona.

**Escenario principal**

1. El administrador elige "Nueva zona".
2. El sistema muestra el formulario.
3. El administrador completa código, nombre y marca el punto de referencia en el mapa.
4. El administrador registra el pluviómetro de la zona.
5. El sistema valida y guarda.

**Extensiones**

- 3a. El código de la zona ya existe: el sistema pide otro.
- 4a. La zona ya tiene pluviómetro: el sistema pide confirmar el reemplazo y conserva el anterior como inactivo, para no perder sus lecturas.
- 1a. **Modificar zona o pluviómetro:** se repite desde el paso 3 con los datos precargados.
- 1b. **Dar de baja una zona:** solo si no tiene lotes asignados. Si los tiene, el sistema pide reasignarlos primero.
- 1c. **Dar de baja un pluviómetro:** se marca inactivo, no se borra, porque tiene lecturas asociadas.

---

## CU09 Consultar pronóstico

| Campo | Contenido |
|---|---|
| **Objetivo** | Obtener la lluvia prevista por zona dentro del horizonte configurado. |
| **Alcance** | Sistema PluviaZafra. |
| **Nivel** | Objetivo de usuario (también subfunción de CU11). |
| **Actor principal** | Jefe de cosecha. |
| **Actor secundario** | Open-Meteo. |
| **Precondición** | Las zonas tienen coordenadas de referencia. |
| **Garantía mínima** | Si no se puede obtener el pronóstico, se informa sin inventar valores. |
| **Garantía de éxito** | El jefe ve la lluvia prevista por zona y el sistema guarda la consulta con fecha y hora. |
| **Disparador** | El jefe consulta el pronóstico, o lo pide CU11. |

**Escenario principal**

1. El jefe elige "Pronóstico".
2. El sistema lee el horizonte configurado.
3. Para cada zona, el sistema solicita a Open-Meteo la lluvia prevista según sus coordenadas.
4. Open-Meteo responde.
5. El sistema guarda el pronóstico con fecha y hora de consulta.
6. El sistema muestra la lluvia prevista por zona y por día.

**Extensiones**

- 4a. Open-Meteo no responde o devuelve error: el sistema muestra el último pronóstico guardado con su fecha y hora, marcado como desactualizado.
- 4b. No hay pronóstico guardado: el sistema informa que no hay datos de pronóstico.
- 3a. Hay un pronóstico consultado hace menos de [30 minutos]: el sistema usa el guardado para evitar consultas repetidas. [propuesta]

---

## CU14 Consultar historial de paradas

| Campo | Contenido |
|---|---|
| **Objetivo** | Revisar las paradas de fábrica pasadas, con su causa y duración, para evaluar el impacto de la lluvia. |
| **Alcance** | Sistema PluviaZafra. |
| **Nivel** | Objetivo de usuario. |
| **Actor principal** | Jefe de cosecha. También Supervisor de fábrica y Administrador. |
| **Garantía de éxito** | El actor ve la lista de paradas y los totales del período consultado. |
| **Disparador** | Se quiere evaluar paradas de la zafra o de un período. |

**Escenario principal**

1. El actor elige "Historial de paradas".
2. El sistema muestra las paradas de la zafra vigente, de la más reciente a la más antigua.
3. El actor filtra por fechas y por causa.
4. El sistema actualiza la lista y calcula: cantidad de paradas, horas totales y horas por causa.
5. El actor abre una parada para ver el detalle, incluidas las toneladas en patio si se cargaron.

**Extensiones**

- 2a. No hay paradas en el período: el sistema lo informa.
- 2b. Hay una parada abierta: se muestra primera, marcada como "en curso", sin duración final.
- 4a. **Exportar:** el actor exporta la lista filtrada a un archivo CSV. [opcional]

---

## CU01 Iniciar sesión

| Campo | Contenido |
|---|---|
| **Objetivo** | Identificar al usuario y darle acceso según su rol. |
| **Actor principal** | Cualquier usuario del sistema. |
| **Garantía de éxito** | El usuario accede a las funciones de su rol. |

**Escenario principal**

1. El usuario abre la aplicación.
2. El sistema pide correo y contraseña.
3. El usuario los ingresa.
4. El sistema los verifica con Firebase Auth y obtiene el rol del usuario.
5. El sistema muestra la pantalla principal con las funciones de su rol.

**Extensiones**

- 4a. Credenciales incorrectas: el sistema lo informa sin indicar cuál dato falló.
- 4b. El usuario está deshabilitado o no tiene rol asignado: el sistema niega el acceso e indica que consulte al administrador.
- 4c. Hay demasiados intentos fallidos: Firebase bloquea temporalmente y el sistema lo informa.
- 1a. **Cerrar sesión:** el usuario sale y el sistema vuelve a la pantalla de acceso.

---

## CU02 Gestionar usuarios y roles

| Campo | Contenido |
|---|---|
| **Objetivo** | Dar de alta usuarios, asignarles un rol y habilitarlos o deshabilitarlos. |
| **Actor principal** | Administrador. |
| **Garantía de éxito** | El usuario queda registrado con su rol y puede iniciar sesión. |

**Roles:** Administrador, Jefe de cosecha, Operador de campo y Supervisor de fábrica.

**Escenario principal**

1. El administrador elige "Nuevo usuario".
2. El sistema pide nombre, correo y rol.
3. El administrador completa los datos y confirma.
4. El sistema crea el usuario en Firebase Auth, guarda su rol y le permite definir su contraseña.

**Extensiones**

- 3a. El correo ya existe: el sistema lo informa.
- 1a. **Cambiar rol:** el administrador elige un usuario y le asigna otro rol.
- 1b. **Deshabilitar usuario:** el usuario no puede iniciar sesión, pero sus registros se conservan.
- 1c. El administrador intenta quitarse el rol o deshabilitarse siendo el último administrador: el sistema lo impide.

**Regla de negocio:** los usuarios no se eliminan, porque cada lectura, parada y anegamiento guarda quién lo cargó.

---

## CU16 Simular precipitaciones

| Campo | Contenido |
|---|---|
| **Objetivo** | Probar escenarios hipotéticos de lluvia por zona para observar en vivo cómo cambian el puntaje de riesgo, el semáforo en el mapa y el orden del ranking, sin alterar los datos reales. |
| **Alcance** | Sistema PluviaZafra. |
| **Nivel** | Objetivo de usuario. |
| **Actor principal** | Jefe de cosecha (y Administrador por herencia). |
| **Interesados** | Equipo evaluador y jefatura (permite demostrar el comportamiento dinámico del modelo incluso en días sin lluvia y analizar escenarios "¿qué pasaría si...?"). |
| **Precondición** | Sesión iniciada. Hay zonas y lotes con atributos cargados. |
| **Garantía mínima** | Ninguna prueba modifica las lecturas de pluviómetro, los pronósticos guardados ni el último ranking oficial. |
| **Garantía de éxito** | El usuario visualiza en el ranking y en el mapa el efecto inmediato de los milímetros simulados, claramente identificado como simulación. |
| **Disparador** | El jefe de cosecha activa el modo simulador desde el mapa o el ranking. |

**Datos de entrada de la simulación:** por cada zona, milímetros de lluvia acumulada simulada y milímetros de lluvia prevista simulada (o selección de un escenario rápido predefinido: seco 0 mm, lluvia moderada 30 mm, tormenta fuerte 70 mm).

**Escenario principal**

1. El jefe de cosecha elige "Simular precipitaciones".
2. El sistema activa el panel del simulador con un aviso visible de "Modo simulación: los cambios no se guardan" y precarga en cada zona los valores actuales de lluvia acumulada y prevista.
3. El jefe modifica los milímetros de una o más zonas mediante controles deslizantes o elige un escenario rápido.
4. El sistema calcula el índice de vulnerabilidad de cada lote elegible (CU10, inclusión) y recalcula el factor de lluvia, el puntaje de riesgo y el semáforo usando los milímetros simulados.
5. El sistema actualiza al instante los colores de los lotes en el mapa, el orden de la lista del ranking y las toneladas en riesgo.
6. El jefe sale del simulador o elige "Restablecer datos reales", y el sistema vuelve a mostrar el ranking oficial vigente.

**Extensiones**

- 3a. El usuario ingresa un valor negativo o no numérico: el sistema lo corrige a 0 mm o impide el ingreso.
- 5a. **Lotes pasan a rojo en la simulación:** el sistema muestra cómo se vería la alerta de lotes en riesgo (CU15) indicando que corresponde al escenario simulado.
- 6a. El usuario cambia de pantalla sin cerrar el simulador: el modo simulación se desactiva solo y no persiste ningún cambio.

**Regla de negocio:** un ranking calculado en modo simulación tiene carácter transitorio (`esSimulacion = true`) y nunca reemplaza al último ranking oficial en la base de datos.

---

## Pendientes

- Definir con el ingenio los valores entre corchetes. Están reunidos en el documento de preguntas para la entrevista cuando se genere.
- Revisar la consigna de la cátedra para el formato final.
- Decidir si entra CU17 "Registrar stock de patio".
