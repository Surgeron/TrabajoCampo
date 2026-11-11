import "./Sidebar.css";

const NAV = [
  { id: "inicio", label: "Inicio", icon: HomeIcon },
  { id: "comandas", label: "Mis Comandas", icon: OrdersIcon },
  { id: "configuracion", label: "Configuración", icon: SettingsIcon },
];

export default function Sidebar({ activeId = "inicio" }) {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <ChefHat className="sidebar__logo" />
        <strong>Catering</strong>
        <span className="sidebar__tagline">
          Comidas con amor <Heart />
        </span>
      </div>

      <nav className="sidebar__nav" aria-label="Principal">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              className={active ? "sidebar__link sidebar__link--active" : "sidebar__link"}
              aria-current={active ? "page" : undefined}
            >
              <Icon />
              {item.label}
            </button>
          );
        })}
      </nav>

      <ChefHat className="sidebar__mark" />
      <svg className="sidebar__wave" viewBox="0 0 240 80" aria-hidden="true">
        <path
          d="M-20 58 C30 74 55 16 120 28 C175 38 190 8 270 20"
          fill="none"
          stroke="#ff8d1f"
          strokeWidth="16"
          strokeLinecap="round"
        />
      </svg>
    </aside>
  );
}

function ChefHat({ className }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <path
        fill="currentColor"
        d="M32 6c-5.2 0-9.6 3-11.6 7.3A12 12 0 0 0 8 24.2c0 2.6.9 5 2.4 6.9C11 40.6 16.2 48 24 48h16c7.8 0 13-7.4 13.6-16.9A10.2 10.2 0 0 0 56 24.2 12 12 0 0 0 43.6 13.3C41.6 9 37.2 6 32 6z"
      />
      <path fill="currentColor" d="M22 48h20v8a3 3 0 0 1-3 3H25a3 3 0 0 1-3-3v-8z" />
    </svg>
  );
}

function Heart() {
  return (
    <svg className="sidebar__heart" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z"
      />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3.2 3.5 10.2a1 1 0 0 0-.3.7V20a1 1 0 0 0 1 1h5.2v-6.2h5.2V21H20a1 1 0 0 0 1-1v-9.1a1 1 0 0 0-.3-.7L12 3.2z"
      />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        d="M7 3.5h7.2L19 8.2V20a1.2 1.2 0 0 1-1.2 1.2H7A1.2 1.2 0 0 1 5.8 20V4.7A1.2 1.2 0 0 1 7 3.5z"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        d="M14 3.8V8h4.2M8.5 12.2h7M8.5 16h5"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19.4 13.5a7.8 7.8 0 0 0 .1-1.5 7.8 7.8 0 0 0-.1-1.5l2-1.5-2-3.5-2.4.9a7 7 0 0 0-2.6-1.5L14 2h-4l-.5 2.4a7 7 0 0 0-2.6 1.5l-2.4-.9-2 3.5 2 1.5a7.8 7.8 0 0 0-.1 1.5 7.8 7.8 0 0 0 .1 1.5l-2 1.5 2 3.5 2.4-.9a7 7 0 0 0 2.6 1.5L10 22h4l.5-2.4a7 7 0 0 0 2.6-1.5l2.4.9 2-3.5-2-1.5zM12 15.4A3.4 3.4 0 1 1 12 8.6a3.4 3.4 0 0 1 0 6.8z"
      />
    </svg>
  );
}
