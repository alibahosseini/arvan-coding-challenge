<script setup lang="ts">
import { AlertDialogContent as RekaAlertDialogContent, AlertDialogOverlay, AlertDialogPortal } from 'reka-ui'
import { cn } from '@/lib/utils'

defineProps<{ class?: string }>()
</script>

<template>
  <AlertDialogPortal>
    <AlertDialogOverlay class="fixed inset-0 z-40 bg-text-h/45" />
    <RekaAlertDialogContent
      :class="
        cn(
          'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-32px)] max-w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-[10px] border border-border bg-surface p-4 shadow-elevated focus:outline-none',
          $props.class
        )
      "
    >
      <slot />
    </RekaAlertDialogContent>
  </AlertDialogPortal>
</template>
