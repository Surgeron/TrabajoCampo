"""Prueba mínima de conexión: Firestore (lectura/escritura) y Firebase Authentication.

Uso (desde la carpeta backend):
    venv\\Scripts\\python.exe test_conexion.py
"""
import json
import os
import sys
import urllib.error
import urllib.request

import firebase_admin
from firebase_admin import auth, credentials, firestore

KEY_PATH = os.getenv("FIREBASE_KEY_PATH", os.path.join(os.path.dirname(__file__), "serviceAccountKey.json"))
# Clave web pública del proyecto (la misma de src/firebase.js); solo se usa para probar el login.
API_KEY = os.getenv("FIREBASE_WEB_API_KEY", "AIzaSyA8CmnHfmFSfgEGVSIwMNf5xqGGl1-pMfQ")


def probar_firestore(db):
    ref = db.collection("_diagnostico").document("prueba_conexion")
    ref.set({"ok": True, "fecha": firestore.SERVER_TIMESTAMP})
    leido = ref.get().to_dict()
    ref.delete()
    assert leido and leido.get("ok") is True, "No se pudo leer lo escrito"
    print("[OK] Firestore: escritura, lectura y borrado correctos.")


def probar_auth():
    token = auth.create_custom_token("diagnostico", {"rol": "diagnostico"}).decode()
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key={API_KEY}"
    cuerpo = json.dumps({"token": token, "returnSecureToken": True}).encode()
    pedido = urllib.request.Request(url, data=cuerpo, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(pedido, timeout=15) as respuesta:
            datos = json.load(respuesta)
    except urllib.error.HTTPError as error:
        detalle = error.read().decode(errors="replace")
        print(f"[FALLA] Firebase Auth rechazó el token personalizado: {error.code} {detalle}")
        return False
    decodificado = auth.verify_id_token(datos["idToken"])
    print(f"[OK] Firebase Auth: login con token personalizado y verificación (uid={decodificado['uid']}).")
    auth.delete_user("diagnostico")
    return True


def main():
    app = firebase_admin.initialize_app(credentials.Certificate(KEY_PATH))
    print(f"Proyecto: {app.project_id}")
    probar_firestore(firestore.client())
    ok_auth = probar_auth()
    sys.exit(0 if ok_auth else 2)


if __name__ == "__main__":
    main()
