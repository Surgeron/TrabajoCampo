import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Badge, { EstadoBadge } from "../../components/ui/Badge/Badge";
import Button from "../../components/ui/Button/Button";
import Card from "../../components/ui/Card/Card";
import DataTable from "../../components/ui/DataTable/DataTable";
import EmptyState from "../../components/ui/EmptyState/EmptyState";
import FormField, { Input, Select } from "../../components/ui/FormField/FormField";
import { Cargando } from "../../components/ui/Spinner/Spinner";
import { useDatos } from "../../context/DatosContext";
import { ESTADOS_INFO, TIPOS_CLIENTE } from "../../domain/constantes";
import { etiquetaCliente, facturasDeComanda, getComanda, getSucursal, sucursalesActivas } from "../../domain/selectores";
import { useOperacion } from "../../hooks/useOperacion";
import { buscarComandas } from "../../services/mockApi";
import { fechaISO, formatFechaHora, sumarDias } from "../../utils/fechas";
import { formatComprobante, formatMoneda, formatNumeroComanda } from "../../utils/formato";
import "./ConsultaPage.css";

const CLAVE_FILTROS = "trazaplato.consulta";
const filtrosVacios = () => ({
  numero: "",
  desde: sumarDias(fechaISO(), -7),
  hasta: fechaISO(),
  idSucursal: "",
  estado: "",
  trabajador: "",
  factura: "",
});

/** CU-13 Consultar comanda e historial (respuesta a auditorías de las mineras). */
export default function ConsultaPage() {
  const { datos } = useDatos();
  const navigate = useNavigate();
  const [filtros, setFiltros] = useState(() => {
    try {
      return JSON.parse(window.sessionStorage.getItem(CLAVE_FILTROS)) || filtrosVacios();
    } catch {
      return filtrosVacios();
    }
  });
  const [ids, setIds] = useState(null);
  const [buscar, buscando] = useOperacion(buscarComandas);

  const ejecutar = async (valores = filtros) => {
    try {
      window.sessionStorage.setItem(CLAVE_FILTROS, JSON.stringify(valores));
    } catch {
      // Sin almacenamiento, los filtros no se recuerdan al volver.
    }
    const { ok, datos: resultado } = await buscar(valores);
    if (ok) setIds(resultado);
  };

  useEffect(() => {
    ejecutar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cambiar = (campo) => (e) => setFiltros((f) => ({ ...f, [campo]: e.target.value }));
  const filas = (ids || []).map((id) => getComanda(datos, id)).filter(Boolean);

  const columnas = [
    {
      clave: "numero",
      titulo: "Comanda",
      principal: true,
      render: (c) => (
        <span className="consulta__titulo">
          {formatNumeroComanda(c.numero)} <EstadoBadge estado={c.estado} />
        </span>
      ),
    },
    { clave: "fecha", titulo: "Fecha", render: (c) => formatFechaHora(c.fechaHora) },
    { clave: "sucursal", titulo: "Sucursal", render: (c) => getSucursal(datos, c.idSucursal)?.nombre },
    {
      clave: "cliente",
      titulo: "Cliente",
      render: (c) => (
        <span className="consulta__cliente">
          {c.tipoCliente === TIPOS_CLIENTE.CONVENIO && <Badge tono="info">Convenio</Badge>} {etiquetaCliente(datos, c)}
        </span>
      ),
    },
    {
      clave: "factura",
      titulo: "Factura",
      ocultarEnMovil: true,
      render: (c) => facturasDeComanda(datos, c.id).map(formatComprobante).join(", ") || "—",
    },
    { clave: "total", titulo: "Total", alinear: "derecha", render: (c) => <span className="numero">{formatMoneda(c.total)}</span> },
  ];

  return (
    <div className="consulta">
      <Card titulo="Buscar comandas" subtitulo="Combiná los filtros que necesites. Tocá una comanda para ver su historial completo.">
        <form
          className="consulta__filtros"
          onSubmit={(e) => {
            e.preventDefault();
            ejecutar();
          }}
        >
          <FormField etiqueta="N° de comanda">
            <Input type="number" inputMode="numeric" value={filtros.numero} onChange={cambiar("numero")} />
          </FormField>
          <FormField etiqueta="Desde">
            <Input type="date" value={filtros.desde} onChange={cambiar("desde")} max={fechaISO()} />
          </FormField>
          <FormField etiqueta="Hasta">
            <Input type="date" value={filtros.hasta} onChange={cambiar("hasta")} max={fechaISO()} />
          </FormField>
          <FormField etiqueta="Sucursal">
            <Select value={filtros.idSucursal} onChange={cambiar("idSucursal")}>
              <option value="">Todas</option>
              {sucursalesActivas(datos).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField etiqueta="Estado">
            <Select value={filtros.estado} onChange={cambiar("estado")}>
              <option value="">Todos</option>
              {Object.entries(ESTADOS_INFO).map(([id, info]) => (
                <option key={id} value={id}>
                  {info.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField etiqueta="Trabajador">
            <Input value={filtros.trabajador} onChange={cambiar("trabajador")} placeholder="Apellido o nombre" />
          </FormField>
          <FormField etiqueta="N° de factura">
            <Input inputMode="numeric" value={filtros.factura} onChange={cambiar("factura")} placeholder="Ej.: 1834" />
          </FormField>
          <div className="consulta__botones fila-acciones">
            <Button type="submit" icono="buscar" cargando={buscando}>
              Buscar
            </Button>
            <Button
              variante="fantasma"
              onClick={() => {
                const vacios = filtrosVacios();
                setFiltros(vacios);
                ejecutar(vacios);
              }}
            >
              Limpiar
            </Button>
          </div>
        </form>
      </Card>

      <section aria-live="polite">
        {buscando && <Cargando texto="Buscando…" />}
        {!buscando && ids && (
          <>
            <p className="consulta__conteo">
              {filas.length} comanda{filas.length === 1 ? "" : "s"} encontrada{filas.length === 1 ? "" : "s"}
            </p>
            <DataTable
              etiqueta="Resultados"
              columnas={columnas}
              filas={filas}
              onFilaClick={(c) => navigate(`/comandas/${c.id}`)}
              vacio={<EmptyState icono="buscar" titulo="Ninguna comanda coincide con los filtros" />}
            />
          </>
        )}
      </section>
    </div>
  );
}
