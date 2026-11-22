// Rutas del prototipo: una franja por rol, como en el mapa de navegación.
// HashRouter para que funcione en GitHub Pages sin configuración del servidor.
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AvisosProvider } from './context/AvisosContext'
import Layout, { RutaProtegida } from './components/Layout'
import { BASE_ROL } from './config/navegacion'
import { Cargando } from './components/ui'
import Login from './pages/Login'
import NoEncontrada from './pages/NoEncontrada'
// Equipo técnico agrícola
import InicioTecnico from './pages/tecnico/Inicio'
import Ranking from './pages/tecnico/Ranking'
import FichaLote from './pages/tecnico/FichaLote'
import Mapa from './pages/tecnico/Mapa'
import Reserva from './pages/tecnico/Reserva'
import Lotes from './pages/tecnico/Lotes'
import EditarLote from './pages/tecnico/EditarLote'
import Brix from './pages/tecnico/Brix'
import Cosecha from './pages/tecnico/Cosecha'
import Pronostico from './pages/tecnico/Pronostico'
import PronosticoManual from './pages/tecnico/PronosticoManual'
import Simulador from './pages/tecnico/Simulador'
import ResultadoSimulacion from './pages/tecnico/ResultadoSimulacion'
import Parametros from './pages/tecnico/Parametros'
// Compartidas
import EstadoPiso from './pages/compartidas/EstadoPiso'
import Abastecimiento from './pages/compartidas/Abastecimiento'
import Panel from './pages/compartidas/Panel'
import Informes from './pages/compartidas/Informes'
import VistaInforme from './pages/compartidas/VistaInforme'
// Jefe de lote
import InicioJefe from './pages/jefe/Inicio'
import Lectura from './pages/jefe/Lectura'
import MisRegistros from './pages/jefe/MisRegistros'
// Personal de báscula
import InicioBascula from './pages/bascula/Inicio'
import RegistrarCarros from './pages/bascula/RegistrarCarros'
import HistorialPatio from './pages/bascula/HistorialPatio'
// Fábrica
import InicioFabrica from './pages/fabrica/Inicio'
import Alertas from './pages/fabrica/Alertas'
import DetalleAlerta from './pages/fabrica/DetalleAlerta'
import Paradas from './pages/fabrica/Paradas'
import FormParada from './pages/fabrica/FormParada'

function Raiz() {
  const { perfil, cargando } = useAuth()
  if (cargando) return <Cargando texto="Verificando la sesión…" />
  return <Navigate to={perfil ? BASE_ROL[perfil.rol] : '/login'} replace />
}

function Franja({ rol }) {
  return (
    <RutaProtegida rol={rol}>
      <Layout />
    </RutaProtegida>
  )
}

export default function App() {
  return (
    <AvisosProvider>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Raiz />} />
            <Route path="/login" element={<Login />} />

            <Route path="/tecnico" element={<Franja rol="tecnico" />}>
              <Route index element={<InicioTecnico />} />
              <Route path="ranking" element={<Ranking />} />
              <Route path="mapa" element={<Mapa />} />
              <Route path="reserva" element={<Reserva />} />
              <Route path="lotes" element={<Lotes />} />
              <Route path="lotes/:id" element={<FichaLote />} />
              <Route path="lotes/:id/editar" element={<EditarLote />} />
              <Route path="estado-piso" element={<EstadoPiso />} />
              <Route path="brix" element={<Brix />} />
              <Route path="cosecha" element={<Cosecha />} />
              <Route path="pronostico" element={<Pronostico />} />
              <Route path="pronostico/manual" element={<PronosticoManual />} />
              <Route path="abastecimiento" element={<Abastecimiento />} />
              <Route path="simulador" element={<Simulador />} />
              <Route path="simulador/resultado" element={<ResultadoSimulacion />} />
              <Route path="panel" element={<Panel />} />
              <Route path="informes" element={<Informes />} />
              <Route path="informes/:tipo" element={<VistaInforme />} />
              <Route path="parametros" element={<Parametros />} />
              <Route path="*" element={<NoEncontrada />} />
            </Route>

            <Route path="/jefe" element={<Franja rol="jefe_lote" />}>
              <Route index element={<InicioJefe />} />
              <Route path="lectura" element={<Lectura />} />
              <Route path="estado-piso" element={<EstadoPiso />} />
              <Route path="registros" element={<MisRegistros />} />
              <Route path="*" element={<NoEncontrada />} />
            </Route>

            <Route path="/bascula" element={<Franja rol="bascula" />}>
              <Route index element={<InicioBascula />} />
              <Route path="carros" element={<RegistrarCarros />} />
              <Route path="historial" element={<HistorialPatio />} />
              <Route path="*" element={<NoEncontrada />} />
            </Route>

            <Route path="/fabrica" element={<Franja rol="fabrica" />}>
              <Route index element={<InicioFabrica />} />
              <Route path="alertas" element={<Alertas />} />
              <Route path="alertas/:id" element={<DetalleAlerta />} />
              <Route path="paradas" element={<Paradas />} />
              <Route path="paradas/nueva" element={<FormParada />} />
              <Route path="paradas/:id/cerrar" element={<FormParada />} />
              <Route path="abastecimiento" element={<Abastecimiento />} />
              <Route path="panel" element={<Panel />} />
              <Route path="informes" element={<Informes />} />
              <Route path="informes/:tipo" element={<VistaInforme />} />
              <Route path="*" element={<NoEncontrada />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </AvisosProvider>
  )
}
