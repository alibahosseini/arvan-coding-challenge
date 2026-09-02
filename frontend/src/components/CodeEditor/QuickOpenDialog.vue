<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { DialogContent, DialogRoot, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { getFileIcon } from '../FileExplorer/fileIcon'
import type { CodeFile } from '../../types/code'

const props = defineProps<{
  open: boolean
  files: CodeFile[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  select: [file: CodeFile]
}>()

const query = ref('')
const inputRef = ref<InstanceType<typeof Input> | null>(null)

const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

watch(
  () => props.open,
  (open) => {
    if (open) {
      query.value = ''
      nextTick(() => inputRef.value?.$el?.focus())
    }
  }
)

const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.files.slice(0, 20)
  return props.files.filter((f) => f.path.toLowerCase().includes(q)).slice(0, 20)
})

function choose(file: CodeFile) {
  emit('select', file)
  isOpen.value = false
}
</script>

<template>
  <DialogRoot v-model:open="isOpen">
    <DialogContent class="max-w-[420px]">
      <DialogTitle class="mb-2 text-sm font-semibold text-text-h">Go to File</DialogTitle>
      <Input ref="inputRef" v-model="query" placeholder="Type a file name..." class="mb-2" />
      <ul class="max-h-72 list-none overflow-y-auto">
        <li v-for="file in results" :key="file.id">
          <button
            type="button"
            class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] text-text hover:bg-code-bg hover:text-text-h"
            @click="choose(file)"
          >
            <img :src="getFileIcon(file.name)" class="h-3.5 w-3.5 shrink-0 object-contain" alt="" />
            <span class="truncate">{{ file.path }}</span>
          </button>
        </li>
        <li v-if="!results.length" class="px-2 py-3 text-center text-[12.5px] text-text-dark-muted">No matching files</li>
      </ul>
    </DialogContent>
  </DialogRoot>
</template>
