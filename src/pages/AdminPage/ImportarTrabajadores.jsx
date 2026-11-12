import { useState } from "react";
import Alert from "../../components/ui/Alert/Alert";
import Button from "../../components/ui/Button/Button";
import FormField, { Select } from "../../components/ui/FormField/FormField";
import Modal from "../../components/ui/Modal/Modal";
import { empresasActivas } from "../../domain/selectores";
import { useOperacion } from "../../hooks/useOperacion";
import { importarTrabajadores } from "../../services/mockApi";

/**
 * Lee el listado de personal exportado como CSV (desde Excel: "Guardar como CSV").
 * Columnas esperadas: Apellido; Nombre; DNI (opcional). La primera fila puede ser el encabezado.
 */
export function leerListado(texto) {
  const lineas = texto.replace(/^﻿/, "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lineas.length === 0) return [];
  const separador = (lineas[0].match(/;/g) || []).length >= (lineas[0].match(/,/g) || []).length ? ";" : ",";
  const celdas = lineas.map((l) => l.split(separador).map((c) => c.replace(/^"|"$/g, "").trim()));
  const tieneEncabezado = celdas[0].some((c) => /apellido|nombre/i.test(c));
  return (tieneEncabezado ? celdas.slice(1) : celdas).map(([apellido = "", nombre = "", dni = ""]) => ({ apellido, nombre, dni }));
}

export default function ImportarTrabajadores({ datos, onCerrar }) {
  const [idEmpresa, setIdEmpresa] = useState("");
  const [filas, setFilas] = useState(null);
  const [archivo, setArchivo] = useState("");
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);
  const [importar, importando] = useOperacion(importarTrabajadores);

  const leerArchivo = (e) => {
    const file = e.target.files?.[0];
    setResultado(null);
    setError("");
    if (!file) return;
    if (!/\.(csv|txt)$/i.test(file.name)) {
      setError("El archivo debe ser .csv (desde Excel: Archivo › Guardar como › CSV).");
      setFilas(null);
      return;
    }
    const lector = new FileReader();
    lector.onload = () => {
      const leidas = leerListado(String(lector.result));
      setArchivo(file.name);
      setFilas(leidas);
      if (leidas.length === 0) setError("El archivo no tiene filas con datos.");
    };
    lector.onerror = () => setError("No se pudo leer el archivo.");
    lector.readAsText(file, "utf-8");
  };

  const confirmar = async () => {
    if (!idEmpresa) {
      setError("Elegí la empresa a la que pertenece el listado.");
      return;
    }
    if (!filas || filas.length === 0) {
      setError("Elegí un archivo con trabajadores.");
      return;
    }
    const { ok, datos: res } = await importar(idEmpresa, filas);
    if (ok) setResultado(res);
  };

  return (
    <Modal
      titulo="Importar listado de personal"
      subtitulo="Archivo CSV con columnas Apellido; Nombre; DNI (opcional)."
      onCerrar={onCerrar}
      cerrable={!importando}
      pie={
        resultado ? (
          <Button onClick={onCerrar}>Listo</Button>
        ) : (
          <>
            <Button variante="secundario" onClick={onCerrar} disabled={importando}>
              Cancelar
            </Button>
            <Button icono="subir" cargando={importando} onClick={confirmar} disabled={!filas?.length}>
              Importar {filas?.length ? `${filas.length} trabajadores` : ""}
            </Button>
          </>
        )
      }
    >
      {resultado ? (
        <div className="grilla-form">
          <Alert tipo="exito" titulo={`${resultado.importados} trabajador(es) importado(s)`} />
          {resultado.omitidos.length > 0 && (
            <Alert tipo="advertencia" titulo={`${resultado.omitidos.length} fila(s) omitida(s)`}>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {resultado.omitidos.slice(0, 10).map((o) => (
                  <li key={o.fila}>
                    Fila {o.fila} ({o.nombre}): {o.motivo}
                  </li>
                ))}
              </ul>
            </Alert>
          )}
        </div>
      ) : (
        <div className="grilla-form">
          <FormField etiqueta="Empresa" obligatorio>
            <Select
              value={idEmpresa}
              onChange={(e) => {
                setIdEmpresa(e.target.value);
                setError("");
              }}
            >
              <option value="">Elegí…</option>
              {empresasActivas(datos).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.razonSocial}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField etiqueta="Archivo" obligatorio ayuda={archivo || "Formato .csv"}>
            <input type="file" accept=".csv,.txt,text/csv" onChange={leerArchivo} className="control" />
          </FormField>
          {error && <Alert tipo="error">{error}</Alert>}
          {filas?.length > 0 && (
            <Alert tipo="info" titulo={`Vista previa (${filas.length} filas)`}>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {filas.slice(0, 6).map((f, i) => (
                  <li key={i}>
                    {f.apellido}, {f.nombre} {f.dni && `· DNI ${f.dni}`}
                  </li>
                ))}
                {filas.length > 6 && <li>… y {filas.length - 6} más</li>}
              </ul>
            </Alert>
          )}
          <p className="campo__ayuda">Las filas incompletas o repetidas se omiten y se informan al terminar.</p>
        </div>
      )}
    </Modal>
  );
}
