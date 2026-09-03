<script setup lang="ts">
import { computed, ref } from 'vue'
import { X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useEditorTabsStore } from '../../stores/editorTabs'
import { useCodeEditor } from '../../composables/useCodeEditor'
import { draggedItem, EXPLORER_DND_MIME } from '../FileExplorer/dragState'
import CodeEditor from './CodeEditor.vue'
import EditorTabs from './EditorTabs.vue'

const props = defineProps<{
  groupId: string
  isOnlyGroup: boolean
  isLastGroup: boolean
}>()

const emit = defineEmits<{
  saveAs: [tabId: string]
}>()

const store = useEditorTabsStore()
const { files } = useCodeEditor()

const group = computed(() => store.groups.find((g) => g.id === props.groupId) ?? null)
const activeTab = computed(() => (group.value?.activeTabId ? store.tabs[group.value.activeTabId] : null))
const openTabIds = computed(() => group.value?.tabIds ?? [])
const isActiveGroup = computed(() => store.activeGroupId === props.groupId)

function focusGroup() {
  store.setActiveGroup(props.groupId)
}

function onContentUpdate(tabId: string, value: string) {
  store.updateTabContent(tabId, value)
}

function closeThisGroup() {
  void store.closeGroup(props.groupId)
}

const codeEditorRef = ref<InstanceType<typeof CodeEditor> | null>(null)

function revealLine(tabId: string, lineNumber: number) {
  if (activeTab.value?.id === tabId) {
    codeEditorRef.value?.revealLine(lineNumber)
  }
}

defineExpose({ revealLine, groupId: props.groupId })

// --- Drag a file from the explorer onto this pane's editor area to open it here ---
const isFileDragOver = ref(false)

function onEditorDragOver(event: DragEvent) {
  if (!event.dataTransfer?.types.includes(EXPLORER_DND_MIME)) return
  if (draggedItem.value?.kind !== 'file') return

  event.preventDefault()
  event.stopPropagation()
  event.dataTransfer.dropEffect = 'move'
  isFileDragOver.value = true
}

function onEditorDragLeave(event: DragEvent) {
  const related = event.relatedTarget as Node | null
  if (related && (event.currentTarget as HTMLElement).contains(related)) return
  isFileDragOver.value = false
}

function onEditorDrop(event: DragEvent) {
  if (!event.dataTransfer?.types.includes(EXPLORER_DND_MIME)) return

  const dragged = draggedItem.value
  draggedItem.value = null
  isFileDragOver.value = false
  if (dragged?.kind !== 'file' || !dragged.id) return

  // Stop this before it reaches Monaco's own drop handling (attached directly
  // on its container), which otherwise consumes the event first and prevents
  // it from ever reaching this bubble-phase listener.
  event.preventDefault()
  event.stopPropagation()

  const file = files.value.find((f) => f.id === dragged.id)
  if (!file) return

  store.openFile(file, { preview: false, groupId: props.groupId })
}
</script>

<template>
  <section
    class="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-border last:border-r-0"
    :class="!isOnlyGroup && isActiveGroup && 'ring-1 ring-inset ring-accent/40'"
    @click="focusGroup"
    @focusin="focusGroup"
  >
    <div class="flex items-stretch border-b border-border">
      <EditorTabs :group-id="groupId" class="min-w-0 flex-1" :class="isLastGroup && 'pr-[210px]'" @save-as="(id) => emit('saveAs', id)" />
    </div>

    <div
      class="relative flex min-h-0 flex-1"
      @dragover.capture="onEditorDragOver"
      @dragleave.capture="onEditorDragLeave"
      @drop.capture="onEditorDrop"
    >
      <CodeEditor
        v-if="activeTab"
        ref="codeEditorRef"
        :tab-id="activeTab.id"
        :content="activeTab.content"
        :language="activeTab.language"
        :open-tab-ids="openTabIds"
        @update:content="onContentUpdate"
      />
      <div v-else class="flex flex-1 flex-col items-center justify-center gap-2 bg-surface-dark text-center text-text-dark">
        <p>No file open</p>
        <p class="text-[12.5px] text-text-dark-muted">Select a file from the explorer to start editing.</p>
        <Button v-if="!isOnlyGroup" variant="outline" size="sm" class="mt-2" @click.stop="closeThisGroup">
          <X :size="14" />
          Close Editor
        </Button>
      </div>

      <div
        v-if="isFileDragOver"
        class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center border-2 border-dashed border-accent bg-black/40"
      >
        <span class="rounded-md bg-surface px-3 py-1.5 text-[12.5px] font-medium text-text-h shadow-elevated">Drop to open here</span>
      </div>
    </div>
  </section>
</template>
