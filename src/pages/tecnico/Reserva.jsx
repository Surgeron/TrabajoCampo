// T05 – Lotes de reserva (CU21, incluye CU12)
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApi } from '../../hooks/useApi'
import { api } from '../../services/api'
import { useAvisos } from '../../context/AvisosContext'
import { Aviso, Boton, Cargando, Encabezado, ErrorCarga, Seccion, Tabla, Vacio } from '../../components/ui'
import { InsigniaZona } from '../../components/estados'
import { fecha, fechaHora, num } from '../../utils/formato'

export default function Reserva() {
  const { datos, cargando, error, recargar } = useApi('/reserva')
  const { avisar } = useAvisos()
  const [vista, setVista] = useState(null)
  const [enCurso, setEnCurso] = useState(null)

  useEffect(() => {
    if (datos) setVista(datos)
  }, [datos])

  useEffect(() => {
    datos?.avisos?.forEach((a) => avisar(a, 'alerta', 9000))
  }, [datos, avisar])

  const marcar = async (lote, enReserva) => {
    setEnCurso(lote.id_unico)
    try {
      const r = await api.put(`/reserva/${lote.id_unico}`, { en_reserva: enReserva })
      setVista(r)
      avisar(enReserva ? `${lote.nombre} quedó en reserva.` : `${lote.nombre} salió de la reserva.`)
    } catch (e) {
      avisar(e.message, 'error', 8000)
    } finally {
      setEnCurso(null)
    }
  }

  const columnas = (accion) => [
    { clave: 'nombre', titulo: 'Lote', ordenable: true, render: (l) => <Link to={`/tecnico/lotes/${l.id_unico}`} className="font-semibold hover:underline">{l.nombre}</Link> },
    { clave: 'finca', titulo: 'Finca', ordenable: true },
    { clave: 'zona', titulo: 'Zona', ordenable: true, render: (l) => <InsigniaZona zona={l.zona} /> },
    { clave: 'brix', titulo: 'Brix', alinear: 'derecha', ordenable: true, render: (l) => num(l.brix, 1) },
    { clave: 'area_neta_ha', titulo: 'Ha netas', alinear: 'derecha', ordenable: true, render: (l) => num(l.area_neta_ha, 1) },
    { clave: 'accion', titulo: '', alinear: 'derecha', render: accion },
  ]

  if (cargando && !vista) return <Cargando texto="Calculando candidatos…" />
  if (error && !vista) return <ErrorCarga error={error} alReintentar={recargar} />
  if (!vista) return null

  return (
    <>
      <Encabezado
        codigo="T05"
        titulo="Lotes de reserva"
        descripcion="A dónde mandar las máquinas cuando llueve: lotes en producción, sin terminar, con 8 °Bx o más, bien drenados, habilitados y en zona cercana o media."
      />
      {vista.alertas_vigentes.length > 0 && (
        <Aviso tono="info" titulo="Hay alerta de lluvia vigente" className="mb-6">
          {vista.alertas_vigentes.map((a) => (
            <p key={a.id}>
              {a.finca}: {num(a.prob_lluvia_pct, 0)} % el {fecha(a.fecha_prevista)} ({num(a.mm_previstos, 0)} mm).
            </p>
          ))}
        </Aviso>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-linea bg-superficie p-4">
          <p className="text-sm text-tinta-2">Reserva total</p>
          <p className="cifra mt-1 text-4xl font-semibold">
            {num(vista.ha_total, 0)} <span className="text-lg font-normal text-tenue">ha netas</span>
          </p>
        </div>
        {['Cercana', 'Media'].map((z) => (
          <div key={z} className="rounded-lg border border-linea bg-superficie p-4">
            <p className="text-sm text-tinta-2">Zona {z.toLowerCase()}</p>
            <p className="cifra mt-1 text-4xl font-semibold">
              {num(vista.ha_por_zona[z] || 0, 0)} <span className="text-lg font-normal text-tenue">ha</span>
            </p>
          </div>
        ))}
      </div>

      {vista.sugerencia_adelantar.length > 0 && (
        <Seccion titulo="Conviene adelantar su corte" descripcion="Mal drenados y maduros en las fincas con alerta de 70 % o más" className="mb-6 border-critico/40">
          <Tabla etiqueta="Lotes para adelantar" claveFila="id_unico" columnas={columnas(() => null).slice(0, 5)} filas={vista.sugerencia_adelantar} />
        </Seccion>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Seccion titulo={`En reserva · ${vista.reservados.length}`} descripcion={Object.entries(vista.ha_por_finca).map(([f, h]) => `${f}: ${num(h, 0)} ha`).join(' · ')}>
          <Tabla
            etiqueta="Lotes en reserva"
            claveFila="id_unico"
            columnas={columnas((l) => (
              <Boton variante="secundario" onClick={() => marcar(l, false)} cargando={enCurso === l.id_unico} title={l.fecha_reserva ? `En reserva desde ${fechaHora(l.fecha_reserva)}` : undefined}>
                Quitar
              </Boton>
            ))}
            filas={vista.reservados}
            vacio={<Vacio titulo="Todavía no marcaste lotes de reserva.">Elegí candidatos de la lista.</Vacio>}
          />
        </Seccion>
        <Seccion titulo={`Candidatos · ${vista.candidatos.length}`}>
          <Tabla
            etiqueta="Candidatos a reserva"
            claveFila="id_unico"
            columnas={columnas((l) => (
              <Boton onClick={() => marcar(l, true)} cargando={enCurso === l.id_unico} icono="reserva">
                Dejar en reserva
              </Boton>
            ))}
            filas={vista.candidatos}
            vacio={<Vacio titulo="No hay candidatos.">Ningún lote cumple hoy todas las condiciones.</Vacio>}
          />
        </Seccion>
      </div>
    </>
  )
}
