// Formularios de cada maestro (CU-14). Reciben { datos, valor, errores, onCambiar }.
import Alert from "../../components/ui/Alert/Alert";
import FormField, { Checkbox, Input, Select, Textarea } from "../../components/ui/FormField/FormField";
import { ROLES, ROLES_INFO, UNIDADES } from "../../domain/constantes";
import { empresasActivas, sucursalesActivas } from "../../domain/selectores";
import { formatMoneda } from "../../utils/formato";
import "../../components/cobros/cobros.css";

const campo = (onCambiar, clave) => (e) => onCambiar({ [clave]: e.target.value });

export function FormUsuario({ datos, valor, errores, onCambiar }) {
  const alternarRol = (rol, marcado) =>
    onCambiar({ roles: marcado ? [...valor.roles, rol] : valor.roles.filter((r) => r !== rol) });
  const operaEnHotel = valor.roles.some((r) => ROLES_INFO[r].requiereSucursal);
  return (
    <div className="grilla-form grilla-form--2">
      <FormField etiqueta="Nombre" error={errores.nombre} obligatorio>
        <Input value={valor.nombre} onChange={campo(onCambiar, "nombre")} maxLength={40} />
      </FormField>
      <FormField etiqueta="Apellido" error={errores.apellido} obligatorio>
        <Input value={valor.apellido} onChange={campo(onCambiar, "apellido")} maxLength={40} />
      </FormField>
      <FormField etiqueta="Nombre de usuario" error={errores.nombreUsuario} obligatorio>
        <Input value={valor.nombreUsuario} onChange={campo(onCambiar, "nombreUsuario")} autoCapitalize="none" maxLength={30} />
      </FormField>
      <FormField
        etiqueta="Contraseña"
        error={errores.password}
        obligatorio={!valor.id}
        ayuda={valor.id ? "Dejala vacía para no cambiarla." : "Mínimo 4 caracteres."}
      >
        <Input type="password" value={valor.password || ""} onChange={campo(onCambiar, "password")} autoComplete="new-password" />
      </FormField>
      <fieldset className="ocupa-todo" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="campo__etiqueta" style={{ marginBottom: 8 }}>
          Roles <span className="campo__obligatorio">*</span>
        </legend>
        <div className="grilla-form grilla-form--2">
          {Object.values(ROLES).map((rol) => (
            <Checkbox
              key={rol}
              etiqueta={ROLES_INFO[rol].label}
              checked={valor.roles.includes(rol)}
              onChange={(marcado) => alternarRol(rol, marcado)}
            />
          ))}
        </div>
        {errores.roles && <p className="campo__error" style={{ marginTop: 6 }}>{errores.roles}</p>}
      </fieldset>
      {operaEnHotel && (
        <FormField
          etiqueta="Sucursal de trabajo"
          ayuda="Opcional. Si la asignás, no tiene que elegirla al ingresar."
          className="ocupa-todo"
        >
          <Select value={valor.idSucursalTrabajo || ""} onChange={(e) => onCambiar({ idSucursalTrabajo: e.target.value || null })}>
            <option value="">La elige al iniciar sesión</option>
            {sucursalesActivas(datos).map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </Select>
        </FormField>
      )}
    </div>
  );
}

export function FormSucursal({ valor, errores, onCambiar }) {
  return (
    <div className="grilla-form grilla-form--2">
      <FormField etiqueta="Nombre" error={errores.nombre} obligatorio>
        <Input value={valor.nombre} onChange={campo(onCambiar, "nombre")} maxLength={60} />
      </FormField>
      <FormField etiqueta="Capacidad del comedor" error={errores.capacidadComedor} obligatorio>
        <Input type="number" inputMode="numeric" min="1" value={valor.capacidadComedor} onChange={campo(onCambiar, "capacidadComedor")} />
      </FormField>
      <FormField etiqueta="Ubicación" error={errores.ubicacion} obligatorio className="ocupa-todo">
        <Input value={valor.ubicacion} onChange={campo(onCambiar, "ubicacion")} maxLength={100} />
      </FormField>
    </div>
  );
}

export function FormEmpresa({ valor, errores, onCambiar }) {
  return (
    <div className="grilla-form grilla-form--2">
      <FormField etiqueta="Razón social" error={errores.razonSocial} obligatorio>
        <Input value={valor.razonSocial} onChange={campo(onCambiar, "razonSocial")} maxLength={80} />
      </FormField>
      <FormField etiqueta="CUIT" error={errores.cuit} obligatorio ayuda="11 dígitos, con o sin guiones">
        <Input inputMode="numeric" value={valor.cuit} onChange={campo(onCambiar, "cuit")} placeholder="30-12345678-9" />
      </FormField>
    </div>
  );
}

export function FormTrabajador({ datos, valor, errores, onCambiar }) {
  return (
    <div className="grilla-form grilla-form--2">
      <FormField etiqueta="Nombre" error={errores.nombre} obligatorio>
        <Input value={valor.nombre} onChange={campo(onCambiar, "nombre")} maxLength={40} />
      </FormField>
      <FormField etiqueta="Apellido" error={errores.apellido} obligatorio>
        <Input value={valor.apellido} onChange={campo(onCambiar, "apellido")} maxLength={40} />
      </FormField>
      <FormField etiqueta="Empresa" error={errores.idEmpresa} obligatorio>
        <Select value={valor.idEmpresa} onChange={campo(onCambiar, "idEmpresa")}>
          <option value="">Elegí…</option>
          {empresasActivas(datos).map((e) => (
            <option key={e.id} value={e.id}>
              {e.razonSocial}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField etiqueta="DNI" error={errores.dni} ayuda="Opcional: el listado de personal hoy no lo trae">
        <Input inputMode="numeric" value={valor.dni} onChange={campo(onCambiar, "dni")} maxLength={10} />
      </FormField>
    </div>
  );
}

export function FormConvenio({ datos, valor, errores, onCambiar }) {
  const productos = datos.productos.filter((p) => p.activo);
  const cobertura = (idProducto) => valor.coberturas.find((c) => c.idProducto === idProducto) || { idProducto, cubierto: false, cantidadMaximaPorDia: "" };
  const actualizarCobertura = (idProducto, cambios) => {
    const existentes = valor.coberturas.filter((c) => c.idProducto !== idProducto);
    onCambiar({ coberturas: [...existentes, { ...cobertura(idProducto), ...cambios }] });
  };
  return (
    <div className="grilla-form">
      <div className="grilla-form grilla-form--3">
        <FormField etiqueta="Empresa" error={errores.idEmpresa} obligatorio>
          <Select value={valor.idEmpresa} onChange={campo(onCambiar, "idEmpresa")} disabled={Boolean(valor.id)}>
            <option value="">Elegí…</option>
            {empresasActivas(datos).map((e) => (
              <option key={e.id} value={e.id}>
                {e.razonSocial}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField etiqueta="Vigente desde" error={errores.fechaDesde} obligatorio>
          <Input type="date" value={valor.fechaDesde} onChange={campo(onCambiar, "fechaDesde")} />
        </FormField>
        <FormField etiqueta="Vigente hasta" error={errores.fechaHasta} ayuda="Vacío: sin vencimiento">
          <Input type="date" value={valor.fechaHasta || ""} onChange={campo(onCambiar, "fechaHasta")} />
        </FormField>
        <FormField etiqueta="Día de corte" error={errores.diaCorte} obligatorio ayuda="Por defecto 21 (período 21 al 20)">
          <Input type="number" inputMode="numeric" min="1" max="28" value={valor.diaCorte} onChange={campo(onCambiar, "diaCorte")} />
        </FormField>
        <FormField etiqueta="Observaciones" className="ocupa-todo">
          <Textarea value={valor.observaciones} onChange={campo(onCambiar, "observaciones")} rows={2} maxLength={200} />
        </FormField>
      </div>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="campo__etiqueta" style={{ marginBottom: 8 }}>
          Qué cubre el convenio <span className="campo__obligatorio">*</span>
        </legend>
        {errores.coberturas && (
          <div style={{ marginBottom: 10 }}>
            <Alert tipo="error">{errores.coberturas}</Alert>
          </div>
        )}
        <div className="coberturas">
          {productos.map((p) => {
            const c = cobertura(p.id);
            return (
              <div key={p.id} className="coberturas__fila">
                <Checkbox etiqueta={p.nombre} checked={c.cubierto} onChange={(v) => actualizarCobertura(p.id, { cubierto: v })} />
                <Input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={c.cantidadMaximaPorDia ?? ""}
                  onChange={(e) => actualizarCobertura(p.id, { cantidadMaximaPorDia: e.target.value })}
                  disabled={!c.cubierto}
                  placeholder="Sin límite"
                  aria-label={`Máximo por día de ${p.nombre}`}
                />
              </div>
            );
          })}
        </div>
        <p className="campo__ayuda" style={{ marginTop: 8 }}>
          El número es la cantidad máxima por trabajador y por día. Lo que no está cubierto lo paga el trabajador aparte.
        </p>
      </fieldset>
    </div>
  );
}

export function FormProducto({ datos, valor, errores, onCambiar }) {
  const sucursales = datos.sucursales.filter((s) => s.activo || valor.precios?.[s.id]);
  const precio = (idSucursal) => valor.precios?.[idSucursal] || { precio: "", codigoTango: "", activo: false };
  const actualizarPrecio = (idSucursal, cambios) =>
    onCambiar({ precios: { ...valor.precios, [idSucursal]: { ...precio(idSucursal), ...cambios } } });
  return (
    <div className="grilla-form">
      <div className="grilla-form grilla-form--2">
        <FormField etiqueta="Nombre" error={errores.nombre} obligatorio>
          <Input value={valor.nombre} onChange={campo(onCambiar, "nombre")} maxLength={60} />
        </FormField>
        <FormField etiqueta="Categoría" error={errores.idCategoria} obligatorio>
          <Select value={valor.idCategoria} onChange={campo(onCambiar, "idCategoria")}>
            <option value="">Elegí…</option>
            {datos.categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Select>
        </FormField>
      </div>
      {errores.precios && <Alert tipo="error">{errores.precios}</Alert>}
      {sucursales.map((s) => {
        const p = precio(s.id);
        return (
          <fieldset key={s.id} className="editor-cobro__bloque">
            <legend>{s.nombre}</legend>
            <div className="grilla-form grilla-form--3">
              <Checkbox etiqueta="Se vende en esta sucursal" checked={p.activo} onChange={(v) => actualizarPrecio(s.id, { activo: v })} />
              <FormField etiqueta="Precio" error={errores[`precio_${s.id}`]} ayuda={p.precio ? formatMoneda(p.precio) : undefined}>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={p.precio}
                  disabled={!p.activo}
                  onChange={(e) => actualizarPrecio(s.id, { precio: e.target.value })}
                />
              </FormField>
              <FormField etiqueta="Código Tango" error={errores[`codigo_${s.id}`]}>
                <Input
                  value={p.codigoTango}
                  disabled={!p.activo}
                  onChange={(e) => actualizarPrecio(s.id, { codigoTango: e.target.value.toUpperCase() })}
                  maxLength={20}
                />
              </FormField>
            </div>
          </fieldset>
        );
      })}
      <p className="campo__ayuda">Un cambio de precio no modifica las comandas ya registradas: cada una guarda el precio del momento.</p>
    </div>
  );
}

export function FormInsumo({ valor, errores, onCambiar }) {
  return (
    <div className="grilla-form grilla-form--3">
      <FormField etiqueta="Nombre" error={errores.nombre} obligatorio>
        <Input value={valor.nombre} onChange={campo(onCambiar, "nombre")} maxLength={60} />
      </FormField>
      <FormField etiqueta="Unidad de medida" error={errores.unidad} obligatorio>
        <Select value={valor.unidad} onChange={campo(onCambiar, "unidad")}>
          <option value="">Elegí…</option>
          {UNIDADES.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField etiqueta="Código Tango" error={errores.codigoTango} obligatorio>
        <Input value={valor.codigoTango} onChange={(e) => onCambiar({ codigoTango: e.target.value.toUpperCase() })} maxLength={20} />
      </FormField>
    </div>
  );
}

export function FormMotivo({ valor, errores, onCambiar }) {
  return (
    <FormField etiqueta="Descripción" error={errores.descripcion} obligatorio>
      <Input value={valor.descripcion} onChange={campo(onCambiar, "descripcion")} maxLength={60} />
    </FormField>
  );
}
