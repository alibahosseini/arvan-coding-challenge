<script setup lang="ts">
import { ContextMenuContent as RekaContextMenuContent, ContextMenuPortal } from 'reka-ui'
import { cn } from '@/lib/utils'

defineProps<{ class?: string }>()
</script>

<template>
  <ContextMenuPortal>
    <RekaContextMenuContent
      :class="
        cn(
          'z-30 min-w-[170px] rounded-lg border border-border bg-surface p-1 shadow-elevated focus:outline-none',
          $props.class
        )
      "
    >
      <slot />
    </RekaContextMenuContent>
  </ContextMenuPortal>
</template>
