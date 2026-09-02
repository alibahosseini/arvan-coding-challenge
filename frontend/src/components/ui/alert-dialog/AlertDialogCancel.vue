<script setup lang="ts">
import { AlertDialogCancel } from 'reka-ui'
import { cn } from '@/lib/utils'
import { buttonVariants } from '../button/variants'

defineProps<{ class?: string }>()
</script>

<template>
  <AlertDialogCancel :class="cn(buttonVariants({ variant: 'outline', size: 'sm' }), $props.class)">
    <slot />
  </AlertDialogCancel>
</template>
