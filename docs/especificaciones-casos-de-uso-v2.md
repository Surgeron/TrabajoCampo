# PluviaZafra: Especificación de casos de uso v2 (formato Cockburn)

Especifica los casos del [modelo de casos de uso v2](casos-de-uso-v2.md). Los valores entre corchetes son propuestas a confirmar con el ingenio.

## Decisiones de modelado

- **Clasificación de distancia (dato real `DIST ILE`):** cercana de 1 a 6 km, media de 7 a 12 km, lejana de 13 a 19 km. Es fija y no cambia entre zafras.
- **Filtro de habilitación:** un lote entra al ranking solo si su Brix alcanza el mínimo (8, confirmado) y su piso es transitable.
- **Orden base de prioridad:** lejanos con variedades tempranas, luego intermedios, al final los cercanos. Los pesos son configurables (CU06).
- **Riesgo de piso:** depende de la lluvia acumulada del pluviómetro de la finca y de la clase de drenaje. No existe un umbral fijo en mm. Los suelos mal drenados tienen seguimiento prioritario ante la lluvia.
- **Pronóstico:** solo alerta. No decide el ranking.
- **Decisión final:** siempre del Equipo Técnico. El sistema recomienda.
- **Trazabilidad:** todo registro guarda quién y cuándo lo cargó.

---

## CU01 Iniciar sesión

| Campo | Contenido |
|---|---|
| **Objetivo** | Acceder al sistema con las funciones del rol. |
| **Actor principal** | Todos los actores humanos. |
| **Garantía de éxito** | El usuario accede solo a las funciones de su rol. |

**Escenario principal**
1. El usuario abre la aplicación.
2. El sistema pide correo y contraseña.
3. El usuario los ingresa.
4. El sistema los verifica con Firebase Auth, obtiene el rol y muestra la pantalla principal de ese rol.

**Extensiones**
- 4a. Credenciales incorrectas: el sistema lo informa sin indicar cuál dato falló.
- 4b. Usuario deshabilitado o sin rol: el sistema niega el acceso.
- 1a. Cerrar sesión: el sistema vuelve a la pantalla de acceso.

---

## CU02 Gestionar usuarios y roles

| Campo | Contenido |
|---|---|
| **Objetivo** | Dar de alta usuarios, asignar rol y habilitarlos o deshabilitarlos. |
| **Actor principal** | Administrador. |
| **Roles** | Administrador, Equipo Técnico, Jefe de Lote, Supervisor de Fábrica. |

**Roles:** Administrador, Equipo Técnico, Jefe de Lote, Supervisor de Fábrica. **Un usuario puede tener más de un rol**, y sus permisos son la unión de los de sus roles.

**Escenario principal**
1. El administrador elige "Nuevo usuario".
2. El sistema pide nombre, correo y uno o más roles. Si el rol es Jefe de Lote, pide también la finca.
3. El administrador completa los datos y confirma.
4. El sistema crea el usuario en Firebase Auth y guarda su rol.

**Extensiones**
- 3a. El correo ya existe: el sistema lo informa.
- 1a. Cambiar rol o deshabilitar usuario.
- 1b. Se intenta deshabilitar al último administrador: el sistema lo impide.

**Regla de negocio:** los usuarios no se eliminan, porque cada registro guarda quién lo cargó.

---

## CU03 Gestionar fincas y lotes

| Campo | Contenido |
|---|---|
| **Objetivo** | Mantener el inventario de fincas y lotes con sus datos productivos. |
| **Actor principal** | Administrador. |
| **Precondición** | Sesión iniciada con rol Administrador. |
| **Garantía mínima** | Si falla, no se altera ningún lote existente. |
| **Garantía de éxito** | El lote queda guardado y disponible para el ranking. |

**Datos de la finca:** código, nombre, cruza ruta 34 (solo El Quemado), pluviómetro asignado.

**Datos del lote** (columnas del inventario oficial): identificador único, finca, tipo de cultivo (convencional, orgánico full, orgánico NOP), nombre, variedad, área bruta, área neta, surcos, año de plantación, distancia entre surcos y distancia a ILE (km).

**Datos derivados:**
- Zona de distancia: según `DIST ILE`.
- Soca: ciclo actual menos año de plantación [a validar con el técnico].
- Ciclo de la variedad (temprana, media o tardía): se asigna con la tabla de variedades [tabla a pedir al ingenio].

**Escenario principal (alta de lote)**
1. El administrador elige "Nuevo lote".
2. El sistema muestra el formulario.
3. El administrador completa los datos del inventario.
4. El sistema valida y calcula la zona de distancia y la soca.
5. El administrador confirma.
6. El sistema guarda el lote como pendiente de cosecha.

**Extensiones**
- 4a. Identificador duplicado: el sistema lo informa.
- 4b. Área neta mayor que la bruta: el sistema pide corregir.
- 4c. Faltan datos (hay lotes sin variedad o sin distancia en la base 2025; son lotes en preparación para funcionar más adelante como cañeros): el sistema permite guardar como "incompleto" y no lo incluye en el ranking hasta completarlo.
- 1a. **Importar inventario:** el administrador carga la planilla oficial y el sistema informa altas, modificaciones y filas rechazadas.
- 1b. **Cambiar estado:** pendiente, en cosecha, cosechado o en descanso.

**Regla de negocio:** un lote nunca se elimina si tiene registros asociados. Se pasa a "en descanso".

---

## CU04 Clasificar drenaje del lote

| Campo | Contenido |
|---|---|
| **Objetivo** | Asignar a cada lote su clase de drenaje, que determina si se puede entrar tras la lluvia. |
| **Actor principal** | Equipo Técnico. |
| **Precondición** | El lote existe. |
| **Garantía de éxito** | El lote queda con su clase y con un historial de cambios. |

**Clases:** bien drenado, medianamente drenado, imperfectamente drenado.

**Escenario principal**
1. El técnico elige un lote.
2. El sistema muestra su clase actual.
3. El técnico elige la nueva clase e indica una observación (por ejemplo "surgentes").
4. El sistema guarda la clase, el autor y la fecha.

**Extensiones**
- 1a. **Marcar finca crítica:** Miraflores, San Antonio, Ciénaga y Vacuno. El sistema muestra una insignia en sus lotes.
- 3a. Se deja un lote sin clasificar: el sistema lo trata como imperfectamente drenado hasta que se clasifique (criterio prudente) [a validar].

---

## CU05 Gestionar pluviómetros

| Campo | Contenido |
|---|---|
| **Objetivo** | Mantener el registro de los 16–17 pluviómetros manuales y su vínculo con fincas y jefes de lote. |
| **Actor principal** | Administrador. |

**Datos:** código, ubicación, finca asignada, jefe de lote responsable, estado (activo o fuera de servicio).

**Escenario principal**
1. El administrador elige "Nuevo pluviómetro".
2. Completa código, ubicación, finca y responsable.
3. El sistema valida y guarda.

**Extensiones**
- 3a. Código duplicado: el sistema lo informa.
- 1a. Dar de baja: el pluviómetro queda inactivo y se conservan sus lecturas.

**Regla de negocio:** el riesgo de piso de un lote usa un pluviómetro de su finca. Como hay más pluviómetros (16–17) que fincas (5), una finca puede tener varios, y cada lote se asigna al más cercano o representativo [a definir]. Si la finca no tiene uno activo, usa el más cercano de otra finca.

---

## CU06 Configurar parámetros del sistema

| Campo | Contenido |
|---|---|
| **Objetivo** | Ajustar los parámetros que gobiernan el ranking, el riesgo y las alertas. |
| **Actor principal** | Administrador (con acuerdo del Equipo Técnico). |

| Parámetro | Valor inicial |
|---|---|
| Brix mínimo de corte | 8 (confirmado) |
| Rangos de distancia (km) | cercana 1–6, media 7–12, lejana 13–19 |
| Pesos del ranking | distancia, ciclo de variedad, soca, madurez, orgánico |
| Días de ventana de lluvia acumulada | [3] |
| Días estimados sin acceso según drenaje | tabla inicial por criterio experto (ver [valores-a-confirmar-v2.md](valores-a-confirmar-v2.md)) |
| Molienda | 312,5 t/h |
| Umbral de cobertura de patio | 3 h |
| Umbral de reinicio | 30 carros (confirmado; Pedro dio 15 a 20 como mínimo) |
| Toneladas netas por carro | 28 t (30 t brutas, entre 2 % y 14 % no caña) |
| Umbral de alerta de pronóstico | 70 % (confirmado) |

**Escenario principal**
1. El administrador abre la configuración.
2. Modifica uno o más valores.
3. El sistema valida rangos y que los pesos sumen 100%.
4. El sistema guarda con autor y fecha.

**Extensiones**
- 3a. Valor fuera de rango: se rechaza.
- 1a. Restablecer valores iniciales.

**Regla de negocio:** un cambio no altera rankings ya generados, solo los nuevos.

---

## CU07 Registrar lectura de pluviómetro

| Campo | Contenido |
|---|---|
| **Objetivo** | Reemplazar el mensaje de celular por una carga registrada de la lluvia diaria. |
| **Actor principal** | Jefe de Lote. Opera solo sobre los lotes de su finca. |
| **Interesados** | Equipo Técnico (necesita lluvia actual), área estadística de la empresa. |
| **Precondición** | Sesión iniciada. El jefe tiene un pluviómetro asignado. |
| **Garantía de éxito** | La lectura queda guardada con fecha, mm y autor. |
| **Disparador** | Cada mañana, el jefe lee su pluviómetro. |

**Escenario principal**
1. El jefe de lote elige "Cargar lectura".
2. El sistema muestra su pluviómetro y la fecha de hoy.
3. El jefe ingresa los milímetros.
4. El sistema guarda y recalcula el riesgo de piso (CU11).

**Extensiones**
- 3a. Valor negativo o no numérico: el sistema lo rechaza.
- 3b. Ya existe una lectura de ese día: el sistema pregunta si corrige.
- 3c. Valor excepcionalmente alto: el sistema pide confirmar.
- 1a. **Sin lluvia:** el jefe registra 0 mm.
- 1b. **Carga fuera de término:** el jefe elige una fecha anterior y el sistema lo marca como "cargado con demora".

**Regla de negocio:** una lectura por pluviómetro y por día. Una corrección conserva el valor anterior.

---

## CU08 Registrar estado de piso

| Campo | Contenido |
|---|---|
| **Objetivo** | Registrar si se puede entrar a un lote, según lo observado en el campo. |
| **Actor principal** | Jefe de Lote. Opera solo sobre los lotes de su finca. |
| **Precondición** | Sesión iniciada. |
| **Garantía de éxito** | El estado queda guardado y prevalece sobre la estimación del sistema. |

**Escenario principal**
1. El jefe elige un lote de su zona.
2. Indica "se puede entrar" o "no se puede entrar" y una observación opcional.
3. El sistema guarda el registro con fecha, hora y autor.
4. El sistema actualiza la habilitación del lote.

**Extensiones**
- 2a. Máquina hundida: el jefe lo indica y el sistema lo marca como evento.
- 3a. El lote pasa de "no transitable" a "transitable": el sistema cierra el período de inaccesibilidad y guarda los días.

**Regla de negocio:** lo observado manda sobre lo estimado. Antes de mover máquinas a un campo nuevo, el jefe de cosecha lo verifica en persona, y el sistema no lo reemplaza.

---

## CU09 Registrar Brix

| Campo | Contenido |
|---|---|
| **Objetivo** | Registrar la madurez de un lote para habilitarlo o no al corte. |
| **Actor principal** | Jefe de Lote. Opera solo sobre los lotes de su finca. |
| **Garantía de éxito** | La lectura queda guardada con lote, fecha, valor y autor. |

**Escenario principal**
1. El jefe elige un lote.
2. Ingresa el Brix medido.
3. El sistema guarda la lectura.
4. El sistema indica si el lote supera el Brix mínimo.

**Extensiones**
- 2a. Valor fuera del rango posible [0 a 30]: el sistema lo rechaza.
- 4a. No alcanza el mínimo: el sistema marca el lote como "no maduro" y lo excluye del ranking.

---

## CU10 Consultar alerta de pronóstico

| Campo | Contenido |
|---|---|
| **Objetivo** | Mostrar el pronóstico de lluvia como aviso para prepararse, sin usarlo para decidir el ranking. |
| **Actor principal** | Equipo Técnico. |
| **Actor secundario** | Open-Meteo. |
| **Garantía de éxito** | El usuario ve la probabilidad y los mm previstos con una advertencia de baja confiabilidad local. |

**Escenario principal**
1. El técnico abre el tablero.
2. El sistema consulta a Open-Meteo con las coordenadas de referencia de cada zona.
3. El sistema muestra probabilidad y mm previstos.
4. El sistema marca como "alerta de lluvia" si la probabilidad alcanza el 70 % (umbral confirmado, configurable en CU06).

**Extensiones**
- 2a. Open-Meteo no responde: el sistema muestra el último pronóstico guardado con su hora, o informa que no hay datos. El ranking no se ve afectado.

**Regla de negocio:** con 20–30% casi nunca llueve y con 50–60% es probable. Una falsa alarma no tiene consecuencias graves y una alerta correcta permite preparar mantenimiento.

---

## CU11 Estimar riesgo de piso (caso interno)

| Campo | Contenido |
|---|---|
| **Objetivo** | Estimar si un lote es transitable y cuántos días faltan para que lo sea. |
| **Actor principal** | Ninguno. Lo invoca CU12, CU14 o CU07. |

**Entradas:** lluvia acumulada en la ventana (pluviómetro de la finca), clase de drenaje, último estado de piso observado e historial de inaccesibilidad.

**Salida:** `transitable`, `en_riesgo` o `no_transitable`, con los días estimados hasta ser transitable.

**Reglas**
- Un estado observado vigente prevalece sobre la estimación.
- A igual lluvia, un lote imperfectamente drenado se complica antes y tarda más que uno bien drenado.
- Varias lluvias seguidas pesan más que una sola.
- La calibración usa el historial de inaccesibilidad. Hoy el ingenio no lo registra, así que se parte de una tabla inicial por criterio experto y se recalibra con los registros de CU08.

---

## CU12 Generar ranking de prioridad de cosecha

| Campo | Contenido |
|---|---|
| **Objetivo** | Entregar cada día una lista ordenada de lotes a cosechar, para sostener el abastecimiento a fábrica. |
| **Actor principal** | Equipo Técnico. |
| **Interesados** | Dirección de Agrotecnia, Fábrica. |
| **Precondición** | Hay lotes completos, y Brix y piso cargados. |
| **Garantía mínima** | Si falla el cálculo, se conserva el último ranking vigente. |
| **Garantía de éxito** | Se muestra el ranking con el motivo de cada posición y se guarda. |
| **Disparador** | La reunión de cada mañana, o cambios en lluvia, piso o Brix. |

**Escenario principal**
1. El técnico elige "Generar ranking".
2. El sistema excluye los lotes cosechados, en descanso, incompletos, no maduros (Brix) o no transitables (CU11).
3. El sistema calcula el puntaje de los restantes: zona de distancia (lejana primero), ciclo de la variedad (temprana primero), soca, y madurez.
4. El sistema ordena y muestra el ranking con el motivo de cada puesto, y el área neta y toneladas estimadas.
5. El sistema indica los lotes excluidos y la causa (por ejemplo, "Ciénaga: no transitable, faltan ~3 días").
6. El técnico revisa y usa el ranking en la reunión.

**Extensiones**
- 2a. No hay lotes habilitados: el sistema lo informa y propone ver los lotes de reserva (CU14).
- 3a. Una variedad temprana pasada de fecha: el sistema la destaca ("si no se corta a tiempo se seca").
- 6a. **Ajuste manual:** el técnico mueve un lote y anota el motivo. El sistema conserva la decisión.
- 6b. **Activar prioridad orgánica:** ver CU13.

**Reglas de negocio**
- El orden base es lejanos con variedades tempranas, intermedios y al final cercanos.
- El ranking es una recomendación. La decisión es del técnico.
- Cada ranking se guarda con sus parámetros, para auditoría.

---

## CU13 Activar prioridad orgánica

| Campo | Contenido |
|---|---|
| **Objetivo** | Recalcular el ranking cuando aparece una venta de caña orgánica y hay que cortar fuera del cronograma. |
| **Actor principal** | Equipo Técnico. |
| **Condición de la extensión** | Hay una venta de orgánico. |

**Escenario principal**
1. En CU12, el técnico activa "Prioridad orgánica".
2. El sistema indica el volumen a cubrir (opcional, en toneladas).
3. El sistema recalcula poniendo primero los lotes orgánicos que superen el Brix mínimo, ordenados por madurez, distancia y piso.
4. El sistema muestra el ranking y el impacto en el resto del plan.
5. El técnico confirma o desactiva el modo.

**Extensiones**
- 3a. No hay lotes orgánicos habilitados: el sistema lo informa.
- 3b. Un lote orgánico no tiene la edad ideal: el sistema lo muestra con una advertencia.
- 5a. Volumen cubierto: el sistema sugiere volver al orden normal.

---

## CU14 Gestionar lotes de reserva

| Campo | Contenido |
|---|---|
| **Objetivo** | Mantener identificados lotes maduros y bien drenados para enviar las máquinas cuando llueve y no dejar la fábrica sin caña. |
| **Actor principal** | Equipo Técnico. |
| **Garantía de éxito** | Hay una lista de reserva vigente, con toneladas disponibles. |

**Escenario principal**
1. El técnico abre "Lotes de reserva".
2. El sistema propone lotes maduros, bien drenados y transitables, ordenados por cercanía a fábrica y toneladas.
3. El sistema muestra las toneladas de la reserva y las horas de molienda que cubre.
4. El técnico acepta o ajusta la lista.

**Extensiones**
- 2a. Hay lluvia anunciada (CU10): el sistema propone adelantar los lotes mal drenados que ya están maduros.
- 3a. La reserva cubre menos de [1 día de molienda]: el sistema avisa.

---

## CU15 Monitorear abastecimiento de patio

| Campo | Contenido |
|---|---|
| **Objetivo** | Estimar cuántas horas de caña quedan en el patio y avisar antes de una parada. |
| **Actor principal** | Equipo Técnico. |
| **Actor secundario** | Supervisor de Fábrica. |
| **Disparador** | Nueva carga del estado del patio (CU16) o consulta del tablero. |

**Escenario principal**
1. El técnico abre el monitor.
2. El sistema toma el último estado del patio (carros).
3. El sistema calcula la cobertura mínima en horas, sin contar nuevas llegadas: carros × toneladas netas por carro (28 t) ÷ 312,5 t/h.
4. El sistema muestra la cobertura, el semáforo y los lotes en corte.

**Extensiones**
- 3a. Cobertura menor a [3 h] o menos de 30 carros tras una parada: se extiende con CU17.
- 3b. No hay estado cargado reciente: el sistema avisa que el dato está vencido.

**Regla de negocio:** tras una parada por falta de caña, la fábrica no reanuda hasta tener 30 carros en el patio (cerca de 2 a 3 horas de molienda). Pedro dio 15 a 20 como mínimo, pero para asegurar la reanudación se toman 30. Durante esas horas siguen llegando carros, que se mandan a molienda y reponen el colchón. Por eso la cobertura que muestra el sistema es una cota mínima, sin contar las llegadas. Cada carro lleva unas 30 t de carga bruta, de las que entre 2 % y 14 % no es caña; el máximo se da después de lluvias, y en esa época el sistema usa el valor conservador. El ciclo del camión es de alrededor de 1 hora.

---

## CU16 Registrar estado del patio

| Campo | Contenido |
|---|---|
| **Objetivo** | Registrar la cantidad de carros en el patio. |
| **Actor principal** | Supervisor de Fábrica (confirmado: es quien lo carga). |
| **Garantía de éxito** | El registro queda con fecha, hora, carros y autor. |

**Escenario principal**
1. El supervisor elige "Registrar patio".
2. Ingresa la cantidad de carros.
3. El sistema guarda y actualiza el monitor (CU15).

**Extensiones**
- 2a. Valor negativo o no entero: el sistema lo rechaza.

---

## CU17 Alertar a fábrica

| Campo | Contenido |
|---|---|
| **Objetivo** | Avisar a Fábrica con anticipación que puede haber una parada, para que planifique mantenimiento. |
| **Actor principal** | (extiende CU15) Supervisor de Fábrica como receptor. |
| **Condición de la extensión** | Cobertura bajo el umbral, o lluvia con lotes de reserva insuficientes. |

**Escenario principal**
1. El sistema detecta la condición durante CU15.
2. Muestra una alerta con las horas de cobertura y el motivo.
3. El supervisor la ve en su tablero y marca "enterado".

**Regla de negocio:** una falsa alarma no tiene consecuencias graves. Una alerta acertada permite parar una caldera o hacer mantenimiento.

---

## CU18 Registrar parada de fábrica

| Campo | Contenido |
|---|---|
| **Objetivo** | Dejar registrada cada parada con su causa y duración. |
| **Actor principal** | Supervisor de Fábrica. |
| **Garantía de éxito** | La parada queda cerrada con inicio, fin, duración y causa. |

**Causas:** lluvia, falta de caña, rotura, otra.

**Escenario principal**
1. El supervisor elige "Nueva parada" al detenerse la fábrica.
2. El sistema registra la hora de inicio.
3. Al reanudar, el supervisor elige "Cerrar parada" e indica la causa.
4. El sistema calcula la duración y guarda.

**Extensiones**
- 3a. Causa "rotura": el supervisor puede cargar materiales y costo (opcional).
- 1a. **Carga posterior:** se cargan inicio y fin manualmente.
- 1b. Hay una parada abierta: el sistema no permite abrir otra.

---

## CU19 Consultar historial e indicadores de paradas

| Campo | Contenido |
|---|---|
| **Objetivo** | Medir el impacto de las paradas y justificar el proyecto. |
| **Actor principal** | Equipo Técnico, Supervisor de Fábrica y Administrador. |

**Indicadores**
- Horas de parada por causa, y por falta de caña.
- Toneladas que quedaron sin cosechar.
- Cumplimiento del plan (zafra 2026: 988.900 de 1.024.000 t).
- Costo de la hora de parada (obreros × salario por hora, más materiales si hay rotura). Se muestra como rango estimado (referencia: salario mensual de 1.250 USD, 200 a 300 obreros; ver [valores-a-confirmar-v2.md](valores-a-confirmar-v2.md)).

**Escenario principal**
1. El usuario elige "Historial".
2. El sistema muestra las paradas con filtros por fecha y causa.
3. El sistema muestra los indicadores del período.

**Extensiones**
- 3a. Falta el dato de salario por hora: el sistema muestra horas, no costo.

---

## CU20 Simular escenarios

| Campo | Contenido |
|---|---|
| **Objetivo** | Probar escenarios hipotéticos ("llovieron X mm", "entra una venta de orgánico") y ver cómo cambia el ranking, sin alterar datos reales. |
| **Actor principal** | Equipo Técnico. |
| **Garantía mínima** | Ninguna simulación modifica lecturas, estados ni el ranking oficial. |
| **Garantía de éxito** | El usuario ve el efecto en el ranking, marcado como simulación. |

**Escenario principal**
1. El técnico elige "Simular".
2. El sistema muestra el aviso "Modo simulación: los cambios no se guardan" y precarga los valores actuales.
3. El técnico modifica la lluvia de una o más fincas y, opcionalmente, activa la prioridad orgánica.
4. El sistema recalcula el riesgo de piso y el ranking (CU12, inclusión).
5. El sistema muestra el nuevo ranking junto al oficial, y los lotes que cambian de estado.
6. El técnico sale o elige "Restablecer datos reales".

**Extensiones**
- 3a. Valor negativo o no numérico: el sistema lo corrige a 0.
- 6a. El usuario cambia de pantalla: la simulación se descarta sin guardar.

**Regla de negocio:** un ranking simulado tiene carácter transitorio (`esSimulacion = true`) y nunca reemplaza al oficial.

---

## CU21 Visualizar ranking en el mapa

| Campo | Contenido |
|---|---|
| **Objetivo** | Mostrar el ranking sobre un mapa para usarlo en la reunión de cada mañana. |
| **Actor principal** | Equipo Técnico. Supervisor de Fábrica solo consulta. |
| **Precondición** | Hay un ranking vigente (CU12). |
| **Garantía de éxito** | Cada lote se ve en el mapa con su posición, estado y puesto del ranking. |

**Ubicación de los lotes:** el inventario no trae coordenadas exactas. La posición de cada lote será **aproximada**, a partir de las coordenadas del ingenio y de su distancia (`DIST ILE`). El método se define en la implementación, directamente en el mapa.

**Escenario principal**
1. El técnico elige "Ver en mapa".
2. El sistema muestra el ingenio y los lotes con su color según estado (habilitado, no maduro, no transitable, en reserva).
3. El técnico elige un lote.
4. El sistema muestra su puesto, finca, variedad, Brix, drenaje y el motivo de su posición.

**Extensiones**
- 2a. Un lote no tiene posición asignada: el sistema lo lista aparte, fuera del mapa.
- 2b. **Modo simulación:** si hay una simulación activa (CU20), el mapa lo indica y muestra los colores simulados.
- 2c. El técnico filtra por finca, zona de distancia o tipo de cultivo.

**Regla de negocio:** la posición es solo referencia visual. Nunca se usa para calcular el ranking, que usa `DIST ILE`.

---

## Pendientes

- Confirmar los valores entre corchetes con el ingenio: ver la lista consolidada en [valores-a-confirmar-v2.md](valores-a-confirmar-v2.md).
- Revisar la consigna de la cátedra para el formato final.
