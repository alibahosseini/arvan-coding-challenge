<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { Files, Loader2, PanelLeft, Play, Search as SearchIcon, Sparkles, SplitSquareHorizontal } from 'lucide-vue-next'
import { useCodeEditor } from '../composables/useCodeEditor'
import { useEditorTabsStore } from '../stores/editorTabs'
import { useSettingsStore } from '../stores/settings'
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts'
import { executeCode } from '../services/execution'
import type { CodeFile, ExecutionResult, ExecutionStatus } from '../types/code'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button/variants'
import { cn } from '@/lib/utils'
import { AlertDialogCancel, AlertDialogContent, AlertDialogRoot, AlertDialogTitle } from '@/components/ui/alert-dialog'
import AppHeader from '../components/ui/AppHeader.vue'
// Left nav sidebar disabled for now — not needed currently, kept for later re-enabling.
// import AppSidebar from '../components/ui/AppSidebar.vue'
import FileExplorer from '../components/FileExplorer/FileExplorer.vue'
import SearchPanel from '../components/Search/SearchPanel.vue'
import EditorGroupPanel from '../components/CodeEditor/EditorGroupPanel.vue'
import UnsavedChangesDialog from '../components/CodeEditor/UnsavedChangesDialog.vue'
import SaveAsDialog from '../components/CodeEditor/SaveAsDialog.vue'
import QuickOpenDialog from '../components/CodeEditor/QuickOpenDialog.vue'
import OutputConsole from '../components/OutputConsole/OutputConsole.vue'
import AIAssistant from '../components/ai/AIAssistant.vue'
import { useAIAssistantStore } from '../stores/aiAssistant'
import { useResizablePanel } from '../composables/useResizablePanel'

const {
  files,
  activeFileId,
  isPathTaken,
  fileTree,
  setActiveFile,
  createFile,
  createFolder,
  renameFile,
  renameFolder,
  moveFile,
  moveFolder,
  deleteFile,
  deleteFolder,
} = useCodeEditor()

const tabsStore = useEditorTabsStore()
const settingsStore = useSettingsStore()
const aiStore = useAIAssistantStore()

onMounted(() => {
  // This project's file system is in-memory only, restored from
  // localStorage on load — dropping any tab whose file no longer exists
  // keeps the tab bar from pointing at a broken/deleted file.
  tabsStore.reconcileWithFiles(new Set(files.value.map((f) => f.id)))
})

const isExplorerOpen = ref(false)
function toggleExplorer() {
  isExplorerOpen.value = !isExplorerOpen.value
}

const { width: explorerWidth, isResizing: isExplorerResizing, startResize: startExplorerResize } = useResizablePanel({
  storageKey: 'code-dashboard:explorer-width',
  defaultWidth: 230,
  min: 180,
  max: 480,
  direction: 'right',
})

const leftPanel = ref<'explorer' | 'search'>('explorer')

function selectFile(id: string, preview: boolean) {
  setActiveFile(id)
  const file = files.value.find((f) => f.id === id)
  if (file) tabsStore.openFile(file, { preview })
  isExplorerOpen.value = false
}

function openToSide(id: string) {
  const file = files.value.find((f) => f.id === id)
  if (!file) return

  const currentGroupId = tabsStore.activeGroupId ?? tabsStore.groups[0]?.id
  const otherGroup = tabsStore.groups.find((g) => g.id !== currentGroupId)
  const targetGroupId = otherGroup?.id ?? tabsStore.splitGroup(currentGroupId ?? tabsStore.groups[0].id)
  tabsStore.openFile(file, { preview: false, groupId: targetGroupId })
}

function handleCreateFile(path: string) {
  createFile(path)
  const file = files.value.find((f) => f.id === activeFileId.value)
  if (file) tabsStore.openFile(file, { preview: false })
}

function handleRenameFile(id: string, name: string) {
  renameFile(id, name)
  const file = files.value.find((f) => f.id === id)
  if (file) tabsStore.updateTabMetaForFile(id, { path: file.path, name: file.name, language: file.language })
}

function handleRenameFolder(path: string, name: string) {
  renameFolder(path, name)
  for (const file of files.value) {
    tabsStore.updateTabMetaForFile(file.id, { path: file.path, name: file.name, language: file.language })
  }
}

function handleMoveFile(id: string, targetFolderPath: string) {
  moveFile(id, targetFolderPath)
  const file = files.value.find((f) => f.id === id)
  if (file) tabsStore.updateTabMetaForFile(id, { path: file.path, name: file.name, language: file.language })
}

function handleMoveFolder(path: string, targetParentPath: string) {
  moveFolder(path, targetParentPath)
  for (const file of files.value) {
    tabsStore.updateTabMetaForFile(file.id, { path: file.path, name: file.name, language: file.language })
  }
}

function splitEditor() {
  const currentGroupId = tabsStore.activeGroupId ?? tabsStore.groups[0]?.id
  if (!currentGroupId) return
  tabsStore.splitGroup(currentGroupId)
}

function isTabDirtyForFile(fileId: string): boolean {
  return Object.values(tabsStore.tabs).some((t) => t.fileId === fileId && t.isDirty)
}

function hasUnsavedChanges(target: { type: 'file'; id: string } | { type: 'folder'; path: string }): boolean {
  if (target.type === 'file') return isTabDirtyForFile(target.id)

  const prefix = `${target.path}/`
  const affectedIds = files.value.filter((f) => f.path === target.path || f.path.startsWith(prefix)).map((f) => f.id)
  return affectedIds.some((id) => isTabDirtyForFile(id))
}

function handleDeleteFile(id: string) {
  tabsStore.closeTabsForFile(id)
  deleteFile(id)
}

function handleDeleteFolder(path: string) {
  const prefix = `${path}/`
  const affectedIds = files.value.filter((f) => f.path === path || f.path.startsWith(prefix)).map((f) => f.id)
  affectedIds.forEach((id) => tabsStore.closeTabsForFile(id))
  deleteFolder(path)
}

// --- Save As ---
const saveAsTabId = ref<string | null>(null)
function openSaveAs(tabId: string) {
  saveAsTabId.value = tabId
}

// --- Quick Open ---
const quickOpenVisible = ref(false)
function selectFromQuickOpen(file: CodeFile) {
  setActiveFile(file.id)
  tabsStore.openFile(file, { preview: false })
}

// --- Search in Files ---
const groupPanelRefs = ref<InstanceType<typeof EditorGroupPanel>[]>([])
function openSearchResult(file: CodeFile, lineNumber: number) {
  setActiveFile(file.id)
  const activeGroupId = tabsStore.activeGroupId ?? tabsStore.groups[0]?.id
  tabsStore.openFile(file, { preview: true, groupId: activeGroupId })
  nextTick(() => {
    const tab = tabsStore.activeTab
    if (!tab) return
    for (const panel of groupPanelRefs.value) {
      panel?.revealLine(tab.id, lineNumber)
    }
  })
}

// --- File Explorer sidebar ---
const fileExplorerRef = ref<InstanceType<typeof FileExplorer> | null>(null)

// --- Save failure retry dialog ---
const isSaveErrorOpen = computed({
  get: () => tabsStore.saveError !== null,
  set: (open: boolean) => {
    if (!open) tabsStore.saveError = null
  },
})

// --- Keyboard shortcuts ---
function cycleTab(direction: 1 | -1) {
  const group = tabsStore.activeGroup
  if (!group || group.tabIds.length < 2) return
  const currentIndex = group.tabIds.indexOf(group.activeTabId ?? '')
  const nextIndex = (currentIndex + direction + group.tabIds.length) % group.tabIds.length
  tabsStore.setActiveTab(group.id, group.tabIds[nextIndex])
}

useKeyboardShortcuts({
  save: () => {
    if (tabsStore.activeTab) void tabsStore.save(tabsStore.activeTab.id)
  },
  saveAs: () => {
    if (tabsStore.activeTab) openSaveAs(tabsStore.activeTab.id)
  },
  closeTab: () => {
    if (tabsStore.activeTab) void tabsStore.closeTab(tabsStore.activeTab.id)
  },
  nextTab: () => cycleTab(1),
  previousTab: () => cycleTab(-1),
  quickOpen: () => (quickOpenVisible.value = true),
  searchInFiles: () => {
    leftPanel.value = 'search'
    isExplorerOpen.value = true
  },
  newFile: () => fileExplorerRef.value?.newFile(),
  reopenClosedTab: () => tabsStore.reopenClosedTab(),
})

const tips = [
  { keys: ['Ctrl', 'S'], text: 'to save the current file' },
  { keys: ['Ctrl', 'P'], text: 'to quickly jump to any file' },
  { keys: ['Ctrl', 'Shift', 'F'], text: 'to search across all files' },
]
const activeTipIndex = ref(0)
const activeTip = computed(() => tips[activeTipIndex.value])
let tipInterval: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  tipInterval = setInterval(() => {
    activeTipIndex.value = (activeTipIndex.value + 1) % tips.length
  }, 5000)
})

onBeforeUnmount(() => {
  clearInterval(tipInterval)
})

// --- Run code (executes the active tab's buffered content) ---
const isRunning = ref(false)
const executionStatus = ref<ExecutionStatus>('idle')
const executionResult = ref<ExecutionResult | null>(null)

const isRunDisabled = computed(() => !tabsStore.activeTab || isRunning.value)

const statusText = computed(() => {
  switch (executionStatus.value) {
    case 'running':
      return 'Executing...'
    case 'success':
      return 'Last execution successful'
    case 'error':
      return 'Last execution failed'
    default:
      return 'No executions yet'
  }
})

const statusColorClass = computed(() => {
  switch (executionStatus.value) {
    case 'success':
      return 'text-success'
    case 'error':
      return 'text-error'
    case 'running':
      return 'text-accent-hover'
    default:
      return 'text-text'
  }
})

const statusDotClass = computed(() => {
  switch (executionStatus.value) {
    case 'success':
      return 'bg-success'
    case 'error':
      return 'bg-error'
    case 'running':
      return 'bg-accent animate-pulse'
    default:
      return 'bg-text-dark-muted'
  }
})

async function runCode() {
  if (isRunning.value || !tabsStore.activeTab) return

  const code = tabsStore.activeTab.content

  if (!code.trim()) {
    executionStatus.value = 'error'
    executionResult.value = { success: false, error: 'Write some code before running.' }
    return
  }

  isRunning.value = true
  executionStatus.value = 'running'
  executionResult.value = null

  const result = await executeCode(code)

  executionResult.value = result
  executionStatus.value = result.success ? 'success' : 'error'
  isRunning.value = false
}
</script>

<template>
  <div class="flex min-h-svh w-full flex-col">
    <AppHeader project-name="Code Execution Console" />

    <div class="flex min-h-0 flex-1 max-[900px]:flex-col">
      <!-- <AppSidebar /> disabled for now, see import comment above -->

      <main class="flex min-w-0 flex-1 flex-col gap-5 px-8 py-7 max-[900px]:px-4 max-[900px]:py-5">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h1 class="text-2xl">Code Editor</h1>
            <p class="mt-1.5 text-sm text-text">Edit your files and run them to see the output.</p>
          </div>
        </div>

        <div class="relative flex min-h-0 flex-1 items-stretch gap-5 max-[1100px]:flex-col">
          <aside
            class="relative flex shrink-0 flex-col overflow-hidden rounded-[10px] border border-border bg-surface max-[1100px]:absolute max-[1100px]:inset-0 max-[1100px]:z-[5] max-[1100px]:hidden max-[1100px]:max-h-[60vh] max-[1100px]:w-full! max-[1100px]:shadow-elevated"
            :style="{ width: explorerWidth + 'px' }"
            :class="isExplorerOpen && 'max-[1100px]:flex'"
          >
            <div
              class="group absolute inset-y-0 right-0 z-10 -mr-1 w-2 cursor-col-resize max-[1100px]:hidden"
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize file explorer"
              @pointerdown="startExplorerResize"
            >
              <div class="mx-auto h-full w-px bg-transparent group-hover:bg-accent" :class="isExplorerResizing && 'bg-accent!'" />
            </div>

            <div class="flex shrink-0 border-b border-border">
              <button
                type="button"
                class="flex flex-1 items-center justify-center gap-1.5 py-2 text-[11px] font-semibold uppercase tracking-wider"
                :class="leftPanel === 'explorer' ? 'text-text-h' : 'text-text-dark-muted hover:text-text-h'"
                @click="leftPanel = 'explorer'"
              >
                <Files :size="13" />
                Explorer
              </button>
              <button
                type="button"
                class="flex flex-1 items-center justify-center gap-1.5 py-2 text-[11px] font-semibold uppercase tracking-wider"
                :class="leftPanel === 'search' ? 'text-text-h' : 'text-text-dark-muted hover:text-text-h'"
                @click="leftPanel = 'search'"
              >
                <SearchIcon :size="13" />
                Search
              </button>
            </div>

            <FileExplorer
              v-show="leftPanel === 'explorer'"
              ref="fileExplorerRef"
              :tree="fileTree"
              :active-file-id="activeFileId"
              :is-path-taken="isPathTaken"
              :has-unsaved-changes="hasUnsavedChanges"
              class="min-h-0 flex-1"
              @select="selectFile"
              @open-to-side="openToSide"
              @create-file="handleCreateFile"
              @create-folder="createFolder"
              @rename-file="handleRenameFile"
              @rename-folder="handleRenameFolder"
              @move-file="handleMoveFile"
              @move-folder="handleMoveFolder"
              @delete-file="handleDeleteFile"
              @delete-folder="handleDeleteFolder"
            />

            <SearchPanel v-show="leftPanel === 'search'" :files="files" class="min-h-0 flex-1" @open-result="openSearchResult" />

            <div class="flex shrink-0 flex-col items-start gap-1 border-t border-border px-3 py-2.5">
              <span class="text-[11px] font-medium uppercase tracking-wide text-text-dark-muted/70">Tip</span>
              <Transition name="tip-fade" mode="out-in">
                <span :key="activeTipIndex" class="flex w-full items-center gap-1 overflow-hidden text-xs whitespace-nowrap text-text-dark-muted">
                  <template v-for="(key, index) in activeTip.keys" :key="key">
                    <kbd class="shrink-0 rounded border border-border bg-code-bg px-1.5 py-0.5 text-[11px] font-medium text-text-h">{{ key }}</kbd
                    ><span v-if="index < activeTip.keys.length - 1" class="shrink-0">+</span>
                  </template>
                  <span class="overflow-hidden text-ellipsis">{{ activeTip.text }}</span>
                </span>
              </Transition>
            </div>
          </aside>

          <div class="flex min-h-0 min-w-0 flex-1 flex-col gap-5">
            <section class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[10px] border border-border bg-surface">
              <div class="hidden items-center gap-2 border-b border-border px-3 py-2 max-[1100px]:flex">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Toggle file explorer"
                  @click="toggleExplorer"
                >
                  <PanelLeft :size="16" />
                </Button>
              </div>

              <div class="relative flex min-h-0 flex-1 items-stretch">
                <div class="absolute top-0 right-0 z-10 flex items-stretch gap-3 border-l border-border bg-surface py-2 pr-2 pl-3">
                  <label class="flex shrink-0 items-center gap-2 text-[12.5px] text-text">
                    <input type="checkbox" :checked="settingsStore.autoSaveEnabled" class="h-3.5 w-3.5" @change="settingsStore.toggleAutoSave" />
                    Auto Save
                  </label>
                  <div class="flex items-center gap-1">
                    <Button variant="ghost" size="icon" class="h-6 w-6" title="Split Editor" aria-label="Split editor" @click="splitEditor">
                      <SplitSquareHorizontal :size="14" />
                    </Button>
                    <Button variant="ghost" size="icon" class="h-6 w-6" title="AI Assistant" aria-label="Open AI Assistant" @click="aiStore.toggle">
                      <Sparkles :size="14" />
                    </Button>
                  </div>
                </div>

                <EditorGroupPanel
                  v-for="(group, index) in tabsStore.groups"
                  :key="group.id"
                  ref="groupPanelRefs"
                  :group-id="group.id"
                  :is-only-group="tabsStore.groups.length === 1"
                  :is-last-group="index === tabsStore.groups.length - 1"
                  @save-as="openSaveAs"
                />
              </div>

              <div class="flex items-center justify-between gap-3 border-t border-border px-3 py-2 max-[640px]:flex-col max-[640px]:items-stretch">
                <div class="inline-flex items-center gap-2 whitespace-nowrap text-[12.5px]" :class="statusColorClass">
                  <span class="h-[7px] w-[7px] shrink-0 rounded-full" :class="statusDotClass" aria-hidden="true" />
                  {{ statusText }}
                </div>

                <div class="flex shrink-0 items-center gap-3 max-[640px]:justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    :disabled="!tabsStore.tabs || !Object.values(tabsStore.tabs).some((t) => t.isDirty)"
                    @click="tabsStore.saveAll"
                  >
                    Save All
                  </Button>

                  <Button :disabled="isRunDisabled" :aria-busy="isRunning" class="max-[640px]:justify-center" @click="runCode">
                    <Loader2 v-if="isRunning" :size="15" class="animate-spin" />
                    <Play v-else :size="15" fill="currentColor" :stroke-width="0" />
                    {{ isRunning ? 'Running...' : 'Run Code' }}
                  </Button>
                </div>
              </div>
            </section>

            <section class="flex h-[220px] shrink-0 overflow-hidden rounded-[10px] border border-border">
              <OutputConsole :result="executionResult" :is-running="isRunning" />
            </section>
          </div>

          <AIAssistant v-if="aiStore.isOpen" />
        </div>
      </main>
    </div>

    <UnsavedChangesDialog />
    <SaveAsDialog :tab-id="saveAsTabId" @close="saveAsTabId = null" />
    <QuickOpenDialog v-model:open="quickOpenVisible" :files="files" @select="selectFromQuickOpen" />

    <AlertDialogRoot v-model:open="isSaveErrorOpen">
      <AlertDialogContent v-if="tabsStore.saveError">
        <AlertDialogTitle class="mb-3 text-sm font-semibold text-text-h">Unable to save "{{ tabsStore.saveError.name }}".</AlertDialogTitle>
        <p class="mb-3 text-[12.5px] leading-relaxed text-text">Your changes are still in the editor and have not been lost.</p>
        <div class="flex justify-end gap-2">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <button type="button" :class="cn(buttonVariants({ size: 'sm' }))" @click="tabsStore.retrySave">Retry</button>
        </div>
      </AlertDialogContent>
    </AlertDialogRoot>
  </div>
</template>

<style scoped>
.tip-fade-enter-active,
.tip-fade-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.tip-fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.tip-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
