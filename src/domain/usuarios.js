// ==========================================
// USUARIOS Y ROLES - PRINCIPIO DE MÍNIMO PRIVILEGIO (PoLP)
// Ingenio La Esperanza - Sistema PluviaZafra
// ==========================================

export const ROLES = {
  JEFE_COSECHA: {
    id: "JEFE_COSECHA",
    nombre: "Jefe de Cosecha & Planificador Agrícola",
    descripcion: "Gestión agronómica estratégica, simulación de lluvias DSS, catastro de lotes y balance de zafra.",
    nivelPrivilegio: "ESTRATEGICO",
    vistasPermitidas: ["resumen", "centro-control", "catastro", "auditoria"],
    vistaPorDefecto: "resumen"
  },
  COSECHADOR_CAMPO: {
    id: "COSECHADOR_CAMPO",
    nombre: "Cosechador / Encargado de Frente (Campo)",
    descripcion: "Operación en frente de corte, alerta de tránsito en caminos y registro matutino de pluviómetros.",
    nivelPrivilegio: "OPERATIVO_CAMPO",
    vistasPermitidas: ["frente", "pluviometro"],
    vistaPorDefecto: "frente"
  },
  AUDITOR_FABRICA: {
    id: "AUDITOR_FABRICA",
    nombre: "Auditor de Fábrica & Molienda Industrial",
    descripcion: "Supervisión de abastecimiento de caña en canchón, horas de molienda y costos de paradas.",
    nivelPrivilegio: "AUDITORIA_INDUSTRIAL",
    vistasPermitidas: ["resumen", "centro-control", "auditoria"],
    vistaPorDefecto: "resumen"
  }
};

export const USUARIOS_INICIALES = [
  {
    id: "usr-01",
    username: "jefe.cosecha",
    password: "123",
    nombre: "Ing. Carlos Mendoza",
    cargo: "Jefe de Cosecha & Logística Agrícola",
    rol: "JEFE_COSECHA",
    avatar: "👨‍💼",
    fincaPrincipal: "Todas las Fincas (Supervisión General)",
    email: "carlos.mendoza@laesperanza.com.ar",
    vistasPermitidas: ROLES.JEFE_COSECHA.vistasPermitidas,
    vistaPorDefecto: ROLES.JEFE_COSECHA.vistaPorDefecto
  },
  {
    id: "usr-02",
    username: "cosechador.frente1",
    password: "123",
    nombre: "Roberto Farfán",
    cargo: "Operador Frente N° 1 — Cosechadora John Deere CH570",
    rol: "COSECHADOR_CAMPO",
    avatar: "🚜",
    fincaPrincipal: "Finca Miraflores / Cuadrilla Norte",
    email: "roberto.farfan@laesperanza.com.ar",
    vistasPermitidas: ROLES.COSECHADOR_CAMPO.vistasPermitidas,
    vistaPorDefecto: ROLES.COSECHADOR_CAMPO.vistaPorDefecto
  },
  {
    id: "usr-03",
    username: "gerente.fabrica",
    password: "123",
    nombre: "Lic. Horacio Valdiviezo",
    cargo: "Gerente de Recepción de Caña & Molienda",
    rol: "AUDITOR_FABRICA",
    avatar: "🏭",
    fincaPrincipal: "Fábrica Central & Canchón Ingenio",
    email: "horacio.valdiviezo@laesperanza.com.ar",
    vistasPermitidas: ROLES.AUDITOR_FABRICA.vistasPermitidas,
    vistaPorDefecto: ROLES.AUDITOR_FABRICA.vistaPorDefecto
  }
];
