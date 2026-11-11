import { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";

import MainLayout from "./components/layout/MainLayout/MainLayout";
import HomePage from "./pages/HomePage"; // <-- Eliminamos el "zz" que estaba aquí
import PruebaBackend from "./PruebaBackend";

export default function App() {
  // 1. Los estados (useState) van al inicio, DENTRO de la función App y ANTES del return.
  const [categories, setCategories] = useState([]);
  const [cargando, setCargando] = useState(true);

  // 2. El useEffect también va aquí, manejando la conexión asíncrona a Firebase.
  useEffect(() => {
    // ---------------------------------------------------------
    // MODO MOCKING (Frontend Aislado)
    // Comentamos la llamada real a Firebase para no borrar el código
    // ---------------------------------------------------------
    /*
    const obtenerCategorias = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "categories"));
        const listaCategorias = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCategories(listaCategorias);
      } catch (error) {
        console.error("Error al obtener las categorías:", error);
      } finally {
        setCargando(false);
      }
    };
    obtenerCategorias();
    */

    // ---------------------------------------------------------
    // SIMULACIÓN DE RESPUESTA INMEDIATA
    // ---------------------------------------------------------
    // 1. Cargamos categorías falsas orientadas a tu proyecto minero
    setCategories([
      { id: "cat_1", nombre: "Viandas Estándar (Mineros)" },
      { id: "cat_2", nombre: "Menú Vegetariano (Administrativos)" },
      { id: "cat_3", nombre: "Dietas Especiales (Celiaquía/Hipertensión)" }
    ]);
    
    // 2. Apagamos la pantalla de carga instantáneamente
    setCargando(false); 

  }, []);

  // 3. Renderizado condicional: Si Firebase está cargando, mostramos esto y el código se detiene aquí.
  if (cargando) {
    return <h2>Cargando categorías...</h2>;
  }

  // 4. Si ya cargó (cargando es false), React pasa a este return principal y renderiza la interfaz.
  return (
    <MainLayout>
      {/* Si más adelante necesitas usar las categorías, puedes pasarlas así: <HomePage categorias={categories} /> */}
      <HomePage />
      <PruebaBackend />
    </MainLayout>
  );
}