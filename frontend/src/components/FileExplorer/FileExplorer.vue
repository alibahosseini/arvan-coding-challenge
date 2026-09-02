<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { File, FolderPlus, Plus } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { AlertDialogCancel, AlertDialogContent, AlertDialogRoot, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button/variants'
import { cn } from '@/lib/utils'
import type { FileSystemTarget, FileTreeNode } from '../../types/code'
import FileExplorerNode from './FileExplorerNode.vue'
import InlineCreateInput from './InlineCreateInput.vue'
import type { CreatingState } from './creating'

const props = defineProps<{
  tree: FileTreeNode[]
  activeFileId: string
  isPathTaken: (path: string, excludeFileId?: string) => boolean
  hasUnsavedChanges?: (target: FileSystemTarget) => boolean
}>()

const emit = defineEmits<{
  select: [id: string, preview: boolean]
  openToSide: [id: string]
  createFile: [path: string]
  createFolder: [path: string]
  renameFile: [id: string, name: string]
  renameFolder: [path: string, name: string]
  moveFile: [id: string, targetFolderPath: string]
  moveFolder: [path: string, targetParentPath: string]
  deleteFile: [id: string]
  deleteFolder: [path: string]
}>()

const expanded = reactive(new Set<string>())

function toggleFolder(path: string) {
  if (expanded.has(path)) {
    expanded.delete(path)
  } else {
    expanded.add(path)
  }
}

// --- Create file/folder: inline, no confirmation popup ---
const creating = ref<CreatingState | null>(null)
const showCreateTypeMenu = ref(false)
const createMenuRef = ref<HTMLElement | null>(null)

function toggleCreateTypeMenu() {
  showCreateTypeMenu.value = !showCreateTypeMenu.value
}

function chooseCreateType(type: 'file' | 'folder', parentPath = '') {
  showCreateTypeMenu.value = false
  if (parentPath) expanded.add(parentPath)
  creating.value = { parentPath, type }
}

function startCreateIn(parentPath: string, type: 'file' | 'folder') {
  expanded.add(parentPath)
  creating.value = { parentPath, type }
}

function commitCreate(name: string) {
  const state = creating.value
  creating.value = null
  if (!state) return

  const path = state.parentPath ? `${state.parentPath}/${name}` : name
  if (state.type === 'file') {
    emit('createFile', path)
  } else {
    emit('createFolder', path)
    expanded.add(path)
  }
}

function cancelCreate() {
  creating.value = null
}

function onDocumentClick(event: MouseEvent) {
  if (!showCreateTypeMenu.value) return
  if (createMenuRef.value && !createMenuRef.value.contains(event.target as Node)) {
    showCreateTypeMenu.value = false
  }
}

document.addEventListener('mousedown', onDocumentClick)
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocumentClick))

// --- Delete confirmation ---
type DeleteTarget = FileSystemTarget & { itemCount?: number }

const pendingDelete = ref<DeleteTarget | null>(null)
const deleteDialogOpen = computed({
  get: () => pendingDelete.value !== null,
  set: (open: boolean) => {
    if (!open) pendingDelete.value = null
  },
})

function requestDelete(target: DeleteTarget) {
  pendingDelete.value = target
}

function confirmDelete() {
  const target = pendingDelete.value
  if (!target) return

  if (target.type === 'file') {
    emit('deleteFile', target.id)
  } else {
    emit('deleteFolder', target.path)
  }

  pendingDelete.value = null
}

defineExpose({ newFile: () => startCreateIn('', 'file') })
</script>

<template>
  <nav class="flex h-full w-full flex-col overflow-y-auto" aria-label="Project files">
    <div class="relative flex shrink-0 items-center justify-between px-3 py-2.5">
      <span class="text-[11px] font-semibold uppercase tracking-wider text-text-dark-muted">Files</span>
      <Button
        variant="ghost"
        size="icon"
        class="h-[22px] w-[22px] rounded-[5px]"
        aria-label="Create file or folder"
        title="Create file or folder"
        @click="toggleCreateTypeMenu"
      >
        <Plus :size="14" :stroke-width="2.25" />
      </Button>

      <div
        v-if="showCreateTypeMenu"
        ref="createMenuRef"
        role="menu"
        class="absolute right-2.5 top-[calc(100%-2px)] z-10 flex gap-1 rounded-md border border-border bg-surface p-1 shadow-elevated"
      >
        <button
          type="button"
          role="menuitem"
          class="flex flex-col items-center gap-1 rounded px-2.5 py-2 text-[11.5px] text-text hover:bg-code-bg hover:text-text-h"
          @click="chooseCreateType('file')"
        >
          <File :size="15" />
          File
        </button>
        <button
          type="button"
          role="menuitem"
          class="flex flex-col items-center gap-1 rounded px-2.5 py-2 text-[11.5px] text-text hover:bg-code-bg hover:text-text-h"
          @click="chooseCreateType('folder')"
        >
          <FolderPlus :size="15" />
          Folder
        </button>
      </div>
    </div>

    <ul v-if="tree.length || (creating && creating.parentPath === '')" class="flex-1 list-none p-0 px-1.5 pb-2.5">
      <li v-if="creating && creating.parentPath === ''" class="list-none">
        <InlineCreateInput :type="creating.type" :depth="0" @commit="commitCreate" @cancel="cancelCreate" />
      </li>
      <FileExplorerNode
        v-for="node in tree"
        :key="node.type === 'file' ? node.id : node.path"
        :node="node"
        :depth="0"
        :active-file-id="activeFileId"
        :expanded="expanded"
        :is-path-taken="isPathTaken"
        :creating="creating"
        @select="(id, preview) => $emit('select', id, preview)"
        @open-to-side="$emit('openToSide', $event)"
        @toggle="toggleFolder"
        @start-create-in="startCreateIn"
        @commit-create="commitCreate"
        @cancel-create="cancelCreate"
        @rename-file="(id, name) => $emit('renameFile', id, name)"
        @rename-folder="(path, name) => $emit('renameFolder', path, name)"
        @move-file="(id, targetFolderPath) => $emit('moveFile', id, targetFolderPath)"
        @move-folder="(path, targetParentPath) => $emit('moveFolder', path, targetParentPath)"
        @delete-request="requestDelete"
      />
    </ul>

    <div v-else class="flex flex-1 flex-col items-center justify-center gap-1 px-4 py-5 text-center">
      <File :size="20" class="mb-1 text-text-dark-muted" />
      <p class="text-[13px] font-medium text-text-h">No files yet</p>
      <p class="text-xs leading-tight text-text-dark-muted">Create a file or folder to get started.</p>
    </div>

    <!-- Delete confirmation -->
    <AlertDialogRoot v-model:open="deleteDialogOpen">
      <AlertDialogContent v-if="pendingDelete">
        <AlertDialogTitle class="mb-3 text-sm font-semibold text-text-h">Delete "{{ pendingDelete.name }}"?</AlertDialogTitle>
        <p v-if="pendingDelete.type === 'folder'" class="mb-2.5 text-[12.5px] leading-relaxed text-text">
          This folder contains {{ pendingDelete.itemCount }}
          {{ pendingDelete.itemCount === 1 ? 'item' : 'items' }}. Deleting it will remove all items inside.
        </p>
        <p v-if="hasUnsavedChanges?.(pendingDelete)" class="mb-2.5 text-[12.5px] font-medium leading-relaxed text-warning">
          {{ pendingDelete.type === 'folder' ? 'It contains unsaved changes' : 'It has unsaved changes' }} that will be lost, and its open tab will be closed.
        </p>
        <p class="mb-2.5 text-[12.5px] leading-relaxed text-text">This action cannot be undone.</p>
        <div class="flex justify-end gap-2">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <button type="button" :class="cn(buttonVariants({ variant: 'destructive', size: 'sm' }))" @click="confirmDelete">
            Delete
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialogRoot>
  </nav>
</template>
