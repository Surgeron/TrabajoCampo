import React, { useState, useMemo } from "react";
import {
  GestorZonas,
  GestorPronostico,
  GestorConfiguracion
} from "../services/gestores";

// <<interfaz>> InterfazPronostico (CU09)
export default function PronosticoView({
  onToast,
  onDatosCambiados,
  versionDatos,
  intervaloAutoSyncMinutos = 30,
  onCambiarIntervaloAutoSync,
  ultimaAutoSync = null,
  sincronizandoAuto = false
}) {
  const [cargando, setCargando] = useState(false);

  const config = useMemo(() => GestorConfiguracion.obtenerVigente(), [versionDatos]);
  const zonas = useMemo(() => GestorZonas.listarZonas(), [versionDatos]);

  const pronosticosPorZona = useMemo(() => {
    const mapa = {};
    zonas.forEach((z) => {
      mapa[z.codigo] = GestorPronostico.obtenerUltimoGuardado(z.codigo);
    });
    return mapa;
  }, [zonas, versionDatos]);

  const solicitarPronostico = async (forzarRed = false) => {
    setCargando(true);
    try {
      let huboDesactualizados = false;
      for (const z of zonas) {
        const res = await GestorPronostico.consultar(z, forzarRed);
        if (!res || res.desactualizado) {
          huboDesactualizados = true;
        }
      }
      if (onDatosCambiados) onDatosCambiados();
      if (onToast) {
        onToast(
          huboDesactualizados
            ? "Open-Meteo no respondió en alguna zona; se mostró el último pronóstico guardado."
            : "Pronóstico consultado y guardado correctamente para todas las zonas."
        );
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="view-container" style={{ padding: "16px 24px", maxWidth: "1100px", margin: "0 auto", width: "100%" }}>
      <div className="section-header-box">
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 800, display: "flex", alignItems: "center", gap: "8px" }}>
            <span>🌦️</span> Consulta de Pronóstico por Zona (CU09 — Open-Meteo)
          </h2>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
            Horizonte de pronóstico vigente: <b>{config.horizontePronosticoHoras} horas</b> · Caché de consultas: 30 minutos.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            className="btn-action"
            disabled={cargando}
            onClick={() => solicitarPronostico(false)}
          >
            {cargando ? "⏳ Consultando..." : "🔄 Consultar (usar caché < 30 min)"}
          </button>
          <button
            className="btn-action btn-primary"
            disabled={cargando}
            onClick={() => solicitarPronostico(true)}
          >
            {cargando ? "⏳ Consultando..." : "📡 Actualizar desde Open-Meteo"}
          </button>
        </div>

        {/* Barra de auto-actualización periódica */}
        <div
          style={{
            gridColumn: "1 / -1",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            marginTop: "12px",
            paddingTop: "12px",
            borderTop: "1px solid var(--border-color)",
            flexWrap: "wrap",
            fontSize: "13px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span>⏱️ <b>Auto-actualización automática:</b></span>
            <select
              className="form-control"
              style={{ width: "auto", padding: "4px 10px", fontSize: "12px", height: "32px", borderRadius: "6px" }}
              value={intervaloAutoSyncMinutos}
              onChange={(e) => onCambiarIntervaloAutoSync?.(Number(e.target.value))}
            >
              <option value={10}>Cada 10 minutos</option>
              <option value={15}>Cada 15 minutos</option>
              <option value={30}>Cada 30 minutos (recomendado)</option>
              <option value={60}>Cada 1 hora</option>
              <option value={0}>Desactivada (solo manual)</option>
            </select>
            {intervaloAutoSyncMinutos > 0 ? (
              <span className="badge-status badge-safe" style={{ fontSize: "11px", padding: "4px 8px" }}>
                {sincronizandoAuto ? "⏳ Sincronizando en vivo..." : `🟢 Activa (cada ${intervaloAutoSyncMinutos} min)`}
              </span>
            ) : (
              <span className="badge-status badge-incompleto" style={{ fontSize: "11px", padding: "4px 8px" }}>
                ⏸️ Desactivada
              </span>
            )}
          </div>

          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            {ultimaAutoSync
              ? `Última sincronización: ${new Date(ultimaAutoSync).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
              : "Esperando primer ciclo de sincronización"}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px"
        }}
      >
        {zonas.map((z) => {
          const p = pronosticosPorZona[z.codigo];
          const mmPrevistos = p ? p.milimetrosPrevistos() : null;
          const esViejo = p
            ? (Date.now() - new Date(p.fechaConsulta).getTime()) / 60000 > 30
            : false;

          return (
            <div
              key={z.codigo}
              style={{
                background: "var(--bg-card)",
                border: `1px solid ${p?.desactualizado ? "#f59e0b" : "var(--border-color)"}`,
                borderRadius: "12px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span style={{ fontSize: "11px", fontFamily: "JetBrains Mono", color: "#38bdf8" }}>
                    {z.codigo}
                  </span>
                  <h3 style={{ fontSize: "16px", fontWeight: 700 }}>{z.nombre}</h3>
                  <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                    Ref: {z.latitud.toFixed(4)}, {z.longitud.toFixed(4)}
                  </span>
                </div>

                {p ? (
                  p.desactualizado ? (
                    <span className="badge-status badge-warning">Desactualizado</span>
                  ) : esViejo ? (
                    <span className="badge-status badge-descanso">Guardado (&gt;30m)</span>
                  ) : (
                    <span className="badge-status badge-safe">Al día</span>
                  )
                ) : (
                  <span className="badge-status badge-urgent">Sin datos</span>
                )}
              </div>

              {p ? (
                <>
                  <div
                    style={{
                      background: "#0f172a",
                      borderRadius: "8px",
                      padding: "12px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <span style={{ fontSize: "12.5px", color: "#cbd5e1" }}>
                      Lluvia prevista total ({p.horizonteHoras} h):
                    </span>
                    <b
                      style={{
                        fontSize: "20px",
                        fontFamily: "JetBrains Mono",
                        color: mmPrevistos >= 30 ? "#f87171" : mmPrevistos >= 10 ? "#fbbf24" : "#34d399"
                      }}
                    >
                      {mmPrevistos} mm
                    </b>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
                      Detalle por día (PronosticoDia):
                    </div>
                    {p.dias.map((d) => (
                      <div
                        key={d.fecha}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "12.5px",
                          padding: "6px 10px",
                          background: "#162032",
                          borderRadius: "6px"
                        }}
                      >
                        <span>{d.fecha}</span>
                        <b style={{ fontFamily: "JetBrains Mono" }}>{d.milimetros} mm</b>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                    Última consulta: {new Date(p.fechaConsulta).toLocaleString()}
                    {p.desactualizado && " · Usando respaldo por error de red (CU09 4a)"}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: "13px", color: "#94a3b8", padding: "12px 0" }}>
                  No hay pronóstico guardado para esta zona (CU09 4b).
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
