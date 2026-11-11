export default function MealArtwork({ type }) {
  if (type === "desayuno") return <Breakfast />;
  if (type === "almuerzo") return <Lunch />;
  if (type === "merienda") return <Snack />;
  return <Dinner />;
}

function Breakfast() {
  return (
    <svg className="meal-art" viewBox="0 0 280 180" aria-hidden="true">
      <defs>
        <linearGradient id="juice" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd56a" />
          <stop offset="1" stopColor="#ff8800" />
        </linearGradient>
      </defs>
      <path
        d="M18 148 C48 78 132 70 168 112"
        fill="none"
        stroke="#f0b14a"
        strokeWidth="34"
        strokeLinecap="round"
      />
      <path
        d="M42 132 C72 92 118 90 146 112"
        fill="none"
        stroke="#c9842c"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M58 122 C82 98 112 98 132 116"
        fill="none"
        stroke="#e8a24a"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <g transform="translate(118,6)">
        <rect x="10" y="132" width="52" height="10" rx="4" fill="#e7ebf1" />
        <path d="M16 10h44l8 122H8z" fill="#fff" />
        <path d="M22 36h36l6 92H16z" fill="url(#juice)" />
        <ellipse cx="38" cy="38" rx="18" ry="6" fill="#ffb43a" />
        <circle cx="38" cy="16" r="16" fill="#ff9a1c" />
        <path d="M30 12c4-7 12-8 16-2" fill="none" stroke="#ffe7ad" strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <g transform="translate(168,78)">
        <ellipse cx="48" cy="70" rx="44" ry="12" fill="#f3eee8" />
        <path d="M10 22h58v16a29 29 0 0 1-58 0z" fill="#fff" />
        <path d="M68 32h10a14 14 0 0 1 0 24H68" fill="none" stroke="#fff" strokeWidth="8" />
        <ellipse cx="39" cy="26" rx="22" ry="8" fill="#6a3b22" />
        <ellipse cx="39" cy="24" rx="14" ry="4.5" fill="#8d5434" />
      </g>
    </svg>
  );
}

function Lunch() {
  return (
    <svg className="meal-art" viewBox="0 0 280 180" aria-hidden="true">
      <ellipse cx="132" cy="128" rx="108" ry="22" fill="#000" opacity="0.05" />
      <ellipse cx="132" cy="112" rx="112" ry="34" fill="#f5f7fa" />
      <ellipse cx="132" cy="106" rx="90" ry="24" fill="#fff" />
      <g transform="translate(48,62)">
        <circle cx="22" cy="28" r="14" fill="#62be52" />
        <circle cx="42" cy="14" r="12" fill="#8ed15f" />
        <circle cx="46" cy="36" r="9" fill="#ef5b45" />
        <circle cx="18" cy="46" r="7" fill="#f0c14d" />
        <circle cx="8" cy="22" r="8" fill="#4eaf55" />
      </g>
      <g transform="translate(148,70)">
        <ellipse cx="52" cy="36" rx="40" ry="22" fill="#f4f1ea" />
        <ellipse cx="50" cy="32" rx="28" ry="16" fill="#fff" />
        <path d="M34 24c6 4 14 4 22 0M36 32c6 4 16 4 24 0" fill="none" stroke="#e6e1d8" strokeWidth="2" />
      </g>
      <g transform="translate(92,78)">
        <ellipse cx="40" cy="30" rx="38" ry="20" fill="#e39a48" />
        <ellipse cx="40" cy="27" rx="30" ry="14" fill="#f2b56a" />
        <path
          d="M16 22h48M18 30h44M22 16h40"
          fill="none"
          stroke="#c47c34"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

function Snack() {
  return (
    <svg className="meal-art" viewBox="0 0 280 180" aria-hidden="true">
      <defs>
        <linearGradient id="muffin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e7ae68" />
          <stop offset="1" stopColor="#c47438" />
        </linearGradient>
        <linearGradient id="smoothie" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f7a8dc" />
          <stop offset="1" stopColor="#d24eb4" />
        </linearGradient>
      </defs>
      <path d="M38 102h92l-12 52H50z" fill="#f7f3ee" />
      <path d="M50 102h68l-8 52H58z" fill="#fff" opacity="0.45" />
      <path d="M48 108h10M70 108h10M92 108h10M114 108h8" stroke="#e3d5c4" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="84" cy="96" rx="48" ry="34" fill="url(#muffin)" />
      <ellipse cx="84" cy="90" rx="40" ry="26" fill="#d8924c" />
      <circle cx="66" cy="84" r="5" fill="#4a2c1c" />
      <circle cx="86" cy="74" r="4.5" fill="#4a2c1c" />
      <circle cx="104" cy="88" r="5" fill="#4a2c1c" />
      <circle cx="78" cy="100" r="4" fill="#4a2c1c" />
      <circle cx="98" cy="102" r="3.5" fill="#4a2c1c" />
      <g transform="translate(150,18)">
        <rect x="16" y="128" width="52" height="10" rx="4" fill="#e7ebf1" />
        <path d="M22 22h44l10 108H12z" fill="#fff" />
        <path d="M26 52h40l8 74H18z" fill="url(#smoothie)" />
        <ellipse cx="44" cy="54" rx="20" ry="7" fill="#f8c4e6" />
        <rect x="58" y="6" width="5" height="48" rx="2.5" fill="#f3d4ea" transform="rotate(16 60 30)" />
      </g>
    </svg>
  );
}

function Dinner() {
  return (
    <svg className="meal-art" viewBox="0 0 280 180" aria-hidden="true">
      <defs>
        <linearGradient id="soup" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe7a3" />
          <stop offset="1" stopColor="#e6ae3e" />
        </linearGradient>
      </defs>
      <path d="M28 108h176c8 36-24 58-88 58S20 144 28 108z" fill="#f6f8fb" />
      <ellipse cx="116" cy="108" rx="88" ry="22" fill="#fff" />
      <ellipse cx="116" cy="106" rx="64" ry="18" fill="url(#soup)" />
      <path d="M104 98c6 8 16 8 22 0" fill="none" stroke="#3d8c4c" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="116" cy="90" r="6" fill="#3d8c4c" />
      <g transform="translate(168,112)">
        <ellipse cx="46" cy="28" rx="40" ry="14" fill="#f3dcb0" />
        <ellipse cx="28" cy="16" rx="28" ry="12" fill="#e8c48a" />
        <ellipse cx="58" cy="22" rx="24" ry="10" fill="#f7e2bb" />
        <path d="M12 14c10-10 28-10 36 0" fill="none" stroke="#d7ae68" strokeWidth="2" />
      </g>
    </svg>
  );
}
