// B02 – Registrar carros en patio (CU17)
import { useState } from 'react'
import { api } from '../../services/api'
import { useApi } from '../../hooks/useApi'
import { useAvisos } from '../../context/AvisosContext'
import Colchon from '../../components/Colchon'
import { Aviso, Boton, Campo, Encabezado, Seccion } from '../../components/ui'
import { num } from '../../utils/formato'
import { reglas, validar } from '../../utils/validacion'

const esquema = {
  cantidad_carros: [
    reglas.requerido('Ingresá la cantidad de carros.'),
    reglas.numero(),
    reglas.entero('La cantidad de carros es un número entero.'),
    reglas.minimo(0, 'No puede ser negativa.'),
    reglas.maximo(1000, 'Revisá la cantidad: máximo 1000 carros.'),
  ],
  condicion: [reglas.requerido('Elegí la condición de la carga.')],
}

export default function RegistrarCarros() {
  const { avisar } = useAvisos()
  const param = useApi('/parametros')
  const [valores, setValores] = useState({ cantidad_carros: '', condicion: 'Normal' })
  const [errores, setErrores] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState(null)

  const p = Object.fromEntries((param.datos?.parametros || []).map((x) => [x.clave, x.valor]))
  const minimo = p.carros_minimos_patio ?? 30

  const poner = (campo, valor) => {
    const v = { ...valores, [campo]: valor }
    setValores(v)
    if (errores[campo]) setErrores(validar(v, esquema))
  }

  const sumar = (n) => poner('cantidad_carros', String(Math.max(0, (Number(valores.cantidad_carros) || 0) + n)))

  const enviar = async (e) => {
    e.preventDefault()
    const errs = validar(valores, esquema)
    setErrores(errs)
    if (Object.keys(errs).length) return
    setEnviando(true)
    try {
      const r = await api.post('/patio', { cantidad_carros: Number(valores.cantidad_carros), condicion: valores.condicion })
      setResultado(r)
      avisar(r.calculo.bajo_umbral ? 'Registro guardado. Se avisó a Fábrica por colchón bajo.' : 'Registro guardado.', r.calculo.bajo_umbral ? 'alerta' : 'ok')
    } catch (err) {
      setErrores(err.campos || {})
      if (!Object.keys(err.campos || {}).length) avisar(err.message, 'error', 8000)
    } finally {
      setEnviando(false)
    }
  }

  const cantidad = Number(valores.cantidad_carros)
  const previa = valores.cantidad_carros !== '' && Number.isInteger(cantidad) && cantidad >= 0 && p.carga_neta_carro_t
  const neta = valores.condicion === 'Post-lluvia' ? p.carga_neta_post_lluvia_t : p.carga_neta_carro_t

  return (
    <>
      <Encabezado codigo="B02" titulo="Registrar carros en patio" descripcion={`Cantidad de carros que esperan afuera. Con menos de ${minimo} se avisa a Fábrica.`} />
      <div className="grid gap-6 xl:grid-cols-2">
        <form onSubmit={enviar} noValidate className="flex flex-col gap-6">
          <Seccion>
            <Campo etiqueta="Carros esperando en patio" requerido error={errores.cantidad_carros}>
              {(a) => (
                <div className="flex items-stretch gap-2">
                  <Boton variante="secundario" className="min-h-16 w-16 px-0 text-2xl" onClick={() => sumar(-1)} aria-label="Restar un carro">
                    −
                  </Boton>
                  <input
                    {...a}
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="1000"
                    step="1"
                    className="campo-entrada cifra min-h-16 flex-1 text-center text-4xl"
                    value={valores.cantidad_carros}
                    onChange={(e) => poner('cantidad_carros', e.target.value)}
                    onBlur={() => setErrores(validar(valores, esquema))}
                  />
                  <Boton variante="secundario" className="min-h-16 w-16 px-0 text-2xl" onClick={() => sumar(1)} aria-label="Sumar un carro">
                    +
                  </Boton>
                </div>
              )}
            </Campo>
            <fieldset className="mt-5">
              <legend className="mb-2 text-sm font-semibold">Condición de la carga</legend>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Normal', `${num(p.carga_neta_carro_t, 1)} t netas por carro`],
                  ['Post-lluvia', `${num(p.carga_neta_post_lluvia_t, 1)} t netas (más barro)`],
                ].map(([v, t]) => (
                  <label key={v} className="cursor-pointer">
                    <input type="radio" name="condicion" value={v} checked={valores.condicion === v} onChange={() => poner('condicion', v)} className="peer sr-only" />
                    <span className="flex min-h-16 flex-col justify-center rounded-lg border-2 border-linea bg-superficie px-4 py-2 peer-checked:border-cana peer-checked:bg-cana-claro peer-focus-visible:outline-3 peer-focus-visible:outline-lluvia">
                      <span className="font-display text-lg font-semibold">{v}</span>
                      <span className="text-xs text-tinta-2">{t}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            {previa && (
              <p className="mt-4 text-sm text-tinta-2">
                Equivale a {num(cantidad * neta, 0)} t netas, unas {num((cantidad * neta) / p.capacidad_molienda_th, 1)} h de molienda.
              </p>
            )}
          </Seccion>
          <Boton type="submit" cargando={enviando} icono="check" className="min-h-14 text-base">
            Registrar
          </Boton>
          <Aviso tono="info">La condición Normal o Post-lluvia es una propuesta pendiente de confirmar con el ingenio.</Aviso>
        </form>
        {resultado && (
          <Seccion titulo="Registro guardado">
            <Colchon calculo={resultado.calculo} fechaHora={resultado.registro.fecha_hora} fabricaParada={resultado.fabrica_parada} />
            <p className="mt-4 text-sm font-semibold">{resultado.mensaje}</p>
          </Seccion>
        )}
      </div>
    </>
  )
}
