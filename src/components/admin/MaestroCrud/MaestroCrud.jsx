import { useMemo, useState } from "react";
import { useFeedback } from "../../../context/FeedbackContext";
import { useOperacion } from "../../../hooks/useOperacion";
import { cambiarActivoMaestro, guardarMaestro } from "../../../services/mockApi";
import { normalizar } from "../../../utils/formato";
import Badge from "../../ui/Badge/Badge";
import Button from "../../ui/Button/Button";
import DataTable from "../../ui/DataTable/DataTable";
import EmptyState from "../../ui/EmptyState/EmptyState";
import { Input, Select } from "../../ui/FormField/FormField";
import Icon from "../../ui/Icon/Icon";
import Modal from "../../ui/Modal/Modal";
import "./MaestroCrud.css";

/**
 * Alta, modificación, consulta y baja lógica (desactivar) de un maestro.
 * La pantalla solo describe columnas, texto de búsqueda y formulario; el resto es común.
 *
 * config: { coleccion, singular, columnas(datos), textoBusqueda(registro, datos), nuevo(), Formulario, validarLocal?(datos, registro) }
 */
export default function MaestroCrud({ datos, config, accionesExtra }) {
  const feedback = useFeedback();
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("activos");
  const [edicion, setEdicion] = useState(null);
  const [errores, setErrores] = useState({});
  const [guardar, guardando] = useOperacion(guardarMaestro, {
    manejarError: (error) => {
      if (error.codigo === "VALIDACION" && error.detalles) {
        setErrores(error.detalles);
        return true;
      }
      return false;
    },
  });
  const [cambiarActivo] = useOperacion(cambiarActivoMaestro);

  const registros = datos[config.coleccion];
  const o = config.femenino ? "a" : "o";
  const visibles = useMemo(() => {
    const texto = normalizar(busqueda);
    return registros
      .filter((r) => (estado === "activos" ? r.activo : estado === "inactivos" ? !r.activo : true))
      .filter((r) => !texto || normalizar(config.textoBusqueda(r, datos)).includes(texto));
  }, [registros, busqueda, estado, config, datos]);

  const abrir = (registro) => {
    setErrores({});
    setEdicion(registro ? structuredClone(registro) : config.nuevo());
  };

  const enviar = async () => {
    const locales = config.validarLocal ? config.validarLocal(datos, edicion) : {};
    setErrores(locales);
    if (Object.keys(locales).length) return;
    const { ok } = await guardar(config.coleccion, edicion);
    if (ok) {
      feedback.exito(`${config.singular} ${edicion.id ? `actualizad${o}` : `cread${o}`}.`);
      setEdicion(null);
    }
  };

  const alternarActivo = async (registro) => {
    if (registro.activo) {
      const seguir = await feedback.confirmar({
        titulo: `¿Desactivar ${config.singular.toLowerCase()}?`,
        mensaje: "No se borra: deja de estar disponible para nuevas operaciones y el histórico lo conserva. Podés reactivarlo cuando quieras.",
        confirmarTexto: "Desactivar",
        tono: "peligro",
      });
      if (!seguir) return;
    }
    const { ok } = await cambiarActivo(config.coleccion, registro.id, !registro.activo);
    if (ok) feedback.exito(`${config.singular} ${registro.activo ? `desactivad${o}` : `reactivad${o}`}.`);
  };

  const columnas = [
    ...config.columnas(datos),
    {
      clave: "activo",
      titulo: "Estado",
      render: (r) => <Badge tono={r.activo ? "exito" : "neutro"}>{r.activo ? "Activo" : "Inactivo"}</Badge>,
    },
    {
      clave: "acciones",
      titulo: "Acciones",
      alinear: "derecha",
      render: (r) => (
        <span className="maestro__acciones">
          <Button variante="secundario" icono="editar" onClick={() => abrir(r)}>
            Editar
          </Button>
          <Button variante={r.activo ? "fantasma" : "secundario"} icono={r.activo ? "anular" : "recargar"} onClick={() => alternarActivo(r)}>
            {r.activo ? "Desactivar" : "Reactivar"}
          </Button>
        </span>
      ),
    },
  ];

  const { Formulario } = config;

  return (
    <div className="maestro">
      <div className="maestro__barra">
        <label className="maestro__buscar">
          <Icon nombre="buscar" />
          <span className="visualmente-oculto">Buscar</span>
          <Input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar…" />
        </label>
        <Select value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Filtrar por estado">
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
          <option value="todos">Todos</option>
        </Select>
        <div className="maestro__botones">
          {accionesExtra}
          <Button icono="mas" onClick={() => abrir(null)}>
            {config.femenino ? "Nueva" : "Nuevo"}
          </Button>
        </div>
      </div>

      <DataTable
        etiqueta={config.titulo}
        columnas={columnas}
        filas={visibles}
        vacio={<EmptyState icono="buscar" titulo="No hay registros que coincidan" />}
      />

      {edicion && (
        <Modal
          titulo={`${edicion.id ? "Editar" : config.femenino ? "Nueva" : "Nuevo"}: ${config.singular.toLowerCase()}`}
          onCerrar={() => setEdicion(null)}
          cerrable={!guardando}
          ancho={config.anchoFormulario || "md"}
          pie={
            <>
              <Button variante="secundario" onClick={() => setEdicion(null)} disabled={guardando}>
                Cancelar
              </Button>
              <Button icono="check" cargando={guardando} onClick={enviar}>
                Guardar
              </Button>
            </>
          }
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              enviar();
            }}
            noValidate
          >
            <Formulario
              datos={datos}
              valor={edicion}
              errores={errores}
              onCambiar={(cambios) => {
                setEdicion((actual) => ({ ...actual, ...cambios }));
                setErrores((e) => {
                  const restantes = { ...e };
                  Object.keys(cambios).forEach((k) => delete restantes[k]);
                  return restantes;
                });
              }}
            />
            <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
          </form>
        </Modal>
      )}
    </div>
  );
}
