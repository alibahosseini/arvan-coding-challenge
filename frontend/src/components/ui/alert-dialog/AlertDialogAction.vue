<script setup lang="ts">
import { AlertDialogAction } from 'reka-ui'
import { cn } from '@/lib/utils'
import { buttonVariants, type ButtonVariants } from '../button/variants'

withDefaults(defineProps<{ variant?: ButtonVariants['variant']; class?: string }>(), {
  variant: 'default',
})
</script>

<template>
  <AlertDialogAction :class="cn(buttonVariants({ variant, size: 'sm' }), $props.class)">
    <slot />
  </AlertDialogAction>
</template>
