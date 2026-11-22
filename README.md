# Priorización de cosecha – Ingenio La Esperanza (prototipo v2)

Sistema para decidir qué lote cosechar primero según zona, madurez, drenaje y lluvia prevista, avisar a Fábrica antes de que falte caña y medir el costo de las paradas.

- **Front end:** React 18 + Vite 5 + Tailwind 4 + React Router (carpeta raíz).
- **Back end:** Python + FastAPI + Firebase Admin (carpeta `backend`).
- **Datos y sesión:** Firebase (Firestore y Auth), proyecto `prototiposistemas-553bd`.
- Análisis, matriz de trazabilidad y decisiones: [`docs/analisis-y-trazabilidad.md`](docs/analisis-y-trazabilidad.md). Datos de la carga inicial: [`docs/datos-de-prueba.md`](docs/datos-de-prueba.md). Diagramas (casos de uso, DER y navegación): `docs/modelos/`.

## Requisitos

- Node.js 18 o superior y npm.
- Python 3.11 o superior.
- En la consola de Firebase del proyecto:
  1. **Authentication → Método de acceso:** habilitar “Correo electrónico/contraseña”.
  2. **Firestore Database:** crearla (modo producción) y publicar las reglas de `firestore.rules`.
  3. **Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada:** guardar el archivo como `backend/serviceAccountKey.json` (está en `.gitignore`; no se sube).

## Puesta en marcha local

### 1. Back end

Los comandos están para **Símbolo del sistema (cmd)** de Windows; si usás PowerShell o macOS/Linux, ver la nota de cada paso. Se usa `python -m ...` para no depender de que `pip` y `uvicorn` estén en el PATH.

```bat
cd backend
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
```

Copiar la credencial de Firebase como `backend\serviceAccountKey.json` (ver Requisitos).

Carga inicial (una vez; se puede repetir sin duplicar). El script necesita `lotes_coordenadas_aproximadas.json`: lo busca en las carpetas `confidencial` o `informacion` de la raíz del proyecto; si está en otro lugar, se indica con `--datos`. Primero se puede ver qué cargaría sin escribir nada:

```bat
python -m scripts.seed_firestore --solo-resumen --datos "D:\ruta\al\lotes_coordenadas_aproximadas.json"
```

Después, con la clave de los usuarios de prueba (mínimo 6 caracteres):

```bat
set SEED_PASSWORD=una-clave
python -m scripts.seed_firestore --datos "D:\ruta\al\lotes_coordenadas_aproximadas.json"
```

En PowerShell la clave se define con `$env:SEED_PASSWORD="una-clave"`; en macOS/Linux, con `export SEED_PASSWORD=una-clave`.

Iniciar el back end:

```bat
python -m uvicorn main:app --reload
```

Queda en `http://localhost:8000` (documentación interactiva en `/docs`). Al iniciar, consulta el pronóstico de Open-Meteo y lo repite cada 60 minutos. Variables opcionales en `backend/.env.example`.

### 2. Front end

En otra terminal, desde la raíz del proyecto:

```bat
npm install
copy .env.example .env
npm run dev
```

(En macOS/Linux: `cp .env.example .env`.)

Abrir `http://localhost:5173/TrabajoCampo/` e ingresar con un usuario de prueba:

| Correo | Rol |
|---|---|
| `tecnico@nexozafra.test` | Equipo técnico agrícola |
| `jefe.lote@nexozafra.test` | Jefe de lote |
| `bascula@nexozafra.test` | Personal de báscula |
| `fabrica@nexozafra.test` | Fábrica |

Para dar de alta otra persona: crearla en Firebase Authentication y agregar en Firestore un documento en `usuarios` con id = su UID y los campos `nombre`, `apellido`, `email`, `rol` (`tecnico`, `jefe_lote`, `bascula` o `fabrica`) y `activo: true`.

## Pruebas

```bat
cd backend
python -m unittest discover -s tests -t .
```

Las pruebas de casos de uso necesitan el JSON de lotes (lo buscan en `../confidencial/`, `../informacion/` o en la variable `DATOS_LOTES`); si no lo encuentran, se saltean.

## Publicación

- Front end en GitHub Pages: `npm run deploy` (usa `homepage` y `base: '/TrabajoCampo/'`). Definir `VITE_API_URL` en `.env.production` con la URL del back end publicado.
- Back end (por ejemplo en Render): comando `uvicorn main:app --host 0.0.0.0 --port $PORT`, raíz `backend`, variables `FIREBASE_KEY_PATH` (archivo secreto con la credencial) y `ALLOWED_ORIGIN=https://surgeron.github.io`.

## Estructura

```
backend/
  main.py                 aplicación, CORS, errores y tarea horaria
  app/domain/             reglas de negocio puras (zona, riesgo, ranking, reserva, patio, paradas)
  app/services/           casos de uso
  app/routers/api.py      35 endpoints con control de rol
  app/repositories/       Firestore, caché y memoria (pruebas)
  scripts/seed_firestore.py   carga inicial
  tests/                  pruebas automáticas
src/
  pages/<rol>/            pantallas de cada rol; pages/compartidas para las comunes
  components/             piezas reutilizables (tabla, campos, mapa, gráficos, colchón de patio)
  services/               API, tiempo real, cola sin conexión, exportación
  config/navegacion.js    menú de cada rol (36 pantallas)
docs/                     análisis, trazabilidad, datos de prueba y diagramas
firestore.rules           reglas de seguridad
```
