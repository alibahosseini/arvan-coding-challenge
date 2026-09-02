import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useCodeEditor } from '../composables/useCodeEditor'
import { useSettingsStore } from './settings'
import type { CodeFile, ClosedTabRecord, EditorGroup, EditorTab, PendingConfirmation, PendingConfirmationKind } from '../types/code'

const STORAGE_KEY = 'code-dashboard:editor-state-v2'
const AUTO_SAVE_DEBOUNCE_MS = 700

interface PersistedState {
  groups: EditorGroup[]
  tabs: Record<string, EditorTab>
  activeGroupId: string | null
}

function genId(): string {
  return crypto.randomUUID()
}

function makeDefaultGroup(): EditorGroup {
  return { id: genId(), tabIds: [], activeTabId: null }
}

function loadPersistedState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { groups: [makeDefaultGroup()], tabs: {}, activeGroupId: null }

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.groups) || !parsed.tabs) {
      return { groups: [makeDefaultGroup()], tabs: {}, activeGroupId: null }
    }

    const groups: EditorGroup[] = parsed.groups
    const tabs: Record<string, EditorTab> = parsed.tabs
    const activeGroupId =
      typeof parsed.activeGroupId === 'string' && groups.some((g) => g.id === parsed.activeGroupId)
        ? parsed.activeGroupId
        : (groups[0]?.id ?? null)

    return { groups: groups.length ? groups : [makeDefaultGroup()], tabs, activeGroupId }
  } catch {
    return { groups: [makeDefaultGroup()], tabs: {}, activeGroupId: null }
  }
}

export const useEditorTabsStore = defineStore('editorTabs', () => {
  const fileApi = useCodeEditor()
  const settings = useSettingsStore()

  const persisted = loadPersistedState()

  const groups = ref<EditorGroup[]>(persisted.groups)
  const tabs = ref<Record<string, EditorTab>>(persisted.tabs)
  const activeGroupId = ref<string | null>(persisted.activeGroupId ?? persisted.groups[0]?.id ?? null)
  const closedTabsHistory = ref<ClosedTabRecord[]>([])
  const pendingConfirmation = ref<PendingConfirmation | null>(null)
  const saveError = ref<{ tabId: string; name: string } | null>(null)

  const autoSaveTimers = new Map<string, ReturnType<typeof setTimeout>>()

  function getGroup(groupId: string | null | undefined): EditorGroup | null {
    if (!groupId) return null
    return groups.value.find((g) => g.id === groupId) ?? null
  }

  const activeGroup = computed(() => getGroup(activeGroupId.value))

  const activeTab = computed(() => {
    const group = activeGroup.value
    if (!group?.activeTabId) return null
    return tabs.value[group.activeTabId] ?? null
  })

  function tabsInGroup(groupId: string): EditorTab[] {
    const group = getGroup(groupId)
    if (!group) return []
    return group.tabIds.map((id) => tabs.value[id]).filter((t): t is EditorTab => Boolean(t))
  }

  function sortPinnedFirst(group: EditorGroup) {
    const pinned = group.tabIds.filter((id) => tabs.value[id]?.isPinned)
    const rest = group.tabIds.filter((id) => !tabs.value[id]?.isPinned)
    group.tabIds = [...pinned, ...rest]
  }

  function setActiveGroup(groupId: string) {
    if (getGroup(groupId)) activeGroupId.value = groupId
  }

  function setActiveTab(groupId: string, tabId: string) {
    const group = getGroup(groupId)
    if (group && group.tabIds.includes(tabId)) {
      group.activeTabId = tabId
      activeGroupId.value = groupId
    }
  }

  // --- Open / activate ---
  function openFile(file: CodeFile, opts: { preview?: boolean; groupId?: string } = {}) {
    const preview = opts.preview ?? false
    const groupId = opts.groupId ?? activeGroupId.value ?? groups.value[0]?.id
    const group = getGroup(groupId)
    if (!group) return

    activeGroupId.value = group.id

    const existingId = group.tabIds.find((id) => tabs.value[id]?.fileId === file.id)
    if (existingId) {
      group.activeTabId = existingId
      if (!preview) tabs.value[existingId].isPreview = false
      return
    }

    if (preview) {
      const previewId = group.tabIds.find((id) => tabs.value[id]?.isPreview)
      const previewTab = previewId ? tabs.value[previewId] : null

      if (previewTab && !previewTab.isDirty) {
        previewTab.fileId = file.id
        previewTab.path = file.path
        previewTab.name = file.name
        previewTab.language = file.language
        previewTab.content = file.code
        previewTab.originalContent = file.code
        previewTab.isDirty = false
        group.activeTabId = previewTab.id
        return
      }
    }

    const tab: EditorTab = {
      id: genId(),
      fileId: file.id,
      path: file.path,
      name: file.name,
      language: file.language,
      content: file.code,
      originalContent: file.code,
      isDirty: false,
      isPinned: false,
      isPreview: preview,
      groupId: group.id,
    }

    tabs.value[tab.id] = tab
    group.tabIds.push(tab.id)
    sortPinnedFirst(group)
    group.activeTabId = tab.id
  }

  // --- Content / dirty ---
  function updateTabContent(tabId: string, content: string) {
    const tab = tabs.value[tabId]
    if (!tab) return

    tab.content = content
    tab.isDirty = content !== tab.originalContent
    if (tab.isPreview && tab.isDirty) tab.isPreview = false

    const existingTimer = autoSaveTimers.get(tabId)
    if (existingTimer) clearTimeout(existingTimer)

    if (settings.autoSaveEnabled && tab.isDirty) {
      const timer = setTimeout(() => {
        autoSaveTimers.delete(tabId)
        void save(tabId)
      }, AUTO_SAVE_DEBOUNCE_MS)
      autoSaveTimers.set(tabId, timer)
    }
  }

  // --- Save ---
  async function save(tabId: string): Promise<boolean> {
    const tab = tabs.value[tabId]
    if (!tab) return false

    try {
      const file = fileApi.files.value.find((f) => f.id === tab.fileId)
      if (!file) throw new Error('File no longer exists')

      fileApi.updateCode(tab.fileId, tab.content)
      tab.originalContent = tab.content
      tab.isDirty = false
      if (saveError.value?.tabId === tabId) saveError.value = null
      return true
    } catch {
      saveError.value = { tabId, name: tab.name }
      return false
    }
  }

  async function saveAll(): Promise<void> {
    const dirtyIds = Object.values(tabs.value)
      .filter((t) => t.isDirty)
      .map((t) => t.id)
    for (const id of dirtyIds) {
      await save(id)
    }
  }

  function saveAs(tabId: string, newPath: string): boolean {
    const tab = tabs.value[tabId]
    if (!tab) return false
    if (fileApi.isPathTaken(newPath)) return false

    const newFile = fileApi.createFile(newPath, tab.content)
    if (!newFile) return false

    tab.fileId = newFile.id
    tab.path = newFile.path
    tab.name = newFile.name
    tab.language = newFile.language
    tab.originalContent = tab.content
    tab.isDirty = false
    tab.isPreview = false
    return true
  }

  function retrySave() {
    if (saveError.value) void save(saveError.value.tabId)
  }

  // --- Confirmation flow ---
  function requestConfirmation(
    kind: PendingConfirmationKind,
    tabIds: string[],
    groupId: string
  ): Promise<'save' | 'discard' | 'cancel'> {
    return new Promise((resolve) => {
      pendingConfirmation.value = { kind, tabIds, groupId, resolve }
    })
  }

  function resolvePendingConfirmation(choice: 'save' | 'discard' | 'cancel') {
    const pending = pendingConfirmation.value
    pendingConfirmation.value = null
    pending?.resolve(choice)
  }

  function recordClosed(tab: EditorTab) {
    closedTabsHistory.value.push({
      fileId: tab.fileId,
      path: tab.path,
      name: tab.name,
      language: tab.language,
      groupId: tab.groupId,
    })
    if (closedTabsHistory.value.length > 20) closedTabsHistory.value.shift()
  }

  function removeTabsFromGroups(tabIds: string[]) {
    for (const id of tabIds) {
      const tab = tabs.value[id]
      if (!tab) continue

      const group = getGroup(tab.groupId)
      recordClosed(tab)

      const timer = autoSaveTimers.get(id)
      if (timer) {
        clearTimeout(timer)
        autoSaveTimers.delete(id)
      }

      if (group) {
        const index = group.tabIds.indexOf(id)
        if (index !== -1) group.tabIds.splice(index, 1)
        if (group.activeTabId === id) {
          const fallback = group.tabIds[Math.max(0, index - 1)] ?? group.tabIds[0] ?? null
          group.activeTabId = fallback
        }
      }

      delete tabs.value[id]
    }
  }

  async function closeTab(tabId: string, opts: { force?: boolean } = {}): Promise<void> {
    const tab = tabs.value[tabId]
    if (!tab) return

    if (tab.isDirty && !opts.force) {
      const choice = await requestConfirmation('close', [tabId], tab.groupId)
      if (choice === 'cancel') return
      if (choice === 'save') {
        const ok = await save(tabId)
        if (!ok) return
      }
    }

    removeTabsFromGroups([tabId])
  }

  async function closeMany(kind: PendingConfirmationKind, groupId: string, affected: string[]): Promise<void> {
    if (!affected.length) return

    const dirty = affected.filter((id) => tabs.value[id]?.isDirty)
    if (dirty.length) {
      const choice = await requestConfirmation(kind, dirty, groupId)
      if (choice === 'cancel') return
      if (choice === 'save') {
        for (const id of dirty) {
          const ok = await save(id)
          if (!ok) {
            // Leave failed-to-save tabs open; still close the rest.
            const idx = affected.indexOf(id)
            if (idx !== -1) affected.splice(idx, 1)
          }
        }
      }
    }

    removeTabsFromGroups(affected)
  }

  function closeOthers(groupId: string, keepTabId: string): Promise<void> {
    const group = getGroup(groupId)
    if (!group) return Promise.resolve()
    const affected = group.tabIds.filter((id) => id !== keepTabId && !tabs.value[id]?.isPinned)
    return closeMany('close-others', groupId, affected)
  }

  function closeToRight(groupId: string, fromTabId: string): Promise<void> {
    const group = getGroup(groupId)
    if (!group) return Promise.resolve()
    const index = group.tabIds.indexOf(fromTabId)
    if (index === -1) return Promise.resolve()
    const affected = group.tabIds.slice(index + 1).filter((id) => !tabs.value[id]?.isPinned)
    return closeMany('close-right', groupId, affected)
  }

  function closeAllInGroup(groupId: string): Promise<void> {
    const group = getGroup(groupId)
    if (!group) return Promise.resolve()
    const affected = group.tabIds.filter((id) => !tabs.value[id]?.isPinned)
    return closeMany('close-all', groupId, affected)
  }

  // Used when the underlying file is deleted — the tab can no longer point
  // at anything real, so it is force-closed regardless of dirty state.
  function closeTabsForFile(fileId: string) {
    const ids = Object.values(tabs.value)
      .filter((t) => t.fileId === fileId)
      .map((t) => t.id)
    removeTabsFromGroups(ids)
  }

  // --- Pin ---
  function pinTab(tabId: string) {
    const tab = tabs.value[tabId]
    if (!tab) return
    tab.isPinned = true
    tab.isPreview = false
    const group = getGroup(tab.groupId)
    if (group) sortPinnedFirst(group)
  }

  function unpinTab(tabId: string) {
    const tab = tabs.value[tabId]
    if (!tab) return
    tab.isPinned = false
    const group = getGroup(tab.groupId)
    if (group) sortPinnedFirst(group)
  }

  // --- Reorder / move ---
  function reorderTab(groupId: string, fromIndex: number, toIndex: number) {
    const group = getGroup(groupId)
    if (!group) return
    const ids = group.tabIds
    if (fromIndex < 0 || fromIndex >= ids.length) return

    const movingId = ids[fromIndex]
    const moving = tabs.value[movingId]
    if (!moving) return

    const pinnedCount = ids.filter((id) => tabs.value[id]?.isPinned).length
    const clampedIndex = moving.isPinned
      ? Math.min(Math.max(toIndex, 0), pinnedCount - 1)
      : Math.max(Math.min(toIndex, ids.length - 1), pinnedCount)

    const [removed] = ids.splice(fromIndex, 1)
    const insertAt = fromIndex < clampedIndex ? clampedIndex : clampedIndex
    ids.splice(insertAt, 0, removed)
  }

  function moveTabToGroup(tabId: string, targetGroupId: string, index?: number) {
    const tab = tabs.value[tabId]
    const sourceGroup = getGroup(tab?.groupId)
    const targetGroup = getGroup(targetGroupId)
    if (!tab || !sourceGroup || !targetGroup || sourceGroup.id === targetGroup.id) return

    const existingId = targetGroup.tabIds.find((id) => tabs.value[id]?.fileId === tab.fileId)
    if (existingId) {
      targetGroup.activeTabId = existingId
      removeTabsFromGroups([tabId])
      return
    }

    const srcIndex = sourceGroup.tabIds.indexOf(tabId)
    if (srcIndex !== -1) sourceGroup.tabIds.splice(srcIndex, 1)
    if (sourceGroup.activeTabId === tabId) {
      sourceGroup.activeTabId = sourceGroup.tabIds[Math.max(0, srcIndex - 1)] ?? sourceGroup.tabIds[0] ?? null
    }

    const insertAt = index ?? targetGroup.tabIds.length
    targetGroup.tabIds.splice(insertAt, 0, tabId)
    sortPinnedFirst(targetGroup)
    tab.groupId = targetGroup.id
    targetGroup.activeTabId = tabId
    activeGroupId.value = targetGroup.id

    pruneEmptyGroups()
  }

  function pruneEmptyGroups() {
    if (groups.value.length <= 1) return
    const nonEmpty = groups.value.filter((g) => g.tabIds.length > 0)
    if (nonEmpty.length === groups.value.length) return

    groups.value = nonEmpty.length ? nonEmpty : [groups.value[0]]
    if (!getGroup(activeGroupId.value)) {
      activeGroupId.value = groups.value[0]?.id ?? null
    }
  }

  function splitGroup(_sourceGroupId: string, tabId?: string): string {
    const newGroup = makeDefaultGroup()
    groups.value.push(newGroup)
    if (tabId) moveTabToGroup(tabId, newGroup.id)
    activeGroupId.value = newGroup.id
    return newGroup.id
  }

  async function closeGroup(groupId: string) {
    if (groups.value.length <= 1) return
    await closeAllInGroup(groupId)
    const group = getGroup(groupId)
    if (group && group.tabIds.length === 0) {
      groups.value = groups.value.filter((g) => g.id !== groupId)
      if (activeGroupId.value === groupId) {
        activeGroupId.value = groups.value[0]?.id ?? null
      }
    }
  }

  // --- Rename / delete sync ---
  function updateTabMetaForFile(fileId: string, meta: { path: string; name: string; language: string }) {
    for (const tab of Object.values(tabs.value)) {
      if (tab.fileId === fileId) Object.assign(tab, meta)
    }
  }

  // --- Reopen closed tab ---
  function reopenClosedTab() {
    while (closedTabsHistory.value.length) {
      const record = closedTabsHistory.value.pop()
      if (!record) return

      const file = fileApi.files.value.find((f) => f.id === record.fileId)
      if (!file) continue // stale/deleted file — skip

      const groupId = getGroup(record.groupId) ? record.groupId : (activeGroupId.value ?? groups.value[0]?.id)
      if (!groupId) return
      openFile(file, { preview: false, groupId })
      return
    }
  }

  // --- Reconciliation ---
  function reconcileWithFiles(existingFileIds: ReadonlySet<string>) {
    const staleIds = Object.values(tabs.value)
      .filter((t) => !existingFileIds.has(t.fileId))
      .map((t) => t.id)
    if (staleIds.length) removeTabsFromGroups(staleIds)

    if (!groups.value.length) groups.value = [makeDefaultGroup()]
    if (!getGroup(activeGroupId.value)) activeGroupId.value = groups.value[0].id
  }

  watch(
    [groups, tabs, activeGroupId],
    () => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ groups: groups.value, tabs: tabs.value, activeGroupId: activeGroupId.value })
        )
      } catch {
        // Storage full or unavailable — tabs still work for this session, just won't persist.
      }
    },
    { deep: true }
  )

  return {
    groups,
    tabs,
    activeGroupId,
    activeGroup,
    activeTab,
    closedTabsHistory,
    pendingConfirmation,
    saveError,
    tabsInGroup,
    setActiveGroup,
    setActiveTab,
    openFile,
    updateTabContent,
    save,
    saveAll,
    saveAs,
    retrySave,
    closeTab,
    closeOthers,
    closeToRight,
    closeAllInGroup,
    closeTabsForFile,
    pinTab,
    unpinTab,
    reorderTab,
    moveTabToGroup,
    splitGroup,
    closeGroup,
    updateTabMetaForFile,
    reopenClosedTab,
    reconcileWithFiles,
    resolvePendingConfirmation,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useEditorTabsStore, import.meta.hot))
}
