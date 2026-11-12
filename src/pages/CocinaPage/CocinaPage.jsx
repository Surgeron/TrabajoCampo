import { useMemo, useState } from "react";
import ComandaCard from "../../components/comandas/ComandaCard/ComandaCard";
import Badge from "../../components/ui/Badge/Badge";
import Button from "../../components/ui/Button/Button";
import EmptyState from "../../components/ui/EmptyState/EmptyState";
import Modal from "../../components/ui/Modal/Modal";
import Tabs from "../../components/ui/Tabs/Tabs";
import { useDatos } from "../../context/DatosContext";
import { useSesion } from "../../context/SesionContext";
import { ESTADOS } from "../../domain/constantes";
import { ESTADOS_EN_COCINA } from "../../domain/estados";
import { comandasDeSucursal } from "../../domain/selectores";
import { useOperacion } from "../../hooks/useOperacion";
import { useReloj } from "../../hooks/useReloj";
import { marcarListo } from "../../services/mockApi";
import { formatNumeroComanda } from "../../utils/formato";
import "./CocinaPage.css";

/** CU-04 Mostrar comandas a preparar. Se actualiza sola cuando el mozo carga o agrega pedidos. */
export default function CocinaPage() {
  const { datos } = useDatos();
  const { sucursal } = useSesion();
  const ahora = useReloj(15000);
  const [abierta, setAbierta] = useState(null);
  const [vistaMovil, setVistaMovil] = useState("preparar");
  const [marcando, setMarcando] = useState(null);
  const [listo] = useOperacion(marcarListo, {
    mensajeExito: (c) => `${formatNumeroComanda(c.numero)} lista para entregar.`,
  });

  const comandas = useMemo(() => comandasDeSucursal(datos, sucursal.id), [datos, sucursal.id]);
  const porPreparar = comandas
    .filter((c) => ESTADOS_EN_COCINA.includes(c.estado))
    .sort((a, b) => ultimoIngresoACocina(a).localeCompare(ultimoIngresoACocina(b)));
  const listas = comandas
    .filter((c) => c.estado === ESTADOS.LISTO)
    .sort((a, b) => b.historial.at(-1).fechaHora.localeCompare(a.historial.at(-1).fechaHora));

  const marcar = async (comanda) => {
    setMarcando(comanda.id);
    const { ok } = await listo(comanda.id);
    setMarcando(null);
    if (ok) setAbierta(null);
  };

  const comandaAbierta = abierta ? comandas.find((c) => c.id === abierta) : null;

  const tarjeta = (comanda, preparar) => (
    <ComandaCard
      key={comanda.id}
      datos={datos}
      comanda={comanda}
      ahora={ahora}
      resaltarAdiciones
      mostrarTotal={false}
      onAbrir={() => setAbierta(comanda.id)}
      acciones={
        preparar && (
          <Button variante="exito" tamano="lg" icono="check" cargando={marcando === comanda.id} onClick={() => marcar(comanda)}>
            Listo para entregar
          </Button>
        )
      }
    />
  );

  return (
    <div className="cocina">
      <div className="cocina__cabecera">
        <div>
          <h2>Cocina · {sucursal.nombre}</h2>
          <p className="texto-secundario">Por orden de llegada. Las adiciones aparecen recuadradas.</p>
        </div>
        <Badge tono="exito">
          <span className="cocina__en-vivo" aria-hidden="true" /> En vivo
        </Badge>
      </div>

      <div className="cocina__selector-movil">
        <Tabs
          activa={vistaMovil}
          onCambiar={setVistaMovil}
          pestanas={[
            { id: "preparar", etiqueta: "Por preparar", contador: porPreparar.length },
            { id: "listas", etiqueta: "Listas", contador: listas.length },
          ]}
        />
      </div>

      <div className="cocina__tablero">
        <section className={`cocina__columna ${vistaMovil === "preparar" ? "" : "cocina__columna--oculta-movil"}`}>
          <h3 className="cocina__titulo-columna">
            Por preparar <span>{porPreparar.length}</span>
          </h3>
          {porPreparar.length === 0 ? (
            <EmptyState icono="cocina" titulo="No hay pedidos pendientes">
              Cuando el mozo registre una comanda, aparece acá sin recargar.
            </EmptyState>
          ) : (
            <div className="cocina__lista">{porPreparar.map((c) => tarjeta(c, true))}</div>
          )}
        </section>
        <section className={`cocina__columna cocina__columna--listas ${vistaMovil === "listas" ? "" : "cocina__columna--oculta-movil"}`}>
          <h3 className="cocina__titulo-columna">
            Listas, esperando al mozo <span>{listas.length}</span>
          </h3>
          {listas.length === 0 ? (
            <EmptyState icono="check" titulo="Nada esperando" />
          ) : (
            <div className="cocina__lista">{listas.map((c) => tarjeta(c, false))}</div>
          )}
        </section>
      </div>

      {comandaAbierta && (
        <Modal
          titulo={`${formatNumeroComanda(comandaAbierta.numero)} · Mesa ${comandaAbierta.mesa}`}
          onCerrar={() => setAbierta(null)}
          pie={
            ESTADOS_EN_COCINA.includes(comandaAbierta.estado) ? (
              <Button variante="exito" icono="check" cargando={marcando === comandaAbierta.id} onClick={() => marcar(comandaAbierta)}>
                Listo para entregar
              </Button>
            ) : (
              <Button variante="secundario" onClick={() => setAbierta(null)}>
                Cerrar
              </Button>
            )
          }
        >
          <ComandaCard datos={datos} comanda={comandaAbierta} ahora={ahora} resaltarAdiciones mostrarTotal={false} />
        </Modal>
      )}
    </div>
  );
}

/** Una comanda con adición vuelve a la cola según el momento de la adición. */
function ultimoIngresoACocina(comanda) {
  const ingreso = [...comanda.historial].reverse().find((h) => ESTADOS_EN_COCINA.includes(h.estadoNuevo));
  return ingreso ? ingreso.fechaHora : comanda.fechaHora;
}
