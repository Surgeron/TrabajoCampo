// Conexión con Firebase: Auth para iniciar sesión (CU01) y Firestore para leer
// en tiempo real alertas y registros de patio (CU18 y CU22). Las escrituras van por el back end.
import { initializeApp } from 'firebase/app'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const env = import.meta.env

// Configuración del proyecto de la v1; se puede reemplazar con variables VITE_FIREBASE_*
const firebaseConfig = {
  apiKey: "AIzaSyCrWFXA2kGr3BgivX6vHkC4r_M_lwBepPM",
  authDomain: "nexozafra.firebaseapp.com",
  projectId: "nexozafra",
  storageBucket: "nexozafra.firebasestorage.app",
  messagingSenderId: "808592408613",
  appId: "1:808592408613:web:d3bae0fce2a8496cd67fcc",
  measurementId: "G-0M1L3VFPJM"
};

const app = initializeApp(firebaseConfig)

// Analytics solo donde el navegador lo admite (evita errores en modo privado o sin cookies)
isSupported()
  .then((ok) => ok && getAnalytics(app))
  .catch(() => {})

export const auth = getAuth(app)
export const db = getFirestore(app)
