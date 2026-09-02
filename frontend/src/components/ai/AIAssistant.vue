<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ArrowUp, Sparkles, X } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAIAssistantStore } from '../../stores/aiAssistant'
import { useResizablePanel } from '../../composables/useResizablePanel'

const store = useAIAssistantStore()

const { width, isResizing, startResize } = useResizablePanel({
  storageKey: 'code-dashboard:ai-width',
  defaultWidth: 380,
  min: 280,
  max: 640,
  direction: 'left',
})

const draft = ref('')
const conversationRef = ref<HTMLElement | null>(null)

const isInputDisabled = computed(() => store.hasSubmitted)
const canSend = computed(() => !isInputDisabled.value && draft.value.trim().length > 0)

const placeholder = computed(() => (store.hasSubmitted ? 'AI Assistant is coming soon' : 'Ask anything about your code'))

function scrollToBottom() {
  nextTick(() => {
    const el = conversationRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

watch(() => store.messages.length, scrollToBottom)
watch(
  () => store.messages.map((m) => m.content).join(),
  scrollToBottom
)

function submit() {
  if (!canSend.value) return
  const content = draft.value
  draft.value = ''
  void store.sendMessage(content)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    submit()
  }
}
</script>

<template>
  <section
    class="relative flex shrink-0 flex-col overflow-hidden rounded-[10px] border border-border bg-surface max-[1100px]:w-full!"
    :style="{ width: width + 'px' }"
    aria-label="AI Assistant"
  >
    <div
      class="group absolute inset-y-0 left-0 z-10 -ml-1 w-2 cursor-col-resize max-[1100px]:hidden"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize AI Assistant panel"
      @pointerdown="startResize"
    >
      <div class="mx-auto h-full w-px bg-transparent group-hover:bg-accent" :class="isResizing && 'bg-accent!'" />
    </div>

    <header class="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
      <div class="flex items-center gap-2 text-[13px] font-medium text-text-h">
        <Sparkles :size="15" class="text-accent" />
        AI Assistant
      </div>
      <Button
        variant="ghost"
        size="icon"
        class="h-6 w-6 text-text hover:bg-code-bg hover:text-text-h"
        title="Close AI Assistant"
        aria-label="Close AI Assistant"
        @click="store.close"
      >
        <X :size="14" />
      </Button>
    </header>

    <div ref="conversationRef" class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-4">
      <div v-if="!store.messages.length" class="flex flex-1 flex-col items-center justify-center gap-1.5 px-4 text-center">
        <Sparkles :size="22" class="mb-1 text-text" />
        <p class="text-[13.5px] font-medium text-text-h">AI Assistant</p>
        <p class="text-[12.5px] leading-relaxed text-text">Ask questions about your code or get help with your project.</p>
      </div>

      <template v-else>
        <div v-for="message in store.messages" :key="message.id" class="flex flex-col gap-1" :class="message.role === 'user' && 'items-end'">
          <span class="text-[11px] font-semibold uppercase tracking-wider text-text">
            {{ message.role === 'user' ? 'You' : 'AI Assistant' }}
          </span>

          <div
            class="max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 text-[13px] leading-relaxed"
            :class="message.role === 'user' ? 'bg-accent text-white' : 'bg-code-bg text-text-h'"
          >
            {{ message.content
            }}<span
              v-if="message.role === 'assistant' && store.isStreaming && message.id === store.messages[store.messages.length - 1].id"
              class="animate-pulse"
              aria-hidden="true"
              >▌</span
            >
          </div>
        </div>

        <div v-if="store.isThinking" class="flex flex-col gap-1" role="status" aria-live="polite">
          <span class="text-[11px] font-semibold uppercase tracking-wider text-text">AI Assistant</span>
          <div class="flex w-fit items-center gap-1.5 rounded-lg bg-code-bg px-3 py-2 text-[13px] text-text">
            <span class="flex gap-0.5">
              <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-text-dark-muted [animation-delay:-0.3s]" />
              <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-text-dark-muted [animation-delay:-0.15s]" />
              <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-text-dark-muted" />
            </span>
            Thinking...
          </div>
        </div>
      </template>
    </div>

    <div class="shrink-0 border-t border-border p-3">
      <div class="flex items-end gap-2 rounded-md border border-border bg-code-bg p-1.5 focus-within:border-accent">
        <Textarea
          v-model="draft"
          rows="1"
          class="max-h-32 min-h-8 flex-1 border-0 bg-transparent p-1 text-text-h placeholder:text-text focus-visible:border-transparent"
          :disabled="isInputDisabled"
          :placeholder="placeholder"
          aria-label="Message the AI Assistant"
          @keydown="onKeydown"
        />
        <Button size="icon" class="h-7 w-7 shrink-0" :disabled="!canSend" aria-label="Send message" title="Send" @click="submit">
          <ArrowUp :size="14" />
        </Button>
      </div>
    </div>
  </section>
</template>
