import { useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ModalNoCubiertos from "../../components/comandas/ModalNoCubiertos/ModalNoCubiertos";
import ResumenPedido from "../../components/comandas/ResumenPedido/ResumenPedido";
import SelectorProductos from "../../components/comandas/SelectorProductos/SelectorProductos";
import SelectorTrabajador from "../../components/comandas/SelectorTrabajador/SelectorTrabajador";
import Button from "../../components/ui/Button/Button";
import Card from "../../components/ui/Card/Card";
import FormField, { Input, Segmentado, Textarea } from "../../components/ui/FormField/FormField";
import { useDatos } from "../../context/DatosContext";
import { useFeedback } from "../../context/FeedbackContext";
import { useSesion } from "../../context/SesionContext";
import { MESA_MAXIMA, TIPOS_CLIENTE } from "../../domain/constantes";
import { armarItems, calcularTotal } from "../../domain/reglas";
import { productosVendibles } from "../../domain/selectores";
import { tieneErrores, validarComanda } from "../../domain/validaciones";
import { useCobertura } from "../../hooks/useCobertura";
import { useOperacion } from "../../hooks/useOperacion";
import { registrarComanda } from "../../services/mockApi";
import { formatMoneda, formatNumeroComanda } from "../../utils/formato";
import "./NuevaComandaPage.css";

const OPCIONES_CLIENTE = [
  { valor: TIPOS_CLIENTE.CONVENIO, etiqueta: "Empresa con convenio" },
  { valor: TIPOS_CLIENTE.PARTICULAR, etiqueta: "Particular" },
];

/** CU-03 Registrar comanda. */
export default function NuevaComandaPage() {
  const { datos } = useDatos();
  const { sucursal } = useSesion();
  const feedback = useFeedback();
  const navigate = useNavigate();
  const [parametros] = useSearchParams();
  const categoriaInicial = parametros.get("categoria");
  const formulario = useRef(null);

  const productos = useMemo(() => productosVendibles(datos, sucursal.id), [datos, sucursal.id]);
  const [tipoCliente, setTipoCliente] = useState(null);
  const [idEmpresa, setIdEmpresa] = useState(null);
  const [idTrabajador, setIdTrabajador] = useState(null);
  const [mesa, setMesa] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [errores, setErrores] = useState({});
  const [noCubiertos, setNoCubiertos] = useState(null);
  const [cantidades, setCantidades] = useState(() => {
    // La tarjeta del inicio precarga una unidad de esa comida.
    const plato = productos.find((p) => p.idCategoria === categoriaInicial);
    return plato ? { [plato.id]: 1 } : {};
  });

  const items = useMemo(() => armarItems(datos, cantidades, sucursal.id), [datos, cantidades, sucursal.id]);
  const esConvenio = tipoCliente === TIPOS_CLIENTE.CONVENIO;
  const { evaluacion, estadoCobertura } = useCobertura(datos, {
    idTrabajador: esConvenio ? idTrabajador : null,
    cantidades,
    idSucursal: sucursal.id,
  });

  const [registrar, registrando] = useOperacion(registrarComanda, {
    manejarError: (error) => {
      if (error.codigo === "NO_CUBIERTO") {
        setNoCubiertos(error.detalles.noCubiertos);
        return true;
      }
      return false;
    },
  });

  const cambiarCantidad = (idProducto, cantidad) => {
    setCantidades((actual) => ({ ...actual, [idProducto]: cantidad }));
    setErrores((e) => ({ ...e, items: undefined }));
  };

  const limpiarError = (campo) => setErrores((e) => ({ ...e, [campo]: undefined }));

  const enviar = async (generarAparte = false) => {
    const nuevos = validarComanda({ tipoCliente, idTrabajador, mesa, items });
    if (esConvenio && !idEmpresa) nuevos.idEmpresa = "Elegí la empresa.";
    setErrores(nuevos);
    if (tieneErrores(nuevos)) {
      feedback.advertencia("Revisá los datos marcados antes de confirmar.");
      formulario.current?.querySelector("[aria-invalid='true'], .nueva-comanda__error")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    // Alerta antes de enviar si hay consumos fuera de convenio.
    if (esConvenio && !generarAparte && evaluacion?.noCubiertos.length > 0) {
      setNoCubiertos(evaluacion.noCubiertos);
      return;
    }
    const { ok, datos: creadas } = await registrar({
      tipoCliente,
      idTrabajador: esConvenio ? idTrabajador : null,
      mesa,
      cantidades,
      observaciones,
      generarAparte,
    });
    if (!ok) return;
    setNoCubiertos(null);
    const numeros = creadas.map((c) => formatNumeroComanda(c.numero)).join(" y ");
    feedback.exito(
      creadas.length > 1 ? "La segunda es la comanda aparte (particular), que se cobra en el hotel." : "Ya aparece en la pantalla de cocina.",
      creadas.length > 1 ? `Comandas ${numeros} registradas` : `Comanda ${numeros} registrada`,
    );
    navigate("/comandas", { replace: true });
  };

  const quitarNoCubiertos = () => {
    setCantidades((actual) => {
      const nuevas = { ...actual };
      noCubiertos.forEach((n) => {
        nuevas[n.idProducto] = Math.max(0, (nuevas[n.idProducto] || 0) - n.cantidad);
      });
      return nuevas;
    });
    setNoCubiertos(null);
    feedback.info("Se quitaron del pedido los consumos no cubiertos.");
  };

  const cancelar = async () => {
    if (items.length > 0) {
      const salir = await feedback.confirmar({
        titulo: "¿Descartar el pedido?",
        mensaje: "Se pierden los ítems cargados.",
        confirmarTexto: "Descartar",
        tono: "peligro",
      });
      if (!salir) return;
    }
    navigate(-1);
  };

  const total = calcularTotal(items);
  const cantidadItems = items.reduce((s, i) => s + i.cantidad, 0);

  return (
    <div className="nueva-comanda" ref={formulario}>
      <div className="nueva-comanda__principal">
        <Card titulo="1. Cliente">
          <Segmentado
            nombre="Tipo de cliente"
            opciones={OPCIONES_CLIENTE}
            valor={tipoCliente}
            onCambiar={(valor) => {
              setTipoCliente(valor);
              limpiarError("tipoCliente");
            }}
          />
          {errores.tipoCliente && <p className="nueva-comanda__error">{errores.tipoCliente}</p>}
          {esConvenio && (
            <div className="nueva-comanda__trabajador">
              <SelectorTrabajador
                datos={datos}
                idEmpresa={idEmpresa}
                idTrabajador={idTrabajador}
                errores={errores}
                onCambiarEmpresa={(id) => {
                  setIdEmpresa(id);
                  setIdTrabajador(null);
                  limpiarError("idEmpresa");
                }}
                onCambiarTrabajador={(id) => {
                  setIdTrabajador(id);
                  limpiarError("idTrabajador");
                }}
              />
            </div>
          )}
        </Card>

        <Card titulo="2. Mesa">
          <div className="grilla-form grilla-form--2">
            <FormField etiqueta="Número de mesa" error={errores.mesa} obligatorio>
              <Input
                type="number"
                inputMode="numeric"
                min="1"
                max={MESA_MAXIMA}
                value={mesa}
                onChange={(e) => {
                  setMesa(e.target.value);
                  limpiarError("mesa");
                }}
                placeholder="Ej.: 4"
              />
            </FormField>
            <FormField etiqueta="Observaciones" ayuda="Opcional. Por ejemplo: sin sal.">
              <Textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} maxLength={200} />
            </FormField>
          </div>
        </Card>

        <Card titulo="3. Pedido" subtitulo="Tocá un producto para sumarlo.">
          <SelectorProductos
            categorias={datos.categorias}
            productos={productos}
            idSucursal={sucursal.id}
            cantidades={cantidades}
            onCambiar={cambiarCantidad}
            categoriaInicial={categoriaInicial}
            estadoCobertura={esConvenio && idTrabajador ? estadoCobertura : null}
          />
          {errores.items && <p className="nueva-comanda__error">{errores.items}</p>}
        </Card>
      </div>

      <aside className="nueva-comanda__lateral">
        <Card titulo="Resumen" className="nueva-comanda__resumen">
          <ResumenPedido
            items={items}
            noCubiertos={esConvenio ? evaluacion?.noCubiertos : []}
            onQuitar={(id) => cambiarCantidad(id, 0)}
          />
          <div className="nueva-comanda__acciones">
            <Button tamano="lg" bloque icono="check" cargando={registrando} onClick={() => enviar(false)}>
              Confirmar comanda
            </Button>
            <Button variante="fantasma" bloque onClick={cancelar} disabled={registrando}>
              Cancelar
            </Button>
          </div>
        </Card>
      </aside>

      {/* Celular: total y confirmación siempre a mano. */}
      <div className="nueva-comanda__barra no-imprimir">
        <div className="nueva-comanda__barra-total">
          <span>
            {cantidadItems} ítem{cantidadItems === 1 ? "" : "s"}
          </span>
          <strong className="numero">{formatMoneda(total)}</strong>
        </div>
        <Button tamano="lg" icono="check" cargando={registrando} onClick={() => enviar(false)}>
          Confirmar
        </Button>
      </div>

      {noCubiertos && (
        <ModalNoCubiertos
          noCubiertos={noCubiertos}
          cargando={registrando}
          onGenerarAparte={() => enviar(true)}
          onQuitar={quitarNoCubiertos}
          onCerrar={() => setNoCubiertos(null)}
        />
      )}
    </div>
  );
}
