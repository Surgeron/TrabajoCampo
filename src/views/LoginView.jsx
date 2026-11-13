import React, { useState } from "react";
import { USUARIOS_INICIALES } from "../domain/usuarios";
import { GestorAutenticacion } from "../services/GestorAutenticacion";
import "./LoginView.css";

export default function LoginView({ onLoginExitoso }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");

    const res = GestorAutenticacion.iniciarSesion(username, password);
    if (res.exito) {
      onLoginExitoso(res.usuario);
    } else {
      setErrorMsg(res.mensaje);
    }
  };

  const handleAccesoRapido = (idUsuario) => {
    const res = GestorAutenticacion.iniciarSesionPorId(idUsuario);
    if (res.exito) {
      onLoginExitoso(res.usuario);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-card-wrapper">
        {/* CABECERA BRANDING */}
        <div className="login-brand-header">
          <div className="login-brand-icon">🌱</div>
          <div>
            <h1 className="login-title">PluviaZafra <span className="badge-client">Ingenio La Esperanza</span></h1>
            <p className="login-subtitle">Sistema DSS de Priorización de Cosecha por Vulnerabilidad Hídrica</p>
          </div>
        </div>

        {/* BANNER PRINCIPIO DE MÍNIMO PRIVILEGIO */}
        <div className="polp-banner">
          <div className="polp-badge">
            <span>🛡️</span>
            <b>Principio de Mínimo Privilegio (PoLP)</b>
          </div>
          <p>
            Cada usuario visualiza y opera únicamente los módulos indispensables para su función de trabajo, garantizando el desacoplamiento de interfaces y la seguridad de la información.
          </p>
        </div>

        {/* ACCESO RÁPIDO PARA PRESENTACIÓN / EVALUACIÓN ACADÉMICA */}
        <div className="quick-access-section">
          <h2 className="quick-access-title">
            <span>⚡</span> Seleccioná un Perfil para Iniciar Sesión (Acceso Rápido)
          </h2>
          <p className="quick-access-desc">
            Probá el sistema desde la perspectiva de cada rol del Ingenio:
          </p>

          <div className="quick-access-grid">
            {USUARIOS_INICIALES.map((usr) => (
              <div
                key={usr.id}
                className="quick-user-card"
                onClick={() => handleAccesoRapido(usr.id)}
                role="button"
                tabIndex={0}
              >
                <div className="quick-card-top">
                  <span className="quick-card-avatar">{usr.avatar}</span>
                  <div className="quick-card-info">
                    <h4>{usr.nombre}</h4>
                    <span className="quick-card-cargo">{usr.cargo}</span>
                  </div>
                </div>

                <div className="quick-card-body">
                  <div className="quick-permisos-title">Vistas y Permisos Habilitados:</div>
                  <ul className="quick-permisos-list">
                    {usr.vistasPermitidas.map((vId) => {
                      const vInfo = GestorAutenticacion.VISTAS_SISTEMA[vId];
                      return (
                        <li key={vId}>
                          <span className="check-icon">✔</span> {vInfo ? `${vInfo.icono} ${vInfo.titulo}` : vId}
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="quick-card-footer">
                  <button className="btn-action btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                    Ingresar como {usr.rol.replace("_", " ")} &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SEPARADOR */}
        <div className="login-divider">
          <span>O ingresá manualmente con tus credenciales</span>
        </div>

        {/* FORMULARIO MANUAL CLÁSICO */}
        <form onSubmit={handleLoginSubmit} className="login-form">
          {errorMsg && (
            <div className="login-error-alert">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="login-form-grid">
            <div className="form-group">
              <label>Usuario / Legajo:</label>
              <input
                type="text"
                className="form-control"
                placeholder="ej. jefe.cosecha, cosechador.frente1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Contraseña:</label>
              <input
                type="password"
                className="form-control"
                placeholder="Ingresá 123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", flexWrap: "wrap", gap: "10px" }}>
            <span style={{ fontSize: "12px", color: "#64748b" }}>
              💡 Contraseña por defecto para todos los usuarios de muestra: <b>123</b>
            </span>
            <button
              type="submit"
              className="btn-action btn-primary"
              style={{ minHeight: "44px", padding: "8px 24px" }}
            >
              🔐 Iniciar Sesión
            </button>
          </div>
        </form>

        <div className="login-footer">
          <p>© 2026 Ingenio La Esperanza S.A. — San Pedro de Jujuy | PluviaZafra DSS Core v2.4</p>
        </div>
      </div>
    </div>
  );
}
