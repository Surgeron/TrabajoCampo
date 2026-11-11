import "./Header.css";

const DIAS = ["Dom.", "Lun.", "Mar.", "Mié.", "Jue.", "Vie.", "Sáb."];
const MESES = ["Ene.", "Feb.", "Mar.", "Abr.", "May.", "Jun.", "Jul.", "Ago.", "Sep.", "Oct.", "Nov.", "Dic."];

function formatFecha(fecha) {
  return `${DIAS[fecha.getDay()]} ${fecha.getDate()} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
}

export default function Header({ title = "Comandas" }) {
  const fecha = new Date();
  const iso = fecha.toISOString().slice(0, 10);

  return (
    <header className="topbar">
      <h1 className="topbar__title">{title}</h1>
      <div className="topbar__actions">
        <div className="topbar__date">
          <span className="topbar__calendar" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <rect x="3.5" y="5" width="17" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M3.5 10h17M8 3.5v3M16 3.5v3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </span>
          <time dateTime={iso}>{formatFecha(fecha)}</time>
        </div>
        <button type="button" className="topbar__user" aria-label="Cuenta">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="9" r="3.2" fill="currentColor" />
            <path fill="currentColor" d="M6.2 18.5c.8-2.6 3-4 5.8-4s5 1.4 5.8 4" />
          </svg>
        </button>
      </div>
    </header>
  );
}
