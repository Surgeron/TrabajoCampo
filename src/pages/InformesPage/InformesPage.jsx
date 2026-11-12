import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import GraficoBarras from "../../components/informes/GraficoBarras/GraficoBarras";
import Alert from "../../components/ui/Alert/Alert";
import Button from "../../components/ui/Button/Button";
import Card from "../../components/ui/Card/Card";
import DataTable from "../../components/ui/DataTable/DataTable";
import EmptyState from "../../components/ui/EmptyState/EmptyState";
import FormField, { Input, Select } from "../../components/ui/FormField/FormField";
import { Cargando } from "../../components/ui/Spinner/Spinner";
import { useDatos } from "../../context/DatosContext";
import { useFeedback } from "../../context/FeedbackContext";
import { MEDIOS_PAGO_INFO, TURNOS } from "../../domain/constantes";
import { INFORMES, getInforme, informeVacio } from "../../domain/informes";
import { empresasActivas, getSucursal, sucursalesActivas } from "../../domain/selectores";
import { useOperacion } from "../../hooks/useOperacion";
import { generarInforme } from "../../services/mockApi";
import { exportarExcel, exportarPdf, formatearCelda } from "../../utils/exportar";
import { fechaISO, formatFecha, sumarDias, ultimosPeriodosDeCorte } from "../../utils/fechas";
import "./InformesPage.css";

const filtrosIniciales = () => {
  const [periodo] = ultimosPeriodosDeCorte(1);
  return {
    desde: sumarDias(fechaISO(), -6),
    hasta: fechaISO(),
    idSucursal: "",
    turno: "",
    medioPago: "",
    idEmpresa: "",
    periodo: `${periodo.desde}|${periodo.hasta}`,
  };
};

/** CU-12 Generar informe. */
export default function InformesPage() {
  const { datos } = useDatos();
  const feedback = useFeedback();
  const [parametros, setParametros] = useSearchParams();
  const idInforme = getInforme(parametros.get("tipo")) ? parametros.get("tipo") : "ventas";
  const informe = getInforme(idInforme);
  const [filtros, setFiltros] = useState(filtrosIniciales);
  const [resultado, setResultado] = useState(null);
  const [errores, setErrores] = useState({});
  const [generar, generando] = useOperacion(generarInforme);
  const [imprimiendo, setImprimiendo] = useState(false);
  const periodos = useMemo(() => ultimosPeriodosDeCorte(6), []);
  const empresas = empresasActivas(datos);

  const filtrosEfectivos = () => {
    if (!informe.filtros.includes("periodo")) return filtros;
    const [desde, hasta] = filtros.periodo.split("|");
    return { ...filtros, desde, hasta };
  };

  const ejecutar = async () => {
    const nuevos = {};
    const efectivos = filtrosEfectivos();
    if (!efectivos.desde) nuevos.desde = "Indicá la fecha.";
    if (!efectivos.hasta) nuevos.hasta = "Indicá la fecha.";
    if (efectivos.desde && efectivos.hasta && efectivos.desde > efectivos.hasta) nuevos.hasta = "Debe ser igual o posterior a «desde».";
    if (informe.requiere?.includes("idEmpresa") && !efectivos.idEmpresa) nuevos.idEmpresa = "Elegí la empresa.";
    setErrores(nuevos);
    if (Object.keys(nuevos).length) return;
    const { ok, datos: res } = await generar(idInforme, efectivos);
    if (ok) setResultado({ ...res, filtros: efectivos, idInforme });
  };

  // Al cambiar de informe se genera con los filtros actuales (si ya están completos).
  useEffect(() => {
    setResultado(null);
    setErrores({});
    if (!getInforme(idInforme).requiere) ejecutar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idInforme]);

  const cambiarFiltro = (campo) => (e) => {
    setFiltros((f) => ({ ...f, [campo]: e.target.value }));
    setErrores((er) => ({ ...er, [campo]: undefined }));
  };

  const vacio = resultado && informeVacio(resultado);
  const nombreArchivo = `${idInforme}_${resultado?.filtros.desde}_${resultado?.filtros.hasta}`;
  const columnasTabla = resultado?.columnas.map((c) => ({
    clave: c.clave,
    titulo: c.titulo,
    principal: c.principal,
    alinear: ["moneda", "numero"].includes(c.tipo) ? "derecha" : undefined,
    render: (fila) => <span className={["moneda", "numero"].includes(c.tipo) ? "numero" : ""}>{formatearCelda(c, fila[c.clave])}</span>,
  }));
  const totalesTabla =
    resultado?.totales &&
    Object.fromEntries(
      resultado.columnas.filter((c) => resultado.totales[c.clave] !== undefined).map((c) => [c.clave, formatearCelda(c, resultado.totales[c.clave])]),
    );

  const exportar = (formato) => {
    if (vacio) {
      feedback.advertencia("No hay datos para los filtros elegidos: no se genera el archivo.");
      return;
    }
    if (formato === "excel") {
      exportarExcel(nombreArchivo, resultado);
      feedback.exito("Se descargó el archivo para Excel.");
    } else {
      // Para el PDF se muestran todas las filas (la tabla en pantalla pagina de a 40).
      setImprimiendo(true);
      window.setTimeout(() => {
        exportarPdf();
        setImprimiendo(false);
      }, 150);
    }
  };

  const usa = (f) => informe.filtros.includes(f);

  return (
    <div className="informes">
      <div className="informes__selector no-imprimir">
        <FormField etiqueta="Tipo de informe" className="informes__tipo-movil">
          <Select value={idInforme} onChange={(e) => setParametros({ tipo: e.target.value }, { replace: true })}>
            {INFORMES.map((i) => (
              <option key={i.id} value={i.id}>
                {i.titulo}
              </option>
            ))}
          </Select>
        </FormField>
        <nav className="informes__lista" aria-label="Tipos de informe">
          {INFORMES.map((i) => (
            <button
              key={i.id}
              type="button"
              className={`informes__opcion ${i.id === idInforme ? "informes__opcion--activa" : ""}`}
              onClick={() => setParametros({ tipo: i.id }, { replace: true })}
              aria-current={i.id === idInforme ? "true" : undefined}
            >
              {i.titulo}
            </button>
          ))}
        </nav>
      </div>

      <div className="informes__contenido">
        <Card titulo={informe.titulo} subtitulo={informe.descripcion} className="no-imprimir">
          <div className="informes__filtros">
            {usa("fechas") && (
              <>
                <FormField etiqueta="Desde" error={errores.desde}>
                  <Input type="date" value={filtros.desde} onChange={cambiarFiltro("desde")} max={fechaISO()} />
                </FormField>
                <FormField etiqueta="Hasta" error={errores.hasta}>
                  <Input type="date" value={filtros.hasta} onChange={cambiarFiltro("hasta")} max={fechaISO()} />
                </FormField>
              </>
            )}
            {usa("periodo") && (
              <FormField etiqueta="Período de corte">
                <Select value={filtros.periodo} onChange={cambiarFiltro("periodo")}>
                  {periodos.map((p) => (
                    <option key={p.desde} value={`${p.desde}|${p.hasta}`}>
                      {formatFecha(p.desde)} al {formatFecha(p.hasta)}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
            {usa("empresa") && (
              <FormField etiqueta="Empresa" error={errores.idEmpresa} obligatorio={informe.requiere?.includes("idEmpresa")}>
                <Select value={filtros.idEmpresa} onChange={cambiarFiltro("idEmpresa")}>
                  <option value="">{informe.requiere?.includes("idEmpresa") ? "Elegí la empresa…" : "Todas"}</option>
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.razonSocial}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
            {usa("sucursal") && (
              <FormField etiqueta="Sucursal">
                <Select value={filtros.idSucursal} onChange={cambiarFiltro("idSucursal")}>
                  <option value="">Todas</option>
                  {sucursalesActivas(datos).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
            {usa("turno") && (
              <FormField etiqueta="Turno">
                <Select value={filtros.turno} onChange={cambiarFiltro("turno")}>
                  <option value="">Todos</option>
                  {TURNOS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
            {usa("medioPago") && (
              <FormField etiqueta="Medio de pago">
                <Select value={filtros.medioPago} onChange={cambiarFiltro("medioPago")}>
                  <option value="">Todos</option>
                  {Object.entries(MEDIOS_PAGO_INFO).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FormField>
            )}
          </div>
          <div className="fila-acciones informes__acciones">
            <Button icono="informes" cargando={generando} onClick={ejecutar}>
              Generar informe
            </Button>
            <Button variante="secundario" icono="descargar" onClick={() => exportar("excel")} disabled={!resultado || generando}>
              Excel
            </Button>
            <Button variante="secundario" icono="imprimir" onClick={() => exportar("pdf")} disabled={!resultado || generando}>
              PDF
            </Button>
          </div>
        </Card>

        <section className="informes__resultado informe-imprimible" aria-live="polite">
          {generando && <Cargando texto="Generando informe…" />}
          {!generando && !resultado && (
            <EmptyState icono="informes" titulo="Elegí los filtros y generá el informe" />
          )}
          {!generando && resultado && resultado.idInforme === idInforme && (
            <>
              <header className="informes__cabecera-resultado">
                <h2>{informe.titulo}</h2>
                <p className="texto-secundario">
                  {formatFecha(resultado.filtros.desde)} al {formatFecha(resultado.filtros.hasta)}
                  {resultado.filtros.idSucursal ? ` · ${getSucursal(datos, resultado.filtros.idSucursal)?.nombre}` : " · Todas las sucursales"}
                  {!vacio && ` · ${resultado.filas.length} fila${resultado.filas.length === 1 ? "" : "s"}`}
                </p>
              </header>
              {resultado.nota && (
                <div className="informes__nota">
                  <Alert tipo="info">{resultado.nota}</Alert>
                </div>
              )}
              {vacio ? (
                <EmptyState icono="buscar" titulo="No hay datos para los filtros elegidos">
                  Probá con otro rango de fechas o sucursal. No se genera ningún archivo.
                </EmptyState>
              ) : (
                <>
                  {resultado.grafico && <GraficoBarras {...resultado.grafico} />}
                  <DataTable
                    etiqueta={informe.titulo}
                    columnas={columnasTabla}
                    filas={resultado.filas}
                    totales={totalesTabla}
                    porPagina={40}
                    mostrarTodas={imprimiendo}
                    vacio={<EmptyState icono="check" titulo="Sin observaciones en el período" />}
                  />
                </>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
