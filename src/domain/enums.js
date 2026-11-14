// ==========================================
// ENUMERADOS DEL DOMINIO - PLUVIAZAFRA
// Según diagrama-clases-completo.md y compendio-definiciones-calculos.md
// ==========================================

export const Rol = Object.freeze({
  ADMINISTRADOR: "ADMINISTRADOR",
  JEFE_COSECHA: "JEFE_COSECHA",
  OPERADOR_CAMPO: "OPERADOR_CAMPO",
  SUPERVISOR_FABRICA: "SUPERVISOR_FABRICA"
});

export const EstadoLote = Object.freeze({
  PENDIENTE: "PENDIENTE",
  ANEGADO: "ANEGADO",
  EN_COSECHA: "EN_COSECHA",
  COSECHADO: "COSECHADO",
  EN_DESCANSO: "EN_DESCANSO"
});

export const Semaforo = Object.freeze({
  ROJO: "ROJO",
  AMARILLO: "AMARILLO",
  VERDE: "VERDE"
});

export const Suelo = Object.freeze({
  ARENOSO: "ARENOSO",
  FRANCO: "FRANCO",
  ARCILLOSO: "ARCILLOSO"
});

export const Drenaje = Object.freeze({
  BUENO: "BUENO",
  REGULAR: "REGULAR",
  MALO: "MALO"
});

export const Camino = Object.freeze({
  CONSOLIDADO: "CONSOLIDADO",
  ENRIPIADO: "ENRIPIADO",
  TIERRA: "TIERRA"
});

export const CategoriaVulnerabilidad = Object.freeze({
  BAJA: "BAJA",
  MEDIA: "MEDIA",
  ALTA: "ALTA"
});

export const CausaParada = Object.freeze({
  LLUVIA: "LLUVIA",
  FALTA_CANA_EN_PATIO: "FALTA_CANA_EN_PATIO",
  AVERIA_EQUIPOS: "AVERIA_EQUIPOS",
  MANTENIMIENTO_PROGRAMADO: "MANTENIMIENTO_PROGRAMADO",
  OTRA: "OTRA"
});

export const EstadoParada = Object.freeze({
  ABIERTA: "ABIERTA",
  CERRADA: "CERRADA"
});

// Metadatos de presentación para los enumerados (colores y etiquetas del Compendio)
export const ROL_META = Object.freeze({
  [Rol.ADMINISTRADOR]: {
    id: Rol.ADMINISTRADOR,
    nombre: "Administrador",
    avatar: "🛡️",
    descripcion: "Gestiona usuarios, lotes, zonas, parámetros y accede a todas las consultas y controles."
  },
  [Rol.JEFE_COSECHA]: {
    id: Rol.JEFE_COSECHA,
    nombre: "Jefe de cosecha",
    avatar: "👨‍💼",
    descripcion: "Consulta prioridades, mapa, simulador de lluvias, pronóstico e historial de paradas."
  },
  [Rol.OPERADOR_CAMPO]: {
    id: Rol.OPERADOR_CAMPO,
    nombre: "Operador de campo",
    avatar: "🚜",
    descripcion: "Carga mediciones de pluviómetro y reporta lotes anegados."
  },
  [Rol.SUPERVISOR_FABRICA]: {
    id: Rol.SUPERVISOR_FABRICA,
    nombre: "Supervisor de fábrica",
    avatar: "🏭",
    descripcion: "Registra, cierra y corrige paradas de fábrica y consulta su historial."
  }
});

export const SEMAFORO_META = Object.freeze({
  [Semaforo.ROJO]: {
    id: Semaforo.ROJO,
    label: "Urgente",
    color: "#dc2626",
    badgeClass: "badge-urgent",
    significado: "Riesgo alto ante lluvias previstas. Conviene cosecharlo primero."
  },
  [Semaforo.AMARILLO]: {
    id: Semaforo.AMARILLO,
    label: "Atención",
    color: "#d97706",
    badgeClass: "badge-warning",
    significado: "Riesgo moderado. Conviene cosecharlo si hay margen."
  },
  [Semaforo.VERDE]: {
    id: Semaforo.VERDE,
    label: "Puede esperar",
    color: "#16a34a",
    badgeClass: "badge-safe",
    significado: "Riesgo bajo. Puede cosecharse después."
  }
});

export const ESTADO_LOTE_META = Object.freeze({
  [EstadoLote.PENDIENTE]: {
    id: EstadoLote.PENDIENTE,
    label: "Pendiente",
    color: "#64748b",
    badgeClass: "badge-safe",
    esOperativo: false
  },
  [EstadoLote.ANEGADO]: {
    id: EstadoLote.ANEGADO,
    label: "Anegado",
    color: "#3b82f6",
    badgeClass: "badge-anegado",
    esOperativo: true,
    significado: "Ya está intransitable por lluvia. Se cosecha cuando vuelva a ser accesible."
  },
  [EstadoLote.EN_COSECHA]: {
    id: EstadoLote.EN_COSECHA,
    label: "En cosecha",
    color: "#f97316",
    badgeClass: "badge-en-cosecha",
    esOperativo: true,
    significado: "Cosecha iniciada."
  },
  [EstadoLote.COSECHADO]: {
    id: EstadoLote.COSECHADO,
    label: "Cosechado",
    color: "#64748b",
    badgeClass: "badge-harvested",
    esOperativo: true,
    significado: "Cosecha terminada."
  },
  [EstadoLote.EN_DESCANSO]: {
    id: EstadoLote.EN_DESCANSO,
    label: "En descanso",
    color: "#94a3b8",
    badgeClass: "badge-descanso",
    esOperativo: true,
    significado: "Fuera de la zafra actual (renovación, barbecho)."
  }
});

export const SUELO_LABELS = Object.freeze({
  [Suelo.ARENOSO]: "Arenoso",
  [Suelo.FRANCO]: "Franco",
  [Suelo.ARCILLOSO]: "Arcilloso"
});

export const DRENAJE_LABELS = Object.freeze({
  [Drenaje.BUENO]: "Bueno",
  [Drenaje.REGULAR]: "Regular",
  [Drenaje.MALO]: "Malo"
});

export const CAMINO_LABELS = Object.freeze({
  [Camino.CONSOLIDADO]: "Consolidado",
  [Camino.ENRIPIADO]: "Enripiado",
  [Camino.TIERRA]: "Tierra"
});

export const CATEGORIA_LABELS = Object.freeze({
  [CategoriaVulnerabilidad.BAJA]: "Baja",
  [CategoriaVulnerabilidad.MEDIA]: "Media",
  [CategoriaVulnerabilidad.ALTA]: "Alta"
});

export const CAUSA_PARADA_LABELS = Object.freeze({
  [CausaParada.LLUVIA]: "Lluvia",
  [CausaParada.FALTA_CANA_EN_PATIO]: "Falta de caña en el patio",
  [CausaParada.AVERIA_EQUIPOS]: "Avería de equipos",
  [CausaParada.MANTENIMIENTO_PROGRAMADO]: "Mantenimiento programado",
  [CausaParada.OTRA]: "Otra"
});

export const ESTADO_PARADA_LABELS = Object.freeze({
  [EstadoParada.ABIERTA]: "Abierta (en curso)",
  [EstadoParada.CERRADA]: "Cerrada"
});
