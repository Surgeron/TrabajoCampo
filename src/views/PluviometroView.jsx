import React, { useState } from "react";
import "./PluviometroView.css";

export default function PluviometroView({ lecturas, onRegistrarLectura }) {
  const [finca, setFinca] = useState("Finca Miraflores");
  const [mm, setMm] = useState(35);
  const [observaciones, setObservaciones] = useState("Lluvia moderada entre 04:00 y 07:00 hs.");

  const handleSubmit = (e) => {
    e.preventDefault();
    onRegistrarLectura({
      finca,
      mm: Number(mm),
      observaciones
    });
    setMm(0);
    setObservaciones("");
  };

  return (
    <div className="view-container" style={{ padding: "0 24px", maxWidth: "800px", margin: "0 auto" }}>
      <div className="section-header-box" style={{ flexDirection: "column", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "28px" }}>🌧️</span>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: 800 }}>Carga Diaria de Pluviómetro (Campo)</h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              Registro manual de precipitaciones matutinas para calibrar la saturación de suelo.
            </p>
          </div>
        </div>
      </div>

      {/* FORMULARIO TÁCTIL */}
      <div className="field-card" style={{ marginBottom: "24px" }}>
        <h3 style={{ fontSize: "16px", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>📝</span> Nueva Lectura de Pluviómetro
        </h3>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="form-group">
            <label style={{ fontSize: "13px" }}>Seleccionar Finca / Puesto:</label>
            <select 
              className="form-control" 
              style={{ fontSize: "15px", padding: "12px" }}
              value={finca} 
              onChange={(e) => setFinca(e.target.value)}
            >
              <option value="Finca Miraflores">Finca Miraflores (Zona Baja Río)</option>
              <option value="Finca El Puesto">Finca El Puesto (Sector Zanjas)</option>
              <option value="Finca Central La Esperanza">Finca Central La Esperanza</option>
              <option value="Finca Arrayanal">Finca Arrayanal (Norte)</option>
            </select>
          </div>

          <div className="form-group">
            <label style={{ fontSize: "13px" }}>Precipitación Leída en Pluviómetro (mm):</label>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <input 
                type="number" 
                min="0" 
                max="300" 
                step="0.5"
                className="form-control" 
                style={{ fontSize: "22px", fontWeight: 800, fontFamily: "JetBrains Mono", width: "160px", padding: "10px 14px", textAlign: "center" }}
                value={mm} 
                onChange={(e) => setMm(e.target.value)} 
                required 
              />
              <span style={{ fontSize: "18px", fontWeight: 700, color: "#94a3b8" }}>milímetros</span>
            </div>
          </div>

          <div className="form-group">
            <label style={{ fontSize: "13px" }}>Observaciones de Transitabilidad:</label>
            <input 
              type="text" 
              className="form-control" 
              style={{ padding: "12px" }}
              value={observaciones} 
              onChange={(e) => setObservaciones(e.target.value)} 
              placeholder="Ej. Huellones de barro en callejón de salida."
            />
          </div>

          <button 
            type="submit" 
            className="btn-action btn-primary" 
            style={{ padding: "16px", fontSize: "15px", justifyContent: "center", minHeight: "50px", marginTop: "8px" }}
          >
            💾 Guardar Lectura y Actualizar Riesgo Local
          </button>
        </form>
      </div>

      {/* HISTORIAL RECIENTE */}
      <h3 style={{ fontSize: "16px", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
        <span>📋</span> Últimas Lecturas Registradas
      </h3>

      <div className="table-responsive-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Fecha / Hora</th>
              <th>Finca</th>
              <th>Lluvia Caída</th>
              <th>Observaciones de Campo</th>
            </tr>
          </thead>
          <tbody>
            {lecturas.map((l) => (
              <tr key={l.id}>
                <td>{l.fecha}</td>
                <td><b>{l.finca}</b></td>
                <td>
                  <span style={{ 
                    fontFamily: "JetBrains Mono", 
                    fontWeight: 800, 
                    color: l.mm >= 40 ? "#f87171" : l.mm >= 15 ? "#fbbf24" : "#34d399",
                    fontSize: "15px"
                  }}>
                    {l.mm} mm
                  </span>
                </td>
                <td style={{ fontSize: "12.5px", color: "#cbd5e1" }}>{l.observaciones}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
