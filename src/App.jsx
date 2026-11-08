import { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";

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
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Lista de Categorías</h1>

      {categories.length === 0 ? (
        <p>No se encontraron categorías en la base de datos.</p>
      ) : (
        <ul>
          {categories.map((cat) => (
            <li key={cat.id} style={{ margin: "8px 0" }}>
              <strong>ID:</strong> {cat.id}
              <pre style={{ background: "#f4f4f4", padding: "10px", borderRadius: "5px" }}>
                {JSON.stringify(cat, null, 2)}
              </pre>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}