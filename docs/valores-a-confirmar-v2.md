# PluviaZafra: Valores confirmados y preguntas pendientes para el experto (v2 unificado)

Documento de control alineado con el [modelo de casos de uso unificado (`CU01`–`CU23`)](casos-de-uso-v2.md).

---

## 1. Valores ya confirmados (listos para el modelo)

| # | Parámetro / Decisión | Valor confirmado | Casos de uso donde impacta |
|---|---|---|---|
| **1** | **Zonas de distancia (`DIST ILE`)** | **Cercana:** 1–6 km (63 lotes) · **Media/Intermedia:** 7–12 km (89 lotes) · **Lejana:** 13–19 km (56 lotes) | `CU03`, `CU04`, `CU13` |
| **2** | **Superficie del inventario 2025** | **18.386,42 ha brutas** (`AREA_B`) y **9.307,40 ha netas** (`AREA_N`) en 221 filas útiles | `CU04`, `CU05`, `CU20` |
| **3** | **Brix mínimo de corte** | **8 °Bx** para habilitar cosecha (cerró la zafra cerca de **10,31 °Bx**) | `CU03`, `CU10`, `CU13`, `CU21` |
| **4** | **Categorías de madurez y relación con la distancia** | **Temprana**, **Media (Intermedia)** y **Tardía**. En los lotes **lejanos (13–19 km)** se usa **madurez temprana**, en los **intermedios (7–12 km) media** y en los **cercanos (1–6 km) tardía** | `CU03`, `CU06`, `CU13` |
| **5** | **Suelos mal drenados** | **Foco prioritario:** si están maduros y se anuncia lluvia, se adelanta su corte antes de que pierdan piso | `CU12`, `CU13`, `CU21` |
| **6** | **Historial de días sin piso** | **Hoy no se registra formalmente.** El sistema empieza a construirlo a partir de los períodos *Inhabilitado → Habilitado* | `CU09`, `CU12`, `CU20` |
| **7** | **Umbral de alerta de pronóstico** | **70 % de probabilidad** para tomar precauciones y emitir alerta temprana | `CU03`, `CU11`, `CU18` |
| **8** | **Carga por carro y merma (no caña)** | **30 t brutas por carro**, con **2 % a 14 % de merma** (14 % post-lluvia) → **28 t netas promedio** (25,8 t post-lluvia) | `CU03`, `CU17`, `CU22` |
| **9** | **Colchón en patio para reanudar** | **30 carros en patio** (~2,7 h de molienda asegurada a **312,5 t/h** mientras siguen entrando camiones con ciclo de ~1 h) | `CU03`, `CU17`, `CU18`, `CU19`, `CU22` |
| **10** | **Lotes sin datos en la planilla** | Son **lotes en preparación** para funcionar próximamente como cañeros (*"227"* en el audio era el año **2027**) | `CU04`, `CU05`, `CU13` |
| **11** | **Costo estimado de hora de parada** | Salario mensual **1.250 USD (±20 %)** × **200 a 300 obreros** ÷ 200 h/mes = **1.000 a 2.250 USD/h** (central: **1.563 USD/h**) | `CU03`, `CU19`, `CU20` |

---

## 2. Datos que falta confirmar con el experto (Técnico Agrícola / Fábrica)

### A. Agronómicos y de priorización (para `CU04`, `CU06`, `CU12`, `CU13`, `CU21`)

1. **Época de maduración de las variedades de la planilla (`CU06`):**
   Confirmar si cada variedad del inventario 2025 es **Temprana**, **Media** o **Tardía** (las primeras 5 cubren el 90 % de los lotes con variedad única):
   - `LCP 85-384` (65 lotes)
   - `TUC 03-12` (31 lotes)
   - `TUC 06-7` (12 lotes)
   - `CP 65-350` (12 lotes)
   - `NA 97-3152` / `CP 97-3152` (7 lotes)
   - Otras con 1 a 3 lotes: `NA 78-639` (3), `NA 05-860` (3), `NA 03-3300` (2), `NA 02-514` (1), `NA 96-2929` (1), `NA 76-128` (1), `NA 90-1001` (1), `TUC 97-8` (1), `TUC 95-10` (1), `TUC 95-37` (1), `TUC 02-22` (1).
2. **Clasificación inicial de drenaje por finca o sector (`CU04`):**
   La planilla no trae la columna de drenaje. Sabemos que **Miraflores** (ej. lote *Ciénaga*) y **San Antonio** (ej. *Potrero Vacunos*) tienen los sectores más críticos, pero necesitamos una regla o listado rápido por finca/sector para asignar **Bien drenado**, **Medianamente drenado** o **Imperfectamente drenado** a los lotes de la base 2025.
3. **Umbrales de lluvia acumulada y días estimados sin piso (`CU03` / `CU12`):**
   Como no hay registro histórico, validar esta tabla inicial propuesta para arrancar el sistema:
   - **Ventana de lluvia acumulada a mirar hacia atrás:** ¿**3 días** (72 h) es adecuado?
   - **Días estimados sin poder entrar según lluvia acumulada y drenaje:**

     | Tipo de drenaje | Lluvia moderada (ej. 15–35 mm en 3 días) | Lluvia fuerte o varios días seguidos (ej. > 35–40 mm) |
     |---|---|---|
     | **Bien drenado** | 0 días (Habilitado) | 1 día |
     | **Medianamente drenado** | 1 día | 2 a 3 días |
     | **Imperfectamente drenado** | 2 días | 4 días o más *(caso Ciénaga)* |

4. **Cómo pesa la Soca / Edad en la prioridad (`CU04` / `CU13`):**
   - Confirmar que la cantidad de cortes se calcula como `Año de campaña - PLANT` (`PLANT = 2024` es Caña Planta en 2025).
   - Confirmar si a igualdad de distancia y variedad se prioriza cortar antes las **socas más viejas** (por ejemplo, plantaciones de 2011–2017 o próximas a descepe) o las **más jóvenes** (mayor rendimiento).
5. **Rendimiento promedio estimado en toneladas por hectárea neta (`CU13` / `CU21`):**
   La planilla trae `AREA_N` (ha netas), pero no las toneladas estimadas de cada lote. ¿Qué rendimiento promedio (ej. **70 a 85 t/ha neta**) usamos como base para estimar cuántas toneladas y cuántas horas de molienda aporta un lote de reserva?
6. **Cobertura mínima deseada en Lotes de Reserva (`CU21`):**
   ¿Cuántas horas o días de molienda quieren tener siempre cubiertos con lotes de reserva bien drenados (nuestra propuesta: **al menos 1 día de molienda = ~7.500 t**)?

### B. Red de pluviómetros (para `CU07` / `CU08`)

7. **Distribución de los 16–17 pluviómetros en las 5 fincas:**
   ¿Cuántos pluviómetros hay en cada finca (*El Quemado*, *Parapeti*, *Miraflores*, *San Antonio*, *Meguida*) y cómo los identifican (por nombre o número) para asignarlos a los lotes?

### C. Dudas puntuales de la planilla `ZAFRA 2025` (para `CU04` / `CU05`)

8. **Lotes que dicen `"Varias"` en la columna `VARIEDAD` (11 lotes, incluido *Ciénaga* `3302441`):**
   ¿Qué época de maduración (*Temprana*, *Media* o *Tardía*) se les asigna para el ranking si no se tiene el desglose por variedad?
9. **Lotes con `"Descepe 2024"` pero año `PLANT = 2025` (*Ceibal Goteo* `3303180` y *Sahara Goteo* `3303144` en Miraflores):**
   ¿Ya están replantados y en producción (y con qué variedad), o siguen en preparación?
10. **Finca Meguida (`ID_FINCA = 350`, 12 potreros `"Monte"` sin `DIST ILE`):**
    ¿Son campos en preparación para desmontar/plantar a futuro o quedan fuera del sistema?
