# Formulación del Proyecto

**Sistema de priorización de cosecha según vulnerabilidad a la lluvia para el Ingenio La Esperanza (PluviaZafra, nombre provisorio)**

Los puntos entre corchetes son supuestos o datos pendientes de confirmar en la entrevista con el ingenio.

| Dato | Detalle |
|---|---|
| Organización | Ingenio La Esperanza. Produce azúcar a partir de la caña cosechada en lotes propios y de terceros. [confirmar datos de la organización] |
| Eje de la matriz productiva | Agroindustria azucarera: planificación de la cosecha y abastecimiento de caña a la fábrica durante la zafra. |
| Proceso delimitado | Definición del orden de cosecha de los lotes durante la zafra, en días de lluvia, y su relación con el abastecimiento de caña a fábrica. |
| Fuente de relevamiento | Entrevista al ingenio [pendiente: confirmar con quién y fecha] y relevamiento documental. |

## 1. Resumen técnico

### 1.1 Características principales del problema

En zafra, cuando llueve fuerte, algunos lotes quedan intransitables y no se puede cosechar. El problema tiene tres puntos ciegos:

- **El orden de cosecha no considera qué lotes se anegan más.** No todos los lotes reaccionan igual a la lluvia: depende del suelo, del drenaje y del camino de acceso. Se supone que hoy esa información está en la experiencia de quienes planifican y no en un registro. [confirmar en entrevista]
- **El pronóstico y la lluvia caída no se cruzan con el estado de los lotes.** Se supone que no existe un criterio sistemático que combine lo que se espera que llueva, lo que ya llovió y la vulnerabilidad de cada lote. [confirmar en entrevista]
- **Las paradas de fábrica no quedan registradas con su causa y duración.** Sin ese dato no se puede medir cuánto cuesta la falta de caña por lluvia ni justificar cambios en la planificación. [confirmar si hoy se registran y dónde]

La consecuencia es directa: si se acaba la caña del patio antes de que los lotes anegados vuelvan a ser accesibles, la fábrica para.

### 1.2 Oportunidad

Una parada de fábrica en plena zafra tiene un costo alto y la ventana de cosecha es limitada. Ordenar la cosecha con criterio de riesgo, cosechando antes los lotes que más se anegan cuando se espera lluvia, permite mantener el patio abastecido sin sumar recursos. Además, los datos necesarios existen o son fáciles de conseguir: el pronóstico se obtiene gratis de Open-Meteo y las lecturas de lluvia ya se toman en pluviómetros. [confirmar cuántos pluviómetros hay y cómo se registran]

### 1.3 Necesidad de información del proceso delimitado

- Características de cada lote que determinan su vulnerabilidad: suelo, drenaje, camino de acceso e historial de anegamientos.
- Pronóstico de lluvia por zona y lluvia efectivamente caída según los pluviómetros.
- Umbrales de lluvia a partir de los cuales un lote deja de ser transitable. [definir con el ingenio]
- Estado del patio de caña y ritmo de consumo de la fábrica. [confirmar si entra en el alcance]
- Registro de paradas de fábrica con causa y duración.

### 1.4 Propuesta tecnológica

Se propone desarrollar una aplicación web que asigna a cada lote un índice de vulnerabilidad a la lluvia, calculado a partir del suelo, el drenaje, el camino de acceso y el historial de anegamientos. El sistema cruza ese índice con el pronóstico y la lluvia caída, y arma un ranking de prioridad de cosecha que se muestra en un mapa. También registra las paradas de fábrica con su causa y duración. Es un sistema de apoyo a la decisión: el jefe de cosecha conserva la última palabra sobre el orden real.

## 2. Objetivo

### 2.1 Objetivo general

Desarrollar un sistema de información que ayude a planificar el orden de cosecha del Ingenio La Esperanza durante la zafra, combinando la vulnerabilidad de cada lote con el pronóstico y la lluvia caída, para reducir el riesgo de quedarse sin caña en el patio y las paradas de fábrica por lluvia.

### 2.2 Objetivos específicos

- Registrar los lotes con sus características y asignar a cada uno un índice de vulnerabilidad a la lluvia.
- Incorporar el pronóstico de Open-Meteo y las lecturas de pluviómetro cargadas a mano.
- Generar un ranking de prioridad de cosecha visible en un mapa.
- Registrar las paradas de fábrica con causa y duración, para medir el impacto de la lluvia.
- Sentar las bases para incorporar, en etapas posteriores, trazado de rutas, sensores e imágenes satelitales.

## 3. Alcance

### 3.1 Funcionalidades generales

| Módulo | Funcionalidades | Información que provee |
|---|---|---|
| Acceso y roles | Inicio de sesión por rol (jefe de cosecha, operador de campo, supervisor de fábrica, administrador). | Quién cargó cada dato. |
| Lotes | Alta, modificación y baja de lotes, con ubicación en el mapa y atributos de suelo, drenaje y camino de acceso. | Inventario de lotes y sus características. |
| Índice de vulnerabilidad | Cálculo del índice por lote con pesos configurables e historial de anegamientos. | Qué lotes son más sensibles a la lluvia. |
| Pronóstico | Consulta del pronóstico de lluvia desde Open-Meteo. | Lluvia esperada por zona y por día. |
| Pluviómetros y lecturas | Gestión de pluviómetros y carga manual de lecturas. | Lluvia caída por zona. |
| Ranking y mapa | Ranking de prioridad de cosecha según índice, pronóstico y lluvia caída, mostrado en un mapa (Leaflet), con alerta de lotes en riesgo y simulador interactivo de precipitaciones. | Orden sugerido de cosecha, lotes críticos y análisis de escenarios de lluvia. |
| Paradas de fábrica | Registro de paradas con causa y duración, y consulta del historial. | Frecuencia, causas y duración de las paradas. |

### 3.2 Etapas

- **Etapa 1, prototipo:** gestión de lotes, índice de vulnerabilidad, pronóstico, lecturas de pluviómetro, ranking con mapa y registro de paradas.
- **Etapa 2, puesta en marcha piloto:** ajuste de pesos y umbrales con datos reales de una zafra, y validación con el equipo de cosecha.
- **Etapa 3, evolución:** trazado óptimo de rutas, conexión automática con sensores e imágenes satelitales.

### 3.3 Límites del proyecto (fuera de alcance)

- No incluye el trazado óptimo de rutas de cosecha ni de transporte.
- No incluye conexión automática con sensores: las lecturas de pluviómetro se cargan a mano.
- No incluye imágenes satelitales.
- No reemplaza el criterio del jefe de cosecha: el ranking es una recomendación.
- No incluye hardware: se usan los equipos y pluviómetros que el ingenio ya tiene. [confirmar]

## 4. Justificación

### 4.1 ¿Para qué se haría este proyecto?

Para que el orden de cosecha tenga en cuenta qué lotes se anegan más y qué lluvia se espera, y así evitar que la fábrica pare por falta de caña. Hoy esa decisión depende de la experiencia de las personas, y [se supone] no queda un registro que permita aprender de cada zafra.

### 4.2 Problemas que soluciona

- **Paradas de fábrica por falta de caña:** al priorizar los lotes más vulnerables antes de la lluvia, se reduce el riesgo de que el patio se quede sin caña.
- **Decisiones sin datos cruzados:** reúne en un solo lugar la vulnerabilidad del lote, el pronóstico y la lluvia caída.
- **Falta de registro de paradas:** deja una base de datos con causa y duración para medir el impacto de la lluvia.
- **Conocimiento concentrado en pocas personas:** la experiencia sobre qué lotes se anegan queda asentada en el sistema.

### 4.3 Aporte

El proyecto aporta al ingenio una herramienta de bajo costo, con datos abiertos y tecnología web, que se integra a su operación sin cambiar sus procesos de fondo. Para el trabajo de campo, resuelve un problema real de la agroindustria azucarera con una solución tecnológica concreta.

### 4.4 Aceptación y futuro uso

- **Jefe de cosecha y planificadores:** la aceptación depende de que el ranking resulte coherente con su experiencia. Debe validarse comparando las recomendaciones con sus decisiones reales. [confirmar en entrevista]
- **Operadores de campo:** se prevé aceptación si la carga de lecturas es simple y rápida. [confirmar quién toma las lecturas hoy]
- **Fábrica:** el registro de paradas puede interesar a quienes analizan la eficiencia de la zafra. [confirmar]
- **Futuro uso:** escalable a otros lotes y zonas, y ampliable con rutas, sensores e imágenes satelitales.

## 5. Análisis costo/beneficio

### 5.1 Costos

| Tipo | Costo | Observaciones |
|---|---|---|
| Tangible | Desarrollo del prototipo y del sistema | Horas del equipo del trabajo de campo (aporte académico, sin costo para el ingenio en la etapa prototipo). |
| Tangible | Infraestructura en la nube | Firebase, Render y alojamiento del frontend en planes gratuitos o de bajo costo, a estimar según el volumen de uso. |
| Tangible | Dispositivos | A cargo del ingenio; puede usarse equipamiento existente. [confirmar] |
| Tangible | Soporte y mantenimiento posterior | Período gratuito acordado y soporte posterior a definir entre las partes. |
| Intangible | Curva de aprendizaje | Tiempo de adaptación del personal de cosecha y de campo. |
| Intangible | Resistencia al cambio | Posible desconfianza hacia una recomendación automática frente a la experiencia propia. |
| Intangible | Calidad de los datos | El ranking es tan bueno como los atributos de lote y las lecturas cargadas. |

### 5.2 Beneficios

| Tipo | Beneficio | Cómo se mide |
|---|---|---|
| Tangible | Menos paradas de fábrica por falta de caña | Cantidad y horas de paradas por lluvia por zafra. |
| Tangible | Menos caña perdida o cosechada fuera de tiempo por lotes anegados | Lotes que quedaron inaccesibles con caña en pie. [definir indicador con el ingenio] |
| Tangible | Menos tiempo de planificación en días de lluvia | Tiempo que lleva definir el orden de cosecha. |
| Intangible | Decisiones basadas en datos | Ranking y registros disponibles para la jefatura. |
| Intangible | Conocimiento del terreno asentado en el sistema | Atributos e historial de anegamientos por lote. |
| Intangible | Base para rutas, sensores e imágenes satelitales | Datos estructurados y ordenados por lote. |
