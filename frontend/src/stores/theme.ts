import { acceptHMRUpdate, defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'code-dashboard:theme'

function loadPersisted(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // Storage unavailable — fall through to system preference.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const useThemeStore = defineStore('theme', () => {
  // index.html sets document.documentElement.dataset.theme synchronously
  // before first paint (to avoid a flash); this just mirrors that value
  // into reactive state and keeps it in sync afterward.
  const theme = ref<Theme>(loadPersisted())

  function setTheme(next: Theme) {
    theme.value = next
  }

  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  watch(
    theme,
    (value) => {
      document.documentElement.dataset.theme = value
      try {
        localStorage.setItem(STORAGE_KEY, value)
      } catch {
        // Storage unavailable — theme still applies for this session.
      }
    },
    { immediate: true }
  )

  return { theme, setTheme, toggleTheme }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useThemeStore, import.meta.hot))
}
