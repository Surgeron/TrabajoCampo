import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import ModalAdicion from "../../components/comandas/ModalAdicion/ModalAdicion";
import ModalAnular from "../../components/comandas/ModalAnular/ModalAnular";
import Alert from "../../components/ui/Alert/Alert";
import Badge, { EstadoBadge } from "../../components/ui/Badge/Badge";
import Button from "../../components/ui/Button/Button";
import Card from "../../components/ui/Card/Card";
import EmptyState from "../../components/ui/EmptyState/EmptyState";
import PageHeader from "../../components/ui/PageHeader/PageHeader";
import { useDatos } from "../../context/DatosContext";
import { useFeedback } from "../../context/FeedbackContext";
import { useSesion } from "../../context/SesionContext";
import { ESTADOS_INFO, MEDIOS_PAGO_INFO, ROLES, TIPOS_CLIENTE } from "../../domain/constantes";
import {
  motivoNoAnulable,
  puedeAgregarAdicion,
  puedeAnular,
  puedeCobrar,
  puedeCompletarFactura,
  puedeMarcarEntregado,
} from "../../domain/estados";
import {
  comandaAparteDe,
  empresaDeComanda,
  facturasDeComanda,
  getComanda,
  getConvenio,
  getSucursal,
  getTrabajador,
  nombreUsuario,
  pagosDeComanda,
} from "../../domain/selectores";
import { useOperacion } from "../../hooks/useOperacion";
import { marcarEntregado } from "../../services/mockApi";
import { formatFechaHora, formatHora } from "../../utils/fechas";
import { formatComprobante, formatMoneda, formatNumeroComanda } from "../../utils/formato";
import "./ComandaDetallePage.css";

/** Detalle de comanda: ítems, adiciones, pagos, facturas e historial (CU-06, CU-09, CU-13). */
export default function ComandaDetallePage() {
  const { id } = useParams();
  const [parametros, setParametros] = useSearchParams();
  const { datos } = useDatos();
  const { rol, sucursal } = useSesion();
  const feedback = useFeedback();
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);
  const [entregar, entregando] = useOperacion(marcarEntregado, { mensajeExito: "Comanda entregada." });
  const comanda = getComanda(datos, id);

  // ?accion=adicion abre directamente la carga de ítems.
  useEffect(() => {
    if (parametros.get("accion") === "adicion" && comanda && puedeAgregarAdicion(comanda)) setModal("adicion");
  }, [parametros, comanda]);

  if (!comanda) {
    return (
      <EmptyState icono="buscar" titulo="La comanda no existe" accion={<Button onClick={() => navigate(-1)}>Volver</Button>} />
    );
  }
  if (rol === ROLES.MOZO && comanda.idSucursal !== sucursal?.id) {
    return <EmptyState icono="sucursal" titulo="La comanda pertenece a otra sucursal" />;
  }

  const esMozo = rol === ROLES.MOZO;
  const trabajador = comanda.idTrabajador ? getTrabajador(datos, comanda.idTrabajador) : null;
  const empresa = empresaDeComanda(datos, comanda);
  const convenio = comanda.idConvenio ? getConvenio(datos, comanda.idConvenio) : null;
  const pagos = pagosDeComanda(datos, comanda.id);
  const facturas = facturasDeComanda(datos, comanda.id);
  const origen = comanda.idComandaOrigen ? getComanda(datos, comanda.idComandaOrigen) : null;
  const apartes = comandaAparteDe(datos, comanda.id);
  const originales = comanda.items.filter((i) => !i.idAdicion);
  const anulable = puedeAnular(comanda, rol);

  const cerrarModal = () => {
    setModal(null);
    if (parametros.get("accion")) setParametros({}, { replace: true });
  };

  const alAgregar = (resultado) => {
    cerrarModal();
    const partes = [];
    if (resultado.comanda) partes.push("La adición ya está en la cola de cocina.");
    if (resultado.aparte) partes.push(`Se generó la comanda aparte ${formatNumeroComanda(resultado.aparte.numero)}.`);
    feedback.exito(partes.join(" "), "Ítems agregados");
  };

  const filaItem = (item) => (
    <li key={item.id} className="detalle__item">
      <span className="numero">{item.cantidad}×</span>
      <span>{item.nombre}</span>
      <span className="numero texto-secundario">{formatMoneda(item.precioUnitario)}</span>
      <strong className="numero">{formatMoneda(item.cantidad * item.precioUnitario)}</strong>
    </li>
  );

  return (
    <div className="detalle">
      <PageHeader
        volverA={-1}
        titulo={`${formatNumeroComanda(comanda.numero)} · Mesa ${comanda.mesa}`}
        descripcion={`${getSucursal(datos, comanda.idSucursal)?.nombre} · ${formatFechaHora(comanda.fechaHora)}`}
        acciones={<EstadoBadge estado={comanda.estado} grande />}
      />

      {comanda.estado === "anulado" && (
        <div className="detalle__aviso">
          <Alert tipo="error" titulo="Comanda anulada">
            Motivo: {comanda.historial.at(-1)?.motivo || "—"}
          </Alert>
        </div>
      )}

      <div className="detalle__acciones fila-acciones">
        {esMozo && puedeMarcarEntregado(comanda) && (
          <Button variante="exito" icono="check" cargando={entregando} onClick={() => entregar(comanda.id)}>
            Marcar entregada
          </Button>
        )}
        {esMozo && puedeCobrar(comanda) && (
          <Button icono="cobrar" onClick={() => navigate(`/cobrar?ids=${comanda.id}`)}>
            {comanda.tipoCliente === TIPOS_CLIENTE.CONVENIO ? "Cerrar en cuenta corriente" : "Cobrar"}
          </Button>
        )}
        {esMozo && puedeAgregarAdicion(comanda) && (
          <Button variante="secundario" icono="mas" onClick={() => setModal("adicion")}>
            Agregar ítems
          </Button>
        )}
        {[ROLES.MOZO, ROLES.FINANZAS].includes(rol) && puedeCompletarFactura(comanda) && (
          <Button icono="factura" onClick={() => navigate(`/facturas-pendientes?ids=${comanda.id}`)}>
            Cargar factura
          </Button>
        )}
        {[ROLES.MOZO, ROLES.SUPERVISOR].includes(rol) && comanda.estado !== "anulado" && (
          <Button
            variante="secundario"
            icono="anular"
            onClick={() => setModal("anular")}
            disabled={!anulable}
            title={anulable ? undefined : motivoNoAnulable(comanda, rol)}
          >
            Anular
          </Button>
        )}
      </div>
      {[ROLES.MOZO, ROLES.SUPERVISOR].includes(rol) && !anulable && comanda.estado !== "anulado" && (
        <p className="detalle__nota texto-secundario">{motivoNoAnulable(comanda, rol)}</p>
      )}

      <div className="detalle__grilla">
        <div className="detalle__columna">
          <Card titulo="Cliente">
            <dl className="detalle__datos">
              <div>
                <dt>Tipo</dt>
                <dd>
                  {comanda.tipoCliente === TIPOS_CLIENTE.CONVENIO ? <Badge tono="info">Convenio</Badge> : <Badge>Particular</Badge>}
                </dd>
              </div>
              {trabajador && (
                <div>
                  <dt>Trabajador</dt>
                  <dd>
                    {trabajador.apellido}, {trabajador.nombre}
                  </dd>
                </div>
              )}
              {empresa && (
                <div>
                  <dt>Empresa</dt>
                  <dd>{empresa.razonSocial}</dd>
                </div>
              )}
              {convenio && (
                <div>
                  <dt>Firma del control diario</dt>
                  <dd>{comanda.firmoControlDiario ? "Confirmada" : "Pendiente"}</dd>
                </div>
              )}
              <div>
                <dt>Mozo</dt>
                <dd>{nombreUsuario(datos, comanda.idMozo)}</dd>
              </div>
              <div>
                <dt>Turno</dt>
                <dd style={{ textTransform: "capitalize" }}>{comanda.turno}</dd>
              </div>
            </dl>
            {origen && (
              <p className="detalle__vinculo">
                Consumo fuera de convenio de la comanda{" "}
                <Link to={`/comandas/${origen.id}`}>{formatNumeroComanda(origen.numero)}</Link>.
              </p>
            )}
            {apartes.map((a) => (
              <p key={a.id} className="detalle__vinculo">
                Tiene una comanda aparte por consumo no cubierto:{" "}
                <Link to={`/comandas/${a.id}`}>{formatNumeroComanda(a.numero)}</Link>.
              </p>
            ))}
            {comanda.observaciones && <p className="detalle__vinculo">Observaciones: {comanda.observaciones}</p>}
          </Card>

          <Card titulo="Pedido">
            <ul className="detalle__items">{originales.map(filaItem)}</ul>
            {comanda.adiciones.map((adicion, i) => (
              <div key={adicion.id} className="detalle__adicion">
                <span className="detalle__adicion-titulo">
                  Adición {i + 1} · {formatHora(adicion.fechaHora)} · {nombreUsuario(datos, adicion.idUsuario)}
                </span>
                <ul className="detalle__items">{comanda.items.filter((it) => it.idAdicion === adicion.id).map(filaItem)}</ul>
              </div>
            ))}
            <div className="detalle__total">
              <span>Total</span>
              <strong className="numero">{formatMoneda(comanda.total)}</strong>
            </div>
          </Card>
        </div>

        <div className="detalle__columna">
          <Card titulo="Cobro y facturación">
            {comanda.tipoCliente === TIPOS_CLIENTE.CONVENIO ? (
              <p className="texto-secundario">
                Cuenta corriente: no se cobra ni se factura en el hotel. Finanzas la factura con el certificado del período (21 al 20).
              </p>
            ) : (
              <>
                {pagos.length === 0 && <p className="texto-secundario">Sin pagos registrados.</p>}
                <ul className="detalle__lista">
                  {pagos.map((p) => (
                    <li key={p.id}>
                      <span>
                        <strong>{MEDIOS_PAGO_INFO[p.medio]}</strong> · {formatFechaHora(p.fechaHora)}
                        {p.ordenante && <span className="texto-secundario"> · Ordenante: {p.ordenante}</span>}
                        {p.numeroOperacion && <span className="texto-secundario"> · Op. {p.numeroOperacion}</span>}
                      </span>
                      <strong className="numero">
                        {formatMoneda(p.aplicaciones.find((a) => a.idComanda === comanda.id)?.montoAplicado)}
                      </strong>
                    </li>
                  ))}
                </ul>
                {facturas.length > 0 && <h3 className="detalle__subtitulo">Facturas de Tango</h3>}
                <ul className="detalle__lista">
                  {facturas.map((f) => (
                    <li key={f.id}>
                      <span>
                        <strong>{formatComprobante(f)}</strong> · {f.clienteFacturado}
                        {f.comandas.length > 1 && <span className="texto-secundario"> · compartida con {f.comandas.length - 1} comanda(s)</span>}
                      </span>
                      <strong className="numero">{formatMoneda(f.importe)}</strong>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          <Card titulo="Historial de estados">
            <ol className="detalle__historial">
              {comanda.historial.map((h, i) => (
                <li key={`${h.fechaHora}-${i}`}>
                  <span className="detalle__hito" />
                  <div>
                    <strong>{ESTADOS_INFO[h.estadoNuevo].label}</strong>
                    <span className="texto-secundario">
                      {formatFechaHora(h.fechaHora)} · {nombreUsuario(datos, h.idUsuario)}
                    </span>
                    {h.motivo && <span className="detalle__motivo">Motivo: {h.motivo}</span>}
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      {modal === "adicion" && <ModalAdicion datos={datos} comanda={comanda} onCerrar={cerrarModal} onListo={alAgregar} />}
      {modal === "anular" && <ModalAnular comanda={comanda} onCerrar={cerrarModal} onListo={cerrarModal} />}
    </div>
  );
}
