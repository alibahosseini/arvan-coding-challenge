<script setup lang="ts">
import { ref, watch } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DialogClose, DialogContent, DialogRoot, DialogTitle } from '@/components/ui/dialog'
import { useEditorTabsStore } from '../../stores/editorTabs'

const props = defineProps<{
  tabId: string | null
}>()

const emit = defineEmits<{
  close: []
}>()

const store = useEditorTabsStore()

const pathInput = ref('')
const error = ref('')

const isOpen = ref(false)

watch(
  () => props.tabId,
  (tabId) => {
    if (tabId) {
      const tab = store.tabs[tabId]
      pathInput.value = tab?.path ?? ''
      error.value = ''
      isOpen.value = true
    } else {
      isOpen.value = false
    }
  },
  { immediate: true }
)

watch(isOpen, (open) => {
  if (!open) emit('close')
})

function confirm() {
  if (!props.tabId) return
  const path = pathInput.value.trim()
  if (!path) {
    error.value = 'Enter a file path.'
    return
  }

  const ok = store.saveAs(props.tabId, path)
  if (!ok) {
    error.value = 'A file already exists at that path.'
    return
  }

  isOpen.value = false
}
</script>

<template>
  <DialogRoot v-model:open="isOpen">
    <DialogContent v-if="tabId">
      <DialogTitle class="mb-3 text-sm font-semibold text-text-h">Save As</DialogTitle>
      <label class="mb-1.5 flex flex-col gap-1.5 text-xs text-text">
        File path
        <Input v-model="pathInput" placeholder="src/components/NewFile.tsx" autofocus @keydown.enter="confirm" />
      </label>
      <p v-if="error" class="mb-2 text-[12px] text-error">{{ error }}</p>
      <div class="mt-2 flex justify-end gap-2">
        <DialogClose as-child>
          <Button variant="outline" size="sm">Cancel</Button>
        </DialogClose>
        <Button size="sm" @click="confirm">Save</Button>
      </div>
    </DialogContent>
  </DialogRoot>
</template>
