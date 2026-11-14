// useSegurar.js — segurar um item (meio segundo parado) abre o menu dele;
// no computador, o botão direito. `holdProps(payload)` vai no elemento;
// `wasHeld()` diz se o toque que acabou foi um "segurar" — para o clique
// que vem em seguida não abrir o item.
import { useRef } from 'react'

const HOLD_MS = 500
const MOVE_PX = 10

export function useSegurar(onHold) {
  const ref = useRef({ timer: null, held: false, touching: false, x: 0, y: 0 })
  const cancel = () => { clearTimeout(ref.current.timer); ref.current.timer = null }
  // Num toque, o menu abre uma vez só (o relógio e o menu de contexto do
  // navegador podem chegar os dois) e o clique seguinte é engolido.
  const fire = payload => { if (ref.current.held) return; ref.current.held = true; onHold(payload) }
  // Ao soltar o dedo depois de segurar, o navegador ainda mandaria um
  // clique — que cairia no véu da folha recém-aberta e a fecharia.
  const end = e => { cancel(); ref.current.touching = false; if (ref.current.held && e?.cancelable) e.preventDefault() }
  function holdProps(payload) {
    return {
      onTouchStart: e => {
        const t = e.touches[0]
        cancel()
        ref.current = { held: false, touching: true, x: t.clientX, y: t.clientY, timer: setTimeout(() => fire(payload), HOLD_MS) }
      },
      onTouchMove: e => {
        const t = e.touches[0]
        if (Math.abs(t.clientX - ref.current.x) > MOVE_PX || Math.abs(t.clientY - ref.current.y) > MOVE_PX) cancel()
      },
      onTouchEnd: end,
      onTouchCancel: end,
      onContextMenu: e => {
        e.preventDefault()
        cancel()
        // Com o mouse não há clique depois: nada a engolir.
        if (ref.current.touching) fire(payload)
        else onHold(payload)
      },
    }
  }
  function wasHeld() {
    const held = ref.current.held
    ref.current.held = false
    return held
  }
  return { holdProps, wasHeld }
}
