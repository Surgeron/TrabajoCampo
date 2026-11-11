import { useEffect, useState } from "react";
const API = import.meta.env.VITE_API_URL;

export default function PruebaBackend() {
  const [estado, setEstado] = useState("Conectando...");
  const [comandas, setComandas] = useState([]);

  useEffect(() => {
    fetch(`${API}/`)
      .then((res) => res.json())
      .then((data) => setEstado(data.estado))
      .catch(() => setEstado("No se pudo conectar"));

    fetch(`${API}/comandas`)
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