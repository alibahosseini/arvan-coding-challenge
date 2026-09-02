import { ref, watch } from 'vue'

interface ResizablePanelOptions {
  storageKey: string
  defaultWidth: number
  min: number
  max: number
  /** 'right' = handle on the right edge, dragging right grows the panel.
   *  'left' = handle on the left edge, dragging left grows the panel. */
  direction: 'left' | 'right'
}

function loadWidth(storageKey: string, defaultWidth: number, min: number, max: number): number {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return defaultWidth
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return defaultWidth
    return Math.min(Math.max(parsed, min), max)
  } catch {
    return defaultWidth
  }
}

export function useResizablePanel(options: ResizablePanelOptions) {
  const { storageKey, defaultWidth, min, max, direction } = options

  const width = ref(loadWidth(storageKey, defaultWidth, min, max))
  const isResizing = ref(false)

  watch(width, () => {
    try {
      localStorage.setItem(storageKey, String(width.value))
    } catch {
      // Storage unavailable — width still works for this session.
    }
  })

  let startX = 0
  let startWidth = 0

  function onPointerMove(event: PointerEvent) {
    const delta = event.clientX - startX
    const signedDelta = direction === 'right' ? delta : -delta
    width.value = Math.min(Math.max(startWidth + signedDelta, min), max)
  }

  function onPointerUp() {
    isResizing.value = false
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  }

  function startResize(event: PointerEvent) {
    event.preventDefault()
    startX = event.clientX
    startWidth = width.value
    isResizing.value = true
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  return { width, isResizing, startResize }
}
