import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DatasheetStore } from "./domain/datasheets.js";
import { ROL_META } from "./domain/enums.js";
import {
  GestorParadas,
  GestorRanking,
  GestorSesion,
  GestorZonas
} from "./services/gestores.js";
import Navbar from "./components/Navbar.jsx";
import LoginView from "./views/LoginView.jsx";
import CentroControlView from "./views/CentroControlView.jsx";
import PronosticoView from "./views/PronosticoView.jsx";
import PluviometroView from "./views/PluviometroView.jsx";
import AnegamientoView from "./views/AnegamientoView.jsx";
import ParadasView from "./views/ParadasView.jsx";
import AdministracionView from "./views/AdministracionView.jsx";
import "./App.css";

export default function App() {
  const [usuario, setUsuario] = useState(() => GestorSesion.obtenerUsuarioActual());
  const [vistaActual, setVistaActual] = useState(() =>
    usuario ? GestorSesion.obtenerVistaPorDefecto(usuario) : "centro-control"
  );
  const [versionDatos, setVersionDatos] = useState(0);
  const [toast, setToast] = useState(null);
  const [zonaPreseleccionada, setZonaPreseleccionada] = useState(null);
  const [lotePreseleccionado, setLotePreseleccionado] = useState(null);

  // Suscripción reactiva al DatasheetStore
  useEffect(() => {
    const desuscribir = DatasheetStore.subscribe(() => {
      setVersionDatos((v) => v + 1);
    });
    return desuscribir;
  }, []);

  // Auto-ocultar notificaciones toast
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(timer);
  }, [toast]);

  const mostrarToast = useCallback((mensaje, tipo = "info") => {
    setToast({ mensaje, tipo, id: Date.now() });
  }, []);

  const notificarCambioDatos = useCallback(() => {
    setVersionDatos((v) => v + 1);
  }, []);

  // Asegurar que la vista actual esté permitida para el rol logueado
  useEffect(() => {
    if (!usuario) return;
    if (!GestorSesion.tienePermisoVista(usuario, vistaActual)) {
      setVistaActual(GestorSesion.obtenerVistaPorDefecto(usuario));
    }
  }, [usuario, vistaActual]);

  // Ranking oficial vigente (genera uno inicial si la hoja está vacía)
  const rankingOficial = useMemo(() => {
    void versionDatos;
    const existente = GestorRanking.obtenerUltimoRanking();
    if (existente) return existente;
    return GestorRanking.generarRanking(usuario);
  }, [versionDatos, usuario]);

  const paradaAbierta = useMemo(() => {
    void versionDatos;
    return GestorParadas.obtenerAbierta();
  }, [versionDatos]);

  const handleLoginExitoso = (u) => {
    setUsuario(u);
    setVistaActual(GestorSesion.obtenerVistaPorDefecto(u));
    const rolNombre = ROL_META[u?.rol]?.nombre || u?.rol;
    mostrarToast(`Bienvenido, ${u.nombre} (${rolNombre}).`, "success");
  };

  const handleCerrarSesion = () => {
    GestorSesion.cerrarSesion();
    setUsuario(null);
    setZonaPreseleccionada(null);
    setLotePreseleccionado(null);
    mostrarToast("Sesión cerrada.", "info");
  };

  const handleCambiarVista = (idVista) => {
    if (!usuario || !GestorSesion.tienePermisoVista(usuario, idVista)) {
      mostrarToast("Tu rol no tiene acceso a ese módulo.", "error");
      return;
    }
    if (idVista !== "anegamiento") {
      setZonaPreseleccionada(null);
      setLotePreseleccionado(null);
    }
    setVistaActual(idVista);
  };

  const handleGenerarRanking = () => {
    const nuevo = GestorRanking.generarRanking(usuario);
    setVersionDatos((v) => v + 1);
    return nuevo;
  };

  const handleIrAAnegamiento = (codigoZonaOLote) => {
    if (!GestorSesion.tienePermisoVista(usuario, "anegamiento")) {
      mostrarToast("Tu rol no tiene permiso para registrar anegamientos.", "error");
      return;
    }
    if (codigoZonaOLote) {
      const esZona =
        String(codigoZonaOLote).startsWith("ZN-") ||
        Boolean(GestorZonas.obtenerPorCodigo(codigoZonaOLote));
      if (esZona) {
        setZonaPreseleccionada(codigoZonaOLote);
        setLotePreseleccionado(null);
      } else {
        setLotePreseleccionado(codigoZonaOLote);
        setZonaPreseleccionada(null);
      }
    } else {
      setZonaPreseleccionada(null);
      setLotePreseleccionado(null);
    }
    setVistaActual("anegamiento");
  };

  const handleExportarDatasheets = () => {
    const json = DatasheetStore.exportJSON();
    const blob = new Blob([json], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `pluviazafra-datasheets-${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    mostrarToast("Respaldo JSON de los datasheets descargado.", "info");
  };

  const handleResetDatasheets = () => {
    DatasheetStore.reset();
    GestorRanking.generarRanking(usuario);
    setVersionDatos((v) => v + 1);
    mostrarToast("Datasheets restablecidos a los datos iniciales de calibración.", "info");
  };

  if (!usuario) {
    return (
      <>
        <LoginView onLoginExitoso={handleLoginExitoso} />
        {toast && <ToastBanner toast={toast} onClose={() => setToast(null)} />}
      </>
    );
  }

  return (
    <div className="app-shell">
      <Navbar
        usuario={usuario}
        vistaActual={vistaActual}
        paradaAbierta={paradaAbierta}
        onCambiarVista={handleCambiarVista}
        onCerrarSesion={handleCerrarSesion}
        onResetDatasheets={handleResetDatasheets}
        onExportarDatasheets={handleExportarDatasheets}
      />

      <main className="main-content">
        {vistaActual === "centro-control" && (
          <CentroControlView
            usuario={usuario}
            rankingOficial={rankingOficial}
            onGenerarRanking={handleGenerarRanking}
            onIrAAnegamiento={handleIrAAnegamiento}
            onToast={mostrarToast}
            versionDatos={versionDatos}
          />
        )}

        {vistaActual === "pronostico" && (
          <PronosticoView
            onToast={mostrarToast}
            onDatosCambiados={notificarCambioDatos}
            versionDatos={versionDatos}
          />
        )}

        {vistaActual === "pluviometro" && (
          <PluviometroView
            usuario={usuario}
            onDatosCambiados={notificarCambioDatos}
            onMarcarAnegamiento={handleIrAAnegamiento}
            onToast={mostrarToast}
            versionDatos={versionDatos}
          />
        )}

        {vistaActual === "anegamiento" && (
          <AnegamientoView
            usuario={usuario}
            zonaPreseleccionada={zonaPreseleccionada}
            lotePreseleccionado={lotePreseleccionado}
            onDatosCambiados={notificarCambioDatos}
            onRecalcularRanking={handleGenerarRanking}
            onToast={mostrarToast}
            versionDatos={versionDatos}
          />
        )}

        {vistaActual === "paradas" && (
          <ParadasView
            usuario={usuario}
            onDatosCambiados={notificarCambioDatos}
            onToast={mostrarToast}
            versionDatos={versionDatos}
          />
        )}

        {vistaActual === "administracion" && (
          <AdministracionView
            usuario={usuario}
            onDatosCambiados={notificarCambioDatos}
            onToast={mostrarToast}
            versionDatos={versionDatos}
          />
        )}
      </main>

      {toast && <ToastBanner toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

function ToastBanner({ toast, onClose }) {
  const estilosPorTipo = {
    success: { background: "#064e3b", borderColor: "#059669", color: "#ecfdf5" },
    warning: { background: "#78350f", borderColor: "#d97706", color: "#fef3c7" },
    error: { background: "#7f1d1d", borderColor: "#ef4444", color: "#fee2e2" },
    info: { background: "#1e3a8a", borderColor: "#3b82f6", color: "#eff6ff" }
  };
  const estilo = estilosPorTipo[toast.tipo] || estilosPorTipo.info;

  return (
    <div
      className="toast"
      style={{
        ...estilo,
        zIndex: 3000,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        cursor: "pointer"
      }}
      onClick={onClose}
      role="status"
    >
      <span>{toast.mensaje}</span>
      <span style={{ opacity: 0.75, fontSize: "0.85rem" }}>✕</span>
    </div>
  );
}
