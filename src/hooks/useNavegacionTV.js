import { useEffect } from 'react'

// Navegación con control remoto o teclado: las flechas mueven el foco entre los elementos
// interactivos (izquierda/arriba = anterior, derecha/abajo = siguiente) cuando no se está escribiendo.
const SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useNavegacionTV() {
  useEffect(() => {
    const alPresionar = (e) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return
      const activo = document.activeElement
      const escribiendo =
        activo &&
        (activo.tagName === 'TEXTAREA' ||
          activo.tagName === 'SELECT' ||
          (activo.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit'].includes(activo.type)))
      if (escribiendo || activo?.closest('.leaflet-container')) return
      // Solo se activa cuando el usuario ya está navegando con foco (no al desplazar la página con el mouse)
      if (!activo || activo === document.body) return
      const elementos = [...document.querySelectorAll(SELECTOR)].filter(
        (el) => el.offsetParent !== null && !el.closest('[aria-hidden="true"]'),
      )
      const i = elementos.indexOf(activo)
      if (i < 0) return
      const siguiente = ['ArrowDown', 'ArrowRight'].includes(e.key) ? elementos[i + 1] : elementos[i - 1]
      if (siguiente) {
        e.preventDefault()
        siguiente.focus()
        siguiente.scrollIntoView({ block: 'nearest' })
      }
    }
    window.addEventListener('keydown', alPresionar)
    return () => window.removeEventListener('keydown', alPresionar)
  }, [])
}
