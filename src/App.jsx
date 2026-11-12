import { Route, Routes } from "react-router-dom";
import { ROLES } from "./domain/constantes";
import AdminPage from "./pages/AdminPage/AdminPage";
import CobroPage from "./pages/CobroPage/CobroPage";
import CocinaPage from "./pages/CocinaPage/CocinaPage";
import ComandaDetallePage from "./pages/ComandaDetallePage/ComandaDetallePage";
import ComandasPage from "./pages/ComandasPage/ComandasPage";
import ConsultaPage from "./pages/ConsultaPage/ConsultaPage";
import DepositoPage from "./pages/DepositoPage/DepositoPage";
import DesperdicioPage from "./pages/DesperdicioPage/DesperdicioPage";
import FacturasPendientesPage from "./pages/FacturasPendientesPage/FacturasPendientesPage";
import HomePage from "./pages/HomePage";
import InformesPage from "./pages/InformesPage/InformesPage";
import LoginPage from "./pages/LoginPage/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import NuevaComandaPage from "./pages/NuevaComandaPage/NuevaComandaPage";
import SucursalPage from "./pages/SucursalPage/SucursalPage";
import RutaProtegida, { RedireccionInicio } from "./routes/RutaProtegida";

const { MOZO, COCINERO, FINANZAS, SUPERVISOR, ADMINISTRADOR } = ROLES;

/** Ruta protegida con los roles que pueden verla. */
const protegida = (roles, elemento) => <RutaProtegida roles={roles}>{elemento}</RutaProtegida>;

// Modo prototipo: los datos salen del backend simulado (src/services/mockApi.js).
// PruebaBackend.jsx y firebase.js quedan en el proyecto para la integración con el backend real.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RedireccionInicio />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/sucursal" element={<SucursalPage />} />

      {/* Mozo */}
      <Route path="/inicio" element={protegida([MOZO], <HomePage />)} />
      <Route path="/comandas/nueva" element={protegida([MOZO], <NuevaComandaPage />)} />
      <Route path="/comandas" element={protegida([MOZO], <ComandasPage />)} />
      <Route path="/comandas/:id" element={protegida([MOZO, SUPERVISOR, FINANZAS], <ComandaDetallePage />)} />
      <Route path="/cobrar" element={protegida([MOZO], <CobroPage />)} />
      <Route path="/facturas-pendientes" element={protegida([MOZO, FINANZAS], <FacturasPendientesPage />)} />

      {/* Cocinero */}
      <Route path="/cocina" element={protegida([COCINERO], <CocinaPage />)} />
      <Route path="/deposito" element={protegida([COCINERO], <DepositoPage />)} />
      <Route path="/desperdicio" element={protegida([COCINERO], <DesperdicioPage />)} />

      {/* Finanzas y supervisión */}
      <Route path="/informes" element={protegida([FINANZAS, SUPERVISOR], <InformesPage />)} />
      <Route path="/consulta" element={protegida([FINANZAS, SUPERVISOR], <ConsultaPage />)} />

      {/* Administración */}
      <Route path="/admin" element={protegida([ADMINISTRADOR], <AdminPage />)} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
