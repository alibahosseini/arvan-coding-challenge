<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import defaultFolderIcon from '../../assets/FormatIcons/default_folder.svg'
import { getFileIcon } from './fileIcon'

const props = defineProps<{
  type: 'file' | 'folder'
  depth: number
}>()

const emit = defineEmits<{
  commit: [name: string]
  cancel: []
}>()

const draft = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
let settled = false

onMounted(() => {
  nextTick(() => inputRef.value?.focus())
})

function settle() {
  if (settled) return
  settled = true

  const name = draft.value.trim()
  if (name) {
    emit('commit', name)
  } else {
    emit('cancel')
  }
}

function cancel() {
  if (settled) return
  settled = true
  emit('cancel')
}

const indent = `${10 + (props.depth + (props.type === 'file' ? 1 : 0)) * 14}px`
</script>

<template>
  <div class="flex items-center gap-1.5 rounded-md px-2.5 py-[5px]" :style="{ paddingLeft: indent }">
    <img :src="type === 'folder' ? defaultFolderIcon : getFileIcon(draft || 'file.txt')" class="h-[15px] w-[15px] shrink-0 object-contain" alt="" />
    <input
      ref="inputRef"
      v-model="draft"
      type="text"
      :placeholder="type === 'folder' ? 'Folder name' : 'File name'"
      class="min-w-0 flex-1 rounded border border-accent bg-bg px-[5px] py-px font-mono text-[13px] text-text-h focus:outline-none"
      @blur="settle"
      @keydown.enter="settle"
      @keydown.escape="cancel"
    />
  </div>
</template>
