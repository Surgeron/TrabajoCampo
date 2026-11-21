# PluviaZafra: Casos de uso y permisos por rol (v2 unificado)

Agrupa los **23 casos de uso** de [casos-de-uso-v2.md](casos-de-uso-v2.md) según los **5 actores humanos** definidos en la propuesta unificada con @Jairo. Las especificaciones completas están en [especificaciones-casos-de-uso-v2.md](especificaciones-casos-de-uso-v2.md).

## 1. Principios de acceso

1. **Mínimo privilegio:** cada rol ve y ejecuta solo lo que necesita para su función operativa.
2. **Herencia de `Usuario` y múltiples roles por cuenta:** todos los actores humanos heredan del actor abstracto `Usuario` (`CU01 Iniciar sesión`). Una cuenta puede tener asignado más de un rol si una persona cumple más de una función, sumando los permisos de sus roles.
3. **Trazabilidad completa:** todo registro guarda `id_usuario`, fecha y hora. Los usuarios y lotes no se borran físicamente: se desactivan para conservar el historial.
4. **Alcance por finca para el Jefe de lote:** la zona del Jefe de lote equivale a su finca. Carga lecturas de pluviómetro y estado de piso de su finca.
5. **Verificación de piso compartida:** tanto el **Jefe de lote** como el **Equipo técnico agrícola** (el jefe de cosecha que revisa el lote antes de mover máquinas) pueden registrar el estado de piso (`CU09`).
6. **El sistema recomienda, el Equipo técnico decide:** ningún otro rol modifica el ranking, las variedades, los lotes ni los lotes de reserva.

## 2. Los 5 roles humanos

| Rol | Quiénes son en el ingenio | Dispositivo habitual | Responsabilidad principal en el sistema |
|---|---|---|---|
| **Equipo técnico agrícola (Agrotecnia)** | Gerente agrícola, responsable de logística de cosecha (Javier Tapia en 2026) y técnicos del área | Computadora (reunión matutina) y celular (en campo) | Mantiene fincas, lotes (con tipo de drenaje), variedades y pluviómetros; importa planilla; carga Brix, estado de piso, cosecha y pronóstico manual; consulta ranking, mapa, reserva y patio; activa prioridad orgánica; simula escenarios y genera informes. |
| **Jefe de lote** | Los 5 jefes de lote que recorren el campo | Celular (con soporte offline en campo) | Carga la lectura diaria de los pluviómetros y el estado de piso de los lotes de su finca. |
| **Fábrica** | Jefe de área industrial (Pedro) y supervisores de turno | Computadora en fábrica | Recibe alertas tempranas, monitorea el abastecimiento de patio, registra paradas de fábrica y genera informes. |
| **Personal de báscula** | Personal que recibe y coordina el ingreso de camiones | Computadora en báscula | Registra la cantidad de carros en patio (colchón de caña). |
| **Administrador del sistema** | Persona de sistemas designada por el ingenio | Computadora | Gestiona usuarios y roles (`CU02`) y configura los parámetros de priorización (`CU03`). |

El **Servicio de pronóstico** (Open-Meteo) es un actor secundario externo y no tiene interfaz de usuario.

## 3. Matriz de casos de uso por rol (`CU01` a `CU23`)

`●` ejecuta el caso (actor principal). `○` solo consulta. `–` sin acceso.

| Código | Caso de uso | Origen | Equipo técnico agrícola | Jefe de lote | Fábrica | Personal de báscula | Administrador del sistema |
|---|---|---|:-:|:-:|:-:|:-:|:-:|
| **CU01** | Iniciar sesión | `[TCI]` | ● | ● | ● | ● | ● |
| **CU02** | Gestionar usuarios | `[Sugerencia]` | – | – | – | – | ● |
| **CU03** | Configurar parámetros de priorización | `[Entrevista]` | ○ | – | – | – | ● |
| **CU04** | Gestionar fincas y lotes *(incluye drenaje)* | `[TCI]` | ● | ○ *(su finca)* | – | – | ○ |
| **CU05** | Importar planilla de campaña | `[Sugerencia]` | ● | – | – | – | – |
| **CU06** | Gestionar variedades | `[Entrevista]` | ● | – | – | – | – |
| **CU07** | Gestionar pluviómetros | `[Sugerencia]` | ● | ○ *(los suyos)* | – | – | – |
| **CU08** | Registrar lectura de pluviómetro | `[TCI]` | ○ | ● *(su finca)* | – | – | – |
| **CU09** | Registrar estado de piso | `[TCI]` | ● | ● *(su finca)* | – | – | – |
| **CU10** | Registrar medición de Brix | `[Entrevista]` | ● | – | – | – | – |
| **CU11** | Actualizar pronóstico de lluvia | `[TCI]` | ● *(manual)* | – | ○ | – | – |
| **CU12** | Calcular riesgo de los lotes *(interno)* | `[TCI]` | – | – | – | – | – |
| **CU13** | Consultar ranking de cosecha | `[TCI]` | ● | – | ○ | – | – |
| **CU14** | Consultar mapa de lotes | `[TCI]` | ● | – | ○ | – | – |
| **CU15** | Activar prioridad orgánica | `[Entrevista]` | ● | – | – | – | – |
| **CU16** | Registrar cosecha realizada | `[Sugerencia]` | ● | – | – | – | – |
| **CU17** | Registrar carros en patio | `[Entrevista]` | ○ | – | ○ | ● | – |
| **CU18** | Emitir alerta temprana a Fábrica | `[Entrevista]` | ○ | – | ● *(recibe)* | – | – |
| **CU19** | Registrar parada de fábrica | `[TCI]` | ○ | – | ● | – | – |
| **CU20** | Generar informes | `[TCI]` | ● | – | ● | – | – |
| **CU21** | Gestionar lotes de reserva *(nuestro)* | `[Entrevista]` | ● | – | ○ | – | – |
| **CU22** | Monitorear abastecimiento de patio *(nuestro)* | `[Entrevista]` | ● | – | ● | ○ | – |
| **CU23** | Simular escenarios *(nuestro)* | `[Sugerencia]` | ● | – | – | – | – |

## 4. Detalle por rol y pantallas asociadas

### 4.1 Administrador del sistema
- **Casos de uso:** `CU01`, `CU02`, `CU03`.
- **Pantallas (mapa de navegación):** `A01 Inicio`, `A02 Usuarios`, `A03 Alta/edición de usuario`, `A04 Parámetros`.
- **Alcance:** administra cuentas, asigna uno o más roles y configura los parámetros de la campaña (Brix mínimo = 8, rangos de distancia = 1–6 / 7–12 / 13–19 km, colchón de reinicio = 30 carros / 3 h, probabilidad de alerta = 70 %).

### 4.2 Equipo técnico agrícola (Agrotecnia)
- **Casos de uso:** `CU01`, `CU04`, `CU05`, `CU06`, `CU07`, `CU09`, `CU10`, `CU11`, `CU13`, `CU14`, `CU15`, `CU16`, `CU20`, `CU21`, `CU22`, `CU23`.
- **Pantallas:** `T01 Inicio`, `T02 Ranking`, `T03 Ficha de lote`, `T04 Mapa`, `T05 Pedido orgánico`, `T06 Lotes`, `T07 Editar lote`, `T08 Importar planilla`, `T09 Estado de piso`, `T10 Brix`, `T11 Cosecha`, `T12 Pronóstico`, `T13 Pronóstico manual`, `T14 Variedades`, `T15 Pluviómetros`, `T16 Informes`, `T17 Vista de informe`, más las vistas de `Lotes de reserva`, `Monitor de patio` y `Simulador de escenarios`.
- **Alcance:** dueño funcional de los datos agronómicos y de la planificación diaria de zafra.

### 4.3 Jefe de lote
- **Casos de uso:** `CU01`, `CU08`, `CU09`.
- **Pantallas:** `J01 Inicio`, `J02 Lectura de pluviómetro`, `J03 Estado de piso`, `J04 Mis registros`.
- **Alcance:** interfaz móvil simple, acotada a su finca y con soporte de guardado local sin señal (`CU08`).

### 4.4 Personal de báscula
- **Casos de uso:** `CU01`, `CU17`.
- **Pantallas:** `B01 Inicio`, `B02 Registrar carros`, `B03 Historial del patio`.
- **Alcance:** carga periódicamente los carros esperando en el patio. Si la cobertura calculada baja del umbral, el sistema dispara `CU18`.

### 4.5 Fábrica
- **Casos de uso:** `CU01`, `CU18`, `CU19`, `CU20`, `CU22`.
- **Pantallas:** `F01 Inicio`, `F02 Alertas`, `F03 Detalle de alerta`, `F04 Paradas`, `F05 Registrar/cerrar parada`, `F06 Informes`, `F07 Vista de informe`.
- **Alcance:** recibe alertas tempranas para programar mantenimiento de calderas/equipos, monitorea el colchón de patio (30 carros para reanudar), registra cada parada con su causa y duración, y emite informes.
