import { useMemo, useState } from "react";
import { TIPOS_CLIENTE } from "../../../domain/constantes";
import { armarItems } from "../../../domain/reglas";
import { productosVendibles } from "../../../domain/selectores";
import { useCobertura } from "../../../hooks/useCobertura";
import { useOperacion } from "../../../hooks/useOperacion";
import { agregarAdicion } from "../../../services/mockApi";
import { formatNumeroComanda } from "../../../utils/formato";
import Alert from "../../ui/Alert/Alert";
import Button from "../../ui/Button/Button";
import Modal from "../../ui/Modal/Modal";
import ModalNoCubiertos from "../ModalNoCubiertos/ModalNoCubiertos";
import ResumenPedido from "../ResumenPedido/ResumenPedido";
import SelectorProductos from "../SelectorProductos/SelectorProductos";

/** CU-06 Agregar adición: suma ítems a una comanda abierta y la devuelve a la cola de cocina. */
export default function ModalAdicion({ datos, comanda, onCerrar, onListo }) {
  const [cantidades, setCantidades] = useState({});
  const [noCubiertos, setNoCubiertos] = useState(null);
  const [error, setError] = useState("");
  const productos = useMemo(() => productosVendibles(datos, comanda.idSucursal), [datos, comanda.idSucursal]);
  const items = useMemo(() => armarItems(datos, cantidades, comanda.idSucursal), [datos, cantidades, comanda.idSucursal]);
  const esConvenio = comanda.tipoCliente === TIPOS_CLIENTE.CONVENIO;
  const { evaluacion, estadoCobertura } = useCobertura(datos, {
    idTrabajador: esConvenio ? comanda.idTrabajador : null,
    cantidades,
    idSucursal: comanda.idSucursal,
    fecha: comanda.fechaHora.slice(0, 10),
  });

  const [agregar, agregando] = useOperacion(agregarAdicion, {
    manejarError: (e) => {
      if (e.codigo === "NO_CUBIERTO") {
        setNoCubiertos(e.detalles.noCubiertos);
        return true;
      }
      return false;
    },
  });

  const confirmar = async (generarAparte = false) => {
    if (items.length === 0) {
      setError("Agregá al menos un ítem.");
      return;
    }
    if (esConvenio && !generarAparte && evaluacion?.noCubiertos.length > 0) {
      setNoCubiertos(evaluacion.noCubiertos);
      return;
    }
    const { ok, datos: resultado } = await agregar(comanda.id, { cantidades, generarAparte });
    if (ok) onListo(resultado);
  };

  if (noCubiertos) {
    return (
      <ModalNoCubiertos
        noCubiertos={noCubiertos}
        cargando={agregando}
        onGenerarAparte={() => confirmar(true)}
        onQuitar={() => {
          setCantidades((actual) => {
            const nuevas = { ...actual };
            noCubiertos.forEach((n) => {
              nuevas[n.idProducto] = Math.max(0, (nuevas[n.idProducto] || 0) - n.cantidad);
            });
            return nuevas;
          });
          setNoCubiertos(null);
        }}
        onCerrar={() => setNoCubiertos(null)}
      />
    );
  }

  return (
    <Modal
      titulo={`Agregar a ${formatNumeroComanda(comanda.numero)}`}
      subtitulo={`Mesa ${comanda.mesa} · vuelve a la cocina como adición`}
      onCerrar={onCerrar}
      cerrable={!agregando}
      ancho="lg"
      pie={
        <>
          <Button variante="secundario" onClick={onCerrar} disabled={agregando}>
            Cancelar
          </Button>
          <Button icono="check" cargando={agregando} onClick={() => confirmar(false)}>
            Agregar a la comanda
          </Button>
        </>
      }
    >
      <SelectorProductos
        categorias={datos.categorias}
        productos={productos}
        idSucursal={comanda.idSucursal}
        cantidades={cantidades}
        onCambiar={(id, n) => {
          setCantidades((a) => ({ ...a, [id]: n }));
          setError("");
        }}
        estadoCobertura={esConvenio ? estadoCobertura : null}
      />
      <div style={{ marginTop: 16 }}>
        <ResumenPedido
          items={items}
          noCubiertos={esConvenio ? evaluacion?.noCubiertos : []}
          onQuitar={(id) => setCantidades((a) => ({ ...a, [id]: 0 }))}
          vacio="Elegí lo que pide el cliente."
        />
      </div>
      {error && (
        <div style={{ marginTop: 12 }}>
          <Alert tipo="error">{error}</Alert>
        </div>
      )}
    </Modal>
  );
}
