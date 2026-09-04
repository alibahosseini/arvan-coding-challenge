<script setup lang="ts">
import { Moon, Sun } from 'lucide-vue-next'
import arvanLogo from '../../assets/arvancloud-logo.png'
import { useThemeStore } from '../../stores/theme'
import { Button } from './button'

defineProps<{
  projectName: string
}>()

const themeStore = useThemeStore()
</script>

<template>
  <header class="flex h-[60px] shrink-0 items-center justify-between border-b border-border bg-surface px-5">
    <div class="flex min-w-0 items-center gap-2">
      <img :src="arvanLogo" class="h-7 w-7 shrink-0 object-contain" width="28" height="28" alt="ArvanCloud logo" />
      <span class="whitespace-nowrap text-[15px] font-semibold text-text-h">ArvanCloud</span>
      <span class="text-border max-[640px]:hidden" aria-hidden="true">/</span>
      <span class="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-text max-[640px]:hidden">{{ projectName }}</span>
    </div>

    <div class="flex shrink-0 items-center gap-3">
      <span class="inline-flex items-center gap-1.5 rounded-full border border-border bg-code-bg px-2.5 py-1 text-xs font-medium text-text">
        <span class="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
        Development
      </span>

      <Button
        variant="outline"
        size="icon"
        :title="themeStore.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
        :aria-label="themeStore.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="themeStore.toggleTheme"
      >
        <Sun v-if="themeStore.theme === 'dark'" :size="16" />
        <Moon v-else :size="16" />
      </Button>
    </div>
  </header>
</template>
