// Alerta temprana (CU18): lluvia prevista o colchón bajo.
import { Link } from 'react-router-dom'
import { fecha, fechaHora, horasTexto, num } from '../utils/formato'
import Icono from './Icono'
import { Insignia } from './ui'

export default function TarjetaAlerta({ alerta, enlace, accion }) {
  const lluvia = alerta.tipo === 'Lluvia'
  return (
    <article
      className={`rounded-lg border bg-superficie p-4 ${
        alerta.activa === false ? 'border-linea opacity-80' : lluvia ? 'border-lluvia/40' : 'border-critico/40'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className={`inline-flex h-9 w-9 items-center justify-center rounded-md ${
              lluvia ? 'bg-lluvia-claro text-lluvia-oscuro' : 'bg-critico-claro text-critico-texto'
            }`}
          >
            <Icono nombre={lluvia ? 'lluvia' : 'patio'} />
          </span>
          <div>
            <h3 className="font-display text-base font-semibold">
              {lluvia ? `Lluvia en ${alerta.finca} el ${fecha(alerta.fecha_prevista)}` : 'Colchón bajo en patio'}
            </h3>
            <p className="text-xs text-tenue">Emitida {fechaHora(alerta.fecha_hora)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {alerta.activa === false && <Insignia>Cerrada</Insignia>}
          {alerta.vista ? <Insignia tono="bien">Vista</Insignia> : <Insignia tono="atencion">Sin ver</Insignia>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        {lluvia ? (
          <>
            <p>
              <span className="cifra text-2xl font-semibold text-lluvia-oscuro">{num(alerta.prob_lluvia_pct, 0)} %</span>{' '}
              <span className="text-tenue">probabilidad</span>
            </p>
            <p>
              <span className="cifra text-2xl font-semibold">{num(alerta.mm_previstos, 0)} mm</span>{' '}
              <span className="text-tenue">previstos</span>
            </p>
          </>
        ) : (
          <>
            <p>
              <span className="cifra text-2xl font-semibold text-critico-texto">{alerta.cantidad_carros}</span>{' '}
              <span className="text-tenue">carros</span>
            </p>
            <p>
              <span className="cifra text-2xl font-semibold">{horasTexto(alerta.horas_cobertura)}</span>{' '}
              <span className="text-tenue">de molienda</span>
            </p>
          </>
        )}
      </div>
      <p className="mt-2 text-sm text-tinta-2">{alerta.mensaje}</p>
      {(enlace || accion) && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {enlace && (
            <Link to={enlace} className="text-sm font-semibold text-cana hover:underline">
              Ver detalle
            </Link>
          )}
          {accion}
        </div>
      )}
    </article>
  )
}
