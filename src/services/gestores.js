// ==========================================
// CAPA DE CONTROL - 12 GESTORES Y SERVICIO EXTERNO (BCE)
// Según diagrama-clases-completo.md y compendio-definiciones-calculos.md
// ==========================================

import { DatasheetStore, crearDatasheetsIniciales } from "../domain/datasheets.js";
import {
  Rol,
  EstadoLote,
  Semaforo,
  CategoriaVulnerabilidad,
  CausaParada,
  EstadoParada,
  CAUSA_PARADA_LABELS
} from "../domain/enums.js";
import {
  Usuario,
  Zona,
  Pluviometro,
  Lote,
  AtributosVulnerabilidad,
  Lectura,
  Anegamiento,
  Pronostico,
  PronosticoDia,
  ItemRanking,
  Ranking,
  Configuracion,
  Parada
} from "../domain/entities.js";

// ==========================================
// HELPER DE SESIÓN EN MEMORIA
// ==========================================
let _usuarioActual = null;

function resolverIdCodigo(entidadOCodigo, campo = "codigo") {
  if (!entidadOCodigo) return null;
  return typeof entidadOCodigo === "object" ? entidadOCodigo[campo] : entidadOCodigo;
}

// ==========================================
// 1. SERVICIO EXTERNO: Open-Meteo
// ==========================================
export class ServicioOpenMeteo {
  static async consultarPronostico(latitud, longitud, horas = 48) {
    const diasNecesarios = Math.max(1, Math.min(7, Math.ceil(Number(horas) / 24)));
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitud}&longitude=${longitud}&daily=precipitation_sum&forecast_days=${diasNecesarios}&timezone=America%2FArgentina%2FJujuy`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Open-Meteo HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!data?.daily?.time || !data?.daily?.precipitation_sum) {
      throw new Error("Respuesta inválida de Open-Meteo");
    }

    const dias = data.daily.time.slice(0, diasNecesarios).map(
      (fecha, idx) =>
        new PronosticoDia({
          fecha,
          milimetros: Number(data.daily.precipitation_sum[idx] || 0)
        })
    );

    return dias;
  }
}

// ==========================================
// 2. GESTOR DE SESIÓN (CU01) + CONTROL DE ACCESO (PoLP)
// ==========================================
export class GestorSesion {
  static VISTAS_SISTEMA = Object.freeze({
    "centro-control": {
      id: "centro-control",
      titulo: "Mapa, Ranking y Simulador",
      icono: "🗺️",
      descripcion: "CU11, CU12, CU15, CU16 — Priorización de cosecha, mapa satelital, alertas y simulador"
    },
    "pronostico": {
      id: "pronostico",
      titulo: "Pronóstico",
      icono: "🌦️",
      descripcion: "CU09 — Lluvia prevista por zona desde Open-Meteo"
    },
    "pluviometro": {
      id: "pluviometro",
      titulo: "Lectura Pluviómetro",
      icono: "🌧️",
      descripcion: "CU08 — Registro manual de milímetros de lluvia por zona"
    },
    "anegamiento": {
      id: "anegamiento",
      titulo: "Anegamientos",
      icono: "🌊",
      descripcion: "CU05 — Apertura y cierre de eventos de lotes intransitables"
    },
    "paradas": {
      id: "paradas",
      titulo: "Paradas de Fábrica",
      icono: "🏭",
      descripcion: "CU13, CU14 — Registro de paradas de molienda e historial"
    },
    "administracion": {
      id: "administracion",
      titulo: "Administración",
      icono: "⚙️",
      descripcion: "CU02, CU03, CU04, CU06, CU07 — Usuarios, lotes, atributos, zonas y parámetros"
    }
  });

  // Matriz de casos de uso por rol según casos-de-uso-por-usuario.md
  static PERMISOS_CU_POR_ROL = Object.freeze({
    [Rol.JEFE_COSECHA]: [
      "CU01", "CU05", "CU09", "CU11", "CU12", "CU14", "CU15", "CU16"
    ],
    [Rol.OPERADOR_CAMPO]: [
      "CU01", "CU05", "CU08"
    ],
    [Rol.SUPERVISOR_FABRICA]: [
      "CU01", "CU13", "CU14"
    ],
    [Rol.ADMINISTRADOR]: [
      "CU01", "CU02", "CU03", "CU04", "CU05", "CU06", "CU07",
      "CU09", "CU11", "CU12", "CU14", "CU15", "CU16"
    ]
  });

  static VISTAS_POR_ROL = Object.freeze({
    [Rol.JEFE_COSECHA]: ["centro-control", "pronostico", "anegamiento", "paradas"],
    [Rol.OPERADOR_CAMPO]: ["pluviometro", "anegamiento"],
    [Rol.SUPERVISOR_FABRICA]: ["paradas"],
    [Rol.ADMINISTRADOR]: [
      "centro-control",
      "pronostico",
      "anegamiento",
      "paradas",
      "administracion"
    ]
  });

  static VISTA_DEFECTO_POR_ROL = Object.freeze({
    [Rol.JEFE_COSECHA]: "centro-control",
    [Rol.OPERADOR_CAMPO]: "pluviometro",
    [Rol.SUPERVISOR_FABRICA]: "paradas",
    [Rol.ADMINISTRADOR]: "centro-control"
  });

  static iniciarSesion(correo, clave) {
    const correoNorm = String(correo || "").trim().toLowerCase();
    const claveStr = String(clave || "").trim();

    const fila = DatasheetStore.getSheet("usuarios").find(
      (u) => u.correo.toLowerCase() === correoNorm && u.clave === claveStr
    );

    if (!fila) {
      return {
        exito: false,
        usuario: null,
        error: "Credenciales incorrectas. Verificá el correo y la contraseña."
      };
    }

    if (!fila.habilitado || !fila.rol) {
      return {
        exito: false,
        usuario: null,
        error: "Usuario deshabilitado o sin rol asignado. Consultá al administrador."
      };
    }

    _usuarioActual = new Usuario(fila);
    return { exito: true, usuario: _usuarioActual, error: null };
  }

  static iniciarSesionPorId(usuarioId) {
    const fila = DatasheetStore.getSheet("usuarios").find((u) => u.id === usuarioId);
    if (!fila) {
      return { exito: false, usuario: null, error: "Usuario no encontrado." };
    }
    if (!fila.habilitado || !fila.rol) {
      return {
        exito: false,
        usuario: null,
        error: "Usuario deshabilitado o sin rol asignado. Consultá al administrador."
      };
    }
    _usuarioActual = new Usuario(fila);
    return { exito: true, usuario: _usuarioActual, error: null };
  }

  static cerrarSesion() {
    _usuarioActual = null;
  }

  static obtenerUsuarioActual() {
    return _usuarioActual;
  }

  static obtenerRol(usuario = _usuarioActual) {
    return usuario?.rol || null;
  }

  static puedeEjecutar(usuario, codigoCU) {
    const rol = this.obtenerRol(usuario);
    if (!rol || !usuario?.habilitado) return false;
    const permitidos = this.PERMISOS_CU_POR_ROL[rol] || [];
    return permitidos.includes(codigoCU);
  }

  static tienePermisoVista(usuario, idVista) {
    const rol = this.obtenerRol(usuario);
    if (!rol || !usuario?.habilitado) return false;
    const vistas = this.VISTAS_POR_ROL[rol] || [];
    return vistas.includes(idVista);
  }

  static obtenerVistasPermitidas(usuario) {
    const rol = this.obtenerRol(usuario);
    if (!rol) return [];
    return (this.VISTAS_POR_ROL[rol] || [])
      .map((id) => this.VISTAS_SISTEMA[id])
      .filter(Boolean);
  }

  static obtenerVistaPorDefecto(usuario) {
    const rol = this.obtenerRol(usuario);
    return this.VISTA_DEFECTO_POR_ROL[rol] || "centro-control";
  }
}

// ==========================================
// 3. GESTOR DE USUARIOS Y ROLES (CU02)
// ==========================================
export class GestorUsuarios {
  static listarUsuarios() {
    return DatasheetStore.getSheet("usuarios").map((u) => new Usuario(u));
  }

  static obtenerPorId(id) {
    const u = DatasheetStore.getSheet("usuarios").find((x) => x.id === id);
    return u ? new Usuario(u) : null;
  }

  static esUltimoAdministrador(u) {
    const userId = resolverIdCodigo(u, "id");
    const adminsActivos = DatasheetStore.getSheet("usuarios").filter(
      (x) => x.rol === Rol.ADMINISTRADOR && x.habilitado
    );
    return adminsActivos.length <= 1 && adminsActivos.some((x) => x.id === userId);
  }

  static crearUsuario(nombre, correo, rol, clave = "123") {
    const nombreLimpio = String(nombre || "").trim();
    const correoLimpio = String(correo || "").trim().toLowerCase();

    if (!nombreLimpio || !correoLimpio || !rol) {
      throw new Error("Nombre, correo y rol son obligatorios.");
    }
    if (!Object.values(Rol).includes(rol)) {
      throw new Error("Rol inválido.");
    }

    const existe = DatasheetStore.getSheet("usuarios").some(
      (u) => u.correo.toLowerCase() === correoLimpio
    );
    if (existe) {
      throw new Error(`El correo '${correoLimpio}' ya se encuentra registrado.`);
    }

    const nuevo = new Usuario({
      id: `usr-${Date.now().toString(36)}`,
      nombre: nombreLimpio,
      correo: correoLimpio,
      rol,
      habilitado: true,
      clave: clave || "123"
    });

    DatasheetStore.mutate((ds) => {
      ds.usuarios.push({ ...nuevo });
    });

    return nuevo;
  }

  static cambiarRol(u, nuevoRol) {
    const userId = resolverIdCodigo(u, "id");
    if (!Object.values(Rol).includes(nuevoRol)) {
      throw new Error("Rol inválido.");
    }

    const actual = this.obtenerPorId(userId);
    if (!actual) throw new Error("Usuario no encontrado.");

    if (
      actual.rol === Rol.ADMINISTRADOR &&
      nuevoRol !== Rol.ADMINISTRADOR &&
      this.esUltimoAdministrador(actual)
    ) {
      throw new Error(
        "No se puede quitar el rol de Administrador porque es el último administrador activo (RN05)."
      );
    }

    DatasheetStore.mutate((ds) => {
      const idx = ds.usuarios.findIndex((x) => x.id === userId);
      if (idx !== -1) ds.usuarios[idx].rol = nuevoRol;
    });

    return this.obtenerPorId(userId);
  }

  static deshabilitar(u) {
    const userId = resolverIdCodigo(u, "id");
    const actual = this.obtenerPorId(userId);
    if (!actual) throw new Error("Usuario no encontrado.");

    if (this.esUltimoAdministrador(actual)) {
      throw new Error(
        "No se puede deshabilitar al último administrador activo (RN05)."
      );
    }

    DatasheetStore.mutate((ds) => {
      const idx = ds.usuarios.findIndex((x) => x.id === userId);
      if (idx !== -1) ds.usuarios[idx].habilitado = false;
    });

    return this.obtenerPorId(userId);
  }

  static habilitar(u) {
    const userId = resolverIdCodigo(u, "id");
    DatasheetStore.mutate((ds) => {
      const idx = ds.usuarios.findIndex((x) => x.id === userId);
      if (idx !== -1) ds.usuarios[idx].habilitado = true;
    });
    return this.obtenerPorId(userId);
  }
}

// ==========================================
// 4. GESTOR DE ZONAS Y PLUVIÓMETROS (CU07)
// ==========================================
export class GestorZonas {
  static listarZonas() {
    const zonas = DatasheetStore.getSheet("zonas");
    return zonas.map((z) => new Zona(z));
  }

  static obtenerPorCodigo(codigo) {
    const z = DatasheetStore.getSheet("zonas").find((x) => x.codigo === codigo);
    return z ? new Zona(z) : null;
  }

  static pluviometroActivo(z) {
    const zonaCodigo = resolverIdCodigo(z, "codigo");
    const p = DatasheetStore.getSheet("pluviometros").find(
      (x) => x.zonaCodigo === zonaCodigo && x.activo
    );
    return p ? new Pluviometro(p) : null;
  }

  static listarPluviometros(z = null) {
    const zonaCodigo = resolverIdCodigo(z, "codigo");
    const todos = DatasheetStore.getSheet("pluviometros");
    const filtrados = zonaCodigo ? todos.filter((p) => p.zonaCodigo === zonaCodigo) : todos;
    return filtrados.map((p) => new Pluviometro(p));
  }

  static crearZona(datos) {
    const codigo = String(datos.codigo || "").trim().toUpperCase();
    const nombre = String(datos.nombre || "").trim();
    const latitud = Number(datos.latitud);
    const longitud = Number(datos.longitud);

    if (!codigo || !nombre || Number.isNaN(latitud) || Number.isNaN(longitud)) {
      throw new Error("Código, nombre y coordenadas de referencia son obligatorios.");
    }

    const existe = DatasheetStore.getSheet("zonas").some((z) => z.codigo === codigo);
    if (existe) {
      throw new Error(`El código de zona '${codigo}' ya existe.`);
    }

    const nuevaZona = new Zona({ codigo, nombre, latitud, longitud });
    DatasheetStore.mutate((ds) => {
      ds.zonas.push({ ...nuevaZona });
    });

    if (datos.pluviometroCodigo) {
      this.registrarPluviometro(nuevaZona, {
        codigo: datos.pluviometroCodigo,
        latitud: datos.pluviometroLatitud ?? latitud,
        longitud: datos.pluviometroLongitud ?? longitud
      });
    }

    return nuevaZona;
  }

  static modificarZona(z, datos) {
    const zonaCodigo = resolverIdCodigo(z, "codigo");
    DatasheetStore.mutate((ds) => {
      const idx = ds.zonas.findIndex((x) => x.codigo === zonaCodigo);
      if (idx === -1) throw new Error("Zona no encontrada.");
      if (datos.nombre) ds.zonas[idx].nombre = String(datos.nombre).trim();
      if (datos.latitud !== undefined) ds.zonas[idx].latitud = Number(datos.latitud);
      if (datos.longitud !== undefined) ds.zonas[idx].longitud = Number(datos.longitud);
    });
    return this.obtenerPorCodigo(zonaCodigo);
  }

  static darDeBajaZona(z) {
    const zonaCodigo = resolverIdCodigo(z, "codigo");
    const lotesAsociados = DatasheetStore.getSheet("lotes").filter(
      (l) => l.zonaCodigo === zonaCodigo
    );
    if (lotesAsociados.length > 0) {
      throw new Error(
        `No se puede dar de baja la zona porque tiene ${lotesAsociados.length} lote(s) asignado(s). Reasignarlos primero (RN03).`
      );
    }

    DatasheetStore.mutate((ds) => {
      ds.zonas = ds.zonas.filter((x) => x.codigo !== zonaCodigo);
    });
    return true;
  }

  static registrarPluviometro(z, datos) {
    const zonaCodigo = resolverIdCodigo(z, "codigo");
    const activo = this.pluviometroActivo(zonaCodigo);
    if (activo) {
      return this.reemplazarPluviometro(zonaCodigo, datos);
    }

    const codigo = String(datos.codigo || "").trim().toUpperCase();
    if (!codigo) throw new Error("El código del pluviómetro es obligatorio.");

    const existeCodigo = DatasheetStore.getSheet("pluviometros").some(
      (p) => p.codigo === codigo
    );
    if (existeCodigo) {
      throw new Error(`El código de pluviómetro '${codigo}' ya existe.`);
    }

    const zonaObj = this.obtenerPorCodigo(zonaCodigo);
    const nuevo = new Pluviometro({
      codigo,
      zonaCodigo,
      latitud: datos.latitud ?? zonaObj?.latitud ?? -24.22,
      longitud: datos.longitud ?? zonaObj?.longitud ?? -64.84,
      activo: true
    });

    DatasheetStore.mutate((ds) => {
      ds.pluviometros.push({ ...nuevo });
    });

    return nuevo;
  }

  static reemplazarPluviometro(z, datos) {
    const zonaCodigo = resolverIdCodigo(z, "codigo");
    const codigo = String(datos.codigo || "").trim().toUpperCase();
    if (!codigo) throw new Error("El código del nuevo pluviómetro es obligatorio.");

    const existeCodigo = DatasheetStore.getSheet("pluviometros").some(
      (p) => p.codigo === codigo
    );
    if (existeCodigo) {
      throw new Error(`El código de pluviómetro '${codigo}' ya existe.`);
    }

    const zonaObj = this.obtenerPorCodigo(zonaCodigo);
    const nuevo = new Pluviometro({
      codigo,
      zonaCodigo,
      latitud: datos.latitud ?? zonaObj?.latitud ?? -24.22,
      longitud: datos.longitud ?? zonaObj?.longitud ?? -64.84,
      activo: true
    });

    DatasheetStore.mutate((ds) => {
      // RN04: El anterior queda inactivo, nunca se borra para conservar sus lecturas
      ds.pluviometros.forEach((p) => {
        if (p.zonaCodigo === zonaCodigo && p.activo) {
          p.activo = false;
        }
      });
      ds.pluviometros.push({ ...nuevo });
    });

    return nuevo;
  }

  static desactivarPluviometro(p) {
    const codigo = resolverIdCodigo(p, "codigo");
    DatasheetStore.mutate((ds) => {
      const idx = ds.pluviometros.findIndex((x) => x.codigo === codigo);
      if (idx !== -1) {
        ds.pluviometros[idx].activo = false;
      }
    });
  }
}

// ==========================================
// GEOMETRÍA AUXILIAR PARA POLÍGONOS (CU03)
// ==========================================
function orientacion(p, q, r) {
  const val = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1]);
  if (Math.abs(val) < 1e-12) return 0;
  return val > 0 ? 1 : 2;
}

function enSegmento(p, q, r) {
  return (
    q[0] <= Math.max(p[0], r[0]) + 1e-12 &&
    q[0] >= Math.min(p[0], r[0]) - 1e-12 &&
    q[1] <= Math.max(p[1], r[1]) + 1e-12 &&
    q[1] >= Math.min(p[1], r[1]) - 1e-12
  );
}

function segmentosSeCruzan(p1, q1, p2, q2) {
  const o1 = orientacion(p1, q1, p2);
  const o2 = orientacion(p1, q1, q2);
  const o3 = orientacion(p2, q2, p1);
  const o4 = orientacion(p2, q2, q1);

  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && enSegmento(p1, p2, q1)) return true;
  if (o2 === 0 && enSegmento(p1, q2, q1)) return true;
  if (o3 === 0 && enSegmento(p2, p1, q2)) return true;
  if (o4 === 0 && enSegmento(p2, q1, q2)) return true;
  return false;
}

function puntoEnPoligono(punto, poligono) {
  const [x, y] = punto;
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i];
    const [xj, yj] = poligono[j];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-15) + xi;
    if (intersect) dentro = !dentro;
  }
  return dentro;
}

// ==========================================
// 5. GESTOR DE LOTES (CU03)
// ==========================================
export class GestorLotes {
  static existeCodigo(codigo) {
    const norm = String(codigo || "").trim().toUpperCase();
    return DatasheetStore.getSheet("lotes").some((l) => l.codigo.toUpperCase() === norm);
  }

  static validarPoligono(poligono) {
    if (!Array.isArray(poligono) || poligono.length < 3) {
      return false;
    }
    const n = poligono.length;
    for (let i = 0; i < n; i++) {
      const p1 = poligono[i];
      const q1 = poligono[(i + 1) % n];
      if (
        !Array.isArray(p1) ||
        p1.length < 2 ||
        Number.isNaN(Number(p1[0])) ||
        Number.isNaN(Number(p1[1]))
      ) {
        return false;
      }
      for (let j = i + 1; j < n; j++) {
        // Saltar aristas adyacentes
        if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) continue;
        const p2 = poligono[j];
        const q2 = poligono[(j + 1) % n];
        if (segmentosSeCruzan(p1, q1, p2, q2)) {
          return false;
        }
      }
    }
    return true;
  }

  // Compendio 4.12: Proyección plana respecto a latitud media + Fórmula de Gauss (Shoelace)
  static calcularAreaHa(poligono) {
    if (!Array.isArray(poligono) || poligono.length < 3) return 0;

    const R = 6371000;
    const toRad = (deg) => (Number(deg) * Math.PI) / 180;

    const latsRad = poligono.map((v) => toRad(v[0]));
    const lngsRad = poligono.map((v) => toRad(v[1]));
    const phi0 = latsRad.reduce((a, b) => a + b, 0) / latsRad.length;
    const cosPhi0 = Math.cos(phi0);

    const coordsM = poligono.map((_, idx) => ({
      x: R * cosPhi0 * lngsRad[idx],
      y: R * latsRad[idx]
    }));

    let suma = 0;
    const n = coordsM.length;
    for (let i = 0; i < n; i++) {
      const actual = coordsM[i];
      const sig = coordsM[(i + 1) % n];
      suma += actual.x * sig.y - sig.x * actual.y;
    }

    const areaM2 = Math.abs(suma) / 2;
    return Number((areaM2 / 10000).toFixed(2));
  }

  static controlarDiferenciaArea(hectareas, poligono) {
    const ha = Number(hectareas);
    const areaCalculadaHa = this.calcularAreaHa(poligono);
    if (!ha || ha <= 0 || areaCalculadaHa <= 0) {
      return { areaCalculadaHa, diferenciaPct: 0, superaUmbral: false };
    }
    const diferenciaPct = Number(
      ((Math.abs(areaCalculadaHa - ha) / ha) * 100).toFixed(1)
    );
    return {
      areaCalculadaHa,
      diferenciaPct,
      superaUmbral: diferenciaPct > 10
    };
  }

  static superponeConOtro(poligono, codigoExcluir = null) {
    if (!Array.isArray(poligono) || poligono.length < 3) return false;
    const otros = DatasheetStore.getSheet("lotes").filter(
      (l) => l.codigo !== codigoExcluir && Array.isArray(l.poligono) && l.poligono.length >= 3
    );

    for (const otro of otros) {
      const pB = otro.poligono;
      // 1. Algún vértice dentro del otro polígono
      if (poligono.some((v) => puntoEnPoligono(v, pB))) return otro.codigo;
      if (pB.some((v) => puntoEnPoligono(v, poligono))) return otro.codigo;

      // 2. Alguna arista se cruza con otra
      for (let i = 0; i < poligono.length; i++) {
        const a1 = poligono[i];
        const a2 = poligono[(i + 1) % poligono.length];
        for (let j = 0; j < pB.length; j++) {
          const b1 = pB[j];
          const b2 = pB[(j + 1) % pB.length];
          if (segmentosSeCruzan(a1, a2, b1, b2)) return otro.codigo;
        }
      }
    }
    return false;
  }

  static tieneHistorial(l) {
    const codigo = resolverIdCodigo(l, "codigo");
    const aneg = DatasheetStore.getSheet("anegamientos").some(
      (a) => a.loteCodigo === codigo
    );
    const atrs = DatasheetStore.getSheet("atributosVulnerabilidad").some(
      (a) => a.loteCodigo === codigo
    );
    const cambios = DatasheetStore.getSheet("cambiosEstadoLote").some(
      (c) => c.loteCodigo === codigo
    );
    const rankings = DatasheetStore.getSheet("rankings").some(
      (r) =>
        (r.items || []).some((it) => it.loteCodigo === codigo) ||
        (r.lotesIncompletos || []).some((it) => it.loteCodigo === codigo)
    );
    return aneg || atrs || cambios || rankings;
  }

  static listarLotes(filtro = {}) {
    const lotes = DatasheetStore.getSheet("lotes");
    const attrs = DatasheetStore.getSheet("atributosVulnerabilidad");
    const zonas = DatasheetStore.getSheet("zonas");

    let res = lotes.map((raw) => {
      const lote = new Lote(raw);
      const zona = zonas.find((z) => z.codigo === lote.zonaCodigo);
      const vigente = lote.atributosVigentes(attrs);
      return {
        ...lote,
        zonaNombre: zona?.nombre || lote.zonaCodigo,
        atributos: vigente,
        completo: lote.estaCompleto(attrs),
        elegible: lote.esElegible(attrs),
        instancia: lote
      };
    });

    if (filtro.zonaCodigo && filtro.zonaCodigo !== "TODAS") {
      res = res.filter((l) => l.zonaCodigo === filtro.zonaCodigo);
    }
    if (filtro.estado && filtro.estado !== "TODOS") {
      res = res.filter((l) => l.estado === filtro.estado);
    }
    return res;
  }

  static obtenerPorCodigo(codigo) {
    const raw = DatasheetStore.getSheet("lotes").find((l) => l.codigo === codigo);
    return raw ? new Lote(raw) : null;
  }

  static listarElegibles() {
    const attrs = DatasheetStore.getSheet("atributosVulnerabilidad");
    return DatasheetStore.getSheet("lotes")
      .map((raw) => new Lote(raw))
      .filter((l) => l.esElegible(attrs));
  }

  static crearLote(datos, usuario = _usuarioActual) {
    const codigo = String(datos.codigo || "").trim().toUpperCase();
    const nombre = String(datos.nombre || "").trim();
    const hectareas = Number(datos.hectareas);
    const toneladas = Number(datos.toneladas);
    const zonaCodigo = datos.zonaCodigo;
    const poligono = datos.poligono || [];

    if (!codigo || !nombre || !zonaCodigo) {
      throw new Error("Código, nombre y zona son obligatorios.");
    }
    if (this.existeCodigo(codigo)) {
      throw new Error(`El código de lote '${codigo}' ya existe (RN01).`);
    }
    if (Number.isNaN(hectareas) || hectareas <= 0) {
      throw new Error("Las hectáreas deben ser un número positivo.");
    }
    if (Number.isNaN(toneladas) || toneladas <= 0) {
      throw new Error("Las toneladas de caña deben ser un número positivo.");
    }
    if (poligono.length > 0 && !this.validarPoligono(poligono)) {
      throw new Error("El polígono es inválido (mínimo 3 puntos y sin cruces).");
    }

    const nuevo = new Lote({
      codigo,
      nombre,
      hectareas,
      toneladas,
      poligono,
      zonaCodigo,
      estado: EstadoLote.PENDIENTE,
      semaforo: null
    });

    DatasheetStore.mutate((ds) => {
      ds.lotes.push({ ...nuevo });
      ds.cambiosEstadoLote.push({
        id: `est-${Date.now().toString(36)}`,
        loteCodigo: codigo,
        estadoAnterior: null,
        estadoNuevo: EstadoLote.PENDIENTE,
        fechaHora: new Date().toISOString(),
        usuarioId: usuario?.id || null,
        motivo: "Alta inicial del lote"
      });
    });

    return nuevo;
  }

  static modificarLote(l, datos) {
    const codigo = resolverIdCodigo(l, "codigo");
    const hectareas = datos.hectareas !== undefined ? Number(datos.hectareas) : undefined;
    const toneladas = datos.toneladas !== undefined ? Number(datos.toneladas) : undefined;

    if (hectareas !== undefined && (Number.isNaN(hectareas) || hectareas <= 0)) {
      throw new Error("Las hectáreas deben ser positivas.");
    }
    if (toneladas !== undefined && (Number.isNaN(toneladas) || toneladas <= 0)) {
      throw new Error("Las toneladas deben ser positivas.");
    }
    if (datos.poligono && datos.poligono.length > 0 && !this.validarPoligono(datos.poligono)) {
      throw new Error("El polígono dibujado es inválido o se cruza consigo mismo.");
    }

    DatasheetStore.mutate((ds) => {
      const idx = ds.lotes.findIndex((x) => x.codigo === codigo);
      if (idx === -1) throw new Error("Lote no encontrado.");
      const actual = ds.lotes[idx];
      ds.lotes[idx] = {
        ...actual,
        nombre: datos.nombre !== undefined ? String(datos.nombre).trim() : actual.nombre,
        hectareas: hectareas !== undefined ? hectareas : actual.hectareas,
        toneladas: toneladas !== undefined ? toneladas : actual.toneladas,
        zonaCodigo: datos.zonaCodigo !== undefined ? datos.zonaCodigo : actual.zonaCodigo,
        poligono: datos.poligono !== undefined ? datos.poligono : actual.poligono
      };
    });

    return this.obtenerPorCodigo(codigo);
  }

  static cambiarEstado(l, nuevoEstado, usuario = _usuarioActual, motivo = "Cambio manual") {
    const codigo = resolverIdCodigo(l, "codigo");
    if (!Object.values(EstadoLote).includes(nuevoEstado)) {
      throw new Error("Estado operativo de lote inválido.");
    }

    DatasheetStore.mutate((ds) => {
      const idx = ds.lotes.findIndex((x) => x.codigo === codigo);
      if (idx === -1) throw new Error("Lote no encontrado.");
      const estadoAnterior = ds.lotes[idx].estado;
      ds.lotes[idx].estado = nuevoEstado;
      if (nuevoEstado !== EstadoLote.PENDIENTE) {
        ds.lotes[idx].semaforo = null;
      }
      ds.cambiosEstadoLote.push({
        id: `est-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
        loteCodigo: codigo,
        estadoAnterior,
        estadoNuevo: nuevoEstado,
        fechaHora: new Date().toISOString(),
        usuarioId: usuario?.id || null,
        motivo
      });
    });

    return this.obtenerPorCodigo(codigo);
  }

  static darDeBaja(l, usuario = _usuarioActual) {
    const codigo = resolverIdCodigo(l, "codigo");
    if (this.tieneHistorial(codigo)) {
      return {
        eliminado: false,
        requiereDescanso: true,
        mensaje:
          "El lote tiene historial asociado (anegamientos, atributos o rankings). Según RN02 debe pasarse a 'En descanso' en lugar de eliminarse."
      };
    }

    DatasheetStore.mutate((ds) => {
      ds.lotes = ds.lotes.filter((x) => x.codigo !== codigo);
    });

    return {
      eliminado: true,
      requiereDescanso: false,
      mensaje: `Lote ${codigo} eliminado correctamente.`,
      usuarioId: usuario?.id || null
    };
  }
}

// ==========================================
// 6. GESTOR DE CONFIGURACIÓN (CU06)
// ==========================================
export class GestorConfiguracion {
  static obtenerVigente() {
    const lista = DatasheetStore.getSheet("configuraciones");
    if (!lista || lista.length === 0) {
      const def = crearDatasheetsIniciales().configuraciones[0];
      return new Configuracion(def);
    }
    const ordenada = [...lista].sort((a, b) => Number(b.version) - Number(a.version));
    return new Configuracion(ordenada[0]);
  }

  static listarHistorial() {
    return [...DatasheetStore.getSheet("configuraciones")]
      .sort((a, b) => Number(b.version) - Number(a.version))
      .map((c) => new Configuracion(c));
  }

  static validar(c) {
    const cfg = c instanceof Configuracion ? c : new Configuracion(c);
    const errores = [];

    const pesos = [
      cfg.pesoSuelo,
      cfg.pesoDrenaje,
      cfg.pesoCamino,
      cfg.pesoHistorial,
      cfg.pesoUltimaZafra
    ];
    if (pesos.some((p) => Number.isNaN(p) || p < 0)) {
      errores.push("Todos los pesos deben ser numéricos no negativos.");
    }
    if (!cfg.pesosSumanUno()) {
      errores.push(`Los pesos deben sumar 1 (suma actual: ${cfg.sumaPesos()}).`);
    }

    const todosPuntajes = [
      ...Object.values(cfg.puntajesSuelo || {}),
      ...Object.values(cfg.puntajesDrenaje || {}),
      ...Object.values(cfg.puntajesCamino || {})
    ];
    if (todosPuntajes.some((v) => Number.isNaN(Number(v)) || Number(v) < 0 || Number(v) > 100)) {
      errores.push("Todos los puntajes de tablas deben estar entre 0 y 100.");
    }

    if (
      Number.isNaN(cfg.topeHistorial) ||
      cfg.topeHistorial <= 0 ||
      Number.isNaN(cfg.topeUltimaZafra) ||
      cfg.topeUltimaZafra <= 0
    ) {
      errores.push("Los topes de anegamientos deben ser mayores que 0.");
    }

    if (
      cfg.umbralCategoriaMedia <= 0 ||
      cfg.umbralCategoriaMedia >= cfg.umbralCategoriaAlta ||
      cfg.umbralCategoriaAlta > 100
    ) {
      errores.push("Los umbrales de categoría no deben superponerse ni invertirse (0 < Media < Alta <= 100).");
    }

    if (
      cfg.umbralSemaforoAmarillo <= 0 ||
      cfg.umbralSemaforoAmarillo >= cfg.umbralSemaforoRojo ||
      cfg.umbralSemaforoRojo > 100
    ) {
      errores.push("Los umbrales del semáforo no deben superponerse ni invertirse (0 < Amarillo < Rojo <= 100).");
    }

    if (Number.isNaN(cfg.lluviaCriticaMm) || cfg.lluviaCriticaMm <= 0) {
      errores.push("La lluvia crítica debe ser mayor a 0 mm.");
    }

    if (![24, 48, 72].includes(Number(cfg.ventanaLluviaHoras))) {
      errores.push("La ventana de lluvia acumulada debe ser 24, 48 o 72 horas.");
    }
    if (![24, 48, 72].includes(Number(cfg.horizontePronosticoHoras))) {
      errores.push("El horizonte de pronóstico debe ser 24, 48 o 72 horas.");
    }

    return { valida: errores.length === 0, errores };
  }

  static guardar(c, usuario = _usuarioActual) {
    const validacion = this.validar(c);
    if (!validacion.valida) {
      throw new Error(validacion.errores.join(" "));
    }

    const vigente = this.obtenerVigente();
    const nueva = new Configuracion({
      ...c,
      version: vigente.version + 1,
      fechaHora: new Date().toISOString(),
      usuarioId: usuario?.id || null
    });

    DatasheetStore.mutate((ds) => {
      ds.configuraciones.push({ ...nueva });
    });

    return nueva;
  }

  static restaurarPorDefecto(usuario = _usuarioActual) {
    const def = crearDatasheetsIniciales().configuraciones[0];
    return this.guardar(def, usuario);
  }
}

// ==========================================
// 7. GESTOR DE ANEGAMIENTOS (CU05)
// ==========================================
export class GestorAnegamientos {
  static listarTodos() {
    return [...DatasheetStore.getSheet("anegamientos")]
      .sort((a, b) => new Date(b.fechaInicio) - new Date(a.fechaInicio))
      .map((a) => new Anegamiento(a));
  }

  static listarAbiertos() {
    return this.listarTodos().filter((a) => a.estaAbierto());
  }

  static contarTotales(lote) {
    const codigo = resolverIdCodigo(lote, "codigo");
    return DatasheetStore.getSheet("anegamientos").filter(
      (a) => a.loteCodigo === codigo
    ).length;
  }

  static contarUltimaZafra(lote, inicioZafra = null) {
    const codigo = resolverIdCodigo(lote, "codigo");
    const cfgInicio = inicioZafra || GestorConfiguracion.obtenerVigente().inicioZafra;
    const fechaCorte = cfgInicio
      ? new Date(`${cfgInicio}T00:00:00`)
      : new Date(`${new Date().getFullYear()}-01-01T00:00:00`);

    return DatasheetStore.getSheet("anegamientos").filter(
      (a) => a.loteCodigo === codigo && new Date(a.fechaInicio) >= fechaCorte
    ).length;
  }

  static abrir(lotes, inicio, obs = "", usuario = _usuarioActual) {
    const listaLotes = Array.isArray(lotes) ? lotes : [lotes];
    if (listaLotes.length === 0) {
      throw new Error("Debe seleccionar al menos un lote.");
    }

    const fechaInicio = inicio ? new Date(inicio) : new Date();
    if (Number.isNaN(fechaInicio.getTime()) || fechaInicio > new Date()) {
      throw new Error("La fecha de inicio del anegamiento no puede ser futura.");
    }

    const creados = [];
    const omitidos = [];

    DatasheetStore.mutate((ds) => {
      for (const item of listaLotes) {
        const codigo = resolverIdCodigo(item, "codigo");
        const yaAbierto = ds.anegamientos.some(
          (a) => a.loteCodigo === codigo && !a.fechaFin
        );
        if (yaAbierto) {
          omitidos.push(codigo);
          continue;
        }

        const nuevo = new Anegamiento({
          id: `ang-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
          loteCodigo: codigo,
          fechaInicio: fechaInicio.toISOString(),
          fechaFin: null,
          observaciones: obs,
          usuarioId: usuario?.id || null
        });

        ds.anegamientos.push({ ...nuevo });
        creados.push(nuevo);

        // Pasar lote a estado ANEGADO
        const loteIdx = ds.lotes.findIndex((l) => l.codigo === codigo);
        if (loteIdx !== -1) {
          const estadoAnterior = ds.lotes[loteIdx].estado;
          ds.lotes[loteIdx].estado = EstadoLote.ANEGADO;
          ds.lotes[loteIdx].semaforo = null;
          ds.cambiosEstadoLote.push({
            id: `est-${Date.now().toString(36)}-${codigo}`,
            loteCodigo: codigo,
            estadoAnterior,
            estadoNuevo: EstadoLote.ANEGADO,
            fechaHora: new Date().toISOString(),
            usuarioId: usuario?.id || null,
            motivo: "Anegamiento registrado (CU05)"
          });
        }
      }
    });

    if (creados.length === 0 && omitidos.length > 0) {
      throw new Error(
        `Los lotes seleccionados (${omitidos.join(", ")}) ya tienen un anegamiento abierto (RN14).`
      );
    }

    return { creados, omitidos };
  }

  static cerrar(a, fin, usuario = _usuarioActual) {
    const id = resolverIdCodigo(a, "id");
    const fechaFin = fin ? new Date(fin) : new Date();
    if (Number.isNaN(fechaFin.getTime()) || fechaFin > new Date()) {
      throw new Error("La fecha de fin no puede ser futura.");
    }

    let loteCodigoAfectado = null;
    DatasheetStore.mutate((ds) => {
      const idx = ds.anegamientos.findIndex((x) => x.id === id);
      if (idx === -1) throw new Error("Anegamiento no encontrado.");
      const actual = ds.anegamientos[idx];
      if (fechaFin < new Date(actual.fechaInicio)) {
        throw new Error("La fecha de fin no puede ser anterior al inicio.");
      }
      ds.anegamientos[idx].fechaFin = fechaFin.toISOString();
      loteCodigoAfectado = actual.loteCodigo;

      // Devolver lote a PENDIENTE si estaba ANEGADO
      const loteIdx = ds.lotes.findIndex((l) => l.codigo === loteCodigoAfectado);
      if (loteIdx !== -1 && ds.lotes[loteIdx].estado === EstadoLote.ANEGADO) {
        ds.lotes[loteIdx].estado = EstadoLote.PENDIENTE;
        ds.cambiosEstadoLote.push({
          id: `est-${Date.now().toString(36)}-${loteCodigoAfectado}`,
          loteCodigo: loteCodigoAfectado,
          estadoAnterior: EstadoLote.ANEGADO,
          estadoNuevo: EstadoLote.PENDIENTE,
          fechaHora: new Date().toISOString(),
          usuarioId: usuario?.id || null,
          motivo: "Cierre de anegamiento (CU05)"
        });
      }
    });

    return { id, loteCodigo: loteCodigoAfectado, fechaFin: fechaFin.toISOString() };
  }
}

// ==========================================
// 8. GESTOR DE ÍNDICE DE VULNERABILIDAD (CU10)
// ==========================================
export class GestorIndice {
  static calcularIndice(lote, config = GestorConfiguracion.obtenerVigente()) {
    const codigo = resolverIdCodigo(lote, "codigo");
    const loteObj = GestorLotes.obtenerPorCodigo(codigo);
    if (!loteObj) return null;

    const attrs = DatasheetStore.getSheet("atributosVulnerabilidad");
    if (!loteObj.estaCompleto(attrs)) {
      return null; // Extensión 2a: no inventar valor si está incompleto
    }

    const vigente = loteObj.atributosVigentes(attrs);
    const pSuelo = Number(config.puntajesSuelo?.[vigente.suelo] ?? 0);
    const pDrenaje = Number(config.puntajesDrenaje?.[vigente.drenaje] ?? 0);
    const pCamino = Number(config.puntajesCamino?.[vigente.camino] ?? 0);

    const eventosTotales = GestorAnegamientos.contarTotales(codigo);
    const eventosUltimaZafra = GestorAnegamientos.contarUltimaZafra(
      codigo,
      config.inicioZafra
    );

    const pHistorial = Math.min(eventosTotales / config.topeHistorial, 1) * 100;
    const pUltimaZafra = Math.min(eventosUltimaZafra / config.topeUltimaZafra, 1) * 100;

    // Respaldo de normalización (CU10 4a) si los pesos no suman exactamente 1
    let ws = config.pesoSuelo;
    let wd = config.pesoDrenaje;
    let wc = config.pesoCamino;
    let wh = config.pesoHistorial;
    let wz = config.pesoUltimaZafra;
    const suma = ws + wd + wc + wh + wz;
    if (suma > 0 && Math.abs(suma - 1) > 1e-4) {
      ws /= suma;
      wd /= suma;
      wc /= suma;
      wh /= suma;
      wz /= suma;
    }

    const indice =
      ws * pSuelo +
      wd * pDrenaje +
      wc * pCamino +
      wh * pHistorial +
      wz * pUltimaZafra;

    return Number(indice.toFixed(1));
  }

  static calcularDesglose(lote, config = GestorConfiguracion.obtenerVigente()) {
    const codigo = resolverIdCodigo(lote, "codigo");
    const loteObj = GestorLotes.obtenerPorCodigo(codigo);
    const attrs = DatasheetStore.getSheet("atributosVulnerabilidad");
    if (!loteObj || !loteObj.estaCompleto(attrs)) return null;

    const vigente = loteObj.atributosVigentes(attrs);
    const pSuelo = Number(config.puntajesSuelo?.[vigente.suelo] ?? 0);
    const pDrenaje = Number(config.puntajesDrenaje?.[vigente.drenaje] ?? 0);
    const pCamino = Number(config.puntajesCamino?.[vigente.camino] ?? 0);
    const eventosTotales = GestorAnegamientos.contarTotales(codigo);
    const eventosUltimaZafra = GestorAnegamientos.contarUltimaZafra(
      codigo,
      config.inicioZafra
    );
    const pHistorial = Number((Math.min(eventosTotales / config.topeHistorial, 1) * 100).toFixed(1));
    const pUltimaZafra = Number((Math.min(eventosUltimaZafra / config.topeUltimaZafra, 1) * 100).toFixed(1));
    const indice = this.calcularIndice(loteObj, config);
    const categoria = this.categorizar(indice, config);

    return {
      vigente,
      pSuelo,
      pDrenaje,
      pCamino,
      eventosTotales,
      eventosUltimaZafra,
      pHistorial,
      pUltimaZafra,
      indice,
      categoria
    };
  }

  static categorizar(indice, config = GestorConfiguracion.obtenerVigente()) {
    if (indice === null || indice === undefined) return null;
    if (indice < config.umbralCategoriaMedia) return CategoriaVulnerabilidad.BAJA;
    if (indice < config.umbralCategoriaAlta) return CategoriaVulnerabilidad.MEDIA;
    return CategoriaVulnerabilidad.ALTA;
  }
}

// ==========================================
// 9. GESTOR DE ATRIBUTOS DE VULNERABILIDAD (CU04)
// ==========================================
export class GestorAtributos {
  static registrarAtributos(l, suelo, drenaje, camino, usuario = _usuarioActual) {
    const loteCodigo = resolverIdCodigo(l, "codigo");
    const lote = GestorLotes.obtenerPorCodigo(loteCodigo);
    if (!lote) throw new Error("Lote no encontrado.");

    const nuevo = new AtributosVulnerabilidad({
      id: `atr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      loteCodigo,
      suelo: suelo || null,
      drenaje: drenaje || null,
      camino: camino || null,
      fechaHora: new Date().toISOString(),
      usuarioId: usuario?.id || null
    });

    DatasheetStore.mutate((ds) => {
      // RN11: Se agrega una nueva entrada conservando todo el historial anterior
      ds.atributosVulnerabilidad.push({ ...nuevo });
    });

    const completo = Boolean(suelo && drenaje && camino);
    const indiceEstimado = completo ? GestorIndice.calcularIndice(loteCodigo) : null;
    const categoria =
      indiceEstimado !== null ? GestorIndice.categorizar(indiceEstimado) : null;

    return {
      atributos: nuevo,
      completo,
      indiceEstimado,
      categoria
    };
  }

  static historialDe(l) {
    const loteCodigo = resolverIdCodigo(l, "codigo");
    return DatasheetStore.getSheet("atributosVulnerabilidad")
      .filter((a) => a.loteCodigo === loteCodigo)
      .sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora))
      .map((a) => new AtributosVulnerabilidad(a));
  }

  static listarIncompletos() {
    const attrs = DatasheetStore.getSheet("atributosVulnerabilidad");
    return DatasheetStore.getSheet("lotes")
      .map((l) => new Lote(l))
      .filter((l) => !l.estaCompleto(attrs));
  }
}

// ==========================================
// 10. GESTOR DE LECTURAS DE PLUVIÓMETRO (CU08)
// ==========================================
export class GestorLecturas {
  static listarLecturas(zona = null) {
    const zonaCodigo = resolverIdCodigo(zona, "codigo");
    const todas = DatasheetStore.getSheet("lecturas");
    const filtradas = zonaCodigo
      ? todas.filter((l) => l.zonaCodigo === zonaCodigo)
      : todas;
    return [...filtradas]
      .sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora))
      .map((l) => new Lectura(l));
  }

  static existeLectura(zona, fechaHora) {
    const zonaCodigo = resolverIdCodigo(zona, "codigo");
    const minutoObjetivo = Math.floor(new Date(fechaHora).getTime() / 60000);
    const encontrada = DatasheetStore.getSheet("lecturas").find(
      (l) =>
        l.zonaCodigo === zonaCodigo &&
        Math.floor(new Date(l.fechaHora).getTime() / 60000) === minutoObjetivo
    );
    return encontrada ? new Lectura(encontrada) : null;
  }

  static validarLectura(zona, fechaHora, mm) {
    const zonaCodigo = resolverIdCodigo(zona, "codigo");
    const numMm = Number(mm);
    const errores = [];

    if (mm === "" || mm === null || mm === undefined || Number.isNaN(numMm) || numMm < 0) {
      errores.push("Los milímetros deben ser un número mayor o igual a 0.");
    }

    const fecha = new Date(fechaHora);
    if (Number.isNaN(fecha.getTime())) {
      errores.push("La fecha y hora ingresadas no son válidas.");
    } else if (fecha > new Date()) {
      errores.push("No se pueden cargar lecturas con fecha y hora futuras.");
    }

    const pluv = GestorZonas.pluviometroActivo(zonaCodigo);
    if (!pluv) {
      errores.push("La zona seleccionada no tiene un pluviómetro activo asignado.");
    }

    const lecturaExistente =
      errores.length === 0 ? this.existeLectura(zonaCodigo, fechaHora) : null;

    return {
      valida: errores.length === 0,
      errores,
      requiereConfirmacionValorAlto: errores.length === 0 && numMm > 300,
      lecturaExistente
    };
  }

  static registrarLectura(zona, fechaHora, mm, usuario = _usuarioActual) {
    const zonaCodigo = resolverIdCodigo(zona, "codigo");
    const validacion = this.validarLectura(zonaCodigo, fechaHora, mm);
    if (!validacion.valida) {
      throw new Error(validacion.errores.join(" "));
    }

    const pluv = GestorZonas.pluviometroActivo(zonaCodigo);
    const nueva = new Lectura({
      id: `lec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      zonaCodigo,
      pluviometroCodigo: pluv.codigo,
      fechaHora: new Date(fechaHora).toISOString(),
      milimetros: Number(mm),
      usuarioId: usuario?.id || null
    });

    DatasheetStore.mutate((ds) => {
      ds.lecturas.push({ ...nueva });
    });

    const ventana = GestorConfiguracion.obtenerVigente().ventanaLluviaHoras;
    return {
      lectura: nueva,
      acumulado: this.acumuladoZona(zonaCodigo, ventana)
    };
  }

  static reemplazarLectura(l, mm, usuario = _usuarioActual) {
    const id = resolverIdCodigo(l, "id");
    const numMm = Number(mm);
    if (Number.isNaN(numMm) || numMm < 0) {
      throw new Error("Los milímetros deben ser no negativos.");
    }

    let actualizada = null;
    DatasheetStore.mutate((ds) => {
      const idx = ds.lecturas.findIndex((x) => x.id === id);
      if (idx === -1) throw new Error("Lectura no encontrada.");
      ds.lecturas[idx].milimetros = numMm;
      ds.lecturas[idx].usuarioId = usuario?.id || ds.lecturas[idx].usuarioId;
      actualizada = new Lectura(ds.lecturas[idx]);
    });

    const ventana = GestorConfiguracion.obtenerVigente().ventanaLluviaHoras;
    return {
      lectura: actualizada,
      acumulado: this.acumuladoZona(actualizada.zonaCodigo, ventana)
    };
  }

  // Compendio 4.1: Suma de milímetros de las lecturas de la zona en [ahora - horas, ahora]
  static acumuladoZona(zona, horas = GestorConfiguracion.obtenerVigente().ventanaLluviaHoras) {
    const zonaCodigo = resolverIdCodigo(zona, "codigo");
    const ahoraMs = Date.now();
    const limiteInferiorMs = ahoraMs - Number(horas) * 3600000;

    const enVentana = DatasheetStore.getSheet("lecturas").filter((l) => {
      if (l.zonaCodigo !== zonaCodigo) return false;
      const t = new Date(l.fechaHora).getTime();
      return t >= limiteInferiorMs && t <= ahoraMs;
    });

    const mm = Number(
      enVentana.reduce((acc, l) => acc + Number(l.milimetros || 0), 0).toFixed(1)
    );

    return {
      mm,
      cantidadLecturas: enVentana.length,
      sinLecturas: enVentana.length === 0
    };
  }
}

// ==========================================
// 11. GESTOR DE PRONÓSTICO (CU09)
// ==========================================
export class GestorPronostico {
  static obtenerUltimoGuardado(zona) {
    const zonaCodigo = resolverIdCodigo(zona, "codigo");
    const delLugar = DatasheetStore.getSheet("pronosticos")
      .filter((p) => p.zonaCodigo === zonaCodigo)
      .sort((a, b) => new Date(b.fechaConsulta) - new Date(a.fechaConsulta));

    if (delLugar.length === 0) return null;
    return new Pronostico(delLugar[0]);
  }

  static async consultar(zona, forzarRed = false) {
    const zonaObj =
      typeof zona === "object" && zona?.codigo
        ? new Zona(zona)
        : GestorZonas.obtenerPorCodigo(zona);

    if (!zonaObj) throw new Error("Zona no encontrada.");

    const cfg = GestorConfiguracion.obtenerVigente();
    const horizonte = cfg.horizontePronosticoHoras;
    const ultimo = this.obtenerUltimoGuardado(zonaObj.codigo);

    // CU09 Extensión 3a: caché de 30 minutos
    if (!forzarRed && ultimo && ultimo.horizonteHoras === horizonte) {
      const edadMin = (Date.now() - new Date(ultimo.fechaConsulta).getTime()) / 60000;
      if (edadMin < 30 && !ultimo.desactualizado) {
        return ultimo;
      }
    }

    try {
      const dias = await ServicioOpenMeteo.consultarPronostico(
        zonaObj.latitud,
        zonaObj.longitud,
        horizonte
      );
      const nuevo = new Pronostico({
        id: `pro-${zonaObj.codigo}-${Date.now().toString(36)}`,
        zonaCodigo: zonaObj.codigo,
        fechaConsulta: new Date().toISOString(),
        horizonteHoras: horizonte,
        desactualizado: false,
        dias
      });

      DatasheetStore.mutate((ds) => {
        ds.pronosticos.push({
          ...nuevo,
          dias: nuevo.dias.map((d) => ({ ...d }))
        });
      });

      return nuevo;
    } catch {
      // CU09 Extensión 4a / 4b: fallback al último pronóstico guardado marcado desactualizado
      if (ultimo) {
        return new Pronostico({ ...ultimo, desactualizado: true });
      }
      return null;
    }
  }
}

// ==========================================
// 12. GESTOR DE RANKING Y PRIORIZACIÓN (CU11, CU15, CU16)
// ==========================================
export class GestorRanking {
  // Soporta firma UML (lote, lluviaAcum, lluviaPrev) y firma directa (indice, lluviaAcum, lluviaPrev, lluviaCriticaMm)
  static calcularPuntajeRiesgo(
    loteOIndice,
    lluviaAcum,
    lluviaPrev,
    lluviaCriticaMm = GestorConfiguracion.obtenerVigente().lluviaCriticaMm
  ) {
    let indice = loteOIndice;
    if (typeof loteOIndice === "object" && loteOIndice !== null) {
      indice = GestorIndice.calcularIndice(loteOIndice);
    }
    if (indice === null || indice === undefined) {
      return { factorLluvia: 0, puntajeRiesgo: 0 };
    }

    const totalLluvia = Math.max(0, Number(lluviaAcum || 0)) + Math.max(0, Number(lluviaPrev || 0));
    const lc = Math.max(1, Number(lluviaCriticaMm || 60));
    const f = Math.min(totalLluvia / lc, 1);
    const puntajeRiesgo = Number((Number(indice) * f).toFixed(1));

    return {
      factorLluvia: Number(f.toFixed(3)),
      puntajeRiesgo
    };
  }

  static asignarSemaforo(puntaje, config = GestorConfiguracion.obtenerVigente()) {
    const p = Number(puntaje || 0);
    if (p >= config.umbralSemaforoRojo) return Semaforo.ROJO;
    if (p >= config.umbralSemaforoAmarillo) return Semaforo.AMARILLO;
    return Semaforo.VERDE;
  }

  static obtenerLotesEnRojo(ranking) {
    if (!ranking) return { items: [], toneladasEnRiesgo: 0 };
    const r = ranking instanceof Ranking ? ranking : new Ranking(ranking);
    const rojos = r.lotesEnRojo();
    const toneladasEnRiesgo = rojos.reduce((acc, it) => acc + Number(it.toneladas || 0), 0);
    return {
      items: rojos,
      cantidad: rojos.length,
      toneladasEnRiesgo
    };
  }

  static obtenerUltimoRanking() {
    const lista = DatasheetStore.getSheet("rankings");
    if (!lista || lista.length === 0) {
      return this.generarRanking(_usuarioActual);
    }
    const ultimo = [...lista].sort(
      (a, b) => new Date(b.fechaHora) - new Date(a.fechaHora)
    )[0];
    return new Ranking(ultimo);
  }

  static _construirRanking({ usuario = null, lluviasSimuladasPorZona = null }) {
    const cfg = GestorConfiguracion.obtenerVigente();
    const esSimulacion = Boolean(lluviasSimuladasPorZona);
    const lotes = DatasheetStore.getSheet("lotes").map((l) => new Lote(l));
    const attrs = DatasheetStore.getSheet("atributosVulnerabilidad");
    const zonas = DatasheetStore.getSheet("zonas").map((z) => new Zona(z));

    const pendientes = lotes.filter((l) => l.estado === EstadoLote.PENDIENTE);
    const elegibles = [];
    const lotesIncompletos = [];

    for (const lote of pendientes) {
      if (lote.estaCompleto(attrs)) {
        elegibles.push(lote);
      } else {
        lotesIncompletos.push({
          loteCodigo: lote.codigo,
          loteNombre: lote.nombre,
          zonaCodigo: lote.zonaCodigo,
          toneladas: lote.toneladas,
          motivo: "Faltan atributos de vulnerabilidad (suelo, drenaje o camino)."
        });
      }
    }

    const avisos = [];
    const climaPorZona = {};

    for (const zona of zonas) {
      if (esSimulacion) {
        const sim = lluviasSimuladasPorZona[zona.codigo] || {
          lluviaAcumulada: 0,
          lluviaPrevista: 0
        };
        climaPorZona[zona.codigo] = {
          lluviaAcumulada: Number(sim.lluviaAcumulada || 0),
          lluviaPrevista: Number(sim.lluviaPrevista || 0),
          pronosticoDesactualizado: false,
          sinLecturas: false
        };
      } else {
        const pluvActivo = GestorZonas.pluviometroActivo(zona.codigo);
        let acum = { mm: 0, sinLecturas: true };
        if (!pluvActivo) {
          avisos.push(`La zona ${zona.nombre} no tiene pluviómetro activo asignado.`);
        } else {
          acum = GestorLecturas.acumuladoZona(zona.codigo, cfg.ventanaLluviaHoras);
          if (acum.sinLecturas) {
            avisos.push(
              `La zona ${zona.nombre} no tiene lecturas en las últimas ${cfg.ventanaLluviaHoras} h.`
            );
          }
        }

        const pronostico = GestorPronostico.obtenerUltimoGuardado(zona.codigo);
        let lluviaPrevista = 0;
        let pronosticoDesactualizado = false;
        if (!pronostico) {
          pronosticoDesactualizado = true;
          avisos.push(`La zona ${zona.nombre} no tiene pronóstico guardado.`);
        } else {
          lluviaPrevista = pronostico.milimetrosPrevistos();
          if (pronostico.desactualizado) {
            pronosticoDesactualizado = true;
            avisos.push(`Pronóstico desactualizado para ${zona.nombre}.`);
          }
        }

        climaPorZona[zona.codigo] = {
          lluviaAcumulada: acum.mm,
          lluviaPrevista,
          pronosticoDesactualizado,
          sinLecturas: !pluvActivo || acum.sinLecturas
        };
      }
    }

    const itemsSinOrdenar = elegibles.map((lote) => {
      const zona = zonas.find((z) => z.codigo === lote.zonaCodigo);
      const clima = climaPorZona[lote.zonaCodigo] || {
        lluviaAcumulada: 0,
        lluviaPrevista: 0,
        pronosticoDesactualizado: false,
        sinLecturas: false
      };

      const indice = GestorIndice.calcularIndice(lote, cfg);
      const categoria = GestorIndice.categorizar(indice, cfg);
      const { factorLluvia, puntajeRiesgo } = this.calcularPuntajeRiesgo(
        indice,
        clima.lluviaAcumulada,
        clima.lluviaPrevista,
        cfg.lluviaCriticaMm
      );
      const semaforo = this.asignarSemaforo(puntajeRiesgo, cfg);

      return new ItemRanking({
        posicion: 0,
        loteCodigo: lote.codigo,
        loteNombre: lote.nombre,
        zonaCodigo: lote.zonaCodigo,
        zonaNombre: zona?.nombre || lote.zonaCodigo,
        hectareas: lote.hectareas,
        toneladas: lote.toneladas,
        indice,
        categoria,
        lluviaAcumulada: clima.lluviaAcumulada,
        lluviaPrevista: clima.lluviaPrevista,
        factorLluvia,
        puntajeRiesgo,
        semaforo,
        pronosticoDesactualizado: clima.pronosticoDesactualizado,
        sinLecturas: clima.sinLecturas
      });
    });

    // Compendio 4.8: 1) Puntaje riesgo desc, 2) Índice desc, 3) Toneladas desc
    itemsSinOrdenar.sort((a, b) => {
      if (b.puntajeRiesgo !== a.puntajeRiesgo) return b.puntajeRiesgo - a.puntajeRiesgo;
      if (b.indice !== a.indice) return b.indice - a.indice;
      return b.toneladas - a.toneladas;
    });

    itemsSinOrdenar.forEach((it, idx) => {
      it.posicion = idx + 1;
    });

    const ranking = new Ranking({
      id: esSimulacion
        ? `sim-${Date.now().toString(36)}`
        : `rnk-${Date.now().toString(36)}`,
      fechaHora: new Date().toISOString(),
      items: itemsSinOrdenar,
      lotesIncompletos,
      configuracionVersion: cfg.version,
      usuarioId: usuario?.id || null,
      esSimulacion,
      avisos: [...new Set(avisos)]
    });

    // Solo el ranking oficial persiste y actualiza el /semaforo derivado en los lotes (RN16)
    if (!esSimulacion) {
      DatasheetStore.mutate((ds) => {
        ds.rankings.push({
          ...ranking,
          items: ranking.items.map((it) => ({ ...it }))
        });
        // Actualizar atributo derivado /semaforo en hoja lotes
        ds.lotes.forEach((l) => {
          if (l.estado === EstadoLote.PENDIENTE) {
            const item = ranking.items.find((it) => it.loteCodigo === l.codigo);
            l.semaforo = item ? item.semaforo : null;
          } else {
            l.semaforo = null;
          }
        });
      });
    }

    return ranking;
  }

  static generarRanking(usuario = _usuarioActual) {
    return this._construirRanking({ usuario, lluviasSimuladasPorZona: null });
  }

  // CU16: Simulación transitoria (esSimulacion = true), no persiste ni altera datos reales
  static simularRanking(lluviasPorZona) {
    return this._construirRanking({
      usuario: _usuarioActual,
      lluviasSimuladasPorZona: lluviasPorZona || {}
    });
  }
}

// ==========================================
// 13. GESTOR DE PARADAS DE FÁBRICA (CU13, CU14)
// ==========================================
export class GestorParadas {
  static obtenerAbierta() {
    const abierta = DatasheetStore.getSheet("paradas").find(
      (p) => p.estado === EstadoParada.ABIERTA
    );
    return abierta ? new Parada(abierta) : null;
  }

  static abrirParada(causa, detalle, inicio, toneladas = null, usuario = _usuarioActual) {
    if (this.obtenerAbierta()) {
      throw new Error("Ya existe una parada abierta. Cerrala antes de abrir otra (RN12).");
    }

    if (!Object.values(CausaParada).includes(causa)) {
      throw new Error("La causa seleccionada no pertenece al catálogo.");
    }

    const detalleLimpio = String(detalle || "").trim();
    if (causa === CausaParada.OTRA && !detalleLimpio) {
      throw new Error("Para la causa 'Otra' el detalle es obligatorio (RN13).");
    }

    const fechaInicio = inicio ? new Date(inicio) : new Date();
    if (Number.isNaN(fechaInicio.getTime()) || fechaInicio > new Date()) {
      throw new Error("La fecha de inicio de la parada no puede ser futura (RN12).");
    }

    let ton = null;
    if (toneladas !== null && toneladas !== undefined && toneladas !== "") {
      ton = Number(toneladas);
      if (Number.isNaN(ton) || ton < 0) {
        throw new Error("Las toneladas en patio deben ser un número mayor o igual a 0.");
      }
    }

    const idNum = DatasheetStore.getSheet("paradas").length + 1;
    const nueva = new Parada({
      id: `PAR-${String(idNum).padStart(2, "0")}`,
      causa,
      detalle: detalleLimpio,
      fechaInicio: fechaInicio.toISOString(),
      fechaFin: null,
      toneladasPatio: ton,
      estado: EstadoParada.ABIERTA,
      abiertaPorId: usuario?.id || null
    });

    DatasheetStore.mutate((ds) => {
      ds.paradas.push({
        id: nueva.id,
        causa: nueva.causa,
        detalle: nueva.detalle,
        fechaInicio: nueva.fechaInicio,
        fechaFin: nueva.fechaFin,
        toneladasPatio: nueva.toneladasPatio,
        estado: nueva.estado,
        abiertaPorId: nueva.abiertaPorId,
        cerradaPorId: null,
        modificadaPorId: null,
        fechaModificacion: null
      });
    });

    return nueva;
  }

  static cerrarParada(p, fin, usuario = _usuarioActual) {
    const id = resolverIdCodigo(p, "id");
    const fechaFin = fin ? new Date(fin) : new Date();
    if (Number.isNaN(fechaFin.getTime()) || fechaFin > new Date()) {
      throw new Error("La fecha de cierre no puede ser futura.");
    }

    let cerrada = null;
    DatasheetStore.mutate((ds) => {
      const idx = ds.paradas.findIndex((x) => x.id === id);
      if (idx === -1) throw new Error("Parada no encontrada.");
      const actual = ds.paradas[idx];
      if (fechaFin < new Date(actual.fechaInicio)) {
        throw new Error("El fin de la parada no puede ser anterior al inicio (RN12).");
      }
      ds.paradas[idx].fechaFin = fechaFin.toISOString();
      ds.paradas[idx].estado = EstadoParada.CERRADA;
      ds.paradas[idx].cerradaPorId = usuario?.id || null;
      cerrada = new Parada(ds.paradas[idx]);
    });

    return cerrada;
  }

  static corregirParada(p, datos, usuario = _usuarioActual) {
    const id = resolverIdCodigo(p, "id");
    const causa = datos.causa;
    const detalle = String(datos.detalle || "").trim();

    if (causa && !Object.values(CausaParada).includes(causa)) {
      throw new Error("Causa inválida.");
    }
    if (causa === CausaParada.OTRA && !detalle) {
      throw new Error("Para la causa 'Otra' el detalle es obligatorio (RN13).");
    }

    let actualizada = null;
    DatasheetStore.mutate((ds) => {
      const idx = ds.paradas.findIndex((x) => x.id === id);
      if (idx === -1) throw new Error("Parada no encontrada.");
      const actual = ds.paradas[idx];

      const fInicio = datos.fechaInicio ? new Date(datos.fechaInicio) : new Date(actual.fechaInicio);
      const fFin = datos.fechaFin ? new Date(datos.fechaFin) : actual.fechaFin ? new Date(actual.fechaFin) : null;

      if (fInicio > new Date()) {
        throw new Error("La fecha de inicio no puede ser futura.");
      }
      if (fFin && fFin < fInicio) {
        throw new Error("El fin no puede ser anterior al inicio.");
      }

      let ton = actual.toneladasPatio;
      if (datos.toneladasPatio !== undefined) {
        if (datos.toneladasPatio === "" || datos.toneladasPatio === null) {
          ton = null;
        } else {
          ton = Number(datos.toneladasPatio);
          if (Number.isNaN(ton) || ton < 0) {
            throw new Error("Las toneladas en patio deben ser no negativas.");
          }
        }
      }

      ds.paradas[idx] = {
        ...actual,
        causa: causa || actual.causa,
        detalle: datos.detalle !== undefined ? detalle : actual.detalle,
        fechaInicio: fInicio.toISOString(),
        fechaFin: fFin ? fFin.toISOString() : null,
        toneladasPatio: ton,
        modificadaPorId: usuario?.id || null,
        fechaModificacion: new Date().toISOString()
      };

      actualizada = new Parada(ds.paradas[idx]);
    });

    return actualizada;
  }

  static listarHistorial(desde = null, hasta = null, causa = "TODAS") {
    let lista = DatasheetStore.getSheet("paradas").map((p) => new Parada(p));

    if (desde) {
      const fDesde = new Date(`${desde}T00:00:00`);
      lista = lista.filter((p) => new Date(p.fechaInicio) >= fDesde);
    }
    if (hasta) {
      const fHasta = new Date(`${hasta}T23:59:59`);
      lista = lista.filter((p) => new Date(p.fechaInicio) <= fHasta);
    }
    if (causa && causa !== "TODAS") {
      lista = lista.filter((p) => p.causa === causa);
    }

    // CU14 2b: Parada abierta primera, luego de más reciente a más antigua
    return lista.sort((a, b) => {
      if (a.estaAbierta() && !b.estaAbierta()) return -1;
      if (!a.estaAbierta() && b.estaAbierta()) return 1;
      return new Date(b.fechaInicio) - new Date(a.fechaInicio);
    });
  }

  // Compendio 4.11: Totales por causa y porcentajes
  static totalesPorCausa(paradas) {
    const lista = paradas.map((p) => (p instanceof Parada ? p : new Parada(p)));
    const cerradas = lista.filter((p) => !p.estaAbierta() && p.duracionHoras !== null);
    const horasTotales = Number(
      cerradas.reduce((acc, p) => acc + (p.duracionHoras || 0), 0).toFixed(2)
    );

    const porCausa = {};
    for (const c of Object.values(CausaParada)) {
      const deCausa = cerradas.filter((p) => p.causa === c);
      const horas = Number(
        deCausa.reduce((acc, p) => acc + (p.duracionHoras || 0), 0).toFixed(2)
      );
      const porcentaje =
        horasTotales > 0 ? Number(((horas / horasTotales) * 100).toFixed(1)) : 0;
      porCausa[c] = {
        causa: c,
        etiqueta: CAUSA_PARADA_LABELS[c] || c,
        cantidad: lista.filter((p) => p.causa === c).length,
        horas,
        porcentaje
      };
    }

    return {
      cantidadParadas: lista.length,
      horasTotales,
      porCausa
    };
  }

  static exportarCSV(paradas) {
    const lista = paradas.map((p) => (p instanceof Parada ? p : new Parada(p)));
    const encabezados = [
      "ID",
      "Estado",
      "Causa",
      "Detalle",
      "Inicio",
      "Fin",
      "DuracionHoras",
      "ToneladasPatio"
    ];

    const filas = lista.map((p) => [
      p.id,
      p.estado,
      CAUSA_PARADA_LABELS[p.causa] || p.causa,
      `"${String(p.detalle || "").replace(/"/g, '""')}"`,
      p.fechaInicio,
      p.fechaFin || "En curso",
      p.duracionHoras !== null ? p.duracionHoras : "",
      p.toneladasPatio !== null ? p.toneladasPatio : ""
    ]);

    const csv = [encabezados.join(","), ...filas.map((f) => f.join(","))].join("\n");

    if (typeof window !== "undefined" && typeof document !== "undefined") {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `pluviazafra-paradas-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    return csv;
  }
}
