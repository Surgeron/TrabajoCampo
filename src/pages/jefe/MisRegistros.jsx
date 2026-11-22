// J04 – Mis registros: lecturas y estados de piso cargados por el Jefe de lote, y las pendientes sin señal.
import { useEffect, useState } from 'react'
import { useApi } from '../../hooks/useApi'
import { useAvisos } from '../../context/AvisosContext'
import { enviarPendientes, pendientes, quitar } from '../../services/colaSinConexion'
import { Aviso, Boton, Cargando, Encabezado, ErrorCarga, Insignia, Seccion, Tabla } from '../../components/ui'
import { InsigniaPiso } from '../../components/estados'
import { fecha, fechaHora, num } from '../../utils/formato'

export default function MisRegistros() {
  const { avisar } = useAvisos()
  const lecturas = useApi('/lecturas', { mias: true })
  const estados = useApi('/estados-piso', { mias: true })
  const [cola, setCola] = useState(pendientes())
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    const actualizar = () => setCola(pendientes())
    window.addEventListener('cola-lecturas', actualizar)
    return () => window.removeEventListener('cola-lecturas', actualizar)
  }, [])

  const reintentar = async () => {
    setEnviando(true)
    const { enviadas } = await enviarPendientes()
    setEnviando(false)
    avisar(enviadas ? `Se enviaron ${enviadas} lectura(s).` : 'No se pudo enviar: revisá la conexión.', enviadas ? 'ok' : 'alerta')
    if (enviadas) lecturas.recargar(true)
  }

  return (
    <>
      <Encabezado codigo="J04" titulo="Mis registros" descripcion="Lo que cargaste en el campo." />
      {cola.length > 0 && (
        <Seccion titulo="Guardadas en este celular" className="mb-6" acciones={<Boton variante="secundario" icono="actualizar" onClick={reintentar} cargando={enviando}>Enviar ahora</Boton>}>
          <ul className="divide-y divide-linea">
            {cola.map((l) => (
              <li key={`${l.id_pluviometro}-${l.fecha}`} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span>
                  <span className="font-semibold">{l.pluviometro}</span> · {fecha(l.fecha)} · {num(l.mm, 1)} mm
                  {l.estado === 'conflicto' && <span className="block text-xs text-critico-texto">{l.mensaje}</span>}
                </span>
                {l.estado === 'conflicto' ? (
                  <Boton variante="fantasma" onClick={() => quitar(l)}>
                    Descartar
                  </Boton>
                ) : (
                  <Insignia tono="atencion">Pendiente de envío</Insignia>
                )}
              </li>
            ))}
          </ul>
          {cola.some((l) => l.estado === 'conflicto') && (
            <Aviso tono="info" className="mt-3">
              Para corregir una lectura que ya existía, cargala de nuevo desde “Lectura de pluviómetro” y elegí corregir.
            </Aviso>
          )}
        </Seccion>
      )}
      <div className="grid gap-6 xl:grid-cols-2">
        <Seccion titulo="Lecturas de pluviómetro">
          {lecturas.cargando && !lecturas.datos && <Cargando />}
          {lecturas.error && <ErrorCarga error={lecturas.error} alReintentar={lecturas.recargar} />}
          {lecturas.datos && (
            <Tabla
              etiqueta="Mis lecturas"
              columnas={[
                { clave: 'fecha', titulo: 'Fecha', ordenable: true, render: (l) => fecha(l.fecha) },
                { clave: 'pluviometro', titulo: 'Pluviómetro', ordenable: true },
                { clave: 'mm', titulo: 'mm', alinear: 'derecha', ordenable: true, render: (l) => num(l.mm, 1) },
                { clave: 'fecha_hora_correccion', titulo: 'Corregida', render: (l) => (l.fecha_hora_correccion ? `Sí, antes ${num(l.mm_anterior, 1)} mm` : 'No') },
              ]}
              filas={lecturas.datos}
              vacio={<p className="text-sm text-tinta-2">Todavía no cargaste lecturas.</p>}
            />
          )}
        </Seccion>
        <Seccion titulo="Estados de piso">
          {estados.cargando && !estados.datos && <Cargando />}
          {estados.error && <ErrorCarga error={estados.error} alReintentar={estados.recargar} />}
          {estados.datos && (
            <Tabla
              etiqueta="Mis estados de piso"
              columnas={[
                { clave: 'fecha_hora_desde', titulo: 'Fecha', ordenable: true, render: (e) => fechaHora(e.fecha_hora_desde) },
                { clave: 'lote', titulo: 'Lote', ordenable: true, render: (e) => `${e.lote} · ${e.finca}` },
                { clave: 'estado', titulo: 'Estado', render: (e) => <InsigniaPiso estado={e.estado} /> },
                { clave: 'observacion', titulo: 'Observación' },
              ]}
              filas={estados.datos}
              vacio={<p className="text-sm text-tinta-2">Todavía no informaste estados de piso.</p>}
            />
          )}
        </Seccion>
      </div>
    </>
  )
}
