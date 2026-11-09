import { useEffect, useState } from "react";

export default function PruebaBackend() {
  const [estado, setEstado] = useState("Conectando...");
  const [comandas, setComandas] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8000/")
      .then((res) => res.json())
      .then((data) => setEstado(data.estado))
      .catch(() => setEstado("No se pudo conectar"));

    fetch("http://localhost:8000/comandas")
      .then((res) => res.json())
      .then((data) => setComandas(data))
      .catch(() => {});
  }, []);

  return (
    <div>
      <p>Estado del backend: {estado}</p>
      <p>Comandas recibidas: {comandas.length}</p>
    </div>
  );
}