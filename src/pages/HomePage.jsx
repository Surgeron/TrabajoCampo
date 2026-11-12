import { useNavigate } from "react-router-dom";
import { StatCard } from "../components/ui/Card/Card";
import { useSesion } from "../context/SesionContext";
import { useContadores } from "../hooks/useContadores";
import MealArtwork from "./MealArtwork";
import "./HomePage.css";

const MEALS = [
  { id: "desayuno", title: "Desayuno", tone: "breakfast" },
  { id: "almuerzo", title: "Almuerzo", tone: "lunch" },
  { id: "merienda", title: "Merienda", tone: "snack" },
  { id: "cena", title: "Cena", tone: "dinner" },
];

/** Inicio del mozo: cada tarjeta abre una comanda nueva con esa comida cargada (CU-03). */
export default function HomePage() {
  const navigate = useNavigate();
  const { usuario } = useSesion();
  const contadores = useContadores();

  return (
    <section className="home">
      <div className="home__welcome">
        <Rays />
        <h2 className="home__title">¡Hola, {usuario?.nombre}!</h2>
        <Rays flip />
      </div>
      <p className="home__subtitle">Seleccioná el pedido que deseas realizar:</p>
      <div className="home__grid">
        {MEALS.map((meal) => (
          <button
            key={meal.id}
            type="button"
            className={`meal-card meal-card--${meal.tone}`}
            onClick={() => navigate(`/comandas/nueva?categoria=${meal.id}`)}
          >
            <MealArtwork type={meal.id} />
            <span className="meal-card__body">
              <span className="meal-card__title">{meal.title}</span>
              <span className="meal-card__go" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path
                    d="M5 12h12M13 6l6 6-6 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className="home__pendientes">
        <StatCard
          icono="check"
          tono="exito"
          etiqueta="Listas para entregar"
          valor={contadores.listas}
          onClick={() => navigate("/comandas?vista=listas")}
        />
        <StatCard
          icono="cobrar"
          tono="alerta"
          etiqueta="Entregadas sin cobrar"
          valor={contadores.entregadas}
          onClick={() => navigate("/comandas?vista=entregadas")}
        />
        <StatCard
          icono="factura"
          tono="peligro"
          etiqueta="Cobradas sin facturar"
          valor={contadores.sinFacturar}
          onClick={() => navigate("/facturas-pendientes")}
        />
      </div>
    </section>
  );
}

function Rays({ flip = false }) {
  return (
    <svg
      className={flip ? "home__rays home__rays--flip" : "home__rays"}
      viewBox="0 0 64 64"
      aria-hidden="true"
    >
      <g stroke="#f5a524" strokeWidth="5" strokeLinecap="round">
        <path d="M32 6v12M32 46v12M6 32h12M46 32h12M14 14l8 8M42 42l8 8M50 14l-8 8M22 42l-8 8" />
      </g>
    </svg>
  );
}
