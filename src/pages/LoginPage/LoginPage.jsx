import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ChefHat } from "../../components/layout/Sidebar/Sidebar";
import Alert from "../../components/ui/Alert/Alert";
import Button from "../../components/ui/Button/Button";
import FormField, { Input } from "../../components/ui/FormField/FormField";
import { Cargando } from "../../components/ui/Spinner/Spinner";
import { USUARIOS } from "../../data/catalogos";
import { ROLES_INFO } from "../../domain/constantes";
import { useDatos } from "../../context/DatosContext";
import { useSesion } from "../../context/SesionContext";
import "./LoginPage.css";

/** CU-01 Iniciar sesión. */
export default function LoginPage() {
  const { cargando } = useDatos();
  const { usuario, rol, iniciar } = useSesion();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ usuario: "", password: "" });
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [verPassword, setVerPassword] = useState(false);

  if (cargando) return <Cargando texto="Preparando el sistema…" />;
  if (usuario && !enviando) return <Navigate to={ROLES_INFO[rol].inicio} replace />;

  const cambiar = (campo) => (e) => {
    setForm((f) => ({ ...f, [campo]: e.target.value }));
    setErrores((er) => ({ ...er, [campo]: undefined }));
    setErrorGeneral("");
  };

  const enviar = async (e) => {
    e.preventDefault();
    const nuevos = {};
    if (!form.usuario.trim()) nuevos.usuario = "Ingresá tu usuario.";
    if (!form.password) nuevos.password = "Ingresá tu contraseña.";
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;

    setEnviando(true);
    try {
      const encontrado = await iniciar(form.usuario, form.password);
      const rolInicial = encontrado.roles[0];
      const necesitaSucursal = ROLES_INFO[rolInicial].requiereSucursal && !encontrado.idSucursalTrabajo;
      const destino = necesitaSucursal ? "/sucursal" : location.state?.desde || ROLES_INFO[rolInicial].inicio;
      navigate(destino, { replace: true });
    } catch (error) {
      setErrorGeneral(error.message);
      setForm((f) => ({ ...f, password: "" }));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="login">
      <section className="login__marca" aria-hidden="true">
        <ChefHat className="login__logo" />
        <strong>TrazaPlato</strong>
        <p>Comandas y trazabilidad de los comedores de Las Vertientes S.R.L.</p>
      </section>

      <section className="login__panel">
        <form className="login__form" onSubmit={enviar} noValidate>
          <div className="login__cabecera">
            <ChefHat className="login__logo-movil" />
            <h1>Iniciar sesión</h1>
            <p>Ingresá con tu usuario de empleado.</p>
          </div>

          {errorGeneral && <Alert tipo="error">{errorGeneral}</Alert>}

          <FormField etiqueta="Usuario" error={errores.usuario} obligatorio>
            <Input
              value={form.usuario}
              onChange={cambiar("usuario")}
              autoComplete="username"
              autoCapitalize="none"
              placeholder="nombre.usuario"
            />
          </FormField>
          <FormField etiqueta="Contraseña" error={errores.password} obligatorio>
            <div className="login__password">
              <Input
                type={verPassword ? "text" : "password"}
                value={form.password}
                onChange={cambiar("password")}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login__ver"
                onClick={() => setVerPassword((v) => !v)}
                aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {verPassword ? "Ocultar" : "Ver"}
              </button>
            </div>
          </FormField>

          <Button type="submit" tamano="lg" bloque cargando={enviando}>
            Ingresar
          </Button>
        </form>

        <details className="login__demo">
          <summary>Usuarios de prueba (contraseña 1234)</summary>
          <ul>
            {USUARIOS.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => {
                    setForm({ usuario: u.nombreUsuario, password: "1234" });
                    setErrores({});
                    setErrorGeneral("");
                  }}
                >
                  <strong>{u.nombreUsuario}</strong>
                  <span>
                    {u.roles.map((r) => ROLES_INFO[r].label).join(" + ")}
                    {u.activo ? "" : " · inactivo"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      </section>
    </div>
  );
}
