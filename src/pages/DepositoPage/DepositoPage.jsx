import { useMemo, useState } from "react";
import Badge from "../../components/ui/Badge/Badge";
import Button from "../../components/ui/Button/Button";
import Card from "../../components/ui/Card/Card";
import DataTable from "../../components/ui/DataTable/DataTable";
import EmptyState from "../../components/ui/EmptyState/EmptyState";
import FormField, { Input, Segmentado, Select } from "../../components/ui/FormField/FormField";
import { useDatos } from "../../context/DatosContext";
import { useFeedback } from "../../context/FeedbackContext";
import { useSesion } from "../../context/SesionContext";
import { TIPOS_MOVIMIENTO, TURNOS } from "../../domain/constantes";
import { turnoPorHora } from "../../domain/reglas";
import { getInsumo, nombreUsuario } from "../../domain/selectores";
import { tieneErrores, validarMovimiento } from "../../domain/validaciones";
import { useOperacion } from "../../hooks/useOperacion";
import { registrarMovimiento } from "../../services/mockApi";
import { fechaHoraISO, formatFechaHora } from "../../utils/fechas";
import { formatNumero } from "../../utils/formato";
import "../registros.css";

const lineaVacia = () => ({ idInsumo: "", cantidad: "" });

/** CU-10 Registrar retiro de depósito (y devoluciones). */
export default function DepositoPage() {
  const { datos } = useDatos();
  const { sucursal } = useSesion();
  const feedback = useFeedback();
  const [tipo, setTipo] = useState(TIPOS_MOVIMIENTO.RETIRO);
  const [turno, setTurno] = useState(() => turnoPorHora(fechaHoraISO()));
  const [lineas, setLineas] = useState([lineaVacia()]);
  const [errores, setErrores] = useState({});
  const [registrar, registrando] = useOperacion(registrarMovimiento);

  const insumos = datos.insumos.filter((i) => i.activo);
  const movimientos = useMemo(
    () =>
      datos.movimientos
        .filter((m) => m.idSucursal === sucursal.id)
        .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora)),
    [datos, sucursal.id],
  );

  const actualizar = (i, campo, valor) => {
    setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, [campo]: valor } : l)));
    setErrores((e) => ({ ...e, [`${campo === "idInsumo" ? "insumo" : "cantidad"}_${i}`]: undefined, detalle: undefined }));
  };

  const enviar = async (e) => {
    e.preventDefault();
    const movimiento = { tipo, turno, detalle: lineas };
    const nuevos = validarMovimiento(movimiento);
    setErrores(nuevos);
    if (tieneErrores(nuevos)) return;
    const { ok, datos: registro } = await registrar(movimiento);
    if (!ok) return;
    feedback.exito(
      `${registro.detalle.length} insumo${registro.detalle.length > 1 ? "s" : ""} registrados.`,
      `${tipo === TIPOS_MOVIMIENTO.RETIRO ? "Retiro" : "Devolución"} N° ${registro.numero}`,
    );
    setLineas([lineaVacia()]);
  };

  const columnas = [
    {
      clave: "numero",
      titulo: "Movimiento",
      principal: true,
      render: (m) => (
        <span className="registros__titulo">
          N° {m.numero}{" "}
          <Badge tono={m.tipo === TIPOS_MOVIMIENTO.RETIRO ? "info" : "exito"}>
            {m.tipo === TIPOS_MOVIMIENTO.RETIRO ? "Retiro" : "Devolución"}
          </Badge>
        </span>
      ),
    },
    { clave: "fecha", titulo: "Fecha", render: (m) => formatFechaHora(m.fechaHora) },
    {
      clave: "detalle",
      titulo: "Insumos",
      render: (m) =>
        m.detalle
          .map((l) => {
            const insumo = getInsumo(datos, l.idInsumo);
            return `${insumo?.nombre} ${formatNumero(l.cantidad)} ${insumo?.unidad}`;
          })
          .join(" · "),
    },
    { clave: "usuario", titulo: "Registró", render: (m) => nombreUsuario(datos, m.idUsuario), ocultarEnMovil: true },
  ];

  return (
    <div className="registros">
      <Card titulo="Registrar movimiento" subtitulo="Lo que sale del depósito del hotel hacia la cocina.">
        <form className="grilla-form" onSubmit={enviar} noValidate>
          <Segmentado
            nombre="Tipo de movimiento"
            valor={tipo}
            onCambiar={setTipo}
            opciones={[
              { valor: TIPOS_MOVIMIENTO.RETIRO, etiqueta: "Retiro" },
              { valor: TIPOS_MOVIMIENTO.DEVOLUCION, etiqueta: "Devolución" },
            ]}
          />
          <FormField etiqueta="Turno" ayuda="Opcional">
            <Select value={turno} onChange={(e) => setTurno(e.target.value)}>
              <option value="">Sin turno</option>
              {TURNOS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>

          <div className="registros__lineas">
            {lineas.map((linea, i) => {
              const insumo = getInsumo(datos, linea.idInsumo);
              return (
                <div key={i} className="registros__linea">
                  <FormField etiqueta={`Insumo ${i + 1}`} error={errores[`insumo_${i}`]} obligatorio>
                    <Select value={linea.idInsumo} onChange={(e) => actualizar(i, "idInsumo", e.target.value)}>
                      <option value="">Elegí…</option>
                      {insumos.map((ins) => (
                        <option key={ins.id} value={ins.id}>
                          {ins.nombre}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField etiqueta={`Cantidad${insumo ? ` (${insumo.unidad})` : ""}`} error={errores[`cantidad_${i}`]} obligatorio>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.1"
                      value={linea.cantidad}
                      onChange={(e) => actualizar(i, "cantidad", e.target.value)}
                    />
                  </FormField>
                  {lineas.length > 1 && (
                    <Button
                      variante="fantasma"
                      soloIcono
                      icono="cerrar"
                      aria-label={`Quitar insumo ${i + 1}`}
                      className="registros__quitar"
                      onClick={() => setLineas((ls) => ls.filter((_, j) => j !== i))}
                    />
                  )}
                </div>
              );
            })}
          </div>
          {errores.detalle && <p className="registros__error">{errores.detalle}</p>}
          <div className="fila-acciones fila-acciones--apiladas-movil">
            <Button variante="secundario" icono="mas" onClick={() => setLineas((ls) => [...ls, lineaVacia()])}>
              Agregar insumo
            </Button>
            <Button type="submit" tamano="lg" icono="check" cargando={registrando}>
              Registrar {tipo === TIPOS_MOVIMIENTO.RETIRO ? "retiro" : "devolución"}
            </Button>
          </div>
        </form>
      </Card>

      <Card titulo="Movimientos de la sucursal" subtitulo={`${movimientos.length} registrados`}>
        <DataTable
          etiqueta="Movimientos de depósito"
          columnas={columnas}
          filas={movimientos}
          porPagina={15}
          vacio={<EmptyState icono="deposito" titulo="Todavía no hay movimientos" />}
        />
      </Card>
    </div>
  );
}
