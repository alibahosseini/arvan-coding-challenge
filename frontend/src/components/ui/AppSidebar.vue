<script setup lang="ts">
import { Activity, FileCode2, LayoutGrid, Settings, Terminal } from 'lucide-vue-next'

interface NavItem {
  label: string
  icon: typeof FileCode2
  active?: boolean
  disabled?: boolean
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const groups: NavGroup[] = [
  {
    title: 'Overview',
    items: [{ label: 'Overview', icon: LayoutGrid, disabled: true }],
  },
  {
    title: 'Project',
    items: [
      { label: 'Code', icon: FileCode2, active: true },
      { label: 'Assets', icon: LayoutGrid, disabled: true },
    ],
  },
  {
    title: 'Execution',
    items: [
      { label: 'Runs', icon: Terminal, disabled: true },
      { label: 'Logs', icon: Activity, disabled: true },
    ],
  },
  {
    title: 'Settings',
    items: [{ label: 'Settings', icon: Settings, disabled: true }],
  },
]
</script>

<template>
  <nav
    class="flex w-[220px] shrink-0 flex-col gap-5 overflow-y-auto border-r border-border bg-surface px-3 py-5 max-[900px]:w-full max-[900px]:flex-row max-[900px]:items-center max-[900px]:gap-4 max-[900px]:overflow-x-auto max-[900px]:overflow-y-visible max-[900px]:border-r-0 max-[900px]:border-b max-[900px]:px-3 max-[900px]:py-2.5"
    aria-label="Console navigation"
  >
    <div v-for="group in groups" :key="group.title" class="max-[900px]:flex max-[900px]:items-center">
      <p class="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-dark-muted max-[900px]:hidden">
        {{ group.title }}
      </p>
      <ul class="flex flex-col gap-0.5 max-[900px]:flex-row">
        <li v-for="item in group.items" :key="item.label">
          <button
            type="button"
            class="flex w-full items-center gap-2.5 rounded-md border-l-2 border-transparent px-2.5 py-[7px] text-left text-[13.5px] text-text transition-colors focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-accent max-[900px]:w-auto max-[900px]:whitespace-nowrap max-[900px]:rounded-b-none max-[900px]:rounded-t-md max-[900px]:border-b-2 max-[900px]:border-l-0"
            :class="
              item.disabled
                ? 'cursor-not-allowed text-text-dark-muted opacity-55'
                : item.active
                  ? 'border-accent bg-accent-bg font-medium text-text-h max-[900px]:border-b-accent max-[900px]:border-l-transparent'
                  : 'hover:bg-code-bg hover:text-text-h'
            "
            :disabled="item.disabled"
            :aria-current="item.active ? 'page' : undefined"
          >
            <component
              :is="item.icon"
              :size="16"
              :stroke-width="2"
              class="shrink-0"
              :class="item.active ? 'text-accent' : 'text-text-dark-muted'"
            />
            <span>{{ item.label }}</span>
          </button>
        </li>
      </ul>
    </div>
  </nav>
</template>
