# PluviaZafra: Compendio de definiciones y cálculos

Referencia única de los términos, parámetros, fórmulas y reglas de negocio del sistema. Sirve para redactar el informe con un lenguaje consistente.

Los valores marcados como **provisorio** salen de [pendientes-entrevista.md](pendientes-entrevista.md) y se confirman con el ingenio.

---

## Parte 1. Glosario del dominio

### Proceso productivo

| Término | Definición |
|---|---|
| **Zafra** | Período anual de cosecha de la caña de azúcar y molienda en el ingenio. En el sistema se delimita con una fecha de inicio configurable (`inicioZafra`). |
| **Ingenio** | Fábrica que procesa la caña para producir azúcar. En este proyecto, el Ingenio La Esperanza. |
| **Lote** | Parcela de cultivo con caña, identificada por un código único. Tiene hectáreas, toneladas de caña estimadas, un polígono en el mapa y un estado. |
| **Zona** | Agrupación de lotes que comparten un pluviómetro y un punto de referencia para el pronóstico. Cada lote pertenece a una sola zona. |
| **Patio de caña** | Lugar de la fábrica donde se acopia la caña cosechada antes de molerla. Si se vacía, la fábrica se detiene. |
| **Parada de fábrica** | Período en que la fábrica deja de moler. Se registra con causa, inicio, fin y duración. |
| **Cosecha** | Corte y traslado de la caña de un lote hacia la fábrica. |
| **Lote intransitable o anegado** | Lote al que no se puede ingresar a cosechar por efecto de la lluvia (barro, agua o camino inutilizable). |
| **Anegamiento** | Evento en que un lote queda intransitable por lluvia. Tiene un inicio y, cuando el lote se recupera, un fin. |

### Atributos de vulnerabilidad

| Término | Definición | Valores [provisorios] |
|---|---|---|
| **Vulnerabilidad a la lluvia** | Qué tan propenso es un lote a quedar intransitable cuando llueve. Es una propiedad del lote, independiente de cuánto llueva. | |
| **Suelo** | Tipo de suelo del lote. | Arenoso, franco, arcilloso |
| **Drenaje** | Capacidad del lote de evacuar el agua. | Bueno, regular, malo |
| **Camino de acceso** | Estado del camino por el que se llega al lote. | Consolidado, enripiado, tierra |
| **Historial de anegamientos** | Cantidad de eventos de anegamiento que tuvo el lote. Se usa en dos versiones: total y de la última zafra. | |

### Lluvia y pronóstico

| Término | Definición |
|---|---|
| **Pluviómetro** | Instrumento que mide la lluvia caída en milímetros. Cada zona tiene uno activo. |
| **Lectura** | Medición de un pluviómetro: fecha, hora y milímetros. La carga una persona a mano. |
| **Milímetro (mm)** | Unidad de lluvia. 1 mm equivale a 1 litro por metro cuadrado. |
| **Lluvia acumulada** | Suma de los milímetros de las lecturas de una zona dentro de la ventana de lluvia acumulada. Es la lluvia que ya cayó. |
| **Lluvia prevista** | Suma de los milímetros que el pronóstico espera para una zona dentro del horizonte de pronóstico. Es la lluvia que va a caer. |
| **Ventana de lluvia acumulada** | Cantidad de horas hacia atrás que se miran las lecturas. Configurable: 24, 48 o 72 h. Valor inicial: 48 h. |
| **Horizonte de pronóstico** | Cantidad de horas hacia adelante que se miran del pronóstico. Configurable: 24, 48 o 72 h. Valor inicial: 48 h. |
| **Lluvia crítica** | Cantidad de milímetros (acumulados más previstos) a partir de la cual se considera que la lluvia alcanza para inutilizar un lote muy vulnerable. Configurable. Valor inicial: 60 mm. **Provisorio.** |
| **Pronóstico desactualizado** | Pronóstico guardado que se usa porque Open-Meteo no respondió. Se muestra con su fecha y hora de consulta. |
| **Open-Meteo** | Servicio externo gratuito de datos meteorológicos del que se obtiene el pronóstico. |

### Índice, riesgo, ranking y simulación

| Término | Definición |
|---|---|
| **Índice de vulnerabilidad** | Número de 0 a 100 que resume qué tan vulnerable es un lote, calculado con suelo, drenaje, camino e historial. No incluye lluvia ni pronóstico. |
| **Categoría de vulnerabilidad** | Clasificación del índice en baja, media o alta. |
| **Puntaje de riesgo** | Número de 0 a 100 que combina el índice de vulnerabilidad con la lluvia (acumulada más prevista). Mide qué tan urgente es cosechar el lote ahora. |
| **Factor de lluvia** | Número de 0 a 1 que indica qué fracción de la lluvia crítica se alcanzó o se espera alcanzar. |
| **Semáforo** | Color asignado a cada lote pendiente según su puntaje de riesgo: rojo (urgente), amarillo (atención) o verde (puede esperar). |
| **Ranking de prioridad** | Lista de lotes elegibles ordenada por puntaje de riesgo, de mayor a menor. Es una recomendación, no una obligación. |
| **Lote elegible** | Lote pendiente de cosecha con los tres atributos de vulnerabilidad cargados. Solo estos entran al ranking. |
| **Lote incompleto** | Lote al que le falta algún atributo de vulnerabilidad. No recibe índice y se lista aparte. |
| **Toneladas en riesgo** | Suma de las toneladas de caña de los lotes en rojo. Se muestra en la alerta. |
| **Simulación de precipitaciones** | Modo interactivo que permite cargar milímetros hipotéticos de lluvia acumulada y prevista por zona para recalcular en tiempo real el puntaje de riesgo, el semáforo en el mapa y el ranking, sin alterar las lecturas reales ni guardar un ranking oficial. |

### Estados del lote

| Estado | Tipo | Color | Significado | ¿Entra al ranking? |
|---|---|---|---|---|
| Urgente | Semáforo | Rojo | Si llueve como se espera, el lote quedaría inutilizable. | Sí |
| Atención | Semáforo | Amarillo | Riesgo moderado. | Sí |
| Puede esperar | Semáforo | Verde | Riesgo bajo. | Sí |
| Anegado | Operativo | Azul | Ya intransitable. | No |
| En cosecha | Operativo | Naranja | Cosecha iniciada. | No |
| Cosechado | Operativo | Gris | Cosecha terminada. | No |
| En descanso | Operativo | Gris claro | Fuera de la zafra actual. | No |

**Diferencia clave:** el semáforo lo calcula el sistema y solo existe para lotes pendientes. Los estados operativos los cambia una persona. Un lote pendiente tiene semáforo, un lote en cualquier estado operativo no.

### Paradas

| Término | Definición |
|---|---|
| **Causa de parada** | Motivo de la parada, tomado de un catálogo cerrado [provisorio]: lluvia, falta de caña en el patio, avería de equipos, mantenimiento programado u otra (con detalle obligatorio). |
| **Parada abierta** | Parada iniciada y todavía sin fin. Solo puede haber una abierta a la vez. |
| **Parada cerrada** | Parada con fecha y hora de fin y duración calculada. |
| **Toneladas en patio** | Dato opcional de la parada: caña acopiada en el patio en ese momento. |

### Roles

| Rol | Qué hace |
|---|---|
| **Jefe de cosecha** | Decide el orden de cosecha. Consulta ranking, mapa, simulador, pronóstico e historial de paradas, y puede registrar anegamientos. |
| **Operador de campo** | Carga lecturas de pluviómetro y anegamientos. |
| **Supervisor de fábrica** | Registra y consulta paradas de fábrica. |
| **Administrador** | Gestiona usuarios, lotes, atributos, zonas y parámetros. Hereda lo del Jefe de cosecha. |

---

## Parte 2. Glosario técnico

| Término | Definición |
|---|---|
| **React con Vite** | Biblioteca de interfaces y herramienta de compilación del frontend. |
| **Firebase Auth** | Servicio de autenticación (correo y contraseña). |
| **Firestore** | Base de datos de documentos de Firebase donde se guardan los datos del sistema. |
| **FastAPI** | Framework de Python para el backend. Aloja los cálculos del ranking, el índice y la consulta del pronóstico. |
| **Render** | Plataforma donde se despliega el backend. |
| **GitHub Pages y Vercel** | Plataformas donde se publica el frontend. |
| **Leaflet** | Biblioteca de mapas web que muestra los lotes, sus polígonos y sus colores de estado. |
| **CORS** | Mecanismo que define qué orígenes pueden llamar al backend. Se configura con la variable `ALLOWED_ORIGIN`. |
| **Polígono** | Lista ordenada de coordenadas (latitud y longitud) que delimita un lote en el mapa. |
| **CSV** | Formato de archivo de texto con valores separados por comas, usado para exportar datos. |

---

## Parte 3. Parámetros configurables

Todos se editan en CU06 y se guardan en `Configuracion`, con versión, fecha, hora y usuario.

| Parámetro | Valor inicial | Estado |
|---|---|---|
| Peso de suelo | 0,20 | Provisorio |
| Peso de drenaje | 0,25 | Provisorio |
| Peso de camino | 0,20 | Provisorio |
| Peso de historial total | 0,15 | Provisorio |
| Peso de historial última zafra | 0,20 | Provisorio |
| Puntaje de suelo | Arenoso 20, franco 50, arcilloso 90 | Provisorio |
| Puntaje de drenaje | Bueno 10, regular 50, malo 100 | Provisorio |
| Puntaje de camino | Consolidado 10, enripiado 40, tierra 90 | Provisorio |
| Tope de anegamientos totales | 5 | Provisorio |
| Tope de anegamientos de la última zafra | 2 | Provisorio |
| Umbral de categoría media | 34 | Provisorio |
| Umbral de categoría alta | 67 | Provisorio |
| Umbral de semáforo amarillo | 34 | Provisorio |
| Umbral de semáforo rojo | 67 | Provisorio |
| Lluvia crítica | 60 mm | Provisorio |
| Ventana de lluvia acumulada | 48 h | Configurable (24, 48, 72) |
| Horizonte de pronóstico | 48 h | Configurable (24, 48, 72) |
| Inicio de la zafra vigente | Sin definir | A confirmar |

Parámetros fijos o técnicos fuera de `Configuracion` (a confirmar):

| Parámetro | Valor | Dónde se usa |
|---|---|---|
| Lluvia máxima plausible en una lectura | 300 mm | CU08, pide confirmación |
| Diferencia máxima entre hectáreas y polígono | 10 % | CU03, aviso |
| Caché del pronóstico | 30 minutos | CU09, evita consultas repetidas |

---

## Parte 4. Cálculos

### 4.1 Lluvia acumulada de una zona (CU08, CU11)

$$A = \sum_{l \in L} mm_l, \qquad L = \{\text{lecturas de la zona con } ahora - V \le fechaHora_l \le ahora\}$$

- `V`: ventana de lluvia acumulada en horas.
- Si la zona no tiene lecturas en la ventana, se marca "sin lecturas recientes" y el cálculo sigue solo con el pronóstico.

### 4.2 Lluvia prevista de una zona (CU09, CU11)

$$P = \sum_{h=1}^{H} mm\_previstos_h$$

- `H`: horizonte de pronóstico en horas.
- Los valores los entrega Open-Meteo según las coordenadas de la zona.
- Si Open-Meteo falla se usa el último pronóstico guardado, marcado como desactualizado. Si no hay ninguno, se calcula solo con `A`.

### 4.3 Puntaje de un factor del índice (CU10)

**Factores cualitativos** (suelo, drenaje, camino): se convierten con la tabla de puntajes de la configuración.

| Factor | Valor | Puntaje |
|---|---|---|
| Suelo | Arenoso | 20 |
| Suelo | Franco | 50 |
| Suelo | Arcilloso | 90 |
| Drenaje | Bueno | 10 |
| Drenaje | Regular | 50 |
| Drenaje | Malo | 100 |
| Camino | Consolidado | 10 |
| Camino | Enripiado | 40 |
| Camino | Tierra | 90 |

**Factores de historial** (anegamientos totales y de la última zafra): se normalizan con un tope.

$$puntaje = \min\left(\frac{eventos}{tope},\ 1\right) \times 100$$

- Eventos totales: todos los anegamientos registrados para el lote, abiertos y cerrados.
- Eventos de la última zafra: anegamientos con fecha de inicio igual o posterior a `inicioZafra`.
- Si el lote no tiene eventos, el puntaje es 0 (dato válido, no falta de dato).

### 4.4 Índice de vulnerabilidad (CU10)

$$I = w_s \cdot p_s + w_d \cdot p_d + w_c \cdot p_c + w_h \cdot p_h + w_z \cdot p_z, \qquad \sum w = 1$$

| Símbolo | Factor | Peso inicial |
|---|---|---|
| s | Suelo | 0,20 |
| d | Drenaje | 0,25 |
| c | Camino | 0,20 |
| h | Historial total | 0,15 |
| z | Historial última zafra | 0,20 |

- Resultado de 0 a 100. A mayor valor, mayor vulnerabilidad.
- Si los pesos no suman 1, CU06 no permite guardarlos. Como respaldo, el sistema normaliza dividiendo cada peso por la suma.
- Si al lote le falta algún atributo cualitativo, no se calcula: queda "incompleto".

**Categoría de vulnerabilidad** (intervalos semiabiertos):

| Categoría | Condición |
|---|---|
| Baja | $I < 34$ |
| Media | $34 \le I < 67$ |
| Alta | $I \ge 67$ |

### 4.5 Factor de lluvia (CU11, CU16)

$$f = \min\left(\frac{A + P}{LC},\ 1\right)$$

- `LC`: lluvia crítica en mm.
- `f = 0` si no hay lluvia caída ni prevista. `f = 1` si se alcanza o supera la lluvia crítica.
- En el simulador de precipitaciones (CU16), $A$ y $P$ toman los milímetros ingresados por el usuario para probar el escenario.

### 4.6 Puntaje de riesgo (CU11, CU16)

$$R = I \times f$$

- Resultado de 0 a 100.
- El índice marca la sensibilidad del lote y el factor marca cuánto llueve. Los dos hacen falta: un lote muy vulnerable sin lluvia no es urgente, y mucha lluvia sobre un lote poco vulnerable tampoco.

### 4.7 Semáforo (CU11, CU16)

| Color | Condición | Estado |
|---|---|---|
| Rojo | $R \ge 67$ | Urgente |
| Amarillo | $34 \le R < 67$ | Atención |
| Verde | $R < 34$ | Puede esperar |

### 4.8 Orden del ranking (CU11, CU16)

Se ordena por estos criterios, en este orden:

1. Puntaje de riesgo $R$, de mayor a menor.
2. Si hay empate, índice de vulnerabilidad $I$, de mayor a menor.
3. Si persiste, toneladas de caña, de mayor a menor.

Si no llueve ni se pronostica lluvia ($f = 0$), todos los lotes quedan en verde con $R = 0$ y el orden lo da el índice.

### 4.9 Toneladas en riesgo (CU15)

$$T_{riesgo} = \sum_{l \in \text{lotes en rojo}} toneladas_l$$

### 4.10 Duración de una parada (CU13, CU14)

$$D = \frac{fechaFin - fechaInicio}{1\ hora}$$

- Se calcula al cerrar la parada. Mientras está abierta, no tiene duración final.

### 4.11 Totales de paradas (CU14)

- **Cantidad de paradas** del período filtrado.
- **Horas totales** = suma de las duraciones.
- **Horas por causa** = suma de las duraciones de las paradas de esa causa.
- **Porcentaje por causa** = horas de la causa dividido por las horas totales, por 100.

### 4.12 Área del polígono y control contra las hectáreas (CU03)

Para un polígono de vértices (latitud, longitud):

1. Se proyecta cada vértice a metros respecto de la latitud media $\varphi_0$:

$$x_i = R \cdot \cos(\varphi_0) \cdot \lambda_i, \qquad y_i = R \cdot \varphi_i$$

con $R = 6\,371\,000$ m, y $\lambda, \varphi$ en radianes.

2. Se aplica la fórmula del área de Gauss (shoelace):

$$A_{m^2} = \frac{1}{2}\left|\sum_{i=1}^{n} (x_i\, y_{i+1} - x_{i+1}\, y_i)\right|$$

3. Se pasa a hectáreas: $A_{ha} = A_{m^2} / 10\,000$.

**Control:** si $\dfrac{|A_{ha} - hectáreas|}{hectáreas} > 10\,\%$, el sistema avisa. Para lotes de decenas de hectáreas la proyección plana es suficientemente precisa.

### 4.13 Validación de lectura (CU08)

| Regla | Resultado |
|---|---|
| mm menor que 0 o no numérico | Se rechaza. |
| Fecha y hora posteriores a ahora | Se rechaza. |
| mm mayor que 300 | Se pide confirmación expresa. |
| Misma zona y misma fecha y hora que una lectura existente | Se ofrece reemplazar o cancelar. |

---

## Parte 5. Ejemplo completo

**Datos de partida.** Zona Norte, con configuración inicial. Hoy se consulta el ranking.

*Lluvia de la zona*

| Dato | Valor |
|---|---|
| Lecturas dentro de las últimas 48 h | 10 mm, 8 mm, 7 mm |
| Lluvia acumulada $A$ | 10 + 8 + 7 = **25 mm** |
| Lluvia prevista $P$ (próximas 48 h) | **30 mm** |
| Lluvia crítica $LC$ | 60 mm |
| Factor de lluvia $f$ | $\min(55/60, 1) = \mathbf{0{,}917}$ |

*Lotes*

| | Lote A | Lote B | Lote C |
|---|---|---|---|
| Suelo | Arcilloso (90) | Franco (50) | Arenoso (20) |
| Drenaje | Malo (100) | Malo (100) | Bueno (10) |
| Camino | Tierra (90) | Enripiado (40) | Consolidado (10) |
| Anegamientos totales | 4, puntaje $\min(4/5,1)\times100 = 80$ | 3, puntaje 60 | 0, puntaje 0 |
| Anegamientos última zafra | 2, puntaje 100 | 1, puntaje 50 | 0, puntaje 0 |
| Toneladas | 1.800 | 1.200 | 2.500 |

*Cálculo del índice*

| Lote | Cuenta | $I$ | Categoría |
|---|---|---|---|
| A | $0{,}20{\cdot}90 + 0{,}25{\cdot}100 + 0{,}20{\cdot}90 + 0{,}15{\cdot}80 + 0{,}20{\cdot}100 = 18 + 25 + 18 + 12 + 20$ | **93** | Alta |
| B | $0{,}20{\cdot}50 + 0{,}25{\cdot}100 + 0{,}20{\cdot}40 + 0{,}15{\cdot}60 + 0{,}20{\cdot}50 = 10 + 25 + 8 + 9 + 10$ | **62** | Media |
| C | $0{,}20{\cdot}20 + 0{,}25{\cdot}10 + 0{,}20{\cdot}10 + 0 + 0 = 4 + 2{,}5 + 2$ | **8,5** | Baja |

*Puntaje de riesgo y semáforo*

| Lote | $R = I \times 0{,}917$ | Semáforo | Posición |
|---|---|---|---|
| A | $93 \times 0{,}917 = $ **85,3** | Rojo | 1 |
| B | $62 \times 0{,}917 = $ **56,8** | Amarillo | 2 |
| C | $8{,}5 \times 0{,}917 = $ **7,8** | Verde | 3 |

*Alerta (CU15):* hay un lote en rojo, el A. Toneladas en riesgo: **1.800 t**.

*Lectura del resultado:* el lote A es el que más se anega y llueve casi lo suficiente para dejarlo inutilizable, así que se cosecha primero. El lote C, aunque tiene más caña (2.500 t), casi no se anega, así que puede esperar.

**Mismo ejemplo sin lluvia ni pronóstico (o simulando 0 mm en CU16):** $f = 0$, $R = 0$ para todos, todos en verde. El orden queda A, B, C por índice (93, 62, 8,5).

**Mismo ejemplo con lluvia muy fuerte (A + P = 90 mm):** $f = \min(90/60, 1) = 1$. Entonces $R$ coincide con $I$: A = 93 (rojo), B = 62 (amarillo), C = 8,5 (verde). La lluvia crítica funciona como tope: más lluvia no sube el puntaje por encima del índice.

### Ejemplo de parada

| Dato | Valor |
|---|---|
| Causa | Falta de caña en el patio |
| Inicio | 03:30 |
| Fin | 07:00 |
| Duración $D$ | **3,5 horas** |
| Toneladas en patio | 0 (opcional) |

### Ejemplo de control de área

Lote cargado con 48 ha. El polígono dibujado mide 53 ha. Diferencia: $|53 - 48| / 48 = 10{,}4\,\%$. Supera el 10 %, así que el sistema avisa y deja elegir entre corregir o continuar.

---

## Parte 6. Reglas de negocio resumidas

| Código | Regla |
|---|---|
| RN01 | El código de un lote es único. |
| RN02 | Un lote no se elimina si tiene lecturas, anegamientos o historial: se pasa a "En descanso". |
| RN03 | Una zona no se da de baja si tiene lotes asignados. |
| RN04 | Cada zona tiene un solo pluviómetro activo. Un pluviómetro reemplazado queda inactivo, no se borra. |
| RN05 | Los usuarios no se eliminan, se deshabilitan. Siempre debe haber al menos un administrador. |
| RN06 | Los pesos del índice deben sumar 1. |
| RN07 | El semáforo no se edita a mano: lo calcula el sistema. |
| RN08 | Solo los lotes pendientes y completos entran al ranking. |
| RN09 | El ranking es una recomendación: el sistema no impide cosechar en otro orden. |
| RN10 | Cada ranking guarda la versión de configuración con la que se generó. Cambiar parámetros no modifica rankings anteriores. |
| RN11 | Los atributos de vulnerabilidad conservan el historial: al modificarlos se guarda el valor anterior. |
| RN12 | Solo puede haber una parada abierta a la vez. El fin no puede ser anterior al inicio ni el inicio futuro. |
| RN13 | Una parada con causa "otra" exige detalle. |
| RN14 | Cada anegamiento abierto bloquea un nuevo anegamiento del mismo lote hasta cerrarse. |
| RN15 | Cada lectura, parada, anegamiento y cambio de configuración guarda quién lo cargó y cuándo. |
| RN16 | Un ranking calculado en el simulador de precipitaciones es transitorio: no se guarda como ranking oficial ni modifica lecturas o pronósticos reales. |

---

## Parte 7. Siglas y abreviaturas

| Sigla | Significado |
|---|---|
| CU | Caso de uso |
| RN | Regla de negocio |
| mm | Milímetros de lluvia |
| ha | Hectáreas |
| t | Toneladas |
| $I$ | Índice de vulnerabilidad |
| $A$ | Lluvia acumulada |
| $P$ | Lluvia prevista |
| $LC$ | Lluvia crítica |
| $f$ | Factor de lluvia |
| $R$ | Puntaje de riesgo |
| $D$ | Duración de una parada |
| $V$, $H$ | Ventana de lluvia acumulada y horizonte de pronóstico, en horas |
