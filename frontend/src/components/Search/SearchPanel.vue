<script setup lang="ts">
import { computed, ref } from 'vue'
import { Search } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'
import { getFileIcon } from '../FileExplorer/fileIcon'
import type { CodeFile } from '../../types/code'

const props = defineProps<{
  files: CodeFile[]
}>()

const emit = defineEmits<{
  openResult: [file: CodeFile, lineNumber: number]
}>()

const query = ref('')

interface LineMatch {
  lineNumber: number
  text: string
}

interface FileMatch {
  file: CodeFile
  lines: LineMatch[]
}

const results = computed<FileMatch[]>(() => {
  const q = query.value.trim()
  if (!q) return []
  const needle = q.toLowerCase()

  const matches: FileMatch[] = []
  for (const file of props.files) {
    const lines = file.code.split('\n')
    const lineMatches: LineMatch[] = []
    lines.forEach((text, index) => {
      if (text.toLowerCase().includes(needle)) {
        lineMatches.push({ lineNumber: index + 1, text: text.trim().slice(0, 160) })
      }
    })

    // A file name/path match still surfaces the file even without a content match.
    const nameMatches = file.name.toLowerCase().includes(needle) || file.path.toLowerCase().includes(needle)
    if (lineMatches.length || nameMatches) matches.push({ file, lines: lineMatches.slice(0, 30) })
  }
  return matches
})

const totalMatches = computed(() => results.value.reduce((sum, r) => sum + r.lines.length, 0))

interface HighlightPart {
  text: string
  match: boolean
}

function highlightParts(text: string, needle: string): HighlightPart[] {
  if (!needle) return [{ text, match: false }]
  const lower = text.toLowerCase()
  const parts: HighlightPart[] = []
  let i = 0
  while (i < text.length) {
    const idx = lower.indexOf(needle, i)
    if (idx === -1) {
      parts.push({ text: text.slice(i), match: false })
      break
    }
    if (idx > i) parts.push({ text: text.slice(i, idx), match: false })
    parts.push({ text: text.slice(idx, idx + needle.length), match: true })
    i = idx + needle.length
  }
  return parts
}

function fileNameParts(file: CodeFile): HighlightPart[] {
  return highlightParts(file.path, query.value.trim().toLowerCase())
}

function lineParts(line: LineMatch): HighlightPart[] {
  return highlightParts(line.text, query.value.trim().toLowerCase())
}
</script>

<template>
  <div class="flex h-full w-full flex-col overflow-hidden">
    <div class="shrink-0 px-3 py-2.5">
      <span class="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-text-dark-muted">Search</span>
      <div class="relative">
        <Search :size="13" class="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-text-dark-muted" />
        <Input v-model="query" placeholder="Search in files..." class="pl-7" />
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-1.5 pb-2.5">
      <p v-if="query && !results.length" class="px-2 py-3 text-center text-[12.5px] text-text-dark-muted">No results found</p>
      <p v-else-if="query" class="px-2 pb-1.5 text-[11px] text-text-dark-muted">
        {{ totalMatches }} results in {{ results.length }} files
      </p>

      <div v-for="match in results" :key="match.file.id" class="mb-2">
        <div class="flex items-center gap-1.5 px-2 py-1 text-[12.5px] font-medium text-text-h">
          <img :src="getFileIcon(match.file.name)" class="h-3.5 w-3.5 shrink-0 object-contain" alt="" />
          <span class="truncate">
            <template v-for="(part, i) in fileNameParts(match.file)" :key="i">
              <mark v-if="part.match" class="rounded-sm bg-accent/30 text-text-h">{{ part.text }}</mark>
              <template v-else>{{ part.text }}</template>
            </template>
          </span>
        </div>
        <ul class="list-none pl-6">
          <li v-for="line in match.lines" :key="line.lineNumber">
            <button
              type="button"
              class="flex w-full items-start gap-2 rounded px-2 py-0.5 text-left font-mono text-[12px] text-text hover:bg-code-bg hover:text-text-h"
              @click="emit('openResult', match.file, line.lineNumber)"
            >
              <span class="shrink-0 text-text-dark-muted">{{ line.lineNumber }}</span>
              <span class="truncate">
                <template v-for="(part, i) in lineParts(line)" :key="i">
                  <mark v-if="part.match" class="rounded-sm bg-accent/30 text-text-h">{{ part.text }}</mark>
                  <template v-else>{{ part.text }}</template>
                </template>
              </span>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
