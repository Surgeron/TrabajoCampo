import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App.jsx";
import { DatosProvider } from "./context/DatosContext";
import { FeedbackProvider } from "./context/FeedbackContext";
import { SesionProvider } from "./context/SesionContext";
import "./index.css";

// HashRouter (#/ruta) funciona en GitHub Pages sin configuración extra del servidor.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <FeedbackProvider>
        <DatosProvider>
          <SesionProvider>
            <App />
          </SesionProvider>
        </DatosProvider>
      </FeedbackProvider>
    </HashRouter>
  </React.StrictMode>,
);
