// Colchón de caña en patio: un segmento por carro hasta el umbral (30 carros = 2,7 h de molienda).
import { horasTexto, hora, num } from '../utils/formato'

export default function Colchon({ calculo, fechaHora, fabricaParada, carrosParaReanudar, grande = false }) {
  if (!calculo) return null
  const { cantidad_carros: carros, carros_minimos: minimo, bajo_umbral: bajo } = calculo
  const llenos = Math.min(carros, minimo)
  const extra = Math.max(0, carros - minimo)
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="text-sm text-tinta-2">Carros esperando en patio</p>
          <p className={`cifra font-semibold ${grande ? 'text-7xl md:text-8xl' : 'text-6xl'} ${bajo ? 'text-critico-texto' : 'text-tinta'}`}>
            {carros}
            <span className="ml-2 text-2xl font-normal text-tenue">/ {minimo}</span>
          </p>
        </div>
        <dl className={`grid grid-cols-2 gap-x-6 gap-y-2 text-sm ${grande ? 'lg:grid-cols-3' : ''}`}>
          <div>
            <dt className="text-tenue">Molienda asegurada</dt>
            <dd className="cifra text-2xl font-semibold whitespace-nowrap">{horasTexto(calculo.horas_cobertura)}</dd>
          </div>
          <div>
            <dt className="text-tenue">Toneladas netas</dt>
            <dd className="cifra text-2xl font-semibold">{num(calculo.t_netas, 0)} t</dd>
          </div>
          <div>
            <dt className="text-tenue">Carga {calculo.condicion === 'Post-lluvia' ? 'post-lluvia' : 'normal'}</dt>
            <dd className="cifra text-2xl font-semibold">
              {num(calculo.carga_neta_carro_t, 1)} t<span className="text-sm font-normal text-tenue">/carro</span>
            </dd>
          </div>
        </dl>
      </div>

      <div
        className="medidor-carros mt-5"
        style={{ '--cols-m': Math.ceil(minimo / 2), '--cols': minimo }}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={minimo}
        aria-valuenow={carros}
        aria-label={`${carros} de ${minimo} carros`}
      >
        {Array.from({ length: minimo }, (_, i) => (
          <span key={i} className={`h-5 rounded-sm md:h-7 ${i < llenos ? (bajo ? 'bg-critico' : 'bg-cana') : 'bg-linea'}`} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className={bajo ? 'font-semibold text-critico-texto' : 'font-semibold text-bien-texto'}>
          {bajo ? (
            <>
              <span aria-hidden="true">▲ </span>Faltan {calculo.carros_faltantes} carros para llegar a {minimo}
            </>
          ) : (
            <>
              <span aria-hidden="true">● </span>Colchón suficiente{extra ? `: ${extra} carros por encima del mínimo` : ''}
            </>
          )}
        </p>
        <p className="text-tenue">
          Merma {num(calculo.merma_pct, 1)} %{fechaHora ? ` · registro de las ${hora(fechaHora)}` : ''}
        </p>
      </div>
      {fabricaParada && (
        <p className="mt-3 rounded-md bg-critico-claro px-3 py-2 text-sm font-semibold text-critico-texto">
          Fábrica parada: faltan {carrosParaReanudar ?? calculo.carros_faltantes} carros para reanudar sin volver a parar enseguida.
        </p>
      )}
    </div>
  )
}
