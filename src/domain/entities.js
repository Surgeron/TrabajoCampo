// ==========================================
// CLASES DE OBJETO (<<entidad>>) - PLUVIAZAFRA
// Según diagrama-clases-completo.md
// ==========================================

import {
  EstadoLote,
  EstadoParada,
  Semaforo
} from "./enums.js";

export class Usuario {
  constructor({ id, nombre, correo, rol, habilitado = true, clave = "123" }) {
    this.id = id;
    this.nombre = nombre;
    this.correo = correo;
    this.rol = rol;
    this.habilitado = Boolean(habilitado);
    this.clave = clave;
  }
}

export class Zona {
  constructor({ codigo, nombre, latitud, longitud }) {
    this.codigo = codigo;
    this.nombre = nombre;
    this.latitud = Number(latitud);
    this.longitud = Number(longitud);
  }
}

export class Pluviometro {
  constructor({ codigo, zonaCodigo, latitud, longitud, activo = true }) {
    this.codigo = codigo;
    this.zonaCodigo = zonaCodigo;
    this.latitud = Number(latitud);
    this.longitud = Number(longitud);
    this.activo = Boolean(activo);
  }
}

export class AtributosVulnerabilidad {
  constructor({ id, loteCodigo, suelo = null, drenaje = null, camino = null, fechaHora, usuarioId }) {
    this.id = id;
    this.loteCodigo = loteCodigo;
    this.suelo = suelo;
    this.drenaje = drenaje;
    this.camino = camino;
    this.fechaHora = fechaHora || new Date().toISOString();
    this.usuarioId = usuarioId;
  }
}

export class Lote {
  constructor({
    codigo,
    nombre,
    hectareas,
    toneladas,
    poligono = [],
    estado = EstadoLote.PENDIENTE,
    zonaCodigo,
    semaforo = null
  }) {
    this.codigo = codigo;
    this.nombre = nombre;
    this.hectareas = Number(hectareas);
    this.toneladas = Number(toneladas);
    this.poligono = Array.isArray(poligono) ? poligono : [];
    this.estado = estado;
    this.zonaCodigo = zonaCodigo;
    this.semaforo = estado === EstadoLote.PENDIENTE ? semaforo : null;
  }

  atributosVigentes(historialAtributos = []) {
    const delLote = historialAtributos
      .filter((a) => a.loteCodigo === this.codigo)
      .sort((a, b) => new Date(b.fechaHora) - new Date(a.fechaHora));
    return delLote.length > 0 ? new AtributosVulnerabilidad(delLote[0]) : null;
  }

  estaCompleto(historialAtributos = []) {
    const vigente = this.atributosVigentes(historialAtributos);
    if (!vigente) return false;
    return Boolean(vigente.suelo && vigente.drenaje && vigente.camino);
  }

  esElegible(historialAtributos = []) {
    return this.estado === EstadoLote.PENDIENTE && this.estaCompleto(historialAtributos);
  }

  cambiarEstado(nuevoEstado) {
    this.estado = nuevoEstado;
    if (nuevoEstado !== EstadoLote.PENDIENTE) {
      this.semaforo = null;
    }
  }
}

export class Lectura {
  constructor({ id, zonaCodigo, pluviometroCodigo, fechaHora, milimetros, usuarioId }) {
    this.id = id;
    this.zonaCodigo = zonaCodigo;
    this.pluviometroCodigo = pluviometroCodigo;
    this.fechaHora = fechaHora;
    this.milimetros = Number(milimetros);
    this.usuarioId = usuarioId;
  }
}

export class Anegamiento {
  constructor({ id, loteCodigo, fechaInicio, fechaFin = null, observaciones = "", usuarioId }) {
    this.id = id;
    this.loteCodigo = loteCodigo;
    this.fechaInicio = fechaInicio;
    this.fechaFin = fechaFin || null;
    this.observaciones = observaciones || "";
    this.usuarioId = usuarioId;
  }

  estaAbierto() {
    return !this.fechaFin;
  }

  cerrar(fin) {
    this.fechaFin = fin || new Date().toISOString();
  }
}

export class PronosticoDia {
  constructor({ fecha, milimetros }) {
    this.fecha = fecha;
    this.milimetros = Number(milimetros) || 0;
  }
}

export class Pronostico {
  constructor({ id, zonaCodigo, fechaConsulta, horizonteHoras, dias = [], desactualizado = false }) {
    this.id = id;
    this.zonaCodigo = zonaCodigo;
    this.fechaConsulta = fechaConsulta;
    this.horizonteHoras = Number(horizonteHoras);
    this.dias = dias.map((d) => (d instanceof PronosticoDia ? d : new PronosticoDia(d)));
    this.desactualizado = Boolean(desactualizado);
  }

  milimetrosPrevistos() {
    return Number(this.dias.reduce((acc, d) => acc + Number(d.milimetros || 0), 0).toFixed(1));
  }
}

export class ItemRanking {
  constructor({
    posicion,
    loteCodigo,
    loteNombre,
    zonaCodigo,
    zonaNombre,
    hectareas,
    toneladas,
    indice,
    categoria,
    lluviaAcumulada,
    lluviaPrevista,
    factorLluvia,
    puntajeRiesgo,
    semaforo,
    pronosticoDesactualizado = false,
    sinLecturas = false
  }) {
    this.posicion = posicion;
    this.loteCodigo = loteCodigo;
    this.loteNombre = loteNombre;
    this.zonaCodigo = zonaCodigo;
    this.zonaNombre = zonaNombre;
    this.hectareas = Number(hectareas);
    this.toneladas = Number(toneladas);
    this.indice = Number(indice);
    this.categoria = categoria;
    this.lluviaAcumulada = Number(lluviaAcumulada);
    this.lluviaPrevista = Number(lluviaPrevista);
    this.factorLluvia = Number(factorLluvia);
    this.puntajeRiesgo = Number(puntajeRiesgo);
    this.semaforo = semaforo;
    this.pronosticoDesactualizado = Boolean(pronosticoDesactualizado);
    this.sinLecturas = Boolean(sinLecturas);
  }
}

export class Ranking {
  constructor({
    id,
    fechaHora,
    items = [],
    lotesIncompletos = [],
    configuracionVersion,
    usuarioId = null,
    esSimulacion = false,
    avisos = []
  }) {
    this.id = id;
    this.fechaHora = fechaHora;
    this.items = items.map((it) => (it instanceof ItemRanking ? it : new ItemRanking(it)));
    this.lotesIncompletos = lotesIncompletos;
    this.configuracionVersion = configuracionVersion;
    this.usuarioId = usuarioId;
    this.esSimulacion = Boolean(esSimulacion);
    this.avisos = avisos;
  }

  lotesEnRojo() {
    return this.items.filter((i) => i.semaforo === Semaforo.ROJO);
  }
}

export class Configuracion {
  constructor({
    version = 1,
    fechaHora,
    usuarioId = null,
    pesoSuelo = 0.20,
    pesoDrenaje = 0.25,
    pesoCamino = 0.20,
    pesoHistorial = 0.15,
    pesoUltimaZafra = 0.20,
    puntajesSuelo = { ARENOSO: 20, FRANCO: 50, ARCILLOSO: 90 },
    puntajesDrenaje = { BUENO: 10, REGULAR: 50, MALO: 100 },
    puntajesCamino = { CONSOLIDADO: 10, ENRIPIADO: 40, TIERRA: 90 },
    topeHistorial = 5,
    topeUltimaZafra = 2,
    umbralCategoriaMedia = 34,
    umbralCategoriaAlta = 67,
    umbralSemaforoAmarillo = 34,
    umbralSemaforoRojo = 67,
    lluviaCriticaMm = 60,
    ventanaLluviaHoras = 48,
    horizontePronosticoHoras = 48,
    inicioZafra = "2026-05-01"
  }) {
    this.version = Number(version);
    this.fechaHora = fechaHora || new Date().toISOString();
    this.usuarioId = usuarioId;
    this.pesoSuelo = Number(pesoSuelo);
    this.pesoDrenaje = Number(pesoDrenaje);
    this.pesoCamino = Number(pesoCamino);
    this.pesoHistorial = Number(pesoHistorial);
    this.pesoUltimaZafra = Number(pesoUltimaZafra);
    this.puntajesSuelo = { ...puntajesSuelo };
    this.puntajesDrenaje = { ...puntajesDrenaje };
    this.puntajesCamino = { ...puntajesCamino };
    this.topeHistorial = Number(topeHistorial);
    this.topeUltimaZafra = Number(topeUltimaZafra);
    this.umbralCategoriaMedia = Number(umbralCategoriaMedia);
    this.umbralCategoriaAlta = Number(umbralCategoriaAlta);
    this.umbralSemaforoAmarillo = Number(umbralSemaforoAmarillo);
    this.umbralSemaforoRojo = Number(umbralSemaforoRojo);
    this.lluviaCriticaMm = Number(lluviaCriticaMm);
    this.ventanaLluviaHoras = Number(ventanaLluviaHoras);
    this.horizontePronosticoHoras = Number(horizontePronosticoHoras);
    this.inicioZafra = inicioZafra;
  }

  sumaPesos() {
    return Number(
      (
        this.pesoSuelo +
        this.pesoDrenaje +
        this.pesoCamino +
        this.pesoHistorial +
        this.pesoUltimaZafra
      ).toFixed(4)
    );
  }

  pesosSumanUno() {
    return Math.abs(this.sumaPesos() - 1) < 1e-4;
  }
}

export class Parada {
  constructor({
    id,
    causa,
    detalle = "",
    fechaInicio,
    fechaFin = null,
    toneladasPatio = null,
    estado = EstadoParada.ABIERTA,
    abiertaPorId = null,
    cerradaPorId = null,
    modificadaPorId = null,
    fechaModificacion = null
  }) {
    this.id = id;
    this.causa = causa;
    this.detalle = detalle || "";
    this.fechaInicio = fechaInicio;
    this.fechaFin = fechaFin || null;
    this.toneladasPatio =
      toneladasPatio === null || toneladasPatio === undefined || toneladasPatio === ""
        ? null
        : Number(toneladasPatio);
    this.estado = estado;
    this.abiertaPorId = abiertaPorId;
    this.cerradaPorId = cerradaPorId;
    this.modificadaPorId = modificadaPorId;
    this.fechaModificacion = fechaModificacion;
  }

  // Atributo derivado /duracionHoras
  get duracionHoras() {
    if (!this.fechaFin || !this.fechaInicio) return null;
    const diffMs = new Date(this.fechaFin).getTime() - new Date(this.fechaInicio).getTime();
    if (Number.isNaN(diffMs) || diffMs < 0) return null;
    return Number((diffMs / 3600000).toFixed(2));
  }

  estaAbierta() {
    return this.estado === EstadoParada.ABIERTA;
  }

  cerrar(fin) {
    this.fechaFin = fin || new Date().toISOString();
    this.estado = EstadoParada.CERRADA;
  }
}
