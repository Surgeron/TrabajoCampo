"""Carga inicial de Firestore (reemplaza a CU05 en el prototipo).

Lee la planilla ZAFRA 2025 ya limpia con coordenadas aproximadas
(lotes_coordenadas_aproximadas.json) y carga:
  fincas, lotes, campaña 2026, lotes por campaña, pluviómetros de prueba,
  parámetros, mediciones de Brix de prueba, paradas 2026 de prueba y usuarios de prueba.

Todo lo que no viene de la planilla queda marcado como dato de prueba.
Los ids son fijos: correr el script otra vez sobrescribe lo mismo, no duplica.

Uso (desde la carpeta backend, con el entorno virtual activo):
  python -m scripts.seed_firestore --datos ../confidencial/lotes_coordenadas_aproximadas.json
  python -m scripts.seed_firestore --solo-resumen          # no escribe nada, muestra lo que cargaría
Variables de entorno: FIREBASE_KEY_PATH (credencial) y SEED_PASSWORD (clave de los usuarios de prueba).
"""
import argparse
import hashlib
import json
import os
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path
from statistics import median

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.domain import fechas, parametros, zonas  # noqa: E402
from app.domain.constantes import (  # noqa: E402
    CAUSA_LEJANIA,
    CAUSA_LLUVIA,
    COL_BRIX,
    COL_CAMPANIAS,
    COL_FINCAS,
    COL_LOTES,
    COL_LOTES_CAMPANIA,
    COL_PARADAS,
    COL_PARAMETROS,
    COL_PLUVIOMETROS,
    COL_USUARIOS,
    ESTADO_PREPARACION,
    ESTADO_PRODUCCION,
    ORIGEN_PRUEBA,
)

ID_CAMPANIA = "2026"
CAMPANIA = {
    "nombre": "Zafra 2026 (base inventario 2025)",
    "anio": 2026,
    "fecha_inicio": "2026-06-01",
    "fecha_fin": None,
    "toneladas_plan": 1024000,
    "activa": True,
    "origen": "Planilla ZAFRA 2025 (inv2025_ile_oficial)",
}
NOTA_PRUEBA = "Dato de prueba (a confirmar con el ingenio)"

# Drenaje de prueba por finca (pendiente el dato real del ingenio).
# Miraflores y San Antonio son críticas según la entrevista.
DRENAJE_PRUEBA = {"320": "bien", "310": "medio", "350": "medio"}

USUARIOS_PRUEBA = [
    ("tecnico@nexozafra.test", "Usuario", "Técnico agrícola", "tecnico"),
    ("jefe.lote@nexozafra.test", "Usuario", "Jefe de lote", "jefe_lote"),
    ("bascula@nexozafra.test", "Usuario", "Báscula", "bascula"),
    ("fabrica@nexozafra.test", "Usuario", "Fábrica", "fabrica"),
]

PARADAS_PRUEBA = [
    ("2026-07-13T06:00:00-03:00", "2026-07-19T06:00:00-03:00", CAUSA_LLUVIA, "Bloque de 6 días por lluvia"),
    ("2026-08-24T06:00:00-03:00", "2026-08-30T06:00:00-03:00", CAUSA_LLUVIA, "Bloque de 6 días por lluvia"),
    ("2026-10-20T14:00:00-03:00", "2026-10-20T17:30:00-03:00", CAUSA_LEJANIA, "Lotes lejanos y corte lento"),
    ("2026-10-28T03:00:00-03:00", "2026-10-28T06:00:00-03:00", CAUSA_LEJANIA, "Lotes lejanos y corte lento"),
    ("2026-11-05T10:00:00-03:00", "2026-11-05T12:30:00-03:00", CAUSA_LEJANIA, "Primera parada del día"),
    ("2026-11-05T19:00:00-03:00", "2026-11-05T22:00:00-03:00", CAUSA_LEJANIA, "Segunda parada del día"),
    ("2026-11-12T01:00:00-03:00", "2026-11-12T04:30:00-03:00", CAUSA_LEJANIA, "Lotes lejanos, corte lento y lluvia"),
]

VARIEDAD_CODIGO = re.compile(r"^(LCP|TUC|NA|CP)\s*\d{2,3}-\d{1,4}$", re.IGNORECASE)
NO_VARIEDAD = {"descepe 2024", "monte", "vacio", "vacío"}


def _num(v):
    if v is None or v == "":
        return None
    return float(v)


def _hash(texto: str) -> int:
    return int(hashlib.sha256(texto.encode()).hexdigest(), 16)


def _variedad(texto):
    """Devuelve (variedad, observación) normalizadas."""
    if texto is None:
        return None, "Sin variedad ni año en la planilla"
    t = str(texto).strip()
    if t.lower() in NO_VARIEDAD:
        return None, {"vacio": "Vacío"}.get(t.lower(), t)
    if t.lower() == "varias":
        return "Varias", None
    if VARIEDAD_CODIGO.match(t):
        return t.upper(), None
    return None, t


def construir_datos(ruta_json: str, ahora=None) -> dict:
    """Arma todos los documentos a cargar, por colección. No escribe nada."""
    ahora = ahora or fechas.ahora()
    with open(ruta_json, encoding="utf-8") as f:
        fuente = json.load(f)
    params = parametros.valores_defaults()
    datos = defaultdict(dict)

    datos[COL_CAMPANIAS][ID_CAMPANIA] = dict(CAMPANIA)
    for p in parametros.lista_defaults(ID_CAMPANIA):
        datos[COL_PARAMETROS][f"{ID_CAMPANIA}_{p['clave']}"] = p

    for f in fuente["fincas"]:
        datos[COL_FINCAS][f["id_finca"]] = {
            "nombre": f["nombre"],
            "latitud": f["latitud_cabecera"],
            "longitud": f["longitud_cabecera"],
            "referencia": f.get("referencia_cabecera"),
            "cruza_ruta_34": bool(f.get("cruza_ruta_34")),
            "critica_drenaje": bool(f.get("critica_drenaje")),
            "ubicacion_aproximada": True,
        }

    lotes = []
    for l in fuente["lotes"]:
        id_unico = str(l["ID_UNICO"])
        if id_unico in ("0000000",) or not l.get("ID_FINCA"):
            continue
        variedad, obs = _variedad(l.get("VARIEDAD"))
        estado = ESTADO_PRODUCCION if variedad else ESTADO_PREPARACION
        dist = _num(l.get("DIST ILE"))
        zona = zonas.calcular_zona(dist, params)
        tipo = l.get("Tipo") or "Convencional"
        organico = tipo.lower().startswith("organico") or tipo.lower().startswith("orgánico")
        certificacion = None
        if organico:
            certificacion = "Orgánico NOP" if "nop" in tipo.lower() else "Orgánico Full"
        if l.get("ID_FINCA") in DRENAJE_PRUEBA:
            drenaje = DRENAJE_PRUEBA[l["ID_FINCA"]]
        else:  # Miraflores y San Antonio
            drenaje = "imperfecto" if zona == "Media" else "medio"
        poligono = [{"lat": p[0], "lng": p[1]} for p in (l.get("POLIGONO_APROX") or [])]
        if variedad is None and l.get("PLANT") and obs == "Descepe 2024" and l.get("PLANT") == "2025":
            obs = "Descepe 2024; replantado en 2025: completar la variedad plantada"
        lotes.append({
            "id_unico": id_unico,
            "id_finca": l["ID_FINCA"],
            "nro_lote": str(l.get("ID_LOTE")),
            "nombre": (l.get("LOTE") or "").strip(),
            "tipo_cultivo": "Orgánico" if organico else "Convencional",
            "certificacion": certificacion,
            "id_oia": l.get("ID_OIA"),
            "area_bruta_ha": _num(l.get("AREA_B")),
            "area_neta_ha": _num(l.get("AREA_N")),
            "surcos": _num(l.get("SURCOS")),
            "dist_surco_m": _num(l.get("DIST")),
            "dist_ingenio_km": dist,
            "zona": zona,
            "drenaje": drenaje,
            "drenaje_dato_prueba": True,
            "id_pluviometro": None,
            "latitud": l.get("LATITUD"),
            "longitud": l.get("LONGITUD"),
            "poligono": poligono,
            "ubicacion_aproximada": True,
            "_acimut": float(l.get("ACIMUT_GRADOS") or 0),
            "_campania": {
                "id_unico": id_unico,
                "id_campania": ID_CAMPANIA,
                "variedad": variedad,
                "anio_plantacion": int(l["PLANT"]) if l.get("PLANT") else None,
                "estado_lote": estado,
                "cantidad_cortes": None,
                "en_reserva": False,
                "fecha_reserva": None,
                "observaciones": obs,
            },
        })

    # Pluviómetros de prueba: uno por finca y zona; los grupos con 18 o más lotes en
    # producción se parten en dos por acimut; Meguida (sin distancia) tiene uno.
    grupos = defaultdict(list)
    sin_grupo = []
    for l in lotes:
        if l["id_finca"] == "350":
            grupos[("350", "Única")].append(l)
        elif l["zona"]:
            grupos[(l["id_finca"], l["zona"])].append(l)
        else:
            sin_grupo.append(l)
    subgrupos = []
    for clave in sorted(grupos, key=lambda c: (c[0], {"Cercana": 0, "Media": 1, "Lejana": 2, "Única": 3}[c[1]])):
        miembros = grupos[clave]
        prod = [m for m in miembros if m["_campania"]["estado_lote"] == ESTADO_PRODUCCION]
        if len(prod) >= 18:
            corte = median(m["_acimut"] for m in miembros)
            a = [m for m in miembros if m["_acimut"] <= corte]
            b = [m for m in miembros if m["_acimut"] > corte]
            subgrupos += [(clave, "A", a), (clave, "B", b)] if a and b else [(clave, "", miembros)]
        else:
            subgrupos.append((clave, "", miembros))
    fincas_nombre = {k: v["nombre"] for k, v in datos[COL_FINCAS].items()}
    centros = []
    for i, ((id_finca, zona), parte, miembros) in enumerate(subgrupos, start=1):
        id_pluv = f"PLV-{i:02d}"
        lat = round(sum(m["latitud"] for m in miembros) / len(miembros), 6)
        lon = round(sum(m["longitud"] for m in miembros) / len(miembros), 6)
        nombre_zona = "" if zona == "Única" else f" {zona.lower()}"
        datos[COL_PLUVIOMETROS][id_pluv] = {
            "nombre": f"{id_pluv} {fincas_nombre[id_finca]}{nombre_zona}{(' ' + parte) if parte else ''}",
            "id_finca": id_finca,
            "latitud": lat,
            "longitud": lon,
            "dato_prueba": True,
            "observacion": NOTA_PRUEBA,
        }
        centros.append((id_pluv, id_finca, lat, lon))
        for m in miembros:
            m["id_pluviometro"] = id_pluv
    for l in sin_grupo:  # lotes sin distancia: el pluviómetro más cercano de su finca
        propios = [c for c in centros if c[1] == l["id_finca"]] or centros
        l["id_pluviometro"] = min(propios, key=lambda c: (c[2] - l["latitud"]) ** 2 + (c[3] - l["longitud"]) ** 2)[0]

    hoy = ahora.date()
    for l in lotes:
        campania = l.pop("_campania")
        l.pop("_acimut")
        datos[COL_LOTES][l["id_unico"]] = l
        id_lc = f"{ID_CAMPANIA}_{l['id_unico']}"
        datos[COL_LOTES_CAMPANIA][id_lc] = campania
        if campania["estado_lote"] == ESTADO_PRODUCCION:
            h = _hash(l["id_unico"])
            valor = round(7.0 + (h % 501) / 100, 2)  # 7,00 a 12,00 °Bx (cerca del 80 % llega a 8)
            fecha = fechas.fecha_txt(hoy.fromordinal(hoy.toordinal() - (h % 5)))
            datos[COL_BRIX][f"prueba_{id_lc}"] = {
                "id_lote_campania": id_lc,
                "id_unico": l["id_unico"],
                "fecha": fecha,
                "valor_brix": valor,
                "origen": ORIGEN_PRUEBA,
                "fecha_hora_carga": fechas.a_iso(ahora),
                "id_usuario": "carga-inicial",
                "usuario_nombre": "Carga inicial",
            }

    for i, (ini, fin, causa, obs) in enumerate(PARADAS_PRUEBA, start=1):
        datos[COL_PARADAS][f"prueba_parada_{i:02d}"] = {
            "fecha_hora_inicio": ini,
            "fecha_hora_fin": fin,
            "causa": causa,
            "observacion": f"{obs}. Dato de prueba inventado para el prototipo.",
            "dato_prueba": True,
            "id_usuario": "carga-inicial",
            "usuario_nombre": "Carga inicial",
            "fecha_hora_carga": fechas.a_iso(ahora),
        }
    return datos


def resumen(datos: dict) -> str:
    lotes = datos[COL_LOTES].values()
    lc = datos[COL_LOTES_CAMPANIA].values()
    prod = [c for c in lc if c["estado_lote"] == ESTADO_PRODUCCION]
    brix = [b["valor_brix"] for b in datos[COL_BRIX].values()]
    lineas = [
        f"Fincas: {len(datos[COL_FINCAS])}",
        f"Lotes: {len(datos[COL_LOTES])} (en producción {len(prod)}, en preparación {len(lc) - len(prod)})",
        f"Zonas: {dict(Counter(l['zona'] or 'Sin zona' for l in lotes))}",
        f"Drenaje (prueba): {dict(Counter(l['drenaje'] for l in lotes))}",
        f"Pluviómetros (prueba): {len(datos[COL_PLUVIOMETROS])}",
        f"Área bruta: {sum(l['area_bruta_ha'] or 0 for l in lotes):,.2f} ha · área neta: {sum(l['area_neta_ha'] or 0 for l in lotes):,.2f} ha",
        f"Brix de prueba: {len(brix)} mediciones, {sum(1 for b in brix if b >= 8)} con 8 °Bx o más",
        f"Paradas 2026 de prueba: {len(datos[COL_PARADAS])}",
        f"Parámetros: {len(datos[COL_PARAMETROS])}",
    ]
    return "\n".join(lineas)


def buscar_datos(ruta: str | None) -> str:
    if ruta:
        if not Path(ruta).exists():
            raise SystemExit(f"No existe el archivo indicado con --datos: {ruta}")
        return ruta
    raiz = Path(__file__).resolve().parents[2]
    candidatos = [os.getenv("DATOS_LOTES")] + [
        str(raiz / carpeta / "lotes_coordenadas_aproximadas.json") for carpeta in ("confidencial", "informacion")
    ]
    for candidato in candidatos:
        if candidato and Path(candidato).exists():
            return candidato
    buscados = "\n  ".join(c for c in candidatos if c)
    raise SystemExit(
        "No encontré lotes_coordenadas_aproximadas.json. Busqué en:\n  " + buscados
        + "\nIndicá la ruta con --datos \"C:\\ruta\\al\\archivo.json\" o copiá la carpeta con el archivo a la raíz del proyecto."
    )


def escribir_firestore(db, datos: dict):
    lote = db.batch()
    n = 0
    for coleccion, docs in datos.items():
        for id_doc, doc in docs.items():
            lote.set(db.collection(coleccion).document(id_doc), doc)
            n += 1
            if n % 400 == 0:
                lote.commit()
                lote = db.batch()
    lote.commit()
    return n


def crear_usuarios(db, clave: str):
    from firebase_admin import auth

    for email, nombre, apellido, rol in USUARIOS_PRUEBA:
        try:
            usuario = auth.get_user_by_email(email)
            auth.update_user(usuario.uid, password=clave, display_name=f"{nombre} {apellido}", disabled=False)
        except auth.UserNotFoundError:
            usuario = auth.create_user(email=email, password=clave, display_name=f"{nombre} {apellido}")
        db.collection(COL_USUARIOS).document(usuario.uid).set({
            "nombre": nombre, "apellido": apellido, "email": email, "rol": rol, "activo": True,
        })
        print(f"  usuario {email} -> rol {rol}")


def main():
    ap = argparse.ArgumentParser(description="Carga inicial de Firestore para el prototipo v2")
    ap.add_argument("--datos", help="Ruta a lotes_coordenadas_aproximadas.json")
    ap.add_argument("--solo-resumen", action="store_true", help="No escribe nada; muestra lo que cargaría")
    ap.add_argument("--sin-usuarios", action="store_true", help="No crea los usuarios de prueba")
    args = ap.parse_args()

    datos = construir_datos(buscar_datos(args.datos))
    print(resumen(datos))
    if args.solo_resumen:
        return

    import firebase_admin
    from firebase_admin import credentials, firestore

    clave_json = os.getenv("FIREBASE_KEY_PATH", "serviceAccountKey.json")
    if not Path(clave_json).exists():
        raise SystemExit(
            f"No encontré la credencial de Firebase ({Path(clave_json).resolve()}).\n"
            "Descargala en la consola de Firebase: Configuración del proyecto > Cuentas de servicio > "
            "Generar nueva clave privada, y guardala en la carpeta backend como serviceAccountKey.json."
        )
    firebase_admin.initialize_app(credentials.Certificate(clave_json))
    db = firestore.client()
    n = escribir_firestore(db, datos)
    print(f"Documentos escritos: {n}")
    if not args.sin_usuarios:
        clave = os.getenv("SEED_PASSWORD")
        if not clave or len(clave) < 6:
            print("SEED_PASSWORD no está definida (mínimo 6 caracteres): no se crearon los usuarios de prueba.")
        else:
            crear_usuarios(db, clave)
    print("Listo.")


if __name__ == "__main__":
    main()
