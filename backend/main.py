import os
import firebase_admin
from firebase_admin import credentials, firestore
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

KEY_PATH = os.getenv("FIREBASE_KEY_PATH", "serviceAccountKey.json")
firebase_admin.initialize_app(credentials.Certificate(KEY_PATH))
db = firestore.client()

origenes = ["http://localhost:5173"]
if os.getenv("ALLOWED_ORIGIN"):
    origenes.append(os.getenv("ALLOWED_ORIGIN"))

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=origenes,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def inicio():
    return {"estado": "backend funcionando"}

@app.get("/comandas")
def listar_comandas():
    docs = db.collection("comandas").stream()
    return [{"id": d.id, **d.to_dict()} for d in docs]