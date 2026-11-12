import { useMemo, useState } from "react";
import Badge from "../../components/ui/Badge/Badge";
import Button from "../../components/ui/Button/Button";
import Card from "../../components/ui/Card/Card";
import DataTable from "../../components/ui/DataTable/DataTable";
import EmptyState from "../../components/ui/EmptyState/EmptyState";
import FormField, { Input, Segmentado, Select, Textarea } from "../../components/ui/FormField/FormField";
import { useDatos } from "../../context/DatosContext";
import { useSesion } from "../../context/SesionContext";
import { getInsumo, getMotivo, getProducto, nombreUsuario } from "../../domain/selectores";
import { tieneErrores, validarDesperdicio } from "../../domain/validaciones";
import { useOperacion } from "../../hooks/useOperacion";
import { registrarDesperdicio } from "../../services/mockApi";
import { formatFechaHora } from "../../utils/fechas";
import { formatNumero, normalizar } from "../../utils/formato";
import "../registros.css";

const VACIO = { tipo: "insumo", idInsumo: "", idProducto: "", cantidad: "", idMotivo: "", observacion: "" };

/** CU-11 Registrar desperdicio (insumo o plato preparado). */
export default function DesperdicioPage() {
  const { datos } = useDatos();
  const { sucursal } = useSesion();
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [registrar, registrando] = useOperacion(registrarDesperdicio, { mensajeExito: "Desperdicio registrado." });

  const insumos = datos.insumos.filter((i) => i.activo);
  const platos = datos.productos.filter((p) => p.activo && datos.categorias.find((c) => c.id === p.idCategoria)?.tipo === "comida");
  const motivos = datos.motivosDesperdicio.filter((m) => m.activo);
  const motivo = getMotivo(datos, form.idMotivo);
  const insumo = getInsumo(datos, form.idInsumo);
  const unidad = form.tipo === "insumo" ? insumo?.unidad : "porciones";

  const registros = useMemo(
    () =>
      datos.desperdicios.filter((d) => d.idSucursal === sucursal.id).sort((a, b) => b.fechaHora.localeCompare(a.fechaHora)),
    [datos, sucursal.id],
  );

  const cambiar = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
  };

  const enviar = async (e) => {
    e.preventDefault();
    const nuevos = validarDesperdicio(form, motivo);
    setErrores(nuevos);
    if (tieneErrores(nuevos)) return;
    const { ok } = await registrar(form);
    if (ok) setForm({ ...VACIO, tipo: form.tipo });
  };

  const columnas = [
    {
      clave: "producto",
      titulo: "Qué se desechó",
      principal: true,
      render: (d) => (
        <span className="registros__titulo">
          {d.tipo === "insumo" ? getInsumo(datos, d.idInsumo)?.nombre : getProducto(datos, d.idProducto)?.nombre}
          <Badge tono={d.tipo === "insumo" ? "naranja" : "violeta"}>{d.tipo === "insumo" ? "Insumo" : "Plato"}</Badge>
        </span>
      ),
    },
    { clave: "cantidad", titulo: "Cantidad", render: (d) => `${formatNumero(d.cantidad)} ${d.unidad}` },
    { clave: "motivo", titulo: "Motivo", render: (d) => getMotivo(datos, d.idMotivo)?.descripcion + (d.observacion ? ` · ${d.observacion}` : "") },
    { clave: "fecha", titulo: "Fecha", render: (d) => formatFechaHora(d.fechaHora) },
    { clave: "usuario", titulo: "Registró", render: (d) => nombreUsuario(datos, d.idUsuario), ocultarEnMovil: true },
  ];

  return (
    <div className="registros">
      <Card titulo="Registrar desperdicio" subtitulo="Pesalo o contalo antes de desecharlo.">
        <form className="grilla-form" onSubmit={enviar} noValidate>
          <Segmentado
            nombre="Qué se desecha"
            valor={form.tipo}
            onCambiar={(v) => setForm((f) => ({ ...f, tipo: v, idInsumo: "", idProducto: "" }))}
            opciones={[
              { valor: "insumo", etiqueta: "Insumo" },
              { valor: "plato", etiqueta: "Plato preparado" },
            ]}
          />
          {form.tipo === "insumo" ? (
            <FormField etiqueta="Insumo" error={errores.idInsumo} obligatorio>
              <Select value={form.idInsumo} onChange={(e) => cambiar("idInsumo", e.target.value)}>
                <option value="">Elegí…</option>
                {insumos.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nombre}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : (
            <FormField etiqueta="Plato" error={errores.idProducto} obligatorio>
              <Select value={form.idProducto} onChange={(e) => cambiar("idProducto", e.target.value)}>
                <option value="">Elegí…</option>
                {platos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
          <div className="grilla-form grilla-form--2">
            <FormField etiqueta={`Cantidad${unidad ? ` (${unidad})` : ""}`} error={errores.cantidad} obligatorio>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step={form.tipo === "insumo" ? "0.1" : "1"}
                value={form.cantidad}
                onChange={(e) => cambiar("cantidad", e.target.value)}
              />
            </FormField>
            <FormField etiqueta="Motivo" error={errores.idMotivo} obligatorio>
              <Select value={form.idMotivo} onChange={(e) => cambiar("idMotivo", e.target.value)}>
                <option value="">Elegí…</option>
                {motivos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.descripcion}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <FormField
            etiqueta="Observación"
            error={errores.observacion}
            obligatorio={motivo && normalizar(motivo.descripcion) === "otro"}
            ayuda={motivo && normalizar(motivo.descripcion) === "otro" ? undefined : "Opcional"}
          >
            <Textarea value={form.observacion} onChange={(e) => cambiar("observacion", e.target.value)} maxLength={200} rows={2} />
          </FormField>
          <Button type="submit" tamano="lg" icono="check" cargando={registrando}>
            Registrar desperdicio
          </Button>
        </form>
      </Card>

      <Card titulo="Desperdicio registrado" subtitulo={`${registros.length} registros en ${sucursal.nombre}`}>
        <DataTable
          etiqueta="Desperdicios"
          columnas={columnas}
          filas={registros}
          porPagina={15}
          vacio={<EmptyState icono="desperdicio" titulo="Sin registros de desperdicio" />}
        />
      </Card>
    </div>
  );
}
