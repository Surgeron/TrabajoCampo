import { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";

import PruebaBackend from "./PruebaBackend";

// dentro del return de App:

export default function App() {
  const [categories, setCategories] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
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
  }, []);

  if (cargando) {
    return <h2>Cargando categorías...</h2>;
  }

  return (
      <PruebaBackend />

  );
}