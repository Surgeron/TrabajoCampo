import React, { useState, useEffect } from "react";
import "./App.css";

// Dominio y Datos Iniciales
import {
  LOTES_INICIALES,
  PARADAS_INICIALES,
  LECTURAS_PLUV_INICIALES,
  CONFIG_ESCENARIOS
} from "./domain/mockData";

// Gestores (Capa de Control / Servicios - BCE Pattern)
import { GestorPriorizacionDSS } from "./services/GestorPriorizacionDSS";
import { GestorCatastro } from "./services/GestorCatastro";
import { GestorMeteorologico } from "./services/GestorMeteorologico";
import { GestorOperacionesCosecha } from "./services/GestorOperacionesCosecha";
import { GestorParadasFabrica } from "./services/GestorParadasFabrica";
import { GestorAutenticacion } from "./services/GestorAutenticacion";

// Componentes y Vistas (Capa Boundary / UI)
import Navbar from "./components/Navbar";
import KpiBar from "./components/KpiBar";
import LoginView from "./views/LoginView";
import CentroControlView from "./views/CentroControlView";
import CatastroView from "./views/CatastroView";
import AuditoriaParadasView from "./views/AuditoriaParadasView";
import CosechadorFrenteView from "./views/CosechadorFrenteView";
import PluviometroView from "./views/PluviometroView";

export default function App() {
  // Estado de Sesión y Autenticación (Principio de Mínimo Privilegio)
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [vistaActual, setVistaActual] = useState("centro-control");

  // Estado de Dominio
  const [lotes, setLotes] = useState(LOTES_INICIALES);
  const [paradas, setParadas] = useState(PARADAS_INICIALES);
  const [lecturasPluv, setLecturasPluv] = useState(LECTURAS_PLUV_INICIALES);
  const [escenarioActual, setEscenarioActual] = useState("live");
  const [configEscenarios, setConfigEscenarios] = useState(CONFIG_ESCENARIOS);
  const [filtroActivo, setFiltroActivo] = useState("todos");
  const [loteSeleccionadoId, setLoteSeleccionadoId] = useState(null);
  const [toast, setToast] = useState({ visible: false, text: "" });

  const showToast = (text) => {
    setToast({ visible: true, text });
    setTimeout(() => {
      setToast({ visible: false, text: "" });
    }, 3500);
  };

  // Sincronizar clima en vivo con Open-Meteo al cargar
  useEffect(() => {
    GestorMeteorologico.consultarPronosticoLive().then((res) => {
      setConfigEscenarios((prev) => ({
        ...prev,
        live: {
          ...prev.live,
          lluviaPrevistaMm: res.lluviaPrevistaMm,
          probabilidadPct: res.probabilidadPct,
          badge: res.badge
        }
      }));
    });
  }, []);

  // 1. Evaluación DSS en tiempo real usando el Gestor
  const cfgClima = configEscenarios[escenarioActual];
  const rankingDSS = GestorPriorizacionDSS.generarRanking(lotes, cfgClima, filtroActivo);
  const metricasGlobales = GestorOperacionesCosecha.calcularMetricas(lotes, rankingDSS);

  // 2. Controladores de Sesión
  const handleLogin = (usuario) => {
    setUsuarioActual(usuario);
    setVistaActual(usuario.vistaPorDefecto || "centro-control");
    showToast(`Sesión iniciada: ${usuario.nombre} (${usuario.cargo})`);
  };

  const handleLogout = () => {
    setUsuarioActual(null);
    showToast("Sesión cerrada correctamente. Volviendo al inicio.");
  };

  // 3. Controladores de Acciones invocando Gestores
  const handleCambiarEscenario = (nuevoEscenario) => {
    setEscenarioActual(nuevoEscenario);
    showToast(`Escenario activado: ${configEscenarios[nuevoEscenario].nombre}`);
  };

  const handleMarcarCosechado = (idLote) => {
    setLotes((prev) => GestorOperacionesCosecha.marcarCosechado(prev, idLote));
    showToast(`Lote ${idLote} marcado como COSECHADO. El avance de Zafra subió.`);
  };

  const handleReabrirLote = (idLote) => {
    setLotes((prev) => GestorOperacionesCosecha.reabrirLote(prev, idLote));
    showToast(`Lote ${idLote} reabierto a PENDIENTE.`);
  };

  const handleAsignarFrente = (idLote) => {
    setLotes((prev) => GestorOperacionesCosecha.asignarFrente(prev, idLote, "Frente N° 1"));
    showToast(`Cuadrilla asignada al Lote ${idLote}. Estado pasado a EN COSECHA.`);
  };

  const handleActualizarLote = (idLote, nuevosDatos) => {
    setLotes((prev) => GestorCatastro.actualizarLote(prev, idLote, nuevosDatos));
    showToast(`Condiciones del Lote ${idLote} actualizadas. IVL recalculado.`);
  };

  const handleRegistrarLectura = (nuevaLectura) => {
    setLecturasPluv((prev) => GestorMeteorologico.registrarLectura(prev, nuevaLectura));
    showToast(`Lectura guardada: ${nuevaLectura.mm} mm en ${nuevaLectura.finca}.`);
    if (nuevaLectura.mm >= 35) {
      setEscenarioActual("sat");
    }
  };

  const handleRegistrarParada = (nuevaParada) => {
    setParadas((prev) => GestorParadasFabrica.registrarParada(prev, nuevaParada));
    showToast(`Parada registrada: ${nuevaParada.duracionHoras} hs.`);
  };

  const handleResetDemo = () => {
    setLotes(LOTES_INICIALES);
    setParadas(PARADAS_INICIALES);
    setLecturasPluv(LECTURAS_PLUV_INICIALES);
    setEscenarioActual("live");
    setLoteSeleccionadoId(null);
    if (usuarioActual) {
      setVistaActual(usuarioActual.vistaPorDefecto);
    }
    showToast("Demostración restablecida a valores iniciales.");
  };

  // SI NO HAY SESIÓN ACTIVA: Renderizar LoginView (PoLP Gate)
  if (!usuarioActual) {
    return (
      <div className="app-container">
        <LoginView onLoginExitoso={handleLogin} />
        {toast.visible && (
          <div className="toast">
            <span>✅</span> <span>{toast.text}</span>
          </div>
        )}
      </div>
    );
  }

  // SESIÓN ACTIVA: Renderizar solo los módulos autorizados para el rol
  return (
    <div className="app-container">
      {/* NAVEGACIÓN BASADA EN EL PRINCIPIO DE MÍNIMO PRIVILEGIO (PoLP) */}
      <Navbar
        usuario={usuarioActual}
        vistaActual={vistaActual}
        onCambiarVista={(v) => {
          if (GestorAutenticacion.tienePermiso(usuarioActual, v)) {
            setVistaActual(v);
            window.scrollTo({ top: 0, behavior: "smooth" });
          } else {
            showToast("Acceso denegado según Principio de Mínimo Privilegio.");
          }
        }}
        onCerrarSesion={handleLogout}
        onResetDemo={handleResetDemo}
      />

      {/* KPI GLOBAL STRIP - Solo para perfiles con alcance global/estratégico */}
      {usuarioActual.rol !== "COSECHADOR_CAMPO" && (
        <KpiBar metricas={metricasGlobales} />
      )}

      {/* RENDERIZADO CONDICIONAL CON PROTECCIÓN DE PRIVILEGIOS */}
      {vistaActual === "centro-control" && GestorAutenticacion.tienePermiso(usuarioActual, "centro-control") && (
        <CentroControlView
          lotes={lotes}
          rankingDSS={rankingDSS}
          escenarioActual={escenarioActual}
          configEscenarios={configEscenarios}
          onCambiarEscenario={handleCambiarEscenario}
          loteSeleccionadoId={loteSeleccionadoId}
          onSeleccionarLote={setLoteSeleccionadoId}
          filtroActivo={filtroActivo}
          onCambiarFiltro={setFiltroActivo}
          onMarcarCosechado={handleMarcarCosechado}
          onReabrirLote={handleReabrirLote}
          onAsignarFrente={handleAsignarFrente}
        />
      )}

      {vistaActual === "catastro" && GestorAutenticacion.tienePermiso(usuarioActual, "catastro") && (
        <CatastroView
          lotes={lotes}
          onActualizarLote={handleActualizarLote}
        />
      )}

      {vistaActual === "auditoria" && GestorAutenticacion.tienePermiso(usuarioActual, "auditoria") && (
        <AuditoriaParadasView
          paradas={paradas}
          onRegistrarParada={handleRegistrarParada}
        />
      )}

      {vistaActual === "frente" && GestorAutenticacion.tienePermiso(usuarioActual, "frente") && (
        <CosechadorFrenteView
          lotes={lotes}
          onMarcarCosechado={handleMarcarCosechado}
        />
      )}

      {vistaActual === "pluviometro" && GestorAutenticacion.tienePermiso(usuarioActual, "pluviometro") && (
        <PluviometroView
          lecturas={lecturasPluv}
          onRegistrarLectura={handleRegistrarLectura}
        />
      )}

      {/* TOAST ALERT */}
      {toast.visible && (
        <div className="toast">
          <span>✅</span> <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
}
