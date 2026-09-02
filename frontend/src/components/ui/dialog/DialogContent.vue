<script setup lang="ts">
import { DialogContent as RekaDialogContent, DialogOverlay, DialogPortal } from 'reka-ui'
import { cn } from '@/lib/utils'

defineProps<{ class?: string }>()
</script>

<template>
  <DialogPortal>
    <DialogOverlay class="fixed inset-0 z-40 bg-text-h/45" />
    <RekaDialogContent
      :class="
        cn(
          'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-[10px] border border-border bg-surface p-4 shadow-elevated focus:outline-none',
          $props.class
        )
      "
    >
      <slot />
    </RekaDialogContent>
  </DialogPortal>
</template>
