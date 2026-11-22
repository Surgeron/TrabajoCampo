# Prototipo v2 – Análisis, diseño y trazabilidad

Sistema de priorización de cosecha según vulnerabilidad pluvial · Ingenio La Esperanza (Jujuy).

Base funcional: documento **Solución tecnológica v3** (21/11/2026): alcance del prototipo, actores, parámetros, 23 casos de uso, 10 KPI, DER de 15 entidades y mapa de navegación de 36 pantallas. Base técnica: repositorio **v1** (`Surgeron/trabajocampo`). Esta versión reemplaza a los documentos “NexoZafra v2” de la carpeta `docs` del repositorio: donde no coinciden, manda el documento v3.

---

## 1. Tecnologías

| Capa | Ya estaba en la v1 | Agregado en la v2 (autorizado) |
|---|---|---|
| Front end | React 18.3 + Vite 5.4, oxlint, gh-pages, Firebase JS SDK 13.2 | Tailwind CSS 4 (`@tailwindcss/vite`), React Router 6 (`HashRouter`), Recharts 2, Leaflet 1.9 + react-leaflet 4.2, SheetJS (xlsx 0.20.3) y jsPDF |
| Back end | Python + FastAPI + uvicorn + firebase-admin (pandas en requirements) | Ninguna dependencia nueva: el pronóstico usa `urllib` y la tarea horaria usa `asyncio` |
| Datos y acceso | Firebase (Firestore) | Firebase Auth para el inicio de sesión |
| Servicio externo | — | Open-Meteo (pronóstico gratuito, sin clave) |

No se cambió ninguna versión existente. `pandas` sigue en `requirements.txt` aunque la v2 no lo usa.

## 2. Actores y roles

| Actor (documento) | Rol en el sistema | Casos de uso en el prototipo |
|---|---|---|
| Equipo técnico agrícola (Agrotecnia) | `tecnico` | CU04, CU09, CU10, CU11, CU13, CU14, CU16, CU20, CU21, CU22, CU23 (y la vista de CU03) |
| Jefe de lote | `jefe_lote` | CU08, CU09 |
| Personal de báscula | `bascula` | CU17 |
| Fábrica | `fabrica` | CU18 (recibe), CU19, CU20, CU22 |
| Servicio de pronóstico (externo) | Open-Meteo, consultado por el back end | CU11 |
| Administrador | Fuera del prototipo | CU02, CU03 |

Todos heredan de “Usuario” e inician sesión (CU01). El rol se guarda en la colección `usuarios` (documento con id = uid de Firebase Auth).

## 3. Alcance implementado

- **Implementados (17):** CU01, CU04, CU08 a CU14, CU16 a CU23.
- **Solo datos (2):** CU03 (parámetros precargados, pantalla de solo lectura T19) y CU07 (pluviómetros precargados y asignados a los lotes).
- **No implementados (4):** CU02, CU05 (reemplazado por el script de carga inicial), CU06 (la madurez sale de la zona) y CU15 (el pedido orgánico se simula en CU23).

## 4. Requerimientos funcionales

| RF | Descripción | CU |
|---|---|---|
| RF01 | Iniciar sesión con correo y contraseña; abrir el inicio del rol; rechazar usuarios sin rol o desactivados | CU01 |
| RF02 | Listar lotes con filtros por finca, tipo de cultivo, zona, drenaje y estado; ver la ficha | CU04 |
| RF03 | Editar datos del lote y de la campaña; calcular zona y madurez por km al ingenio | CU04 |
| RF04 | Registrar la lectura diaria de un pluviómetro; avisar si ya existe y permitir corregirla; guardar sin señal y enviar al volver | CU08 |
| RF05 | Registrar el estado de piso; abrir y cerrar períodos sin piso con sus días | CU09 |
| RF06 | Registrar mediciones de Brix; habilitar por madurez desde 8 °Bx | CU10 |
| RF07 | Consultar el pronóstico por finca y día cada 1 hora, a pedido y con carga manual que prevalece | CU11 |
| RF08 | Calcular el riesgo de cada lote con su justificación, sin guardarlo | CU12 |
| RF09 | Calcular y mostrar el ranking de cosecha, los lotes en cosecha aparte y los excluidos con su motivo; exportarlo | CU13 |
| RF10 | Mostrar los lotes en un mapa coloreado por riesgo, piso o zona, con la reserva marcada | CU14 |
| RF11 | Registrar cosecha diaria y lote terminado | CU16 |
| RF12 | Registrar carros en patio y calcular toneladas netas y horas de molienda | CU17 |
| RF13 | Emitir alertas a Fábrica por lluvia y por colchón bajo; marcarlas como vistas | CU18 |
| RF14 | Registrar paradas (en curso o pasadas), cerrarlas y calcular costo y alerta previa | CU19 |
| RF15 | Panel gerencial con 4 tarjetas y 6 gráficos, filtros y exportación a PDF; 6 informes exportables a PDF y Excel | CU20 |
| RF16 | Proponer, marcar y quitar lotes de reserva; sacar los que dejan de cumplir; sugerir adelantar mal drenados | CU21 |
| RF17 | Tablero de abastecimiento en tiempo real | CU22 |
| RF18 | Simular lluvia por finca y pedido orgánico sin modificar datos | CU23 |
| RF19 | Consultar los parámetros vigentes (solo lectura) | CU03 |

## 5. Requerimientos no funcionales

| RNF | Cómo se cumple |
|---|---|
| Seguridad | Token de Firebase verificado en cada pedido; acceso por rol en cada endpoint; Firestore solo permite leer alertas y registros de patio a usuarios autenticados; credenciales y claves fuera del repositorio |
| Integridad | Todas las escrituras pasan por el back end, que aplica validaciones y reglas en un solo lugar |
| Usabilidad | Interfaz en español rioplatense, mensajes de error claros por campo, estados de carga y vacío, confirmación antes de terminar un lote |
| Adaptabilidad | Celular (barra inferior con accesos del rol), tablet, computadora (barra lateral) y TV (letra 125 % desde 1.792 px y navegación con flechas del control remoto) |
| Accesibilidad | Etiquetas asociadas, foco visible, colores de estado siempre con ícono y texto, avisos anunciados a lectores de pantalla, movimiento reducido |
| Disponibilidad | Si el servicio de pronóstico no responde se conserva el último; la lectura de lluvia se guarda en el celular sin señal |
| Rendimiento | Caché de 30 minutos sobre Firestore, invalidada al instante en cada escritura, para no superar el plan gratuito |
| Mantenibilidad | Capas separadas (rutas → servicios → dominio → repositorio); reglas puras con pruebas automáticas; parámetros en la base, no en el código |
| Despliegue | Front end en GitHub Pages (`npm run deploy`, `HashRouter`); back end en cualquier servicio con Python (la v1 usaba Render) |

## 6. Reglas de negocio

| RN | Regla | Origen | Dónde está |
|---|---|---|---|
| RN01 | Zona por km al ingenio: cercana 1–6 (Tardía), media 7–12 (Media), lejana 13–19 (Temprana); sin distancia, sin zona | Doc. §3, CU04 | `domain/zonas.py` |
| RN02 | Estado del lote: En producción o En preparación; vacíos o sin variedad quedan en preparación con la leyenda en observaciones | CU04, §7 | `scripts/seed_firestore.py` |
| RN03 | Lote en producción sin drenaje = “datos incompletos” | CU04 | `services/contexto.py` |
| RN04 | Área neta ≤ área bruta; finca + número de lote único | CU04 | `services/lotes.py` |
| RN05 | Una lectura por pluviómetro y fecha; si existe, se corrige y queda quién la corrigió; mm ≥ 0 | CU08 | `services/campo.py` |
| RN06 | Inhabilitado abre un período sin piso; al cambiar de estado se cierra y se calculan los días | CU09 | `domain/riesgo.py` |
| RN07 | Brix ≥ 8 habilita por madurez; Brix positivo | CU10 | `domain/ranking.py`, `services/campo.py` |
| RN08 | Pronóstico por finca y día, un registro que se actualiza; el manual prevalece ese día | CU11 | `services/pronostico.py` |
| RN09 | Riesgo (propuesta): Alto = imperfecto con ≥ 70 %; Medio = medio con ≥ 70 % o imperfecto con 50–69 %; Bajo el resto | CU12 | `domain/riesgo.py` |
| RN10 | Días sin piso estimados: historial del lote o valor experto por drenaje | CU12 | `domain/riesgo.py` |
| RN11 | Ranking: fuera En preparación, terminados, inhabilitados y < 8 °Bx; primero riesgo Alto, después lejana → media → cercana, y mayor Brix | CU13 | `domain/ranking.py` |
| RN12 | Cosecha: no en lotes En preparación; terminado sale del ranking y de la reserva | CU16 | `services/campo.py` |
| RN13 | Carga neta 28 t (normal) o 25,8 t (post-lluvia); 312,5 t/h; umbral 30 carros = 840 t ≈ 2,7 h | CU17 | `domain/patio.py` |
| RN14 | Alerta de lluvia: ≥ 70 % en finca con cosecha en curso, una por finca y día previsto, se actualiza | CU18 | `services/alertas.py` |
| RN15 | Alerta de colchón: < 30 carros, una abierta a la vez, se cierra con ≥ 30 | CU18 | `services/alertas.py` |
| RN16 | Parada: fin posterior al inicio, sin superposición; costo 1.000 / 1.563 / 2.250 USD por hora | CU19 | `domain/paradas.py` |
| RN17 | Reserva: en producción, sin terminar, ≥ 8 °Bx, bien drenado, habilitado, zona cercana o media; sale si deja de cumplir | CU21 | `domain/reserva.py` |
| RN18 | Con alerta ≥ 70 % vigente, sugerir adelantar los mal drenados maduros de esas fincas | CU21 | `domain/reserva.py` |
| RN19 | La simulación no modifica datos ni se guarda | CU23 | `services/priorizacion.py` |

## 7. Entidades (DER v3 → colecciones de Firestore)

| Entidad | Colección | Id del documento |
|---|---|---|
| Usuario | `usuarios` | uid de Firebase Auth |
| Finca | `fincas` | id de finca (310 … 350) |
| Lote | `lotes` | ID_UNICO |
| Campania | `campanias` | año (`2026`) |
| Lote_campania | `lotes_campania` | `<campaña>_<ID_UNICO>` |
| Pluviometro | `pluviometros` | `PLV-01` … `PLV-16` |
| Lectura_pluviometro | `lecturas_pluviometro` | `<pluviómetro>_<fecha>` (garantiza una por día) |
| Pronostico | `pronosticos` | `<finca>_<fecha>` |
| Estado_piso | `estados_piso` | automático |
| Medicion_brix | `mediciones_brix` | automático |
| Registro_cosecha | `registros_cosecha` | automático |
| Parametro | `parametros` | `<campaña>_<clave>` |
| Registro_patio | `registros_patio` | automático |
| Alerta | `alertas` | `lluvia_<finca>_<fecha>` o automático (colchón) |
| Parada_fabrica | `paradas_fabrica` | automático |

**Campos agregados al DER** (necesarios para lo que piden los casos de uso; ninguno cambia una regla):

- Lote: `latitud`, `longitud`, `poligono` (ubicación aproximada), `ubicacion_aproximada`, `drenaje_dato_prueba`.
- Lote_campania: `id_usuario_reserva`, `fecha_baja_reserva`, `motivo_baja_reserva` (aviso de CU21).
- Lectura_pluviometro: `id_finca`, `mm_anterior`, `fecha_hora_correccion`, `id_usuario_correccion` (quién corrigió, CU08).
- Alerta: `finca`, `prob_lluvia_pct`, `mm_previstos`, `cantidad_carros`, `horas_cobertura`, `t_netas`, `lotes_en_cosecha`, `lotes_reserva`, `lotes_adelantar`, `fecha_hora_vista`, `fecha_hora_actualizacion`, `fecha_hora_cierre` (CU18 pide guardar esos datos y cerrar la alerta de colchón).
- Parametro: `unidad`, `descripcion`, `estado` (Confirmado / A confirmar), `usado_en`.
- Registros: `usuario_nombre` (copia del nombre para mostrar sin otra lectura) y `fecha_hora_carga`.
- Finca: `referencia`, `cruza_ruta_34`, `critica_drenaje`, `ubicacion_aproximada`.

## 8. Validaciones

| Formulario | En el front end (al escribir y al enviar) | En el back end |
|---|---|---|
| Iniciar sesión | Correo obligatorio y con formato; contraseña obligatoria | Token válido, usuario con rol y activo |
| Editar lote | Obligatorios, largos máximos, áreas > 0, neta ≤ bruta, km 0–100, año 1950–campaña, cortes 0–30, certificación si es orgánico, variedad si está en producción | Lo mismo + número de lote único en la finca, pluviómetro existente, campos permitidos |
| Lectura de pluviómetro | Pluviómetro, fecha no futura, mm 0–500 | Lo mismo + una lectura por pluviómetro y día (409 con la existente) |
| Estado de piso | Lote, estado de la lista, observación ≤ 300 | Lo mismo + lote existente |
| Brix | Lote, fecha no futura, Brix > 0 y ≤ 30, origen de la lista | Lo mismo |
| Cosecha | Lote, fecha no futura y desde el inicio de la campaña, toneladas > 0; confirmación al terminar | Lo mismo + no En preparación, no terminado |
| Pronóstico manual | Finca, fecha de hoy a 15 días, probabilidad 0–100, mm 0–500 | Lo mismo |
| Simulación | Finca sin repetir, mm > 0 y ≤ 500, al menos un supuesto | Lo mismo, máximo 5 fincas |
| Carros en patio | Entero 0–1000, condición de la lista | Lo mismo |
| Parada | Inicio no futuro, causa de la lista, fin > inicio y no futuro, observación ≤ 500 | Lo mismo + sin superposición y una sola abierta |
| Filtros de panel e informes | Desde ≤ hasta | Lo mismo + finca y zona existentes |

Respuestas HTTP: 200/201 éxito; 401 sin sesión; 403 rol sin acceso o usuario desactivado; 404 no existe; 409 conflicto de negocio (duplicado, superposición, lote terminado); 422 datos inválidos (con mensaje por campo); 502 el servicio de pronóstico no responde.

## 9. Arquitectura

```
Front end (React)                         Back end (FastAPI)                         Firebase
─────────────────                         ──────────────────                         ────────
pages/  pantallas por rol      HTTP+JWT   main.py      errores → HTTP                Auth
components/  piezas comunes   ───────────▶ routers/api.py  rutas finas + rol          Firestore
services/api.js  cliente                   auth.py     token + rol                      ▲
services/tiempoReal.js ◀── onSnapshot ──── schemas.py  validación de entrada            │
                         (solo lectura)    services/   casos de uso                     │
                                           domain/     reglas puras (probadas)          │
                                           repositories/ Firestore + caché ─────────────┘
                                           scheduler.py  pronóstico cada 1 h ──▶ Open-Meteo
```

## 10. Matriz de trazabilidad

| CU | Funcionalidad | Pantalla | Componentes | Endpoint | Servicio / regla |
|---|---|---|---|---|---|
| CU01 | Iniciar sesión por rol | P01 | `Login`, `AuthContext`, `RutaProtegida` | `GET /api/me` | `auth.py` |
| CU03 | Ver parámetros | T19 | `Parametros` | `GET /api/parametros` | `lotes.listar_parametros` |
| CU04 | Listar, ver y editar lotes | T06, T03, T07 | `Lotes`, `FichaLote`, `EditarLote` | `GET /api/fincas`, `GET /api/lotes`, `GET/PUT /api/lotes/{id}` | `lotes.py`, `zonas.py` |
| CU07 | Pluviómetros (datos) | J02, T07 | `Lectura`, `EditarLote` | `GET /api/pluviometros` | `lotes.listar_pluviometros` |
| CU08 | Lectura de pluviómetro | J02, J04, J01 | `Lectura`, `MisRegistros`, `colaSinConexion` | `POST/GET /api/lecturas`, `PUT /api/lecturas/{id}` | `campo.registrar_lectura` |
| CU09 | Estado de piso | T08 = J03 | `EstadoPiso`, `BuscadorLote` | `POST/GET /api/estados-piso` | `campo.registrar_estado_piso`, `riesgo.periodos_sin_piso` |
| CU10 | Medición de Brix | T09 | `Brix`, `BuscadorLote` | `POST /api/brix` | `campo.registrar_brix` |
| CU11 | Pronóstico | T11, T12 | `Pronostico`, `PronosticoManual` | `GET /api/pronosticos`, `POST /api/pronosticos/actualizar`, `PUT /api/pronosticos` | `pronostico.py`, `scheduler.py` |
| CU12 | Riesgo | T02, T03, T04 | `InsigniaRiesgo` | (incluido en lotes y ranking) | `riesgo.py`, `contexto.riesgo_de` |
| CU13 | Ranking | T02, T01 | `Ranking` | `GET /api/ranking` | `ranking.calcular` |
| CU14 | Mapa | T04 | `Mapa`, `MapaLotes` | `GET /api/lotes` | — |
| CU16 | Cosecha | T10 | `Cosecha` | `POST/GET /api/cosechas` | `campo.registrar_cosecha` |
| CU17 | Carros en patio | B02, B03, B01 | `RegistrarCarros`, `HistorialPatio`, `Colchon` | `POST/GET /api/patio` | `patio.registrar`, `domain/patio.py` |
| CU18 | Alertas a Fábrica | F01, F02, F03, T01 | `TarjetaAlerta`, `Alertas`, `DetalleAlerta` | `GET /api/alertas`, `GET /api/alertas/{id}`, `PUT /api/alertas/{id}/vista` | `alertas.py` |
| CU19 | Paradas | F04, F05 | `Paradas`, `FormParada` | `GET/POST /api/paradas`, `GET /api/paradas/{id}`, `PUT /api/paradas/{id}/cerrar` | `paradas.py` |
| CU20 | Panel e informes | T16 = F07, T17 = F08, T18 = F09 | `Panel`, `Graficos`, `Informes`, `VistaInforme`, `exportar.js` | `GET /api/panel`, `GET /api/informes`, `GET /api/informes/{tipo}` | `gerencia.py` |
| CU21 | Lotes de reserva | T05, T01 | `Reserva` | `GET /api/reserva`, `PUT /api/reserva/{id}` | `priorizacion.vista_reserva`, `reserva.py` |
| CU22 | Abastecimiento de patio | T13 = F06 | `Abastecimiento`, `Colchon`, `tiempoReal.js` | `GET /api/abastecimiento` | `patio.tablero` |
| CU23 | Simular escenarios | T14, T15 | `Simulador`, `ResultadoSimulacion` | `POST /api/simulaciones` | `priorizacion.simular` |

Las 36 pantallas del mapa de navegación están en `src/config/navegacion.js` y `src/App.jsx` (P01, T01–T19, J01–J04, B01–B03, F01–F09).

## 11. Decisiones tomadas al programar (para confirmar con el ingenio)

Ninguna cambia una regla del documento; completan lo que el documento deja abierto.

1. **Horizonte del pronóstico:** cuentan hoy y los 2 días siguientes (`horizonte_pronostico_dias = 3`, a confirmar). Se usa la mayor probabilidad de ese período.
2. **Lluvia acumulada:** suma de las lecturas de los últimos 3 días del pluviómetro del lote (`ventana_lluvia_dias`, a confirmar).
3. **Lote sin medición de Brix:** no entra al ranking (motivo “Sin medición de Brix”). En la carga inicial cada lote en producción tiene una medición de prueba.
4. **Lote sin registros de piso:** se toma como Habilitado.
5. **Período sin piso:** dura lo que dura el estado Inhabilitado; se cierra con el siguiente registro (Habilitado o Con restricciones).
6. **Lotes en cosecha:** se muestran arriba y aparte, sin número de posición.
7. **Simulación de lluvia:** se suma a la lluvia real acumulada y se traduce a días sin piso con una tabla de prueba (menos de 15 mm: 0 días; 15 a 35 mm: 0/1/2; más de 35 mm: 1/3/4 según drenaje bien/medio/imperfecto). Para esa finca se toma 100 % de probabilidad.
8. **Pedido orgánico simulado:** los orgánicos van primero sin respetar el orden de zona, pero siguen excluidos si están inhabilitados o con menos de 8 °Bx.
9. **Reserva:** además de las tres causas del documento, un lote sale si deja de cumplir otra condición (por ejemplo, se cambió su drenaje).
10. **Alerta de lluvia:** se crea para los días del horizonte; después se actualiza con cada pronóstico aunque baje de 70 %. “Vigente” = fecha prevista de hoy en adelante y ≥ 70 %.
11. **Alerta previa de una parada por lluvia:** alertas emitidas en las 72 horas anteriores al inicio.
12. **Lluvia por finca (KPI 8):** promedio de sus pluviómetros; uno sin lectura ese día cuenta 0 mm. **Acierto (KPI 10):** “llovió” = más de 0 mm en la finca ese día.
13. **Caña madura en riesgo (KPI 6):** sin variación semanal, porque el riesgo no se guarda.
14. **Topes técnicos** para evitar errores de tipeo: 500 mm, 30 °Bx, 1000 carros, 100.000 t y pronóstico manual hasta 15 días.
15. **Sin señal (CU08):** como las escrituras pasan por el back end, la lectura queda en una cola del celular y se envía al volver la conexión (el documento proponía el modo sin conexión de Firestore).
16. **Usuarios:** el script de carga puede crear 4 usuarios de prueba; también se pueden crear a mano en la consola, como dice CU01.
17. Se quitó el endpoint `/comandas` de la v1 (pertenecía a otro proyecto).

## 12. Verificación

- **Pruebas automáticas** (`backend/tests`): 14 de reglas puras y 17 de casos de uso con los datos reales de la planilla en un repositorio en memoria. Resultado: 31 de 31 correctas.
- **Prueba de endpoints:** 60 llamadas con los 4 roles (permisos, validaciones 422, conflictos 409, errores 401/403/404). Sin fallas.
- **Compilación del front end** sin errores ni advertencias, y revisión de las pantallas en celular (390 px), tablet (820 px), computadora (1440 px) y TV (1920 px) contra un servidor de prueba con los servicios reales.
- Pendiente de probar en el entorno del equipo: la conexión real con Firebase (Auth, Firestore y reglas), Open-Meteo, los gráficos de Recharts y el mapa de Leaflet, que no se pueden instalar en el entorno donde se programó.
