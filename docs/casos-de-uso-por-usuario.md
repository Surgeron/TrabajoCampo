# PluviaZafra: Casos de uso agrupados por usuario

Especificaciones completas en [especificaciones-casos-de-uso.md](especificaciones-casos-de-uso.md). Diagrama en [casos-de-uso-pluviazafra.md](casos-de-uso-pluviazafra.md).

## Jefe de cosecha

Es quien decide el orden de cosecha. Usa el sistema sobre todo para mirar y decidir.

| Caso de uso | Para qué lo usa |
|---|---|
| CU01 Iniciar sesión | Acceder al sistema. |
| CU11 Generar ranking de prioridad | Saber qué lotes cosechar primero. |
| CU12 Visualizar ranking en el mapa | Ver los lotes por color y el detalle de cada uno. |
| CU15 Alertar lote en riesgo | Enterarse de los lotes en rojo (se muestra solo, extiende CU11). |
| CU09 Consultar pronóstico | Ver la lluvia prevista por zona. |
| CU05 Registrar anegamiento | Informar un lote intransitable o su recuperación. |
| CU14 Consultar historial de paradas | Evaluar cuánto afectó la lluvia a la fábrica. |
| CU16 Simular precipitaciones | Probar escenarios de lluvia y ver en vivo cómo cambian el mapa y el ranking sin alterar datos reales. |

## Operador de campo

Está en el terreno. Su carga es corta y frecuente.

| Caso de uso | Para qué lo usa |
|---|---|
| CU01 Iniciar sesión | Acceder al sistema. |
| CU08 Registrar lectura de pluviómetro | Cargar fecha, hora y milímetros de su zona. |
| CU05 Registrar anegamiento | Avisar que un lote quedó intransitable, o que ya se puede entrar. |

## Supervisor de fábrica

Se ocupa de lo que pasa en la planta.

| Caso de uso | Para qué lo usa |
|---|---|
| CU01 Iniciar sesión | Acceder al sistema. |
| CU13 Registrar parada de fábrica | Abrir y cerrar paradas con su causa, y opcionalmente las toneladas en patio. |
| CU14 Consultar historial de paradas | Revisar paradas anteriores y sus totales por causa. |

## Administrador

Configura y mantiene el sistema. Hereda todo lo del Jefe de cosecha (CU09, CU05, CU11, CU12, CU14, CU15 y CU16). [a confirmar con el ingenio]

| Caso de uso | Para qué lo usa |
|---|---|
| CU01 Iniciar sesión | Acceder al sistema. |
| CU02 Gestionar usuarios y roles | Dar de alta usuarios y asignarles rol. |
| CU03 Gestionar lotes | Dibujar polígonos, cargar datos y cambiar estados operativos. |
| CU04 Registrar atributos de vulnerabilidad | Cargar suelo, drenaje y camino de cada lote. |
| CU07 Gestionar zonas y pluviómetros | Definir zonas y asignarles pluviómetro. |
| CU06 Configurar parámetros del sistema | Ajustar pesos, umbrales, lluvia crítica y ventanas. |

## Open-Meteo (sistema externo)

| Caso de uso | Participación |
|---|---|
| CU09 Consultar pronóstico | Responde con la lluvia prevista por coordenadas. Participa también cuando CU11 lo incluye. |

## Casos internos del sistema

| Caso de uso | Quién lo dispara |
|---|---|
| CU10 Calcular índice de vulnerabilidad | CU11 y CU16 lo incluyen. No tiene actor humano. |

## Resumen cruzado

| Caso de uso | Jefe | Operador | Supervisor | Admin |
|---|:---:|:---:|:---:|:---:|
| CU01 Iniciar sesión | x | x | x | x |
| CU02 Gestionar usuarios y roles | | | | x |
| CU03 Gestionar lotes | | | | x |
| CU04 Atributos de vulnerabilidad | | | | x |
| CU05 Registrar anegamiento | x | x | | x |
| CU06 Configurar parámetros | | | | x |
| CU07 Zonas y pluviómetros | | | | x |
| CU08 Lectura de pluviómetro | | x | | |
| CU09 Consultar pronóstico | x | | | x |
| CU10 Índice de vulnerabilidad | interno | | | |
| CU11 Ranking de prioridad | x | | | x |
| CU12 Ranking en el mapa | x | | | x |
| CU13 Registrar parada | | | x | |
| CU14 Historial de paradas | x | | x | x |
| CU15 Alerta de lote en riesgo | x | | | x |
| CU16 Simular precipitaciones | x | | | x |

La columna Admin incluye lo heredado del Jefe de cosecha.

## Observaciones

- **Carga por rol:** el Administrador concentra seis casos propios, sobre todo de configuración inicial. Una vez cargados los lotes y las zonas, su uso baja. El Jefe de cosecha y el Operador son quienes usan el sistema todos los días.
- **El Operador no ve el ranking.** Solo carga datos. Si el ingenio quiere que también vea el mapa, se le agrega CU12 en modo lectura. [consultar en la entrevista]
- **El Supervisor de fábrica no ve lotes.** Si hace falta que la fábrica sepa qué viene del campo, se podría darle CU12 en solo lectura. [consultar]
- **Pendiente de la entrevista:** confirmar si hay más personas que cargan anegamientos (por ejemplo, capataces de cuadrilla), porque cambiaría el actor de CU05.
