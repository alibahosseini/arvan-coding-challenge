<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ChevronDown, ChevronRight, Columns2, Eye, FolderPlus, Pencil, Plus, Trash2, Upload } from 'lucide-vue-next'
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRoot,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import defaultFolderIcon from '../../assets/FormatIcons/default_folder.svg'
import defaultFolderOpenIcon from '../../assets/FormatIcons/default_folder_opened.svg'
import type { FileSystemTarget, FileTreeNode } from '../../types/code'
import { draggedItem, dropTargetPath, EXPLORER_DND_MIME, isValidDropTarget } from './dragState'
import { getFileIcon } from './fileIcon'
import InlineCreateInput from './InlineCreateInput.vue'
import type { CreatingState } from './creating'

const props = defineProps<{
  node: FileTreeNode
  depth: number
  activeFileId: string
  expanded: Set<string>
  isPathTaken: (path: string, excludeFileId?: string) => boolean
  creating: CreatingState | null
}>()

const emit = defineEmits<{
  select: [id: string, preview: boolean]
  openToSide: [id: string]
  toggle: [path: string]
  startCreateIn: [folderPath: string, type: 'file' | 'folder']
  commitCreate: [name: string]
  cancelCreate: []
  renameFile: [id: string, name: string]
  renameFolder: [path: string, name: string]
  moveFile: [id: string, targetFolderPath: string]
  moveFolder: [path: string, targetParentPath: string]
  deleteRequest: [target: FileSystemTarget & { itemCount?: number }]
}>()

const isRevealed = ref(false)
function revealInExplorer() {
  isRevealed.value = true
  setTimeout(() => (isRevealed.value = false), 900)
}

const indent = (extra = 0) => `${10 + (props.depth + extra) * 14}px`

function countDescendants(nodes: FileTreeNode[]): number {
  let count = 0
  for (const child of nodes) {
    count += 1
    if (child.type === 'folder') count += countDescendants(child.children)
  }
  return count
}

function requestDelete() {
  const node = props.node
  if (node.type === 'folder') {
    emit('deleteRequest', { type: 'folder', path: node.path, name: node.name, itemCount: countDescendants(node.children) })
  } else {
    emit('deleteRequest', { type: 'file', id: node.id, path: node.path, name: node.name })
  }
}

// --- Inline rename ---
const isRenaming = ref(false)
const draft = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

watch(isRenaming, (renaming) => {
  if (renaming) {
    draft.value = props.node.name
    nextTick(() => {
      inputRef.value?.focus()
      inputRef.value?.select()
    })
  }
})

function startRename() {
  isRenaming.value = true
}

function commitRename() {
  if (!isRenaming.value) return
  isRenaming.value = false

  const name = draft.value.trim()
  if (!name || name === props.node.name) return

  const segments = props.node.path.split('/')
  segments[segments.length - 1] = name
  const newPath = segments.join('/')

  const excludeId = props.node.type === 'file' ? props.node.id : undefined
  if (props.isPathTaken(newPath, excludeId)) return

  if (props.node.type === 'file') {
    emit('renameFile', props.node.id, name)
  } else {
    emit('renameFolder', props.node.path, name)
  }
}

function cancelRename() {
  isRenaming.value = false
}

const folderIcon = computed(() => (props.expanded.has((props.node as { path: string }).path) ? defaultFolderOpenIcon : defaultFolderIcon))

// --- Drag and drop: move a file/folder onto a folder ---
const isDragOver = computed(() => dropTargetPath.value === props.node.path)

function onDragStart(event: DragEvent) {
  const node = props.node
  const item = node.type === 'file' ? { kind: 'file' as const, id: node.id, path: node.path } : { kind: 'folder' as const, path: node.path }

  draggedItem.value = item
  event.dataTransfer?.setData(EXPLORER_DND_MIME, JSON.stringify(item))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function onDragEnd() {
  draggedItem.value = null
  dropTargetPath.value = null
}

// Only folders accept drops. The dragged item's identity is read from the
// shared `draggedItem` ref rather than `event.dataTransfer` — browsers
// don't expose the payload during dragover/dragenter, only on drop.
function onFolderDragOver(event: DragEvent) {
  if (!event.dataTransfer?.types.includes(EXPLORER_DND_MIME)) return
  const dragged = draggedItem.value
  if (!dragged || !isValidDropTarget(dragged, props.node.path)) return

  event.preventDefault()
  event.stopPropagation()
  event.dataTransfer.dropEffect = 'move'
  // Overwritten by whichever (deepest) folder's dragover fires last, so
  // only one folder is ever highlighted — see dropTargetPath's comment.
  dropTargetPath.value = props.node.path
}

function onFolderDragLeave(event: DragEvent) {
  // Only the currently-active target clears itself, and only once the
  // pointer has genuinely left its box (not just moved into a nested
  // descendant folder, which is still contained within it).
  if (dropTargetPath.value !== props.node.path) return
  const related = event.relatedTarget as Node | null
  if (related && (event.currentTarget as HTMLElement).contains(related)) return
  dropTargetPath.value = null
}

function onFolderDrop(event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()
  dropTargetPath.value = null

  const dragged = draggedItem.value
  draggedItem.value = null
  if (!dragged || !isValidDropTarget(dragged, props.node.path)) return

  if (dragged.kind === 'file' && dragged.id) {
    emit('moveFile', dragged.id, props.node.path)
  } else if (dragged.kind === 'folder') {
    emit('moveFolder', dragged.path, props.node.path)
  }
}
</script>

<template>
  <li
    v-if="node.type === 'folder'"
    class="relative list-none"
    @dragover="onFolderDragOver"
    @dragleave="onFolderDragLeave"
    @drop="onFolderDrop"
  >
    <div
      v-if="isDragOver"
      class="pointer-events-none absolute inset-0 z-10 rounded-md bg-accent-bg/40 ring-2 ring-inset ring-accent"
      aria-hidden="true"
    />

    <div v-if="isRenaming" class="flex items-center gap-1.5 rounded-md px-2.5 py-[5px]" :style="{ paddingLeft: indent() }">
      <img :src="folderIcon" class="h-[15px] w-[15px] shrink-0 object-contain" alt="" />
      <input
        ref="inputRef"
        v-model="draft"
        type="text"
        class="min-w-0 flex-1 rounded border border-accent bg-bg px-[5px] py-px font-mono text-[13px] text-text-h focus:outline-none"
        @blur="commitRename"
        @keydown.enter="commitRename"
        @keydown.escape="cancelRename"
      />
    </div>

    <ContextMenuRoot v-else>
      <ContextMenuTrigger as-child>
        <button
          type="button"
          draggable="true"
          class="flex w-full items-center gap-1.5 rounded-md px-2.5 py-[5px] text-left text-[13px] text-text outline-none hover:bg-code-bg hover:text-text-h focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-accent"
          :class="isDragOver && 'text-text-h'"
          :style="{ paddingLeft: indent() }"
          @click="$emit('toggle', node.path)"
          @dragstart="onDragStart"
          @dragend="onDragEnd"
        >
          <component
            :is="expanded.has(node.path) ? ChevronDown : ChevronRight"
            v-if="node.children.length"
            :size="14"
            class="shrink-0 text-text-dark-muted"
          />
          <span v-else class="inline-block h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <img :src="folderIcon" class="h-[15px] w-[15px] shrink-0 object-contain" alt="" />
          <span class="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-medium">{{ node.name }}</span>
        </button>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem @select="$emit('startCreateIn', node.path, 'file')">
          <Plus :size="14" />
          New File
        </ContextMenuItem>
        <ContextMenuItem @select="$emit('startCreateIn', node.path, 'folder')">
          <FolderPlus :size="14" />
          New Folder
        </ContextMenuItem>
        <ContextMenuItem disabled title="Not available yet">
          <Upload :size="14" />
          Upload File
        </ContextMenuItem>
        <ContextMenuSeparator class="my-1 h-px bg-border" />
        <ContextMenuItem @select="startRename">
          <Pencil :size="14" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem destructive @select="requestDelete">
          <Trash2 :size="14" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenuRoot>

    <ul v-if="expanded.has(node.path)" class="list-none p-0">
      <li v-if="creating && creating.parentPath === node.path" class="list-none">
        <InlineCreateInput
          :type="creating.type"
          :depth="depth + 1"
          @commit="$emit('commitCreate', $event)"
          @cancel="$emit('cancelCreate')"
        />
      </li>
      <FileExplorerNode
        v-for="child in node.children"
        :key="child.type === 'file' ? child.id : child.path"
        :node="child"
        :depth="depth + 1"
        :active-file-id="activeFileId"
        :expanded="expanded"
        :is-path-taken="isPathTaken"
        :creating="creating"
        @select="(id, preview) => $emit('select', id, preview)"
        @open-to-side="$emit('openToSide', $event)"
        @toggle="$emit('toggle', $event)"
        @start-create-in="(path, type) => $emit('startCreateIn', path, type)"
        @commit-create="$emit('commitCreate', $event)"
        @cancel-create="$emit('cancelCreate')"
        @rename-file="(id, name) => $emit('renameFile', id, name)"
        @rename-folder="(path, name) => $emit('renameFolder', path, name)"
        @move-file="(id, targetFolderPath) => $emit('moveFile', id, targetFolderPath)"
        @move-folder="(path, targetParentPath) => $emit('moveFolder', path, targetParentPath)"
        @delete-request="$emit('deleteRequest', $event)"
      />
    </ul>
  </li>

  <li v-else class="list-none">
    <div v-if="isRenaming" class="flex items-center gap-1.5 rounded-md px-2.5 py-[5px]" :style="{ paddingLeft: indent(1) }">
      <img :src="getFileIcon(draft || node.name)" class="h-[15px] w-[15px] shrink-0 object-contain" alt="" />
      <input
        ref="inputRef"
        v-model="draft"
        type="text"
        class="min-w-0 flex-1 rounded border border-accent bg-bg px-[5px] py-px font-mono text-[13px] text-text-h focus:outline-none"
        @blur="commitRename"
        @keydown.enter="commitRename"
        @keydown.escape="cancelRename"
      />
    </div>

    <ContextMenuRoot v-else>
      <ContextMenuTrigger as-child>
        <button
          type="button"
          draggable="true"
          class="flex w-full items-center gap-1.5 rounded-md px-2.5 py-[5px] text-left text-[13px] text-text transition-colors hover:bg-code-bg hover:text-text-h focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-accent"
          :class="[node.id === activeFileId && 'bg-accent-bg font-medium text-text-h', isRevealed && 'ring-2 ring-inset ring-accent']"
          :style="{ paddingLeft: indent(1) }"
          :aria-current="node.id === activeFileId ? 'page' : undefined"
          @click="$emit('select', node.id, true)"
          @dblclick="$emit('select', node.id, false)"
          @dragstart="onDragStart"
          @dragend="onDragEnd"
        >
          <img :src="getFileIcon(node.name)" class="h-[15px] w-[15px] shrink-0 object-contain" alt="" />
          <span class="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{{ node.name }}</span>
        </button>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem @select="$emit('select', node.id, false)">Open</ContextMenuItem>
        <ContextMenuItem @select="$emit('openToSide', node.id)">
          <Columns2 :size="14" />
          Open to the Side
        </ContextMenuItem>
        <ContextMenuSeparator class="my-1 h-px bg-border" />
        <ContextMenuItem @select="startRename">
          <Pencil :size="14" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem destructive @select="requestDelete">
          <Trash2 :size="14" />
          Delete
        </ContextMenuItem>
        <ContextMenuSeparator class="my-1 h-px bg-border" />
        <ContextMenuItem @select="revealInExplorer">
          <Eye :size="14" />
          Reveal in Explorer
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenuRoot>
  </li>
</template>
