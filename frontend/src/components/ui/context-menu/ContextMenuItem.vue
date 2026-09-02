<script setup lang="ts">
import { ContextMenuItem } from 'reka-ui'
import { cn } from '@/lib/utils'

withDefaults(defineProps<{ class?: string; destructive?: boolean; disabled?: boolean }>(), {
  destructive: false,
})
</script>

<template>
  <ContextMenuItem
    :disabled="disabled"
    :class="
      cn(
        'flex w-full items-center gap-2 rounded-md px-2.5 py-[7px] text-[13px] text-text-h outline-none select-none',
        'data-[highlighted]:bg-code-bg',
        destructive && 'text-error data-[highlighted]:bg-error/10',
        disabled && 'cursor-not-allowed text-text-dark-muted opacity-60',
        !disabled && 'cursor-pointer',
        $props.class
      )
    "
  >
    <slot />
  </ContextMenuItem>
</template>
