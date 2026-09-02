import { acceptHMRUpdate, defineStore } from 'pinia'
import { ref } from 'vue'
import { streamMockAIResponse } from '../services/aiMockService'

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const THINKING_MIN_MS = 800
const THINKING_MAX_MS = 1500

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const useAIAssistantStore = defineStore('aiAssistant', () => {
  const isOpen = ref(false)
  const isThinking = ref(false)
  const isStreaming = ref(false)
  const hasSubmitted = ref(false)
  const messages = ref<AIMessage[]>([])

  function open() {
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  function toggle() {
    isOpen.value = !isOpen.value
  }

  async function sendMessage(content: string) {
    const trimmed = content.trim()
    if (!trimmed || hasSubmitted.value) return

    hasSubmitted.value = true
    messages.value.push({ id: crypto.randomUUID(), role: 'user', content: trimmed })

    isThinking.value = true
    await delay(THINKING_MIN_MS + Math.random() * (THINKING_MAX_MS - THINKING_MIN_MS))
    isThinking.value = false

    const assistantMessageId = crypto.randomUUID()
    messages.value.push({ id: assistantMessageId, role: 'assistant', content: '' })

    isStreaming.value = true
    for await (const partial of streamMockAIResponse(trimmed)) {
      const message = messages.value.find((m) => m.id === assistantMessageId)
      if (message) message.content = partial
    }
    isStreaming.value = false
  }

  return { isOpen, isThinking, isStreaming, hasSubmitted, messages, open, close, toggle, sendMessage }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useAIAssistantStore, import.meta.hot))
}
