<script setup lang="ts">
import { computed } from 'vue'
import { AlertDialogCancel, AlertDialogContent, AlertDialogRoot, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button/variants'
import { cn } from '@/lib/utils'
import { useEditorTabsStore } from '../../stores/editorTabs'

const store = useEditorTabsStore()

const pending = computed(() => store.pendingConfirmation)
const isOpen = computed({
  get: () => pending.value !== null,
  set: (open: boolean) => {
    if (!open) store.resolvePendingConfirmation('cancel')
  },
})

const affectedTabs = computed(() => (pending.value ? pending.value.tabIds.map((id) => store.tabs[id]).filter(Boolean) : []))

const title = computed(() => {
  if (!pending.value) return ''
  if (affectedTabs.value.length === 1) {
    return `Do you want to save the changes to "${affectedTabs.value[0].name}"?`
  }
  return `Do you want to save the changes to ${affectedTabs.value.length} files?`
})
</script>

<template>
  <AlertDialogRoot v-model:open="isOpen">
    <AlertDialogContent v-if="pending">
      <AlertDialogTitle class="mb-3 text-sm font-semibold text-text-h">{{ title }}</AlertDialogTitle>
      <ul v-if="affectedTabs.length > 1" class="mb-3 max-h-32 list-disc space-y-0.5 overflow-y-auto pl-4 text-[12.5px] text-text">
        <li v-for="tab in affectedTabs" :key="tab.id">{{ tab.name }}</li>
      </ul>
      <p class="mb-3 text-[12.5px] leading-relaxed text-text">Your changes will be lost if you don't save them.</p>
      <div class="flex justify-end gap-2">
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <button
          type="button"
          :class="cn(buttonVariants({ variant: 'outline', size: 'sm' }))"
          @click="store.resolvePendingConfirmation('discard')"
        >
          Don't Save
        </button>
        <button type="button" :class="cn(buttonVariants({ size: 'sm' }))" @click="store.resolvePendingConfirmation('save')">
          Save
        </button>
      </div>
    </AlertDialogContent>
  </AlertDialogRoot>
</template>
