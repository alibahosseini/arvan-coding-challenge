<script setup lang="ts">
import { cn } from '@/lib/utils'

defineProps<{ class?: string }>()
const model = defineModel<string>()
</script>

<template>
  <input
    v-model="model"
    :class="
      cn(
        'flex h-8 w-full rounded-md border border-border bg-bg px-2.5 font-mono text-[13px] text-text-h placeholder:text-text-dark-muted focus-visible:border-accent focus-visible:outline-none',
        $props.class
      )
    "
  />
</template>
