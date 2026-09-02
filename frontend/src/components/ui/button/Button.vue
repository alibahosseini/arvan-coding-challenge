<script setup lang="ts">
import { cn } from '@/lib/utils'
import { buttonVariants, type ButtonVariants } from './variants'

withDefaults(
  defineProps<{
    variant?: ButtonVariants['variant']
    size?: ButtonVariants['size']
    class?: string
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
  }>(),
  { type: 'button' }
)
</script>

<template>
  <button :type="type" :disabled="disabled" :class="cn(buttonVariants({ variant, size }), $props.class)">
    <slot />
  </button>
</template>
