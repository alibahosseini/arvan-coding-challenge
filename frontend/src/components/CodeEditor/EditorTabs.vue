<script setup lang="ts">
import { computed, ref } from 'vue'
import { Pin, PinOff, SplitSquareHorizontal, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRoot,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { getFileIcon } from '../FileExplorer/fileIcon'
import { useEditorTabsStore } from '../../stores/editorTabs'

const props = defineProps<{
  groupId: string
}>()

const emit = defineEmits<{
  saveAs: [tabId: string]
}>()

const store = useEditorTabsStore()

const group = computed(() => store.groups.find((g) => g.id === props.groupId) ?? null)
const tabs = computed(() => store.tabsInGroup(props.groupId))

const DND_MIME = 'application/x-code-dashboard-tab'

function onKeydown(event: KeyboardEvent, id: string) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    store.setActiveTab(props.groupId, id)
  }
}

function select(id: string) {
  store.setActiveTab(props.groupId, id)
}

function close(id: string) {
  void store.closeTab(id)
}

// --- Drag and drop reorder / cross-group move ---
const dragTabId = ref<string | null>(null)
const dropIndex = ref<number | null>(null)

function onDragStart(event: DragEvent, id: string, index: number) {
  dragTabId.value = id
  event.dataTransfer?.setData(DND_MIME, JSON.stringify({ tabId: id, sourceGroupId: props.groupId, index }))
  event.dataTransfer!.effectAllowed = 'move'
}

function onDragOver(event: DragEvent, index: number) {
  event.preventDefault()
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const before = event.clientX - rect.left < rect.width / 2
  dropIndex.value = before ? index : index + 1
}

function onDragLeaveTabs() {
  dropIndex.value = null
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  const raw = event.dataTransfer?.getData(DND_MIME)
  const index = dropIndex.value
  dropIndex.value = null
  dragTabId.value = null
  if (!raw || index === null) return

  const { tabId, sourceGroupId } = JSON.parse(raw) as { tabId: string; sourceGroupId: string; index: number }

  if (sourceGroupId === props.groupId) {
    const fromIndex = tabs.value.findIndex((t) => t.id === tabId)
    if (fromIndex === -1) return
    let toIndex = index
    if (fromIndex < toIndex) toIndex -= 1
    store.reorderTab(props.groupId, fromIndex, toIndex)
  } else {
    store.moveTabToGroup(tabId, props.groupId, index)
  }
}

function onDragEnd() {
  dragTabId.value = null
  dropIndex.value = null
}

function pinnedBoundaryIndex() {
  return tabs.value.filter((t) => t.isPinned).length
}
</script>

<template>
  <div
    class="scrollbar-hover flex items-stretch overflow-x-auto bg-surface"
    role="tablist"
    aria-label="Open files"
    @dragleave="onDragLeaveTabs"
    @drop="onDrop"
    @dragover.prevent
  >
    <template v-for="(tab, index) in tabs" :key="tab.id">
      <div v-if="dropIndex === index" class="w-0.5 shrink-0 self-stretch bg-accent" aria-hidden="true" />

      <ContextMenuRoot>
        <ContextMenuTrigger as-child>
          <div
            role="tab"
            tabindex="0"
            draggable="true"
            :title="tab.path"
            :aria-selected="tab.id === group?.activeTabId"
            class="group flex shrink-0 cursor-pointer items-center gap-2 border-r border-border px-3 py-2 text-[13px] outline-none focus-visible:bg-code-bg"
            :class="[
              tab.id === group?.activeTabId ? 'bg-code-bg text-text-h' : 'text-text hover:bg-code-bg/60 hover:text-text-h',
              tab.isPreview && 'italic',
              dragTabId === tab.id && 'opacity-50',
              tab.isPinned && index === pinnedBoundaryIndex() - 1 && 'border-r-2 border-r-accent-border',
            ]"
            @click="select(tab.id)"
            @keydown="onKeydown($event, tab.id)"
            @dragstart="onDragStart($event, tab.id, index)"
            @dragover="onDragOver($event, index)"
            @dragend="onDragEnd"
          >
            <Pin v-if="tab.isPinned" :size="11" class="shrink-0 text-text-dark-muted" aria-label="Pinned" />
            <img v-else :src="getFileIcon(tab.name)" class="h-3.5 w-3.5 shrink-0 object-contain" alt="" />
            <span class="max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap">{{ tab.name }}</span>
            <span v-if="tab.isDirty" class="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" title="Unsaved changes" />

            <Button
              v-if="!tab.isPinned"
              variant="ghost"
              size="icon"
              class="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
              :class="tab.id === group?.activeTabId ? 'opacity-100' : ''"
              :aria-label="`Close ${tab.name}`"
              @click.stop="close(tab.id)"
            >
              <X :size="12" />
            </Button>
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent>
          <ContextMenuItem @select="close(tab.id)">Close</ContextMenuItem>
          <ContextMenuItem @select="store.closeOthers(props.groupId, tab.id)">Close Others</ContextMenuItem>
          <ContextMenuItem @select="store.closeToRight(props.groupId, tab.id)">Close Tabs to the Right</ContextMenuItem>
          <ContextMenuItem @select="store.closeAllInGroup(props.groupId)">Close All</ContextMenuItem>
          <ContextMenuSeparator class="my-1 h-px bg-border" />
          <ContextMenuItem @select="store.save(tab.id)">Save</ContextMenuItem>
          <ContextMenuItem @select="emit('saveAs', tab.id)">Save As...</ContextMenuItem>
          <ContextMenuSeparator class="my-1 h-px bg-border" />
          <ContextMenuItem v-if="!tab.isPinned" @select="store.pinTab(tab.id)">
            <Pin :size="14" />
            Pin
          </ContextMenuItem>
          <ContextMenuItem v-else @select="store.unpinTab(tab.id)">
            <PinOff :size="14" />
            Unpin
          </ContextMenuItem>
          <ContextMenuItem @select="store.splitGroup(props.groupId, tab.id)">
            <SplitSquareHorizontal :size="14" />
            Move to New Editor Group
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenuRoot>
    </template>

    <div v-if="dropIndex === tabs.length" class="w-0.5 shrink-0 self-stretch bg-accent" aria-hidden="true" />

    <div class="min-w-6 flex-1" @dragover.prevent="dropIndex = tabs.length" @drop="onDrop" />
  </div>
</template>
