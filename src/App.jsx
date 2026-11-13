import React, { useState, useEffect } from "react";
import "./App.css";

// Dominio y Datos Iniciales
import {
  LOTES_INICIALES,
  PARADAS_INICIALES,
  LECTURAS_PLUV_INICIALES,
  CONFIG_ESCENARIOS
} from "./domain/mockData";

// Gestores (Capa de Control / Servicios)
import { GestorPriorizacionDSS } from "./services/GestorPriorizacionDSS";
import { GestorCatastro } from "./services/GestorCatastro";
import { GestorMeteorologico } from "./services/GestorMeteorologico";
import { GestorOperacionesCosecha } from "./services/GestorOperacionesCosecha";
import { GestorParadasFabrica } from "./services/GestorParadasFabrica";

// Componentes y Vistas (Capa Boundary / UI)
import Navbar from "./components/Navbar";
import KpiBar from "./components/KpiBar";
import CentroControlView from "./views/CentroControlView";
import CatastroView from "./views/CatastroView";
import AuditoriaParadasView from "./views/AuditoriaParadasView";
import CosechadorFrenteView from "./views/CosechadorFrenteView";
import PluviometroView from "./views/PluviometroView";

export default function App() {
  const [vistaActual, setVistaActual] = useState("centro-control");
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

  // 2. Controladores de Acciones invocando Gestores
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
    setVistaActual("centro-control");
    showToast("Demostración restablecida a valores iniciales.");
  };

  return (
    <div className="app-container">
      {/* NAVEGACIÓN DESACOPLADA POR ROL */}
      <Navbar
        vistaActual={vistaActual}
        onCambiarVista={(v) => {
          setVistaActual(v);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onResetDemo={handleResetDemo}
      />

      {/* KPI GLOBAL STRIP */}
      <KpiBar metricas={metricasGlobales} />

      {/* RENDERIZADO DE LA VISTA ACTIVA */}
      {vistaActual === "centro-control" && (
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

      {vistaActual === "catastro" && (
        <CatastroView
          lotes={lotes}
          onActualizarLote={handleActualizarLote}
        />
      )}

      {vistaActual === "auditoria" && (
        <AuditoriaParadasView
          paradas={paradas}
          onRegistrarParada={handleRegistrarParada}
        />
      )}

      {vistaActual === "frente" && (
        <CosechadorFrenteView
          lotes={lotes}
          onMarcarCosechado={handleMarcarCosechado}
        />
      )}

      {vistaActual === "pluviometro" && (
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
