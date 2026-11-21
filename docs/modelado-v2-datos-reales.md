# Modelado v2 (datos reales): PluviaZafra

Base: entrevistas del 19/11/2026 (técnico agrícola y Pedro, jefe de fábrica). Entrega: **2/12**.

## 1. Reformulación del problema

- **Objetivo:** priorizar lotes para **sostener la llegada continua de caña a fábrica** (7.000–7.500 t/día, 312,5 t/h). Ya no se habla de "frentes de cosecha".
- **Problema real de acceso:** no son los caminos (están bien). El problema es el **piso/drenaje**: la máquina se hunde dentro del lote.
- **Usuario decisor:** Agrotecnia / jefe de cosecha. Los jefes de lote solo reportan datos.

## 2. Cambios respecto al modelo anterior

| Antes | Ahora |
|---|---|
| Camino de acceso | **Clase de drenaje**: bien / medianamente / imperfectamente drenado |
| Distancia supuesta | **DIST ILE real**: Cercana (1–6 km), Media (7–12 km), Lejana (13–19 km) |
| Ranking por vulnerabilidad + pronóstico | Filtro por Brix y Piso, luego ranking por distancia, variedad, soca y drenaje |
| Pronóstico decide | Pronóstico solo como **alerta**. Decide la lluvia acumulada del pluviómetro y el drenaje |
| Frente de cosecha | Eliminado (era división administrativa) |
| Sin orgánico | `Tipo` (Convencional vs. Organico Full/NOP) y modo "Prioridad Orgánica" |
| Roles de operador | Roles: Equipo Técnico, Jefe de Lote, Fábrica |

## 3. Análisis de la base real `ZAFRA 2025 (1).xlsx`

La hoja `inv2025_ile_oficial` tiene 223 filas con datos. De ellas, 2 están vacías (`3102032` y `0000000`) y 2 están repetidas (`3202211` Largas B y `3301612` Monte Represa). Quedan **219 lotes únicos**. Corrección: antes se habían contado 223.

- **Fincas (lotes únicos):**
  - San Antonio (340): 63 lotes
  - Miraflores (330): 56 lotes
  - El Quemado (310): 47 lotes, cruza la Ruta 34
  - Parapeti (320): 41 lotes, la más cercana al ingenio
  - Meguida (350): 12 potreros, todos "Monte" y sin distancia
- **Áreas:**
  - Superficie bruta total (`AREA_B`): **18.290,84 ha**
  - Superficie neta total (`AREA_N`): **9.232,90 ha**, pero **65 lotes no tienen área neta**, así que ese total es parcial
- **Tipos de cultivo:** Convencional 109, Orgánico Full 107, Orgánico NOP 3.
- **Distancia a ILE (`DIST ILE`, 1 a 19 km):** 206 lotes la tienen y 13 no.
  - Cercana (1 a 6 km): 62 lotes
  - Media (7 a 12 km): 88 lotes
  - Lejana (13 a 19 km): 56 lotes
- **Variedades más frecuentes:** `LCP 85-384` (65), `TUC 03-12` (31), `CP 65-350` (12), `TUC 06-7` (11), `NA 97-3152` (6). La época de maduración de cada variedad **no viene en el inventario** y hay que pedirla al ingenio.
- **Estados mezclados en la columna `VARIEDAD`:** `Descepe 2024` (22), `Monte` (12), `Vacío` (13), `Varias` (11) y 19 celdas vacías. No son variedades, son estados del lote.
- **Año de plantación (`PLANT`):** años 2011 a 2025. La **soca (cantidad de cortes) no viene en el inventario** y la carga el Equipo Técnico. No se calcula con `PLANT`, porque un lote replantado reinicia el conteo.
- **Lotes críticos por drenaje:** son los lotes Ciénaga (`2441`, Miraflores) y Potrero Vacunos (`9901`, San Antonio). Las fincas más problemáticas son Miraflores y San Antonio.

## 3. Entidades (colecciones Firestore)

### `fincas`
`nombre`, `zona_distancia` (lejana | intermedia | cercana), `km_a_fabrica`, `cruza_ruta_34` (bool; solo El Quemado), `critica_drenaje` (bool; Miraflores y San Antonio), `pluviometro_id`.

### `lotes`
| Campo | Detalle |
|---|---|
| `finca_id` | Referencia a la finca |
| `area_bruta_ha`, `area_neta_ha` | El área neta la confirma el técnico (puede calcularse sumando la base 2025) |
| `variedad`, `ciclo_variedad` | temprana / intermedia / tardía |
| `fecha_siembra` | Define la edad |
| `soca` | 0 = caña planta, 1..n = cortes |
| `tipo_cultivo` | convencional / orgánico |
| `drenaje` | bien / medio / imperfecto |
| `brix_actual`, `brix_fecha` | Última lectura |
| `estado_piso` | transitable / no_transitable, más fecha |
| `geometria` | Opcional, para el mapa |

### `pluviometros` (16–17, manuales y fijos)
`codigo`, `finca_id`, `ubicacion`, `jefe_lote_responsable`.

### `lecturas_lluvia`
`pluviometro_id`, `fecha`, `mm`, `cargado_por`. Una lectura por día, cargada por el jefe de lote.

### `estado_piso` (registro diario)
`lote_id`, `fecha`, `transitable` (bool), `observacion`, `cargado_por`.

### `lecturas_brix`
`lote_id`, `fecha`, `brix`, `cargado_por`.

### `inaccesibilidad` (historial)
`lote_id`, `fecha_inicio`, `fecha_fin`, `dias`, `lluvia_acumulada_previa_mm`. Sirve para calibrar el riesgo de piso. **Confirmar si hoy se registra formalmente.**

### `paradas_fabrica`
`inicio`, `fin`, `duracion_h`, `causa` (lluvia | falta_caña | rotura | otra), `costo_estimado` (opcional).

### `patio` (estado de abastecimiento)
`fecha_hora`, `carros_en_patio`, `horas_cobertura`.

### `parametros` (configurable)
`brix_minimo` = 8 (confirmado), `pesos_prioridad`, `molienda_t_h` = 312,5, `umbral_cobertura_h` = 3, `umbral_reinicio_carros` = 30, `toneladas_netas_por_carro` = 28, `umbral_alerta_pronostico` = 70 %, `dias_lluvia_ventana`.

### `usuarios`
Roles: `equipo_tecnico`, `jefe_lote`, `fabrica`.

## 4. Reglas de cálculo

**1. Habilitación (filtro).** Un lote es cosechable si `brix >= brix_minimo` y `estado_piso = transitable`.

**2. Índice de prioridad.** Puntaje ponderado con pesos ajustables.
- Distancia: lejana > intermedia > cercana.
- Variedad: temprana primero, y más urgencia si está pasada de fecha (una temprana sin cortar se seca).
- Soca y edad.
- Orgánico: si el modo orgánico está activo, sube al tope.

**3. Riesgo de piso.** Entradas: lluvia acumulada de los últimos N días (pluviómetro de la finca) y clase de drenaje. Salida: `transitable`, `en_riesgo` o `no_transitable`, con los días estimados hasta ser transitable. Se calibra con `inaccesibilidad`.
- No existe un umbral fijo de mm. Empezar con una tabla por drenaje y ajustar con el historial.
- El pronóstico externo solo genera una alerta preventiva.

**4. Lotes de reserva.** Mantener identificados lotes maduros y bien drenados. Si se anuncia lluvia, adelantar los maduros mal drenados.

**5. Monitor de abastecimiento.** `horas_cobertura = carros * (t_por_carro) / 312,5`. Alertar si es menor a 3 h, o si hay menos de 30 carros tras una parada.

**6. Indicadores.** Horas de parada por falta de caña, toneladas sin cosechar, cumplimiento del plan (988.900 de 1.024.000 t en 2026), costo/hora de parada (obreros × salario/hora).

## 5. Datos reales disponibles (zafra 2026)

~30.000 ha brutas, 180 días de zafra, 12 días de parada por lluvia (2 × 6), 4–6 paradas por falta de caña al final. Pluviómetros: 16–17.

## 7. Pendientes y estado de confirmación

Ver la lista consolidada y actualizada en [valores-a-confirmar-v2.md](valores-a-confirmar-v2.md).
