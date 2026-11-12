import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ComandaCard from "../../components/comandas/ComandaCard/ComandaCard";
import Button from "../../components/ui/Button/Button";
import EmptyState from "../../components/ui/EmptyState/EmptyState";
import { Input } from "../../components/ui/FormField/FormField";
import Icon from "../../components/ui/Icon/Icon";
import PageHeader from "../../components/ui/PageHeader/PageHeader";
import Tabs from "../../components/ui/Tabs/Tabs";
import { useDatos } from "../../context/DatosContext";
import { useSesion } from "../../context/SesionContext";
import { ESTADOS, TIPOS_CLIENTE } from "../../domain/constantes";
import { comandasDeSucursal } from "../../domain/selectores";
import { useOperacion } from "../../hooks/useOperacion";
import { useReloj } from "../../hooks/useReloj";
import { marcarEntregado } from "../../services/mockApi";
import { fechaISO } from "../../utils/fechas";
import { formatMoneda, formatNumeroComanda } from "../../utils/formato";
import "./ComandasPage.css";

const VISTAS = [
  { id: "cocina", etiqueta: "En cocina", estados: [ESTADOS.INICIADO, ESTADOS.ADICION] },
  { id: "listas", etiqueta: "Listas para entregar", estados: [ESTADOS.LISTO] },
  { id: "entregadas", etiqueta: "Entregadas sin cobrar", estados: [ESTADOS.ENTREGADO] },
  { id: "hoy", etiqueta: "Todas las de hoy", estados: null },
];

/** CU-05 Mostrar comandas a entregar, y punto de partida de CU-06, CU-07 y CU-09. */
export default function ComandasPage() {
  const { datos } = useDatos();
  const { sucursal } = useSesion();
  const navigate = useNavigate();
  const ahora = useReloj();
  const [parametros, setParametros] = useSearchParams();
  const vista = VISTAS.some((v) => v.id === parametros.get("vista")) ? parametros.get("vista") : "listas";
  const [busqueda, setBusqueda] = useState("");
  const [seleccion, setSeleccion] = useState(new Set());
  const [entregar] = useOperacion(marcarEntregado, {
    mensajeExito: (c) => `${formatNumeroComanda(c.numero)} entregada. Ya se puede cobrar.`,
  });
  const [entregando, setEntregando] = useState(null);

  const delaSucursal = useMemo(() => comandasDeSucursal(datos, sucursal.id), [datos, sucursal.id]);
  const hoy = fechaISO();

  const porVista = (v) => {
    const config = VISTAS.find((x) => x.id === v);
    return delaSucursal.filter((c) =>
      config.estados ? config.estados.includes(c.estado) : c.fechaHora.slice(0, 10) === hoy,
    );
  };

  const texto = busqueda.trim();
  const visibles = porVista(vista)
    .filter((c) => !texto || String(c.mesa) === texto || String(c.numero) === texto.replace(/^0+/, ""))
    .sort((a, b) => (vista === "hoy" ? b.fechaHora.localeCompare(a.fechaHora) : a.fechaHora.localeCompare(b.fechaHora)));

  const pestanas = VISTAS.map((v) => ({ id: v.id, etiqueta: v.etiqueta, contador: porVista(v.id).length }));

  const cambiarVista = (id) => {
    setParametros({ vista: id }, { replace: true });
    setSeleccion(new Set());
  };

  const alternar = (id, marcada) =>
    setSeleccion((actual) => {
      const nueva = new Set(actual);
      if (marcada) nueva.add(id);
      else nueva.delete(id);
      return nueva;
    });

  const seleccionadas = visibles.filter((c) => seleccion.has(c.id));
  const totalSeleccion = seleccionadas.reduce((s, c) => s + c.total, 0);

  const entregarComanda = async (comanda) => {
    setEntregando(comanda.id);
    await entregar(comanda.id);
    setEntregando(null);
  };

  const accionesDe = (comanda) => {
    if (comanda.estado === ESTADOS.LISTO) {
      return (
        <Button variante="exito" icono="check" cargando={entregando === comanda.id} onClick={() => entregarComanda(comanda)}>
          Marcar entregada
        </Button>
      );
    }
    if (comanda.estado === ESTADOS.ENTREGADO) {
      return (
        <Button icono="cobrar" onClick={() => navigate(`/cobrar?ids=${comanda.id}`)}>
          {comanda.tipoCliente === TIPOS_CLIENTE.CONVENIO ? "Cerrar (cuenta corriente)" : "Cobrar"}
        </Button>
      );
    }
    return (
      <Button variante="secundario" icono="mas" onClick={() => navigate(`/comandas/${comanda.id}?accion=adicion`)}>
        Agregar ítems
      </Button>
    );
  };

  return (
    <div className="comandas">
      <PageHeader
        titulo={`Comandas · ${sucursal.nombre}`}
        descripcion="Buscá por mesa o número. Tocá una comanda para ver el detalle."
        acciones={
          <Button icono="mas" onClick={() => navigate("/comandas/nueva")}>
            Nueva comanda
          </Button>
        }
      />

      <div className="comandas__filtros">
        <Tabs pestanas={pestanas} activa={vista} onCambiar={cambiarVista} etiqueta="Estado de las comandas" />
        <label className="comandas__buscar">
          <Icon nombre="buscar" />
          <span className="visualmente-oculto">Buscar por mesa o número</span>
          <Input
            type="search"
            inputMode="numeric"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Mesa o N°"
          />
        </label>
      </div>

      {vista === "entregadas" && (
        <p className="comandas__ayuda texto-secundario">
          Para cobrar con una sola transferencia varias comandas particulares, marcalas y tocá «Cobrar juntas».
        </p>
      )}

      {visibles.length === 0 ? (
        <EmptyState icono="comandas" titulo="No hay comandas en esta vista">
          {texto ? `Ninguna coincide con «${texto}».` : "Cuando haya, aparecen acá ordenadas por llegada."}
        </EmptyState>
      ) : (
        <div className="comandas__grilla">
          {visibles.map((comanda) => {
            const seleccionable = vista === "entregadas" && comanda.tipoCliente === TIPOS_CLIENTE.PARTICULAR;
            return (
              <ComandaCard
                key={comanda.id}
                datos={datos}
                comanda={comanda}
                ahora={ahora}
                onAbrir={() => navigate(`/comandas/${comanda.id}`)}
                acciones={vista === "hoy" ? null : accionesDe(comanda)}
                seleccion={
                  seleccionable
                    ? { marcada: seleccion.has(comanda.id), onCambiar: (m) => alternar(comanda.id, m) }
                    : null
                }
              />
            );
          })}
        </div>
      )}

      {seleccionadas.length > 1 && (
        <div className="comandas__barra-seleccion">
          <span>
            {seleccionadas.length} comandas · <strong className="numero">{formatMoneda(totalSeleccion)}</strong>
          </span>
          <div className="fila-acciones">
            <Button variante="fantasma" onClick={() => setSeleccion(new Set())}>
              Limpiar
            </Button>
            <Button icono="cobrar" onClick={() => navigate(`/cobrar?ids=${seleccionadas.map((c) => c.id).join(",")}`)}>
              Cobrar juntas
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
