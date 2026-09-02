<script setup lang="ts">
import { cn } from '@/lib/utils'

defineProps<{ class?: string }>()
const model = defineModel<string>()
</script>

<template>
  <textarea
    v-model="model"
    :class="
      cn(
        'flex w-full resize-none rounded-md border border-border bg-bg px-2.5 py-2 font-mono text-[13px] text-text-h placeholder:text-text-dark-muted focus-visible:border-accent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-55',
        $props.class
      )
    "
  />
</template>
