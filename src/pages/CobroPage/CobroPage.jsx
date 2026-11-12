import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import EditorFacturas, { facturaVacia } from "../../components/cobros/EditorFacturas/EditorFacturas";
import EditorPagos, { pagoVacio } from "../../components/cobros/EditorPagos/EditorPagos";
import Alert from "../../components/ui/Alert/Alert";
import Button from "../../components/ui/Button/Button";
import Card from "../../components/ui/Card/Card";
import EmptyState from "../../components/ui/EmptyState/EmptyState";
import { Checkbox, Segmentado, Select } from "../../components/ui/FormField/FormField";
import PageHeader from "../../components/ui/PageHeader/PageHeader";
import { useDatos } from "../../context/DatosContext";
import { useFeedback } from "../../context/FeedbackContext";
import { useSesion } from "../../context/SesionContext";
import { ESTADOS, TIPOS_CLIENTE } from "../../domain/constantes";
import { etiquetaCliente, getComanda, puntoVentaSugerido } from "../../domain/selectores";
import { validarFactura, validarPago } from "../../domain/validaciones";
import { useOperacion } from "../../hooks/useOperacion";
import { useOperacionConFacturas } from "../../hooks/useOperacionConFacturas";
import { cerrarCuentaCorriente, cobrarComandas } from "../../services/mockApi";
import { formatMoneda, formatNumeroComanda } from "../../utils/formato";
import "./CobroPage.css";

/** CU-07 Cobrar comanda: cuenta corriente (convenio) o cobro particular con pagos y factura de Tango. */
export default function CobroPage() {
  const { datos } = useDatos();
  const { sucursal } = useSesion();
  const navigate = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  const ids = (parametros.get("ids") || "").split(",").filter(Boolean);
  const comandas = ids.map((id) => getComanda(datos, id)).filter(Boolean);

  // Se valida al abrir la pantalla; después, el backend rechaza si otro usuario ya la cerró.
  // (Así no se muestra el aviso de "ya no se puede cobrar" justo después de cobrarla.)
  const [invalidasAlAbrir] = useState(() =>
    comandas.filter((c) => c.idSucursal !== sucursal.id || c.estado !== ESTADOS.ENTREGADO),
  );
  const invalidas = invalidasAlAbrir;
  if (ids.length === 0 || comandas.length !== ids.length) {
    return <EmptyState icono="cobrar" titulo="No hay comandas para cobrar" accion={<Button onClick={() => navigate("/comandas?vista=entregadas")}>Ver entregadas</Button>} />;
  }
  if (invalidas.length > 0) {
    return (
      <EmptyState
        icono="alerta"
        titulo="Esta comanda ya no se puede cobrar"
        accion={<Button onClick={() => navigate("/comandas?vista=entregadas")}>Ver entregadas</Button>}
      >
        Solo se cobra una comanda entregada de tu sucursal. Puede que otro usuario ya la haya cerrado.
      </EmptyState>
    );
  }

  const esConvenio = comandas[0].tipoCliente === TIPOS_CLIENTE.CONVENIO;
  return esConvenio ? (
    <CierreCuentaCorriente datos={datos} comanda={comandas[0]} />
  ) : (
    <CobroParticular
      datos={datos}
      comandas={comandas}
      sucursal={sucursal}
      onCambiarComandas={(nuevos) => setParametros({ ids: nuevos.join(",") }, { replace: true })}
    />
  );
}

function ListaComandas({ datos, comandas, onQuitar }) {
  return (
    <ul className="cobro__comandas">
      {comandas.map((c) => (
        <li key={c.id}>
          <span>
            <strong>
              {formatNumeroComanda(c.numero)} · Mesa {c.mesa}
            </strong>
            <span className="texto-secundario">
              {c.items.map((i) => `${i.cantidad}× ${i.nombre}`).join(", ")} · {etiquetaCliente(datos, c)}
            </span>
          </span>
          <strong className="numero">{formatMoneda(c.total)}</strong>
          {onQuitar && comandas.length > 1 && (
            <Button variante="fantasma" soloIcono icono="cerrar" aria-label="Quitar del cobro" onClick={() => onQuitar(c.id)} />
          )}
        </li>
      ))}
    </ul>
  );
}

function CierreCuentaCorriente({ datos, comanda }) {
  const navigate = useNavigate();
  const [firmo, setFirmo] = useState(false);
  const [error, setError] = useState("");
  const [cerrar, cerrando] = useOperacion(cerrarCuentaCorriente, {
    mensajeExito: (c) => `${formatNumeroComanda(c.numero)} cerrada en cuenta corriente.`,
  });

  const confirmar = async () => {
    if (!firmo) {
      setError("Confirmá que el trabajador firmó el Control diario de servicio.");
      return;
    }
    const { ok } = await cerrar(comanda.id, { firmoControlDiario: true });
    if (ok) navigate("/comandas?vista=entregadas", { replace: true });
  };

  return (
    <div className="cobro cobro--angosto">
      <PageHeader volverA={-1} titulo="Cerrar en cuenta corriente" descripcion="No se cobra ni se factura en el hotel." />
      <Card titulo="Comanda">
        <ListaComandas datos={datos} comandas={[comanda]} />
      </Card>
      <Card titulo="Respaldo del consumo">
        <div className="grilla-form">
          <Alert tipo="info">
            La firma en papel del Control diario de servicio sigue siendo el respaldo que aceptan las mineras. Finanzas factura
            desde la central con el certificado del período (21 al 20).
          </Alert>
          <Checkbox
            etiqueta="El trabajador firmó el Control diario de servicio"
            descripcion={etiquetaCliente(datos, comanda)}
            checked={firmo}
            onChange={(v) => {
              setFirmo(v);
              setError("");
            }}
          />
          {error && <Alert tipo="error">{error}</Alert>}
          <div className="fila-acciones fila-acciones--derecha fila-acciones--apiladas-movil">
            <Button variante="secundario" onClick={() => navigate(-1)} disabled={cerrando}>
              Volver
            </Button>
            <Button tamano="lg" icono="firma" cargando={cerrando} onClick={confirmar}>
              Cerrar en cuenta corriente
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function CobroParticular({ datos, comandas, sucursal, onCambiarComandas }) {
  const navigate = useNavigate();
  const feedback = useFeedback();
  const total = comandas.reduce((s, c) => s + c.total, 0);
  const pvSugerido = useMemo(() => puntoVentaSugerido(datos, sucursal.id), [datos, sucursal.id]);
  const [pagos, setPagos] = useState([pagoVacio(total)]);
  const [conFactura, setConFactura] = useState("si");
  const [facturas, setFacturas] = useState([facturaVacia({ puntoVenta: pvSugerido, importe: total })]);
  const [erroresPago, setErroresPago] = useState({});
  const [erroresFactura, setErroresFactura] = useState({});
  const [cobrar, cobrando] = useOperacionConFacturas(cobrarComandas);

  // Otras comandas particulares entregadas que se pueden sumar a este mismo pago.
  const sumables = datos.comandas.filter(
    (c) =>
      c.idSucursal === sucursal.id &&
      c.estado === ESTADOS.ENTREGADO &&
      c.tipoCliente === TIPOS_CLIENTE.PARTICULAR &&
      !comandas.some((x) => x.id === c.id),
  );

  const actualizarTotalPrecargado = (nuevasComandas) => {
    const nuevoTotal = nuevasComandas.reduce((s, c) => s + c.total, 0);
    if (pagos.length === 1) setPagos([{ ...pagos[0], monto: nuevoTotal }]);
    if (facturas.length === 1) setFacturas([{ ...facturas[0], importe: nuevoTotal }]);
  };

  const sumarComanda = (id) => {
    if (!id) return;
    const nueva = sumables.find((c) => c.id === id);
    actualizarTotalPrecargado([...comandas, nueva]);
    onCambiarComandas([...comandas.map((c) => c.id), id]);
  };

  const quitarComanda = (id) => {
    const restantes = comandas.filter((c) => c.id !== id);
    actualizarTotalPrecargado(restantes);
    onCambiarComandas(restantes.map((c) => c.id));
  };

  const validar = () => {
    const ep = {};
    pagos.forEach((p, i) => {
      const e = validarPago(p);
      if (e.monto) ep[`monto_${i}`] = e.monto;
      if (e.ordenante) ep[`ordenante_${i}`] = e.ordenante;
    });
    const pagado = pagos.reduce((s, p) => s + (Number(p.monto) || 0), 0);
    if (pagos.length === 0) ep.general = "Registrá al menos un pago.";
    else if (Math.abs(pagado - total) > 0.5) ep.general = `Los pagos deben sumar ${formatMoneda(total)}.`;
    const ef = {};
    if (conFactura === "si") {
      facturas.forEach((f, i) => {
        const e = validarFactura(f);
        if (Object.keys(e).length) ef[i] = e;
      });
      const facturado = facturas.reduce((s, f) => s + (Number(f.importe) || 0), 0);
      if (facturas.length > 0 && Math.abs(facturado - total) > 0.5) ef.general = `Las facturas deben sumar ${formatMoneda(total)}.`;
    }
    setErroresPago(ep);
    setErroresFactura(ef);
    return Object.keys(ep).length === 0 && Object.keys(ef).length === 0;
  };

  const confirmar = async () => {
    if (!validar()) {
      feedback.advertencia("Revisá los datos marcados.");
      return;
    }
    const seguir = await feedback.confirmar({
      titulo: "Confirmar cobro",
      mensaje: `${comandas.length} comanda${comandas.length > 1 ? "s" : ""} por ${formatMoneda(total)}. ${
        conFactura === "si" ? "Queda facturada." : "Queda cobrada sin facturar: cargá la factura cuando la emitas en Tango."
      }`,
      confirmarTexto: "Registrar cobro",
    });
    if (!seguir) return;
    const { ok, datos: resultado } = await cobrar({
      idsComandas: comandas.map((c) => c.id),
      pagos,
      facturas: conFactura === "si" ? facturas : [],
    });
    if (!ok) return;
    feedback.exito(
      resultado.estado === ESTADOS.FACTURADO ? "Cobro y factura registrados." : "Cobro registrado. Queda pendiente la factura.",
      "Listo",
    );
    navigate("/comandas?vista=entregadas", { replace: true });
  };

  return (
    <div className="cobro">
      <PageHeader volverA={-1} titulo="Cobrar" descripcion="Venta de contado: se cobra y se factura en el hotel." />
      <div className="cobro__grilla">
        <div className="cobro__columna">
          <Card titulo={`Comandas (${comandas.length})`}>
            <ListaComandas datos={datos} comandas={comandas} onQuitar={quitarComanda} />
            {sumables.length > 0 && (
              <div className="cobro__sumar">
                <Select value="" onChange={(e) => sumarComanda(e.target.value)} aria-label="Sumar otra comanda a este pago">
                  <option value="">+ Sumar otra comanda entregada a este pago…</option>
                  {sumables.map((c) => (
                    <option key={c.id} value={c.id}>
                      {formatNumeroComanda(c.numero)} · Mesa {c.mesa} · {formatMoneda(c.total)}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div className="cobro__total">
              <span>Total a cobrar</span>
              <strong className="numero">{formatMoneda(total)}</strong>
            </div>
          </Card>

          <Card titulo="Pagos">
            <EditorPagos pagos={pagos} onCambiar={setPagos} total={total} errores={erroresPago} />
            {erroresPago.general && (
              <div className="cobro__error">
                <Alert tipo="error">{erroresPago.general}</Alert>
              </div>
            )}
          </Card>
        </div>

        <div className="cobro__columna">
          <Card titulo="Factura de Tango" subtitulo="Emitila en Tango y registrá acá su número.">
            <div className="grilla-form">
              <Segmentado
                nombre="¿Ya emitiste la factura?"
                valor={conFactura}
                onCambiar={setConFactura}
                opciones={[
                  { valor: "si", etiqueta: "Ya la emití" },
                  { valor: "no", etiqueta: "La cargo después" },
                ]}
              />
              {conFactura === "si" ? (
                <EditorFacturas
                  facturas={facturas}
                  onCambiar={setFacturas}
                  total={total}
                  errores={erroresFactura}
                  puntoVentaSugerido={pvSugerido}
                />
              ) : (
                <Alert tipo="advertencia" titulo="Quedará como «Cobrado sin facturar»">
                  Aparece en «Sin facturar» hasta que cargues los datos de la factura. Es el pendiente que controla Finanzas.
                </Alert>
              )}
              {erroresFactura.general && <Alert tipo="error">{erroresFactura.general}</Alert>}
            </div>
          </Card>

          <div className="cobro__confirmar fila-acciones fila-acciones--derecha fila-acciones--apiladas-movil">
            <Button variante="secundario" onClick={() => navigate(-1)} disabled={cobrando}>
              Cancelar
            </Button>
            <Button tamano="lg" icono="check" cargando={cobrando} onClick={confirmar}>
              Registrar cobro de {formatMoneda(total)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
