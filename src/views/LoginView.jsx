import React, { useState } from "react";
import { GestorSesion, GestorUsuarios } from "../services/gestores";
import { ROL_META } from "../domain/enums";
import "./LoginView.css";

// <<interfaz>> InterfazLogin (CU01)
export default function LoginView({ onLoginExitoso }) {
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const usuarios = GestorUsuarios.listarUsuarios();
  const usuariosActivos = usuarios.filter((u) => u.habilitado);

  const enviarCredenciales = (e) => {
    e.preventDefault();
    setErrorMsg("");
    const res = GestorSesion.iniciarSesion(correo, clave);
    if (res.exito) {
      onLoginExitoso(res.usuario);
    } else {
      mostrarError(res.error);
    }
  };

  const mostrarError = (mensaje) => {
    setErrorMsg(mensaje);
  };

  const handleAccesoRapido = (idUsuario) => {
    setErrorMsg("");
    const res = GestorSesion.iniciarSesionPorId(idUsuario);
    if (res.exito) {
      onLoginExitoso(res.usuario);
    } else {
      mostrarError(res.error);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-card-wrapper">
        {/* CABECERA */}
        <div className="login-brand-header">
          <div className="login-brand-icon">🌱</div>
          <div>
            <h1 className="login-title">
              PluviaZafra <span className="badge-client">Ingenio La Esperanza</span>
            </h1>
            <p className="login-subtitle">
              Sistema de Gestión y Priorización de Cosecha por Riesgo Hídrico
            </p>
          </div>
        </div>

        {/* ACCESO RÁPIDO POR PERFIL */}
        <div className="quick-access-section">
          <h2 className="quick-access-title">
            <span>⚡</span> Seleccioná un Perfil para Iniciar Sesión (Acceso Rápido)
          </h2>
          <p className="quick-access-desc">
            Ingresá rápidamente según el rol operativo dentro del ingenio:
          </p>

          <div className="quick-access-grid">
            {usuariosActivos.map((usr) => {
              const rolInfo = ROL_META[usr.rol];
              const vistas = GestorSesion.obtenerVistasPermitidas(usr);
              return (
                <div
                  key={usr.id}
                  className="quick-user-card"
                  onClick={() => handleAccesoRapido(usr.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") handleAccesoRapido(usr.id);
                  }}
                >
                  <div>
                    <div className="quick-card-top">
                      <span className="quick-card-avatar">{rolInfo?.avatar || "👤"}</span>
                      <div className="quick-card-info">
                        <h4>{usr.nombre}</h4>
                        <span className="quick-card-cargo">{rolInfo?.nombre || usr.rol}</span>
                      </div>
                    </div>

                    <div className="quick-card-body">
                      <div className="quick-permisos-title">
                        Módulos habilitados ({vistas.length}):
                      </div>
                      <ul className="quick-permisos-list">
                        {vistas.map((v) => (
                          <li key={v.id}>
                            <span className="check-icon">✔</span> {v.icono} {v.titulo}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="quick-card-footer">
                    <button
                      type="button"
                      className="btn-action btn-primary"
                      style={{ width: "100%", justifyContent: "center" }}
                    >
                      Ingresar como {rolInfo?.nombre} &rarr;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="login-divider">
          <span>O ingresá manualmente con correo y contraseña</span>
        </div>

        {/* FORMULARIO MANUAL (mostrarFormulario) */}
        <form onSubmit={enviarCredenciales} className="login-form">
          {errorMsg && (
            <div className="login-error-alert" role="alert">
              <span>⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="login-form-grid">
            <div className="form-group">
              <label>Correo electrónico:</label>
              <input
                type="email"
                className="form-control"
                placeholder="ej. jefe@laesperanza.com.ar"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Contraseña:</label>
              <input
                type="password"
                className="form-control"
                placeholder="Ingresá 123"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                required
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "12px",
              flexWrap: "wrap",
              gap: "10px"
            }}
          >
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
              💡 Clave por defecto: <b>123</b> | Usuario deshabilitado de prueba:{" "}
              <code>inactivo@laesperanza.com.ar</code>
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
          <p>Ingenio La Esperanza S.A. — PluviaZafra · San Pedro de Jujuy</p>
        </div>
      </div>
    </div>
  );
}
