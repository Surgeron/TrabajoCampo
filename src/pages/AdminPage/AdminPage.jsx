import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import MaestroCrud from "../../components/admin/MaestroCrud/MaestroCrud";
import Button from "../../components/ui/Button/Button";
import PageHeader from "../../components/ui/PageHeader/PageHeader";
import Tabs from "../../components/ui/Tabs/Tabs";
import { useDatos } from "../../context/DatosContext";
import { useFeedback } from "../../context/FeedbackContext";
import { useOperacion } from "../../hooks/useOperacion";
import { restablecerDatos } from "../../services/mockApi";
import ImportarTrabajadores from "./ImportarTrabajadores";
import { MAESTROS } from "./maestros";
import "./AdminPage.css";

/** CU-14 Administrar maestros. */
export default function AdminPage() {
  const { datos } = useDatos();
  const feedback = useFeedback();
  const [parametros, setParametros] = useSearchParams();
  const activo = MAESTROS.find((m) => m.id === parametros.get("seccion")) || MAESTROS[0];
  const [importando, setImportando] = useState(false);
  const [restablecer, restableciendo] = useOperacion(restablecerDatos, {
    mensajeExito: "Se restablecieron los datos de ejemplo.",
  });

  const pestanas = MAESTROS.map((m) => ({
    id: m.id,
    etiqueta: m.titulo,
    contador: datos[m.coleccion].filter((r) => r.activo).length,
  }));

  const confirmarRestablecer = async () => {
    const seguir = await feedback.confirmar({
      titulo: "¿Restablecer los datos de ejemplo?",
      mensaje: "Se borran todas las comandas, cobros y cambios hechos en este navegador y se vuelve al estado inicial del prototipo.",
      confirmarTexto: "Restablecer",
      tono: "peligro",
    });
    if (seguir) await restablecer();
  };

  return (
    <div className="admin">
      <PageHeader
        titulo="Administración"
        descripcion="Nada se borra: los registros se desactivan para conservar el histórico."
        acciones={
          <Button variante="secundario" icono="recargar" cargando={restableciendo} onClick={confirmarRestablecer}>
            Restablecer datos de ejemplo
          </Button>
        }
      />
      <div className="admin__pestanas">
        <Tabs
          pestanas={pestanas}
          activa={activo.id}
          onCambiar={(id) => setParametros({ seccion: id }, { replace: true })}
          etiqueta="Maestros"
        />
      </div>
      <MaestroCrud
        key={activo.id}
        datos={datos}
        config={activo}
        accionesExtra={
          activo.id === "trabajadores" && (
            <Button variante="secundario" icono="subir" onClick={() => setImportando(true)}>
              Importar listado
            </Button>
          )
        }
      />
      {importando && <ImportarTrabajadores datos={datos} onCerrar={() => setImportando(false)} />}
    </div>
  );
}
