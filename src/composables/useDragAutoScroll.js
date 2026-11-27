// Автопрокрутка при перетаскивании (HTML5 drag&drop): пока что-то тащат,
// подведя курсор к верхнему или нижнему краю области, она сама прокручивается —
// не нужно «перебрасывать» файл вверх по шагам.
//
// Прокручивается ближайший к rootRef прокручиваемый контейнер (боковая
// панель, тело модалки) или сама страница.
//
//   const autoScroll = useDragAutoScroll(rootRef)
//   @dragstart → autoScroll.start()   @dragend / @drop → autoScroll.stop()
import { onBeforeUnmount } from 'vue'

function isScrollable(el) {
  if (!el || el === document.body || el === document.documentElement) return false
  const { overflowY } = getComputedStyle(el)
  return (overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight
}

function findScrollContainer(el) {
  let node = el?.parentElement || null
  while (node) {
    if (isScrollable(node)) return node
    node = node.parentElement
  }
  return document.scrollingElement || document.documentElement
}

export function useDragAutoScroll(rootRef, { edge = 90, maxSpeed = 24 } = {}) {
  let raf = null
  let lastY = null
  let container = null

  const onDragOver = (e) => { lastY = e.clientY }

  function visibleBounds() {
    const page = document.scrollingElement || document.documentElement
    if (container === page) return { top: 0, bottom: window.innerHeight }
    const rect = container.getBoundingClientRect()
    return { top: Math.max(rect.top, 0), bottom: Math.min(rect.bottom, window.innerHeight) }
  }

  function tick() {
    if (lastY !== null && container) {
      const { top, bottom } = visibleBounds()
      let dy = 0
      // чем ближе к краю — тем быстрее
      if (lastY < top + edge) dy = -maxSpeed * Math.min(1, (top + edge - lastY) / edge)
      else if (lastY > bottom - edge) dy = maxSpeed * Math.min(1, (lastY - (bottom - edge)) / edge)
      if (dy) container.scrollTop += dy
    }
    raf = requestAnimationFrame(tick)
  }

  function start() {
    stop()
    container = findScrollContainer(rootRef.value)
    document.addEventListener('dragover', onDragOver, true)
    raf = requestAnimationFrame(tick)
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf)
    raf = null
    lastY = null
    document.removeEventListener('dragover', onDragOver, true)
  }

  onBeforeUnmount(stop)
  return { start, stop }
}
