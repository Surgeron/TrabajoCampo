import { useMemo, useState } from "react";
import { describirCoberturas } from "../../../domain/reglas";
import { convenioVigente, empresasConConvenio, trabajadoresDeEmpresa } from "../../../domain/selectores";
import { normalizar } from "../../../utils/formato";
import Alert from "../../ui/Alert/Alert";
import FormField, { Input, Select } from "../../ui/FormField/FormField";
import Icon from "../../ui/Icon/Icon";
import "./SelectorTrabajador.css";

/**
 * CU-03 paso 2: empresa con convenio → trabajador del listado de personal → restricciones del convenio.
 */
export default function SelectorTrabajador({ datos, idEmpresa, idTrabajador, onCambiarEmpresa, onCambiarTrabajador, errores = {} }) {
  const [busqueda, setBusqueda] = useState("");
  const empresas = empresasConConvenio(datos);
  const convenio = idEmpresa ? convenioVigente(datos, idEmpresa) : null;
  const restricciones = useMemo(() => describirCoberturas(datos, convenio), [datos, convenio]);

  const trabajadores = useMemo(() => {
    if (!idEmpresa) return [];
    const texto = normalizar(busqueda);
    return trabajadoresDeEmpresa(datos, idEmpresa)
      .filter((t) => !texto || normalizar(`${t.apellido} ${t.nombre} ${t.dni}`).includes(texto))
      .sort((a, b) => a.apellido.localeCompare(b.apellido));
  }, [datos, idEmpresa, busqueda]);

  return (
    <div className="selector-trabajador">
      <FormField etiqueta="Empresa" error={errores.idEmpresa} obligatorio>
        <Select
          value={idEmpresa || ""}
          onChange={(e) => {
            onCambiarEmpresa(e.target.value || null);
            setBusqueda("");
          }}
        >
          <option value="">Elegí la empresa…</option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.razonSocial}
            </option>
          ))}
        </Select>
      </FormField>

      {idEmpresa && (
        <>
          <FormField etiqueta="Trabajador" error={errores.idTrabajador} obligatorio>
            <Input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por apellido o nombre"
              autoComplete="off"
            />
          </FormField>
          <div className="selector-trabajador__lista" role="listbox" aria-label="Trabajadores">
            {trabajadores.map((t) => (
              <button
                key={t.id}
                type="button"
                role="option"
                aria-selected={t.id === idTrabajador}
                className={`selector-trabajador__opcion ${t.id === idTrabajador ? "selector-trabajador__opcion--activa" : ""}`}
                onClick={() => onCambiarTrabajador(t.id)}
              >
                <Icon nombre={t.id === idTrabajador ? "check" : "usuario"} tamano={18} />
                <span>
                  {t.apellido}, {t.nombre}
                </span>
              </button>
            ))}
            {trabajadores.length === 0 && (
              <p className="texto-secundario">No hay trabajadores que coincidan con «{busqueda}» en el listado de la empresa.</p>
            )}
          </div>

          <Alert tipo="info" titulo="Restricciones del convenio">
            <span>
              <strong>Cubre:</strong> {restricciones.cubiertos.join(", ") || "nada"}.
            </span>
            {restricciones.noCubiertos.length > 0 && (
              <span>
                {" "}
                <strong>No cubre:</strong> {restricciones.noCubiertos.join(", ")} (los paga el trabajador aparte).
              </span>
            )}
            {convenio?.observaciones && <span> {convenio.observaciones}</span>}
          </Alert>
        </>
      )}
      {empresas.length === 0 && <Alert tipo="advertencia">No hay empresas con convenio vigente.</Alert>}
    </div>
  );
}
