// ========================================================
// CATÁLOGO DE INTERFACES BOUNDARY UML (CU01 - CU16)
// Según docs/diagrama-clases-completo.md y docs/casos-de-uso-pluviazafra.md
// ========================================================

export { default as InterfazLogin } from "../views/LoginView.jsx";

export {
  InterfazUsuarios,
  InterfazLotes,
  InterfazAtributosLote,
  InterfazZonas,
  InterfazConfiguracion
} from "../views/AdministracionView.jsx";

export { default as InterfazLectura } from "../views/PluviometroView.jsx";
export { default as InterfazAnegamiento } from "../views/AnegamientoView.jsx";
export { default as InterfazPronostico } from "../views/PronosticoView.jsx";

export {
  default as InterfazMapa,
  default as InterfazRanking,
  InterfazAlertaRiesgo,
  InterfazSimulador
} from "../views/CentroControlView.jsx";

export { InterfazParada, InterfazHistorialParadas } from "../views/ParadasView.jsx";
