# TrazaPlato – Prototipo de comandas (Las Vertientes S.R.L.)

Prototipo frontend funcional del sistema de comandas y trazabilidad para los hoteles El Unquillar y Las Vertientes.
Implementa los 14 casos de uso con un **backend simulado** en el navegador: no usa API ni base de datos real.

## Cómo correrlo

```bash
npm install        # instala react-router-dom, agregado para la navegación
npm run dev        # http://localhost:5173/TrabajoCampo/
npm run build      # genera dist/ para GitHub Pages
```

La navegación usa `HashRouter` (`#/ruta`), así funciona en GitHub Pages sin configurar el servidor.

## Usuarios de prueba (contraseña `1234`)

| Usuario | Roles | Sucursal |
| --- | --- | --- |
| operario.unquillar | Mozo + Cocinero | El Unquillar |
| operario.vertientes | Mozo + Cocinero | Las Vertientes |
| cocina | Cocinero | La elige al ingresar |
| finanzas | Finanzas | — |
| supervisor | Supervisor | — |
| admin | Administrador + Finanzas | — |
| ex.empleada | Mozo (inactivo, no puede ingresar) | — |

Los datos se guardan en `localStorage`. Desde **Administración › Restablecer datos de ejemplo** se vuelve al estado inicial.
Abriendo dos pestañas (por ejemplo, mozo y cocina) los cambios se ven en ambas sin recargar.

## Casos de uso y pantallas

| Caso de uso | Pantalla | Rol |
| --- | --- | --- |
| CU-01 Iniciar sesión | `/login` | Todos |
| CU-02 Seleccionar sucursal | `/sucursal` | Mozo, Cocinero |
| CU-03 Registrar comanda | `/inicio` → `/comandas/nueva` | Mozo |
| CU-04 Mostrar comandas a preparar | `/cocina` | Cocinero |
| CU-05 Mostrar comandas a entregar | `/comandas` | Mozo |
| CU-06 Agregar adición | `/comandas/:id` | Mozo |
| CU-07 Cobrar comanda | `/cobrar?ids=…` | Mozo |
| CU-08 Completar datos de factura | `/facturas-pendientes` | Mozo, Finanzas |
| CU-09 Anular comanda | `/comandas/:id` | Mozo (Iniciado), Supervisor |
| CU-10 Registrar retiro de depósito | `/deposito` | Cocinero |
| CU-11 Registrar desperdicio | `/desperdicio` | Cocinero |
| CU-12 Generar informe | `/informes` | Finanzas, Supervisor |
| CU-13 Consultar comanda e historial | `/consulta` → `/comandas/:id` | Finanzas, Supervisor |
| CU-14 Administrar maestros | `/admin` | Administrador |

## Estructura

```
src/
  main.jsx, App.jsx        Proveedores y rutas con control de acceso por rol
  routes/                  Ruta protegida y menú por rol
  context/                 Datos, sesión y mensajes (toasts y confirmaciones)
  hooks/                   useOperacion (llamadas al backend con carga y errores), coberturas, contadores
  services/mockApi.js      Backend simulado: latencia, permisos, reglas de negocio, localStorage
  domain/                  Reglas puras: estados, coberturas de convenio, validaciones, informes
  data/                    Datos de ejemplo (maestros e historial generado)
  components/ui/           Componentes reutilizables (botón, modal, tabla adaptable, formularios…)
  components/layout/       Sidebar (escritorio), riel de íconos (tablet), barra inferior (celular)
  components/comandas|cobros|informes|admin/   Componentes de cada módulo
  pages/                   Una carpeta por pantalla (.jsx + .css)
  utils/                   Fechas, formatos y exportación a Excel (CSV) / PDF (impresión)
```

## Integración con el backend real

Las pantallas solo llaman a las funciones de `src/services/mockApi.js` mediante `useOperacion`.
Para conectar la API en Python + Firestore se reemplaza ese módulo por uno con las mismas funciones
(`registrarComanda`, `marcarListo`, `cobrarComandas`, `generarInforme`, …) y `suscribirse` por un listener de Firestore.
`firebase.js`, `PruebaBackend.jsx` y `backend/` quedan sin cambios para ese paso.
