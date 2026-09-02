import { acceptHMRUpdate, defineStore } from 'pinia'
import { ref, watch } from 'vue'

const STORAGE_KEY = 'code-dashboard:settings'

interface PersistedSettings {
  autoSaveEnabled: boolean
}

function loadPersisted(): PersistedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { autoSaveEnabled: false }
    const parsed = JSON.parse(raw)
    return { autoSaveEnabled: Boolean(parsed?.autoSaveEnabled) }
  } catch {
    return { autoSaveEnabled: false }
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const persisted = loadPersisted()
  const autoSaveEnabled = ref(persisted.autoSaveEnabled)

  function toggleAutoSave() {
    autoSaveEnabled.value = !autoSaveEnabled.value
  }

  watch(autoSaveEnabled, () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ autoSaveEnabled: autoSaveEnabled.value }))
    } catch {
      // Storage unavailable — setting still works for this session.
    }
  })

  return { autoSaveEnabled, toggleAutoSave }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useSettingsStore, import.meta.hot))
}
