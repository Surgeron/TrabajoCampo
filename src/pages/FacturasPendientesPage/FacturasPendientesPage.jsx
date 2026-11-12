import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import EditorFacturas, { facturaVacia } from "../../components/cobros/EditorFacturas/EditorFacturas";
import Alert from "../../components/ui/Alert/Alert";
import Button from "../../components/ui/Button/Button";
import DataTable from "../../components/ui/DataTable/DataTable";
import EmptyState from "../../components/ui/EmptyState/EmptyState";
import FormField, { Select } from "../../components/ui/FormField/FormField";
import Modal from "../../components/ui/Modal/Modal";
import PageHeader from "../../components/ui/PageHeader/PageHeader";
import { useDatos } from "../../context/DatosContext";
import { useSesion } from "../../context/SesionContext";
import { ESTADOS, MEDIOS_PAGO_INFO, ROLES, TIPOS_CLIENTE } from "../../domain/constantes";
import { getSucursal, mediosDePago, pagosDeComanda, puntoVentaSugerido, sucursalesActivas } from "../../domain/selectores";
import { validarFactura } from "../../domain/validaciones";
import { useOperacionConFacturas } from "../../hooks/useOperacionConFacturas";
import { completarFacturas } from "../../services/mockApi";
import { formatFechaHora, minutosDesde } from "../../utils/fechas";
import { formatMoneda, formatNumeroComanda } from "../../utils/formato";
import "./FacturasPendientesPage.css";

/** CU-08 Completar datos de factura de las comandas cobradas sin facturar. */
export default function FacturasPendientesPage() {
  const { datos } = useDatos();
  const { rol, sucursal } = useSesion();
  const navigate = useNavigate();
  const [parametros] = useSearchParams();
  const [filtroSucursal, setFiltroSucursal] = useState("");
  const idSucursal = rol === ROLES.MOZO ? sucursal.id : filtroSucursal;
  const [seleccion, setSeleccion] = useState(() => new Set((parametros.get("ids") || "").split(",").filter(Boolean)));
  const [formAbierto, setFormAbierto] = useState(Boolean(parametros.get("ids")));

  const pendientes = useMemo(
    () =>
      datos.comandas
        .filter(
          (c) =>
            c.estado === ESTADOS.COBRADO_SIN_FACTURAR &&
            c.tipoCliente === TIPOS_CLIENTE.PARTICULAR &&
            (!idSucursal || c.idSucursal === idSucursal),
        )
        .sort((a, b) => a.fechaHora.localeCompare(b.fechaHora)),
    [datos, idSucursal],
  );

  const seleccionadas = pendientes.filter((c) => seleccion.has(c.id));
  const total = seleccionadas.reduce((s, c) => s + c.total, 0);

  const columnas = [
    {
      clave: "numero",
      titulo: "Comanda",
      principal: true,
      render: (c) => `${formatNumeroComanda(c.numero)} · Mesa ${c.mesa}`,
    },
    { clave: "sucursal", titulo: "Sucursal", render: (c) => getSucursal(datos, c.idSucursal)?.nombre },
    { clave: "fecha", titulo: "Cobrada", render: (c) => formatFechaHora(pagosDeComanda(datos, c.id)[0]?.fechaHora) },
    {
      clave: "demora",
      titulo: "Hace",
      render: (c) => {
        const horas = Math.floor(minutosDesde(pagosDeComanda(datos, c.id)[0]?.fechaHora || c.fechaHora) / 60);
        return horas >= 24 ? `${Math.floor(horas / 24)} día(s)` : `${horas} h`;
      },
    },
    { clave: "medio", titulo: "Medio de pago", render: (c) => mediosDePago(datos, c).map((m) => MEDIOS_PAGO_INFO[m]).join(" + ") },
    { clave: "total", titulo: "Total", alinear: "derecha", render: (c) => <span className="numero">{formatMoneda(c.total)}</span> },
  ];

  return (
    <div className="pendientes">
      <PageHeader
        titulo="Cobradas sin facturar"
        descripcion="Cargá el número de la factura emitida en Tango. Una factura puede cubrir varias comandas."
        acciones={
          <Button icono="factura" disabled={seleccionadas.length === 0} onClick={() => setFormAbierto(true)}>
            Cargar factura{seleccionadas.length > 0 ? ` (${seleccionadas.length})` : ""}
          </Button>
        }
      />

      {rol !== ROLES.MOZO && (
        <div className="pendientes__filtro">
          <FormField etiqueta="Sucursal">
            <Select value={filtroSucursal} onChange={(e) => setFiltroSucursal(e.target.value)}>
              <option value="">Todas</option>
              {sucursalesActivas(datos).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      )}

      {pendientes.length > 0 && (
        <div className="pendientes__aviso">
          <Alert tipo="advertencia">
            {pendientes.length} venta{pendientes.length > 1 ? "s" : ""} cobrada{pendientes.length > 1 ? "s" : ""} sin factura por{" "}
            {formatMoneda(pendientes.reduce((s, c) => s + c.total, 0))}. Es riesgo fiscal ante ARCA: facturalas el mismo día.
          </Alert>
        </div>
      )}

      <DataTable
          etiqueta="Comandas cobradas sin facturar"
          columnas={columnas}
          filas={pendientes}
          onFilaClick={(c) => navigate(`/comandas/${c.id}`)}
          seleccion={{
            seleccionados: seleccion,
            onCambiar: (id, marcado) =>
              setSeleccion((actual) => {
                const nueva = new Set(actual);
                if (marcado) nueva.add(id);
                else nueva.delete(id);
                return nueva;
              }),
          }}
          vacio={
            <EmptyState icono="check" titulo="No hay ventas pendientes de facturar">
              Todo lo cobrado tiene su factura vinculada.
            </EmptyState>
          }
        />

      {formAbierto && seleccionadas.length > 0 && (
        <FormularioFactura
          datos={datos}
          comandas={seleccionadas}
          total={total}
          onCerrar={() => setFormAbierto(false)}
          onListo={() => {
            setFormAbierto(false);
            setSeleccion(new Set());
          }}
        />
      )}
    </div>
  );
}

function FormularioFactura({ datos, comandas, total, onCerrar, onListo }) {
  const pv = puntoVentaSugerido(datos, comandas[0].idSucursal);
  const [facturas, setFacturas] = useState([facturaVacia({ puntoVenta: pv, importe: total })]);
  const [errores, setErrores] = useState({});
  const [registrar, registrando] = useOperacionConFacturas(completarFacturas, {
    mensajeExito: (cs) => `Factura vinculada a ${cs.length} comanda${cs.length > 1 ? "s" : ""}.`,
  });

  const confirmar = async () => {
    const nuevos = {};
    facturas.forEach((f, i) => {
      const e = validarFactura(f);
      if (Object.keys(e).length) nuevos[i] = e;
    });
    const suma = facturas.reduce((s, f) => s + (Number(f.importe) || 0), 0);
    if (Math.abs(suma - total) > 0.5) nuevos.general = `Las facturas deben sumar ${formatMoneda(total)}.`;
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;
    const { ok } = await registrar({ idsComandas: comandas.map((c) => c.id), facturas });
    if (ok) onListo();
  };

  return (
    <Modal
      titulo="Cargar factura de Tango"
      subtitulo={`${comandas.map((c) => formatNumeroComanda(c.numero)).join(", ")} · ${formatMoneda(total)}`}
      onCerrar={onCerrar}
      cerrable={!registrando}
      ancho="lg"
      pie={
        <>
          <Button variante="secundario" onClick={onCerrar} disabled={registrando}>
            Cancelar
          </Button>
          <Button icono="check" cargando={registrando} onClick={confirmar}>
            Vincular factura
          </Button>
        </>
      }
    >
      <EditorFacturas facturas={facturas} onCambiar={setFacturas} total={total} errores={errores} puntoVentaSugerido={pv} />
      {errores.general && (
        <div style={{ marginTop: 12 }}>
          <Alert tipo="error">{errores.general}</Alert>
        </div>
      )}
    </Modal>
  );
}
