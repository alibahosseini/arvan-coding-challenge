<script setup lang="ts">
import { CheckCircle2, Loader2, Terminal, XCircle } from 'lucide-vue-next'
import type { ExecutionResult } from '../../types/code'

defineProps<{
  result?: ExecutionResult | null
  isRunning?: boolean
}>()
</script>

<template>
  <section class="flex h-full min-h-[150px] w-full flex-col overflow-y-auto bg-surface text-left text-text-h" aria-label="Execution output">
    <div class="flex items-center gap-2 px-4 py-3 text-text">
      <Terminal :size="14" :stroke-width="2" />
      <h2 class="text-xs font-semibold uppercase tracking-wider text-text">Output</h2>
    </div>

    <div class="h-px bg-border" />

    <div v-if="isRunning" class="flex items-center gap-2 p-4 font-mono text-[13.5px] leading-normal" role="status" aria-live="polite">
      <Loader2 :size="15" class="animate-spin" />
      <p class="text-text">Running your code…</p>
    </div>

    <div v-else-if="!result" class="p-4 font-mono text-[13.5px] leading-normal">
      <p class="mb-1 text-text">No output yet.</p>
      <p class="text-text">Run your code to see the result here.</p>
    </div>

    <div v-else-if="result.success" class="p-4 font-mono text-[13.5px] leading-normal" role="status" aria-live="polite">
      <p class="m-0 inline-flex items-center gap-1.5 font-medium text-success">
        <CheckCircle2 :size="15" />
        Execution successful
      </p>
      <pre class="mt-1.5 whitespace-pre-wrap font-mono">{{ result.output }}</pre>
    </div>

    <div v-else class="p-4 font-mono text-[13.5px] leading-normal" role="alert">
      <p class="m-0 inline-flex items-center gap-1.5 font-medium text-error">
        <XCircle :size="15" />
        Execution failed
      </p>
      <pre class="mt-1.5 whitespace-pre-wrap font-mono">{{ result.error }}</pre>
    </div>
  </section>
</template>
