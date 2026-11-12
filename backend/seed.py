"""Script de carga inicial (Seed) para Cloud Firestore y el respaldo local del backend.

Uso (desde la carpeta backend):
    venv\\Scripts\\python.exe seed.py

Carga todas las colecciones maestras y el historial operativo de ejemplo desde
`backend/seed/datos_iniciales.json` hacia Cloud Firestore (en lotes de 450 operaciones)
y actualiza el estado local del servidor.
"""
import sys

from app.repositorio import COLECCIONES_LISTA, cargar_datos_semilla, repositorio


def main():
    print("=== TrazaPlato: Inicialización de Base de Datos (Seed) ===")
    datos = cargar_datos_semilla(desplazar_a_hoy=True)
    resumen = " | ".join(f"{col}: {len(datos.get(col, []))}" for col in COLECCIONES_LISTA)
    total = sum(len(datos.get(col, [])) for col in COLECCIONES_LISTA)
    print(f"Documentos preparados ({total} en total):")
    print(f"  {resumen}")

    repositorio.restablecer_semilla(sincronizar_firestore=True)

    if repositorio.firestore_activo:
        print("[OK] Todos los datos fueron cargados en Cloud Firestore y en el servidor local.")
        sys.exit(0)
    else:
        print("[AVISO] Los datos quedaron listos y activos en el servidor local (`backend/seed/estado_actual.json`).")
        print("        Cloud Firestore aún devolvió error al conectar:")
        print(f"        {repositorio.ultimo_error_firestore}")
        print("        En cuanto habilites Firestore en Firebase Console, volvé a ejecutar `python seed.py`")
        print("        o presioná «Restablecer datos de ejemplo» desde Administración.")
        sys.exit(0)


if __name__ == "__main__":
    main()
