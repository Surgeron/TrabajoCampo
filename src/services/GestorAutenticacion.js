// ==========================================
// GESTOR DE AUTENTICACIÓN Y CONTROL DE ACCESO (PoLP)
// Capa Control / Negocio (BCE Pattern)
// ==========================================

import { USUARIOS_INICIALES, ROLES } from "../domain/usuarios";

export class GestorAutenticacion {
  /**
   * Catálogo de todas las vistas del sistema con sus metadatos de presentación
   */
  static VISTAS_SISTEMA = {
    "resumen": {
      id: "resumen",
      titulo: "Resumen General",
      icono: "📊",
      descripcion: "Tablero ejecutivo con KPIs globales de campaña y estado de zafra"
    },
    "centro-control": {
      id: "centro-control",
      titulo: "Centro de Control GIS",
      icono: "🗺️",
      descripcion: "Mapa satelital, simulación de lluvias y ranking de prioridad DSS"
    },
    "catastro": {
      id: "catastro",
      titulo: "Catastro Lotes",
      icono: "📋",
      descripcion: "Administración edáfica, drenajes y estado de caminos viales"
    },
    "auditoria": {
      id: "auditoria",
      titulo: "Auditoría Paradas",
      icono: "🏭",
      descripcion: "Monitoreo financiero y causas de interrupción de fábrica"
    },
    "frente": {
      id: "frente",
      titulo: "Mi Frente de Cosecha",
      icono: "🚜",
      descripcion: "Ficha táctil de corte en lote asignado y pedidos de camión"
    },
    "pluviometro": {
      id: "pluviometro",
      titulo: "Carga Pluviómetro",
      icono: "🌧️",
      descripcion: "Registro matutino diario de precipitaciones de campo"
    }
  };

  /**
   * Autentica un usuario por nombre de usuario y contraseña
   */
  static iniciarSesion(username, password) {
    const userFound = USUARIOS_INICIALES.find(
      (u) =>
        u.username.toLowerCase() === String(username).trim().toLowerCase() &&
        u.password === String(password).trim()
    );

    if (!userFound) {
      return {
        exito: false,
        mensaje: "Usuario o contraseña incorrectos. Para la demo podés usar '123' o el acceso rápido."
      };
    }

    return {
      exito: true,
      usuario: { ...userFound }
    };
  }

  /**
   * Login directo para la demo / selección de rol
   */
  static iniciarSesionPorId(idUsuario) {
    const userFound = USUARIOS_INICIALES.find((u) => u.id === idUsuario);
    if (!userFound) {
      return { exito: false, mensaje: "Usuario no encontrado" };
    }
    return {
      exito: true,
      usuario: { ...userFound }
    };
  }

  /**
   * Valida si un usuario tiene autorización para ver una interfaz determinada
   */
  static tienePermiso(usuario, idVista) {
    if (!usuario || !Array.isArray(usuario.vistasPermitidas)) {
      return false;
    }
    return usuario.vistasPermitidas.includes(idVista);
  }

  /**
   * Retorna los metadatos de las vistas a las que el usuario tiene acceso
   */
  static obtenerVistasPermitidas(usuario) {
    if (!usuario || !Array.isArray(usuario.vistasPermitidas)) {
      return [];
    }

    return usuario.vistasPermitidas
      .map((idVista) => this.VISTAS_SISTEMA[idVista])
      .filter(Boolean);
  }

  /**
   * Retorna información descriptiva del rol del usuario
   */
  static obtenerInfoRol(rolKey) {
    return ROLES[rolKey] || null;
  }
}
