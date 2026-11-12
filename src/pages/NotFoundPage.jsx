import { Link } from "react-router-dom";
import EmptyState from "../components/ui/EmptyState/EmptyState";

export default function NotFoundPage() {
  return (
    <div style={{ padding: "48px 16px", maxWidth: 560, margin: "0 auto" }}>
      <EmptyState icono="buscar" titulo="No encontramos esta página" accion={<Link to="/">Ir al inicio</Link>}>
        La dirección no existe o cambió.
      </EmptyState>
    </div>
  );
}
