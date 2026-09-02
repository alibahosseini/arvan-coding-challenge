import { onBeforeUnmount, onMounted } from 'vue'

export interface KeyboardShortcutHandlers {
  save: () => void
  saveAs: () => void
  closeTab: () => void
  nextTab: () => void
  previousTab: () => void
  quickOpen: () => void
  searchInFiles: () => void
  newFile: () => void
  reopenClosedTab: () => void
}

// Registers a single global keydown listener for VS Code-style shortcuts.
// Only the combos below call preventDefault(); everything else (including
// unmodified typing inside Monaco or any input) passes through untouched.
export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  function onKeydown(event: KeyboardEvent) {
    const mod = event.ctrlKey || event.metaKey
    if (!mod) return

    const key = event.key.toLowerCase()

    if (key === 's' && event.shiftKey) {
      event.preventDefault()
      handlers.saveAs()
    } else if (key === 's') {
      event.preventDefault()
      handlers.save()
    } else if (key === 'w') {
      event.preventDefault()
      handlers.closeTab()
    } else if (key === 'tab' && event.shiftKey) {
      event.preventDefault()
      handlers.previousTab()
    } else if (key === 'tab') {
      event.preventDefault()
      handlers.nextTab()
    } else if (key === 'p' && !event.shiftKey) {
      event.preventDefault()
      handlers.quickOpen()
    } else if (key === 'f' && event.shiftKey) {
      event.preventDefault()
      handlers.searchInFiles()
    } else if (key === 'n' && !event.shiftKey) {
      event.preventDefault()
      handlers.newFile()
    } else if (key === 't' && event.shiftKey) {
      event.preventDefault()
      handlers.reopenClosedTab()
    }
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
}
